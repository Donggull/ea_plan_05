import { DocumentManager } from '@/components/documents/DocumentManager'
import { useAuthStore } from '@/stores/authStore'

export function DocumentsPage() {
  const { user } = useAuthStore()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            로그인이 필요합니다
          </h2>
          <p className="text-text-tertiary">
            문서를 관리하려면 로그인해주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            내 문서
          </h1>
          <p className="text-text-tertiary">
            업로드한 문서들을 관리하고 확인할 수 있습니다. PDF, 이미지, 텍스트 파일을 지원합니다.
          </p>
        </div>

        <DocumentManager
          showUploader={true}
          viewMode="grid"
        />
      </div>
    </div>
  )
}