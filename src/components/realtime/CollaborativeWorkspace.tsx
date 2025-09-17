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
    },
    {
      id: 'doc-2',
      title: '요구사항 정의서',
      content: '# 요구사항 정의서\n\n## 기능 요구사항\n1. 사용자 인증 및 권한 관리\n2. 프로젝트 생성 및 관리\n3. 실시간 문서 편집\n4. 파일 업로드 및 공유\n\n## 비기능 요구사항\n- 성능: 응답시간 3초 이내\n- 보안: SSL/TLS 암호화\n- 확장성: 동시 접속자 1000명',
      type: 'markdown',
      lastModified: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'doc-3',
      title: 'API 설계 문서',
      content: '# API 설계 문서\n\n## 인증 API\n- POST /auth/login\n- POST /auth/logout\n- GET /auth/profile\n\n## 프로젝트 API\n- GET /api/projects\n- POST /api/projects\n- PUT /api/projects/:id\n- DELETE /api/projects/:id\n\n## 실시간 API\n- WebSocket /realtime/connect',
      type: 'markdown',
      lastModified: new Date(Date.now() - 7200000).toISOString()
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
      <div className="h-[32rem]">
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
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {/* 샘플 채팅 메시지들 */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">김</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-text-primary">김철수</span>
                        <span className="text-xs text-text-muted">10:30</span>
                      </div>
                      <div className="bg-bg-tertiary p-3 rounded-lg max-w-md">
                        <p className="text-sm text-text-primary">프로젝트 계획서 검토 완료했습니다. 일정 부분 수정 제안드려요.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">이</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-text-primary">이영희</span>
                        <span className="text-xs text-text-muted">10:35</span>
                      </div>
                      <div className="bg-bg-tertiary p-3 rounded-lg max-w-md">
                        <p className="text-sm text-text-primary">네, 확인했습니다. 2주차 일정이 좀 타이트한 것 같아요.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">박</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-text-primary">박민수</span>
                        <span className="text-xs text-text-muted">11:15</span>
                      </div>
                      <div className="bg-bg-tertiary p-3 rounded-lg max-w-md">
                        <p className="text-sm text-text-primary">API 설계 문서 업데이트했습니다. 실시간 기능 부분 추가했어요.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">최</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-text-primary">최지훈</span>
                        <span className="text-xs text-text-muted">방금 전</span>
                      </div>
                      <div className="bg-primary-500 p-3 rounded-lg max-w-md">
                        <p className="text-sm text-white">좋습니다! 오늘 회의에서 최종 검토하죠.</p>
                      </div>
                    </div>
                  </div>

                  {/* 타이핑 인디케이터 */}
                  <div className="flex items-center space-x-2 text-text-muted">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm">김철수님이 입력 중...</span>
                  </div>
                </div>
                <div className="p-4 border-t border-border-secondary">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="메시지를 입력하세요..."
                      className="flex-1 px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
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