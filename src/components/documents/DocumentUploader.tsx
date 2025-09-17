import { useState, useCallback } from 'react'
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
  retryCount?: number
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
        status: 'pending',
        retryCount: 0
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

  const retryUpload = useCallback(async (uploadFile: UploadFile) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    const maxRetries = 3
    if ((uploadFile.retryCount || 0) >= maxRetries) {
      toast.error(`"${uploadFile.file.name}" 최대 재시도 횟수를 초과했습니다.`)
      return
    }

    console.log(`🔄 파일 재시도 업로드: ${uploadFile.file.name} (${(uploadFile.retryCount || 0) + 1}/${maxRetries})`)

    // 상태를 다시 업로딩으로 변경
    setUploadFilesList((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id
          ? { ...f, status: 'uploading', progress: 0, error: undefined, retryCount: (f.retryCount || 0) + 1 }
          : f
      )
    )

    try {
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

      toast.success(`"${uploadFile.file.name}" 재시도 업로드 성공`)
      onUploadComplete?.([result])

    } catch (error) {
      console.error('💥 재시도 업로드 오류:', error)

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

      toast.error(`"${uploadFile.file.name}" 재시도 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }, [user, projectId, onUploadComplete])

  const startUpload = useCallback(async () => {
    if (!user) {
      console.log('❌ 업로드 시작 실패: 사용자 인증 없음')
      toast.error('로그인이 필요합니다.')
      return
    }

    // 현재 pending 상태인 파일들만 처리
    const currentPendingFiles = uploadFilesList.filter(f => f.status === 'pending')
    if (currentPendingFiles.length === 0) {
      console.log('❌ 업로드할 파일이 없음')
      toast.warning('업로드할 파일이 없습니다.')
      return
    }

    console.log('🚀 업로드 시작:', currentPendingFiles.length, '개 파일')
    setIsUploading(true)
    const completedFiles: any[] = []
    let errorCount = 0

    try {
      // 모든 파일을 순차적으로 업로드 (디버깅을 위해)
      for (const uploadFile of currentPendingFiles) {
        try {
          console.log(`📤 파일 업로드 시작: ${uploadFile.file.name}`, {
            fileSize: uploadFile.file.size,
            fileType: uploadFile.file.type,
            projectId,
            userId: user.id
          })

          // 상태 업데이트: 업로딩 시작
          setUploadFilesList((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
            )
          )

          // 파일 메타데이터 추출
          console.log('📋 메타데이터 추출 중...')
          const metadata = await fileService.extractMetadata(uploadFile.file)
          console.log('✅ 메타데이터 추출 완료:', metadata)

          // 진행률 콜백
          const onProgress = (progress: number) => {
            console.log(`📊 업로드 진행률: ${progress}%`)
            setUploadFilesList((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, progress } : f
              )
            )
          }

          // 파일 업로드
          console.log('☁️ 파일 업로드 실행...')
          const result = await fileService.uploadFile(
            uploadFile.file,
            {
              projectId,
              userId: user.id,
              metadata
            },
            onProgress
          )

          console.log('✅ 파일 업로드 성공:', result)

          // 성공 상태로 업데이트
          setUploadFilesList((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: 'success', progress: 100, url: result.url }
                : f
            )
          )

          completedFiles.push(result)
          toast.success(`"${uploadFile.file.name}" 업로드 완료`)

        } catch (error) {
          console.error('💥 파일 업로드 오류:', error)
          errorCount++

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

          toast.error(`"${uploadFile.file.name}" 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
        }
      }

      // 결과 요약
      if (completedFiles.length > 0) {
        toast.success(`총 ${completedFiles.length}개 파일이 성공적으로 업로드되었습니다.`)
        onUploadComplete?.(completedFiles)
      }

      if (errorCount > 0) {
        toast.error(`${errorCount}개 파일 업로드에 실패했습니다.`)
      }

    } catch (error) {
      console.error('💥 업로드 프로세스 오류:', error)
      toast.error('업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
      console.log('🏁 업로드 프로세스 완료')
    }
  }, [uploadFilesList, user, projectId, onUploadComplete])

  // 자동 업로드 제거 - 사용자가 직접 "업로드 시작" 버튼을 클릭해야 함

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
              {hasPendingFiles && (
                <span className="ml-2 text-xs text-orange-500">
                  {uploadFilesList.filter(f => f.status === 'pending').length}개 대기 중
                </span>
              )}
            </h3>
            <div className="flex space-x-2">
              {hasSuccessFiles && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  완료된 파일 제거
                </button>
              )}
              {hasPendingFiles && !isUploading && (
                <button
                  onClick={startUpload}
                  className="linear-button linear-button-primary text-sm px-4 py-2 font-medium"
                  disabled={isUploading}
                >
                  📤 업로드 시작 ({uploadFilesList.filter(f => f.status === 'pending').length}개)
                </button>
              )}
              {isUploading && (
                <div className="flex items-center space-x-2 text-sm text-accent">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
                  <span>
                    업로드 중... ({uploadFilesList.filter(f => f.status === 'uploading').length}/{uploadFilesList.filter(f => f.status === 'pending' || f.status === 'uploading').length})
                  </span>
                </div>
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
                      {uploadFile.status === 'pending' && (
                        <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded">
                          대기
                        </span>
                      )}
                      {uploadFile.status === 'uploading' && (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-accent border-t-transparent"></div>
                          <span className="text-xs text-accent font-medium">
                            {uploadFile.progress}%
                          </span>
                        </div>
                      )}
                      {uploadFile.status === 'success' && (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            완료
                          </span>
                        </div>
                      )}
                      {uploadFile.status === 'error' && (
                        <div className="flex items-center space-x-1">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            실패 {uploadFile.retryCount ? `(${uploadFile.retryCount}/3)` : ''}
                          </span>
                          {(uploadFile.retryCount || 0) < 3 && (
                            <button
                              onClick={() => retryUpload(uploadFile)}
                              className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                              title="재시도"
                            >
                              🔄 재시도
                            </button>
                          )}
                        </div>
                      )}
                      {uploadFile.status !== 'uploading' && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="text-text-tertiary hover:text-red-500 transition-colors"
                          title="파일 제거"
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