import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react'
import { fileService } from '@/services/fileService'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

interface UploadFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  url?: string
}

interface DocumentUploaderProps {
  projectId?: string
  onUploadComplete?: (files: any[]) => void
  maxFiles?: number
  maxSize?: number
  acceptedTypes?: string[]
}

export function DocumentUploader({
  projectId,
  onUploadComplete,
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024, // 100MB
  acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/gif'
  ]
}: DocumentUploaderProps) {
  const { user } = useAuthStore()
  const [uploadFilesList, setUploadFilesList] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // 거부된 파일들에 대한 에러 표시
      rejectedFiles.forEach((rejection) => {
        const { file, errors } = rejection
        toast.error(`파일 "${file.name}" 업로드 실패: ${errors.map((e: any) => e.message).join(', ')}`)
      })

      // 수락된 파일들을 업로드 목록에 추가
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: 'pending'
      }))

      setUploadFilesList((prev) => [...prev, ...newFiles])

      // 파일 추가 로그
      console.log('파일 추가됨:', newFiles.length, '개')
    },
    []
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: maxFiles - uploadFilesList.length,
    maxSize,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
    disabled: isUploading || uploadFilesList.length >= maxFiles
  })

  const removeFile = (id: string) => {
    setUploadFilesList((prev) => prev.filter((f) => f.id !== id))
  }

  const startUpload = useCallback(async () => {
    if (!user) {
      console.log('업로드 시작 실패: 사용자 인증 없음')
      return
    }

    // 현재 pending 상태인 파일들만 처리
    const currentPendingFiles = uploadFilesList.filter(f => f.status === 'pending')
    if (currentPendingFiles.length === 0) {
      console.log('업로드할 파일이 없음')
      return
    }

    console.log('업로드 시작:', currentPendingFiles.length, '개 파일')
    setIsUploading(true)
    const completedFiles: any[] = []

    try {
      // 모든 파일을 병렬로 업로드
      await Promise.all(
        currentPendingFiles.map(async (uploadFile) => {
          try {
            // 상태 업데이트: 업로딩 시작
            setUploadFilesList((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
              )
            )

            // 파일 메타데이터 추출
            const metadata = await fileService.extractMetadata(uploadFile.file)

            // 진행률 콜백
            const onProgress = (progress: number) => {
              setUploadFilesList((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id ? { ...f, progress } : f
                )
              )
            }

            // 파일 업로드
            const result = await fileService.uploadFile(
              uploadFile.file,
              {
                projectId,
                userId: user.id,
                metadata
              },
              onProgress
            )

            // 성공 상태로 업데이트
            setUploadFilesList((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? { ...f, status: 'success', progress: 100, url: result.url }
                  : f
              )
            )

            completedFiles.push(result)
          } catch (error) {
            console.error('File upload error:', error)

            // 에러 상태로 업데이트
            setUploadFilesList((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? {
                      ...f,
                      status: 'error',
                      error: error instanceof Error ? error.message : '업로드 실패'
                    }
                  : f
              )
            )
          }
        })
      )

      if (completedFiles.length > 0) {
        toast.success(`${completedFiles.length}개 파일이 성공적으로 업로드되었습니다.`)
        onUploadComplete?.(completedFiles)
      }
    } catch (error) {
      console.error('Upload process error:', error)
      toast.error('업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }, [uploadFilesList, user, projectId, onUploadComplete])

  // 파일이 추가되면 자동으로 업로드 시작
  useEffect(() => {
    const pendingFiles = uploadFilesList.filter(f => f.status === 'pending')
    const pendingCount = pendingFiles.length

    if (pendingCount > 0 && !isUploading && user) {
      console.log('자동 업로드 시작:', pendingCount, '개 파일')
      const timer = setTimeout(() => {
        startUpload()
      }, 1000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [uploadFilesList.length, isUploading, user, startUpload])

  const clearCompleted = () => {
    setUploadFilesList((prev) => prev.filter((f) => f.status !== 'success'))
  }

  const hasSuccessFiles = uploadFilesList.some((f) => f.status === 'success')
  const hasPendingFiles = uploadFilesList.some((f) => f.status === 'pending')

  return (
    <div className="space-y-4">
      {/* 드래그 앤 드롭 영역 */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-accent/50'
          }
          ${isUploading || uploadFilesList.length >= maxFiles
            ? 'opacity-50 cursor-not-allowed'
            : ''
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-text-primary">
            {isDragActive
              ? '파일을 여기에 놓으세요'
              : '파일을 드래그하거나 클릭하여 업로드'}
          </p>
          <p className="text-sm text-text-tertiary">
            PDF, Word, 텍스트, 이미지 파일 지원 (최대 {Math.floor(maxSize / (1024 * 1024))}MB)
          </p>
          <p className="text-xs text-text-tertiary">
            최대 {maxFiles}개 파일 ({uploadFilesList.length}/{maxFiles})
          </p>
        </div>
      </div>

      {/* 업로드 파일 목록 */}
      {uploadFilesList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">
              업로드 파일 ({uploadFilesList.length})
            </h3>
            <div className="flex space-x-2">
              {hasSuccessFiles && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-text-tertiary hover:text-text-secondary"
                >
                  완료된 파일 제거
                </button>
              )}
              {hasPendingFiles && !isUploading && (
                <button
                  onClick={startUpload}
                  className="linear-button linear-button-primary text-xs px-3 py-1"
                >
                  업로드 시작
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploadFilesList.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center space-x-3 p-3 bg-background-secondary rounded-lg"
              >
                <File className="h-5 w-5 text-text-tertiary flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {uploadFile.file.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      {uploadFile.status === 'uploading' && (
                        <span className="text-xs text-text-tertiary">
                          {uploadFile.progress}%
                        </span>
                      )}
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {uploadFile.status !== 'uploading' && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="text-text-tertiary hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-text-tertiary">
                      {(uploadFile.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    {uploadFile.status === 'error' && uploadFile.error && (
                      <span className="text-xs text-red-500">{uploadFile.error}</span>
                    )}
                  </div>

                  {/* 진행률 바 */}
                  {uploadFile.status === 'uploading' && (
                    <div className="w-full bg-background-tertiary rounded-full h-1.5 mt-2">
                      <div
                        className="bg-accent h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}