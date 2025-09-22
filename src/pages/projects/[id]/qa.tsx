// Q&A 시스템 메인 페이지
// 프로젝트별 질문-답변 시스템

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  MessageSquare,
  Bot,
  TrendingUp,
  Users,
} from 'lucide-react'
import { QAConversation } from '../../../types/qa'
import { qaService } from '../../../services/qa/qaService'
import QAConversationList from '../../../components/qa/QAConversationList'
import QAChatInterface from '../../../components/qa/QAChatInterface'
import ProjectLayout from '../../../layouts/ProjectLayout'

export default function QAPage() {
  const router = useRouter()
  const { id: projectId } = router.query

  // States
  const [selectedConversation, setSelectedConversation] = useState<QAConversation | null>(null)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)
  const [newConversationData, setNewConversationData] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    isPublic: true
  })
  const [isCreating, setIsCreating] = useState(false)

  // Available tags
  const availableTags = [
    '버그', '기능요청', '질문', '문서', '성능', '보안',
    'API', 'UI/UX', '데이터베이스', '배포', '테스트', '기타'
  ]

  // Effects
  useEffect(() => {
    if (projectId && typeof projectId === 'string') {
      // 프로젝트별 Q&A 초기화
    }
  }, [projectId])

  // Methods
  const handleConversationSelect = (conversation: QAConversation) => {
    setSelectedConversation(conversation)
  }

  const handleNewConversation = () => {
    setShowNewConversationModal(true)
  }

  const handleCreateConversation = async () => {
    if (!newConversationData.title.trim() || !projectId || typeof projectId !== 'string') return

    setIsCreating(true)
    try {
      const response = await qaService.createConversation(
        projectId,
        newConversationData.title,
        newConversationData.description,
        newConversationData.tags,
        newConversationData.isPublic
      )

      if (response.success && response.data) {
        setSelectedConversation(response.data)
        setShowNewConversationModal(false)
        setNewConversationData({
          title: '',
          description: '',
          tags: [],
          isPublic: true
        })
      }
    } catch (error) {
      console.error('대화 생성 중 오류:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleTagToggle = (tag: string) => {
    setNewConversationData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  if (!projectId || typeof projectId !== 'string') {
    return <div>프로젝트를 찾을 수 없습니다.</div>
  }

  return (
    <ProjectLayout>
      <div className="flex h-full">
        {/* 사이드바 - 대화 목록 */}
        <div className="w-80 flex-shrink-0">
          <QAConversationList
            projectId={projectId}
            selectedConversationId={selectedConversation?.id}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            className="h-full"
          />
        </div>

        {/* 메인 영역 */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <QAChatInterface
              projectId={projectId}
              conversationId={selectedConversation.id}
              onConversationChange={setSelectedConversation}
              className="h-full"
            />
          ) : (
            /* 빈 상태 */
            <div className="flex-1 flex items-center justify-center bg-bg-primary">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-10 h-10 text-primary-500" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Q&A 시스템에 오신 것을 환영합니다
                </h2>
                <p className="text-text-secondary mb-8 leading-relaxed">
                  프로젝트와 관련된 질문을 하고, AI 및 팀원들의 답변을 받아보세요.
                  실시간 채팅 형태로 효율적인 소통이 가능합니다.
                </p>

                {/* 기능 소개 */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center space-x-3 text-left">
                    <div className="w-8 h-8 bg-accent-blue/10 rounded-lg flex items-center justify-center">
                      <Bot className="w-4 h-4 text-accent-blue" />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">AI 자동 답변</div>
                      <div className="text-sm text-text-secondary">질문에 대한 즉시 AI 답변 제공</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-left">
                    <div className="w-8 h-8 bg-accent-green/10 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-accent-green" />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">팀 협업</div>
                      <div className="text-sm text-text-secondary">팀원들과 실시간 소통</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-left">
                    <div className="w-8 h-8 bg-accent-purple/10 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-accent-purple" />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">지식 축적</div>
                      <div className="text-sm text-text-secondary">질문과 답변이 프로젝트 지식으로 축적</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNewConversation}
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                >
                  첫 번째 질문 시작하기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 새 대화 생성 모달 */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary border border-border-primary rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">새 질문 작성</h3>

              <div className="space-y-4">
                {/* 제목 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    질문 제목 *
                  </label>
                  <input
                    type="text"
                    value={newConversationData.title}
                    onChange={(e) => setNewConversationData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="질문의 핵심을 간단히 요약해주세요"
                    className="w-full bg-bg-secondary border border-border-primary rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    maxLength={100}
                  />
                </div>

                {/* 설명 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    상세 설명
                  </label>
                  <textarea
                    value={newConversationData.description}
                    onChange={(e) => setNewConversationData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="질문에 대한 자세한 설명이나 배경 정보를 입력해주세요"
                    className="w-full bg-bg-secondary border border-border-primary rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                {/* 태그 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    태그
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          newConversationData.tags.includes(tag)
                            ? 'bg-primary-500 text-white'
                            : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 공개 설정 */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newConversationData.isPublic}
                    onChange={(e) => setNewConversationData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="w-4 h-4 text-primary-500 bg-bg-secondary border-border-primary rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isPublic" className="text-sm text-text-primary">
                    다른 프로젝트 멤버에게 공개
                  </label>
                </div>
              </div>

              {/* 버튼들 */}
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewConversationModal(false)}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
                  disabled={isCreating}
                >
                  취소
                </button>
                <button
                  onClick={handleCreateConversation}
                  disabled={!newConversationData.title.trim() || isCreating}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isCreating ? '생성 중...' : '질문 작성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProjectLayout>
  )
}