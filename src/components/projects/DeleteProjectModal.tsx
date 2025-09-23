import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface DeleteProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  projectName: string
  projectId: string
  isAdmin: boolean
}

export function DeleteProjectModal({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  projectId: _projectId,
  isAdmin
}: DeleteProjectModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const isConfirmValid = confirmText === projectName

  const handleConfirm = async () => {
    if (!isConfirmValid) return

    try {
      setIsDeleting(true)
      await onConfirm()
      setConfirmText('')
      onClose()
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (isDeleting) return
    setConfirmText('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-[500px] w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">프로젝트 삭제</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-400 font-medium">
              <Trash2 className="h-4 w-4" />
              위험한 작업입니다!
            </div>

            <div className="text-red-700 dark:text-red-300 text-sm space-y-2">
              <p>다음 데이터가 <strong>영구적으로 삭제</strong>됩니다:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>프로젝트 정보</li>
                <li>업로드된 모든 문서</li>
                <li>문서 내용 및 분석 결과</li>
                <li>AI 분석 데이터</li>
                <li>프로젝트 멤버 정보</li>
                <li>운영 티켓 및 댓글</li>
                {isAdmin && <li className="font-medium text-red-800 dark:text-red-400">+ 모든 연관 데이터 (관리자 권한)</li>}
              </ul>
              <p className="font-medium">이 작업은 되돌릴 수 없습니다.</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              계속하려면 프로젝트 이름을 정확히 입력하세요:
            </p>
            <p className="font-mono font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded border">
              {projectName}
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="프로젝트 이름 입력..."
              className="font-mono"
              disabled={isDeleting}
            />
          </div>

          {isAdmin && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <p className="text-orange-800 dark:text-orange-400 text-sm font-medium">
                🔑 관리자 권한으로 완전 삭제됩니다
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            className="min-w-[100px]"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                삭제 중...
              </div>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}