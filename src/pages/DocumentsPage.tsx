import { useState } from 'react'
import { Upload } from 'lucide-react'
import { DocumentManager } from '@/components/documents/DocumentManager'
import { DocumentUploader } from '@/components/documents/DocumentUploader'
import { useAuthStore } from '@/stores/authStore'
import { PageContainer, PageHeader, PageContent } from '@/components/LinearComponents'
import { toast } from 'sonner'

export function DocumentsPage() {
  const { user } = useAuthStore()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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

  const handleUploadComplete = (files: any[]) => {
    setShowUploadModal(false)
    setRefreshTrigger(prev => prev + 1) // DocumentManager 새로고침 트리거
    toast.success(`${files.length}개 파일이 업로드되었습니다.`)
  }

  return (
    <PageContainer>
      <PageHeader
        title="내 문서"
        description="업로드한 문서들을 관리하고 확인할 수 있습니다. PDF, 이미지, 텍스트 파일을 지원합니다."
        actions={
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>파일 업로드</span>
          </button>
        }
      />
      <PageContent>
        <DocumentManager
          showUploader={false}
          viewMode="grid"
          key={refreshTrigger}
        />
      </PageContent>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary rounded-lg p-6 max-w-4xl w-full max-h-[85vh] overflow-auto shadow-2xl border border-border-primary">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                파일 업로드
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-text-tertiary hover:text-text-primary text-xl"
              >
                ×
              </button>
            </div>
            <DocumentUploader
              allowProjectSelection={true}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </div>
      )}
    </PageContainer>
  )
}