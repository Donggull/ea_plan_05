import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, AlertCircle, CheckCircle, FolderOpen } from 'lucide-react'
import { fileService } from '@/services/fileService'
import { ProjectService } from '@/services/projectService'
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

interface Project {
  id: string
  name: string
  description?: string | null
  status: string
  owner_id: string
  created_at: string | null
  updated_at: string | null
}

interface DocumentUploaderProps {
  projectId?: string // 특정 프로젝트가 지정된 경우 (선택 불가)
  onUploadComplete?: (files: any[]) => void
  maxFiles?: number
  maxSize?: number
  acceptedTypes?: string[]
  allowProjectSelection?: boolean // 프로젝트 선택 허용 여부
}

export function DocumentUploader({
  projectId: fixedProjectId,
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
  ],
  allowProjectSelection = true
}: DocumentUploaderProps) {
  const { user } = useAuthStore()
  const [uploadFilesList, setUploadFilesList] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // 프로젝트 관련 state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(fixedProjectId || '')
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectsLoaded, setProjectsLoaded] = useState(false)

  // 프로젝트 목록 로드
  const loadProjects = useCallback(async () => {
    if (!user || !allowProjectSelection || fixedProjectId) {
      setProjectsLoaded(true)
      return
    }

    try {
      setLoadingProjects(true)
      console.log('🔍 업로드 가능한 프로젝트 목록 로드 중...')

      const uploadableProjects = await ProjectService.getUploadableProjects(user.id, user.role || 'user')

      console.log(`✅ 프로젝트 ${uploadableProjects.length}개 로드 완료`)
      setProjects(uploadableProjects)

      // 프로젝트가 하나도 없으면 경고 표시
      if (uploadableProjects.length === 0) {
        toast.warning('업로드 가능한 프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.')
      }

    } catch (error) {
      console.error('프로젝트 목록 로드 실패:', error)
      toast.error('프로젝트 목록을 불러올 수 없습니다.')
    } finally {
      setLoadingProjects(false)
      setProjectsLoaded(true)
    }
  }, [user, allowProjectSelection, fixedProjectId])

  // 컴포넌트 마운트 시 프로젝트 목록 로드
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

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
    disabled: isUploading || uploadFilesList.length >= maxFiles || (allowProjectSelection && !fixedProjectId && !selectedProjectId)
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

      // 파일 업로드 (현재 선택된 프로젝트 사용)
      const targetProjectId = fixedProjectId || selectedProjectId
      const result = await fileService.uploadFile(
        uploadFile.file,
        {
          projectId: targetProjectId,
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
  }, [user, fixedProjectId, selectedProjectId, onUploadComplete])

  const startUpload = useCallback(async () => {
    if (!user) {
      console.log('❌ 업로드 시작 실패: 사용자 인증 없음')
      toast.error('로그인이 필요합니다.')
      return
    }

    // 프로젝트 선택 확인 (고정 프로젝트가 없고 프로젝트 선택이 허용된 경우)
    if (allowProjectSelection && !fixedProjectId && !selectedProjectId) {
      console.log('❌ 업로드 시작 실패: 프로젝트 미선택')
      toast.error('업로드할 프로젝트를 선택해주세요.')
      return
    }

    // 현재 pending 상태인 파일들만 처리
    const currentPendingFiles = uploadFilesList.filter(f => f.status === 'pending')
    if (currentPendingFiles.length === 0) {
      console.log('❌ 업로드할 파일이 없음')
      toast.warning('업로드할 파일이 없습니다.')
      return
    }

    // 사용할 프로젝트 ID 결정
    const targetProjectId = fixedProjectId || selectedProjectId
    console.log('📁 타겟 프로젝트 ID:', targetProjectId)

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
            projectId: fixedProjectId,
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
              projectId: targetProjectId,
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
  }, [uploadFilesList, user, fixedProjectId, selectedProjectId, onUploadComplete, allowProjectSelection])

  // 자동 업로드 제거 - 사용자가 직접 "업로드 시작" 버튼을 클릭해야 함

  const clearCompleted = () => {
    setUploadFilesList((prev) => prev.filter((f) => f.status !== 'success'))
  }

  const hasSuccessFiles = uploadFilesList.some((f) => f.status === 'success')
  const hasPendingFiles = uploadFilesList.some((f) => f.status === 'pending')

  return (
    <div className="space-y-4">
      {/* 프로젝트 선택 영역 */}
      {allowProjectSelection && !fixedProjectId && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-primary">
            업로드할 프로젝트 선택 <span className="text-red-500">*</span>
          </label>

          {loadingProjects ? (
            <div className="flex items-center space-x-2 p-3 bg-background-secondary border border-border rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
              <span className="text-sm text-text-tertiary">프로젝트 목록 로드 중...</span>
            </div>
          ) : projects.length > 0 ? (
            <div className="relative z-10">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent appearance-none cursor-pointer hover:bg-background-tertiary transition-colors relative z-20"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 12px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px'
                }}
              >
                <option
                  value=""
                  style={{
                    backgroundColor: '#101113',
                    color: '#8a8f98',
                    padding: '8px 12px'
                  }}
                >
                  프로젝트를 선택해주세요
                </option>
                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                    style={{
                      backgroundColor: '#101113',
                      color: '#f7f8f8',
                      padding: '8px 12px',
                      borderBottom: '1px solid #2a2d30'
                    }}
                  >
                    {project.name}
                    {project.description && ` - ${project.description.substring(0, 50)}${project.description.length > 50 ? '...' : ''}`}
                  </option>
                ))}
              </select>
              <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            </div>
          ) : projectsLoaded ? (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <p className="text-sm text-orange-700">
                  업로드 가능한 프로젝트가 없습니다. 먼저 프로젝트를 생성하거나 프로젝트 멤버로 초대받아야 합니다.
                </p>
              </div>
            </div>
          ) : null}

          {selectedProjectId && (
            <div className="text-xs text-text-tertiary">
              선택된 프로젝트: {projects.find(p => p.id === selectedProjectId)?.name}
            </div>
          )}
        </div>
      )}

      {/* 고정 프로젝트 표시 */}
      {fixedProjectId && (
        <div className="p-3 bg-background-secondary border border-border rounded-lg">
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-4 w-4 text-accent" />
            <span className="text-sm text-text-primary">
              지정된 프로젝트에 업로드됩니다
            </span>
          </div>
        </div>
      )}

      {/* 드래그 앤 드롭 영역 */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-accent/50'
          }
          ${isUploading || uploadFilesList.length >= maxFiles || (allowProjectSelection && !fixedProjectId && !selectedProjectId)
            ? 'opacity-50 cursor-not-allowed'
            : ''
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-text-primary">
            {allowProjectSelection && !fixedProjectId && !selectedProjectId
              ? '먼저 프로젝트를 선택해주세요'
              : isDragActive
              ? '파일을 여기에 놓으세요'
              : '파일을 드래그하거나 클릭하여 업로드'
            }
          </p>
          <p className="text-sm text-text-tertiary">
            PDF, Word, 텍스트, 이미지 파일 지원 (최대 {Math.floor(maxSize / (1024 * 1024))}MB)
          </p>
          <p className="text-xs text-text-tertiary">
            최대 {maxFiles}개 파일 ({uploadFilesList.length}/{maxFiles})
          </p>
          {allowProjectSelection && !fixedProjectId && !selectedProjectId && (
            <p className="text-xs text-orange-600 mt-2">
              ⚠️ 프로젝트를 선택한 후 파일을 업로드할 수 있습니다
            </p>
          )}
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
                  className={`linear-button text-sm px-4 py-2 font-medium ${
                    (allowProjectSelection && !fixedProjectId && !selectedProjectId)
                      ? 'linear-button-disabled cursor-not-allowed'
                      : 'linear-button-primary'
                  }`}
                  disabled={isUploading || (allowProjectSelection && !fixedProjectId && !selectedProjectId)}
                  title={
                    (allowProjectSelection && !fixedProjectId && !selectedProjectId)
                      ? '프로젝트를 먼저 선택해주세요'
                      : undefined
                  }
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