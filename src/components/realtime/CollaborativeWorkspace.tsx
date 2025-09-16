import { useState, useRef } from 'react'
import {
  FileText,
  MessageSquare,
  Video,
  Share2,
  Settings,
  PlusCircle,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { useRealtime } from '../../hooks/useRealtime'
import { PresenceIndicator } from './PresenceIndicator'
import { CollaborativeEditor } from './CollaborativeEditor'
import { CursorOverlay, WithCursorTracking } from './CursorOverlay'

interface CollaborativeWorkspaceProps {
  projectId: string
  className?: string
}

type TabType = 'documents' | 'chat' | 'whiteboard' | 'video'

interface Document {
  id: string
  title: string
  content: string
  type: 'text' | 'markdown' | 'code'
  lastModified: string
}

export function CollaborativeWorkspace({ projectId, className = '' }: CollaborativeWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabType>('documents')
  const [isMinimized, setIsMinimized] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: 'doc-1',
      title: '프로젝트 계획서',
      content: '# 프로젝트 계획서\n\n이 문서는 실시간으로 편집할 수 있습니다.\n\n## 목표\n- 실시간 협업 구현\n- 사용자 경험 개선\n\n## 일정\n- 1주차: 기본 기능 구현\n- 2주차: 실시간 동기화\n- 3주차: 테스트 및 최적화',
      type: 'markdown',
      lastModified: new Date().toISOString()
    }
  ])
  const [activeDocumentId, setActiveDocumentId] = useState<string>(documents[0]?.id || '')

  // 실시간 협업 훅
  const {
    presenceList,
    isConnected,
    cursors,
    updateCursor,
    updatePresence
  } = useRealtime({
    projectId,
    documentId: activeDocumentId,
    enableCursorTracking: true,
    enableTextSync: true
  })

  const activeDocument = documents.find(doc => doc.id === activeDocumentId)

  // 문서 저장
  const handleSaveDocument = async (content: string) => {
    if (!activeDocument) return

    // 실제 구현에서는 서버에 저장
    const updatedDocuments = documents.map(doc =>
      doc.id === activeDocument.id
        ? { ...doc, content, lastModified: new Date().toISOString() }
        : doc
    )
    setDocuments(updatedDocuments)

    // 상태 업데이트
    updatePresence('online', activeDocument.id)
  }

  // 새 문서 생성
  const handleCreateDocument = () => {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: '새 문서',
      content: '',
      type: 'text',
      lastModified: new Date().toISOString()
    }

    setDocuments(prev => [...prev, newDoc])
    setActiveDocumentId(newDoc.id)
  }

  // 커서 이동 처리
  const handleCursorMove = (x: number, y: number, elementId?: string) => {
    updateCursor(x, y, elementId)
  }

  const tabs = [
    { id: 'documents', label: '문서', icon: FileText },
    { id: 'chat', label: '채팅', icon: MessageSquare },
    { id: 'whiteboard', label: '화이트보드', icon: Share2 },
    { id: 'video', label: '화상회의', icon: Video }
  ] as const

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <div className="bg-bg-elevated border border-border-primary rounded-lg shadow-lg">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
              <span className="text-sm font-medium text-text-primary">
                협업 중 ({presenceList.length + 1}명)
              </span>
            </div>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-bg-secondary rounded-lg border border-border-primary ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-border-secondary">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-text-primary">실시간 협업</h3>

          {/* 접속자 표시 */}
          <PresenceIndicator
            presenceList={presenceList}
            isConnected={isConnected}
            maxVisible={3}
            showDetails={true}
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button className="p-1 text-text-muted hover:text-text-primary transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-border-secondary">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-primary-500 border-primary-500 bg-primary-500/5'
                  : 'text-text-muted border-transparent hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === 'chat' && (
                <span className="w-2 h-2 bg-accent-red rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* 콘텐츠 영역 */}
      <div className="h-96">
        <WithCursorTracking onCursorMove={handleCursorMove} className="h-full">
          <div ref={containerRef} className="relative h-full">
            {/* 문서 탭 */}
            {activeTab === 'documents' && (
              <div className="h-full flex">
                {/* 문서 목록 */}
                <div className="w-64 border-r border-border-secondary bg-bg-primary">
                  <div className="p-3 border-b border-border-secondary">
                    <button
                      onClick={handleCreateDocument}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>새 문서</span>
                    </button>
                  </div>

                  <div className="p-2">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setActiveDocumentId(doc.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          activeDocumentId === doc.id
                            ? 'bg-primary-500/10 text-primary-500'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      >
                        <div className="font-medium text-sm truncate">{doc.title}</div>
                        <div className="text-xs text-text-muted mt-1">
                          {new Date(doc.lastModified).toLocaleDateString('ko-KR')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 문서 편집기 */}
                <div className="flex-1">
                  {activeDocument ? (
                    <CollaborativeEditor
                      projectId={projectId}
                      documentId={activeDocument.id}
                      initialContent={activeDocument.content}
                      onSave={handleSaveDocument}
                      placeholder={`${activeDocument.title}을(를) 편집하세요...`}
                      className="h-full border-none"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-muted">
                      문서를 선택하세요
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 채팅 탭 */}
            {activeTab === 'chat' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="text-center text-text-muted">
                    실시간 채팅 기능은 곧 추가될 예정입니다.
                  </div>
                </div>
                <div className="p-4 border-t border-border-secondary">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="메시지를 입력하세요..."
                      className="flex-1 px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled
                    />
                    <button
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                      disabled
                    >
                      전송
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 화이트보드 탭 */}
            {activeTab === 'whiteboard' && (
              <div className="h-full flex items-center justify-center text-text-muted">
                실시간 화이트보드 기능은 곧 추가될 예정입니다.
              </div>
            )}

            {/* 화상회의 탭 */}
            {activeTab === 'video' && (
              <div className="h-full flex items-center justify-center text-text-muted">
                화상회의 기능은 곧 추가될 예정입니다.
              </div>
            )}

            {/* 커서 오버레이 */}
            <CursorOverlay
              cursors={cursors}
              containerRef={containerRef}
            />
          </div>
        </WithCursorTracking>
      </div>
    </div>
  )
}