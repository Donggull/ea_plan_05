import { supabase } from '../lib/supabase'
// import { fileTypeFromBuffer } from 'file-type'

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

    // 파일 시그니처 검증 (보안) - 임시 비활성화
    try {
      // const buffer = await file.arrayBuffer()
      // const fileType = await fileTypeFromBuffer(buffer)

      // if (fileType && !this.ALLOWED_TYPES.includes(fileType.mime)) {
      //   throw new Error('파일 내용이 확장자와 일치하지 않습니다.')
      // }
      console.log('File signature validation temporarily disabled for debugging')
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
    console.log('📤 파일 업로드 시작:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      projectId: options.projectId,
      userId: options.userId
    })

    try {
      // 파일 검증
      console.log('🔍 파일 검증 중...')
      await this.validateFile(file)
      console.log('✅ 파일 검증 완료')

      // 파일 경로 생성 - RLS 정책에 맞게 userId를 첫 번째 폴더로 설정
      const timestamp = Date.now()
      const filename = `${timestamp}-${this.sanitizeFilename(file.name)}`

      // Storage RLS 정책: (storage.foldername(name))[1] = auth.uid()
      // 따라서 경로는 {userId}/{projectId?}/{filename} 형태여야 함
      const filePath = options.projectId
        ? `${options.userId}/${options.projectId}/${filename}`
        : `${options.userId}/${filename}`

      console.log('📁 생성된 파일 경로:', filePath)

      if (!supabase) {
        console.error('❌ Supabase 클라이언트가 없음')
        throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.')
      }

      console.log('☁️ Supabase Storage에 업로드 시작...')

      // Storage 버킷 접근 가능성 미리 확인
      try {
        console.log('🔍 Storage 버킷 접근 가능성 확인 중...')
        const { error: bucketError } = await supabase.storage
          .from('documents')
          .list('', { limit: 1 })

        if (bucketError) {
          console.error('❌ Storage 버킷 접근 실패:', bucketError)
          throw new Error(`Storage 버킷 접근 실패: ${bucketError.message}`)
        }
        console.log('✅ Storage 버킷 접근 가능')
      } catch (error) {
        console.error('❌ Storage 버킷 사전 확인 실패:', error)
        throw new Error('Storage 버킷에 접근할 수 없습니다. 네트워크 연결을 확인해주세요.')
      }

      // 실제 업로드 진행률 시뮬레이션
      const simulateProgress = () => {
        let progress = 20
        const interval = setInterval(() => {
          progress = Math.min(progress + 5, 50) // 최대 50%까지만
          onProgress?.(progress)
        }, 300)
        return interval
      }

      const progressInterval = simulateProgress()

      try {
        // 더 긴 타임아웃과 더 자세한 로깅
        console.log('☁️ Supabase Storage 업로드 시작...', {
          bucketName: 'documents',
          filePath,
          fileSize: file.size,
          fileType: file.type
        })

        // 타임아웃을 90초로 연장하고 더 나은 에러 처리
        const uploadWithTimeout = Promise.race([
          supabase.storage
            .from('documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            }),
          new Promise((_, reject) => {
            setTimeout(() => {
              console.error('❌ Storage 업로드 타임아웃 발생 (90초)')
              reject(new Error('업로드 타임아웃 (90초) - 네트워크 연결을 확인해주세요'))
            }, 90000) // 90초로 연장
          })
        ])

        console.log('⏳ Storage 업로드 대기 중...')
        const uploadResponse = await uploadWithTimeout as any

        // 진행률 시뮬레이션 정리
        clearInterval(progressInterval)

        console.log('📤 Storage 업로드 응답:', {
          error: uploadResponse.error,
          data: uploadResponse.data
        })

        if (uploadResponse.error) {
          console.error('❌ Storage 업로드 실패:', {
            error: uploadResponse.error,
            errorCode: uploadResponse.error.error,
            statusCode: uploadResponse.error.statusCode,
            filePath,
            fileSize: file.size
          })

          // 상세한 오류 케이스별 메시지 개선
          let errorMessage = uploadResponse.error.message
          const errorCode = uploadResponse.error.error || uploadResponse.error.statusCode

          if (uploadResponse.error.message?.includes('The resource already exists')) {
            errorMessage = '같은 이름의 파일이 이미 존재합니다.'
          } else if (uploadResponse.error.message?.includes('Invalid file type')) {
            errorMessage = '지원하지 않는 파일 형식입니다.'
          } else if (uploadResponse.error.message?.includes('File too large')) {
            errorMessage = '파일 크기가 너무 큽니다.'
          } else if (uploadResponse.error.message?.includes('row-level security')) {
            errorMessage = 'Storage 접근 권한이 없습니다. 프로젝트 설정을 확인해주세요.'
          } else if (uploadResponse.error.message?.includes('JWT')) {
            errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.'
          } else if (uploadResponse.error.message?.includes('network') || uploadResponse.error.message?.includes('fetch')) {
            errorMessage = '네트워크 연결 오류입니다. 인터넷 연결을 확인해주세요.'
          } else if (errorCode === 403) {
            errorMessage = 'Storage 접근이 거부되었습니다. 권한을 확인해주세요.'
          } else if (errorCode === 413) {
            errorMessage = '파일 크기가 허용된 한도를 초과했습니다.'
          } else if (errorCode === 429) {
            errorMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
          }

          throw new Error(`파일 업로드 실패: ${errorMessage}`)
        }

        console.log('✅ Storage 업로드 성공')

        // 진행률 60% 보고
        onProgress?.(60)

      } catch (error) {
        clearInterval(progressInterval)
        throw error
      }

      // 공개 URL 생성
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      console.log('🔗 공개 URL 생성:', urlData.publicUrl)

      // 진행률 80% 보고
      onProgress?.(80)

      // 데이터베이스에 문서 정보 저장
      console.log('💾 데이터베이스에 문서 정보 저장 중...')

      const documentData = {
        file_name: filename,
        storage_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        file_type: file.type.length > 255 ? file.type.substring(0, 255) : file.type, // MIME 타입 길이 제한
        project_id: options.projectId || null,
        uploaded_by: options.userId,
        metadata: options.metadata as any, // JSON 호환을 위해 타입 변환
        is_processed: false,
        version: 1
      }

      console.log('📝 삽입할 문서 데이터:', {
        ...documentData,
        file_name_length: filename.length,
        mime_type_length: file.type.length,
        file_type_length: documentData.file_type.length
      })

      const dbResponse = await supabase
        .from('documents')
        .insert(documentData as any)
        .select()
        .single()

      console.log('💾 데이터베이스 삽입 응답:', {
        error: dbResponse.error,
        data: dbResponse.data
      })

      if (dbResponse.error) {
        console.error('❌ 데이터베이스 저장 실패:', dbResponse.error)

        // 업로드된 파일 정리
        console.log('🗑️ 업로드된 파일 정리 중...')
        await supabase.storage
          .from('documents')
          .remove([filePath])

        throw new Error(`문서 정보 저장 실패: ${dbResponse.error.message}`)
      }

      console.log('✅ 데이터베이스 저장 성공')

      // 진행률 100% 보고
      onProgress?.(100)

      const result = {
        id: dbResponse.data.id,
        url: urlData.publicUrl,
        path: filePath,
        metadata: options.metadata
      }

      console.log('🎉 파일 업로드 완료:', result)

      return result
    } catch (error) {
      console.error('💥 파일 업로드 오류:', error)
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
    if (!supabase) throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.')

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
    // 파일명을 안전하게 정리하고 길이 제한
    const sanitized = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')

    // 파일명이 너무 길면 확장자를 보존하면서 줄임
    if (sanitized.length > 100) {
      const ext = this.getFileExtension(sanitized)
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
      const maxNameLength = 100 - ext.length - 1 // 점(.) 포함
      return nameWithoutExt.substring(0, maxNameLength) + '.' + ext
    }

    return sanitized
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

}

export const fileService = new FileService()