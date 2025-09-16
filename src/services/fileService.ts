import { supabase } from '@/lib/supabase'
import { fileTypeFromBuffer } from 'file-type'

export interface FileMetadata {
  name: string
  size: number
  type: string
  lastModified: number
  extension?: string
  dimensions?: {
    width: number
    height: number
  }
  pageCount?: number
  textContent?: string
}

export interface UploadOptions {
  projectId?: string
  userId: string
  metadata: FileMetadata
  folder?: string
}

export interface UploadResult {
  id: string
  url: string
  path: string
  metadata: FileMetadata
}

class FileService {
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]

  async validateFile(file: File): Promise<boolean> {
    // 파일 크기 검증
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`파일 크기가 너무 큽니다. 최대 ${this.MAX_FILE_SIZE / (1024 * 1024)}MB까지 지원됩니다.`)
    }

    // MIME 타입 검증
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`지원하지 않는 파일 형식입니다: ${file.type}`)
    }

    // 파일 시그니처 검증 (보안)
    try {
      const buffer = await file.arrayBuffer()
      const fileType = await fileTypeFromBuffer(buffer)

      if (fileType && !this.ALLOWED_TYPES.includes(fileType.mime)) {
        throw new Error('파일 내용이 확장자와 일치하지 않습니다.')
      }
    } catch (error) {
      console.warn('File signature validation failed:', error)
      // 시그니처 검증 실패는 경고만 하고 진행
    }

    return true
  }

  async extractMetadata(file: File): Promise<FileMetadata> {
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      extension: this.getFileExtension(file.name)
    }

    try {
      // 이미지 파일의 경우 차원 정보 추출
      if (file.type.startsWith('image/')) {
        metadata.dimensions = await this.getImageDimensions(file)
      }

      // PDF 파일의 경우 페이지 수 추출
      if (file.type === 'application/pdf') {
        metadata.pageCount = await this.getPdfPageCount(file)
      }

      // 텍스트 파일의 경우 내용 미리보기 추출
      if (file.type.startsWith('text/')) {
        metadata.textContent = await this.extractTextContent(file)
      }
    } catch (error) {
      console.warn('Metadata extraction failed:', error)
    }

    return metadata
  }

  async uploadFile(
    file: File,
    options: UploadOptions,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    // 파일 검증
    await this.validateFile(file)

    // 파일 경로 생성
    const timestamp = Date.now()
    const extension = this.getFileExtension(file.name)
    const filename = `${timestamp}-${this.sanitizeFilename(file.name)}`
    const folder = options.folder || 'documents'
    const filePath = options.projectId
      ? `${folder}/${options.projectId}/${filename}`
      : `${folder}/${options.userId}/${filename}`

    try {
      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        })

      if (uploadError) {
        throw new Error(`파일 업로드 실패: ${uploadError.message}`)
      }

      // 공개 URL 생성
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // 데이터베이스에 문서 정보 저장
      const { data: documentData, error: dbError } = await supabase
        .from('documents')
        .insert({
          file_name: filename,
          storage_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          file_type: file.type,
          project_id: options.projectId,
          uploaded_by: options.userId,
          metadata: options.metadata,
          is_processed: false,
          version: 1
        })
        .select()
        .single()

      if (dbError) {
        // 업로드된 파일 정리
        await supabase.storage
          .from('documents')
          .remove([filePath])

        throw new Error(`문서 정보 저장 실패: ${dbError.message}`)
      }

      // 썸네일 생성 기능은 향후 구현 예정

      // 진행률 100% 보고
      onProgress?.(100)

      return {
        id: documentData.id,
        url: urlData.publicUrl,
        path: filePath,
        metadata: options.metadata
      }
    } catch (error) {
      console.error('File upload error:', error)
      throw error
    }
  }

  async uploadMultipleFiles(
    files: File[],
    options: Omit<UploadOptions, 'metadata'>,
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const metadata = await this.extractMetadata(file)
        const result = await this.uploadFile(
          file,
          { ...options, metadata },
          (progress) => onProgress?.(i, progress)
        )
        results.push(result)
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error)
        throw error
      }
    }

    return results
  }

  async deleteFile(documentId: string): Promise<void> {
    // 문서 정보 조회
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single()

    if (fetchError) {
      throw new Error(`문서 정보 조회 실패: ${fetchError.message}`)
    }

    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.storage_path])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
    }

    // 데이터베이스에서 문서 정보 삭제
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      throw new Error(`문서 정보 삭제 실패: ${dbError.message}`)
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  private async getPdfPageCount(file: File): Promise<number> {
    try {
      // PDF.js를 사용하여 페이지 수 추출
      const arrayBuffer = await file.arrayBuffer()
      const text = new TextDecoder().decode(arrayBuffer)

      // 간단한 페이지 수 추출 (정확하지 않을 수 있음)
      const matches = text.match(/\/Count\s+(\d+)/g)
      if (matches && matches.length > 0) {
        const counts = matches.map(m => parseInt(m.match(/\d+/)?.[0] || '0'))
        return Math.max(...counts)
      }

      return 1
    } catch (error) {
      console.warn('PDF page count extraction failed:', error)
      return 1
    }
  }

  private async extractTextContent(file: File): Promise<string> {
    try {
      const text = await file.text()
      // 처음 500자까지만 미리보기로 저장
      return text.substring(0, 500)
    } catch (error) {
      console.warn('Text content extraction failed:', error)
      return ''
    }
  }

  // 썸네일 생성 기능 - 향후 구현 예정
  private async generateThumbnail(file: File, documentId: string): Promise<void> {
    // 현재 데이터베이스 스키마에 thumbnail_path 필드가 없어서 주석 처리
    console.log('썸네일 생성 기능은 향후 구현 예정입니다.', file.name, documentId)
  }
}

export const fileService = new FileService()