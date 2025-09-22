// Q&A 대화 목록 컴포넌트
// 모든 Q&A 대화를 표시하고 관리하는 컴포넌트

import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Search,
  Filter,
  Plus,
  Clock,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Bot,
} from 'lucide-react'
import { QAConversation, QASearchFilter, QAStats } from '../../types/qa'
import { qaService } from '../../services/qa/qaService'

interface QAConversationListProps {
  projectId?: string
  selectedConversationId?: string
  onConversationSelect: (conversation: QAConversation) => void
  onNewConversation: () => void
  className?: string
}

export const QAConversationList: React.FC<QAConversationListProps> = ({
  projectId,
  selectedConversationId,
  onConversationSelect,
  onNewConversation,
  className = ''
}) => {
  // States
  const [conversations, setConversations] = useState<QAConversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<QAConversation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_replies' | 'most_votes'>('newest')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<QAStats | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Available tags (실제로는 백엔드에서 가져와야 함)
  const availableTags = ['버그', '기능요청', '질문', '문서', '성능', '보안', 'API', 'UI/UX']

  // Effects
  useEffect(() => {
    loadConversations()
    loadStats()
  }, [projectId])

  useEffect(() => {
    filterConversations()
  }, [conversations, searchQuery, selectedStatus, selectedTags, sortBy])

  // Methods
  const loadConversations = async () => {
    setIsLoading(true)
    try {
      const filters: Partial<QASearchFilter> = {
        projectId,
        sortBy,
        limit: 50
      }

      const response = await qaService.getConversations(projectId, filters)
      if (response.success && response.data) {
        setConversations(response.data)
      }
    } catch (error) {
      console.error('대화 목록 로드 중 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await qaService.getStats(projectId)
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('통계 로드 중 오류:', error)
    }
  }

  const filterConversations = () => {
    let filtered = [...conversations]

    // 텍스트 검색
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(conv =>
        conv.title.toLowerCase().includes(query) ||
        conv.description?.toLowerCase().includes(query) ||
        conv.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // 상태 필터
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(conv => conv.status === selectedStatus)
    }

    // 태그 필터
    if (selectedTags.length > 0) {
      filtered = filtered.filter(conv =>
        selectedTags.some(tag => conv.tags.includes(tag))
      )
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime()
        case 'most_replies':
          return (b.messageCount || 0) - (a.messageCount || 0)
        case 'most_votes':
          // 투표 수 정렬 (구현 필요)
          return b.updatedAt.getTime() - a.updatedAt.getTime()
        default:
          return b.updatedAt.getTime() - a.updatedAt.getTime()
      }
    })

    setFilteredConversations(filtered)
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  const getStatusIcon = (status: QAConversation['status']) => {
    switch (status) {
      case 'active':
        return <MessageSquare className="w-4 h-4 text-accent-green" />
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-text-muted" />
      case 'archived':
        return <Clock className="w-4 h-4 text-text-muted" />
      default:
        return <AlertCircle className="w-4 h-4 text-accent-orange" />
    }
  }

  const getStatusLabel = (status: QAConversation['status']) => {
    switch (status) {
      case 'active': return '활성'
      case 'closed': return '완료'
      case 'archived': return '보관'
      default: return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">대화 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-bg-primary border-r border-border-primary ${className}`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-border-primary">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Q&A</h2>
          <button
            onClick={onNewConversation}
            className="flex items-center space-x-2 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>새 질문</span>
          </button>
        </div>

        {/* 통계 */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-text-primary">{stats.totalConversations}</div>
              <div className="text-xs text-text-secondary">총 대화</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-text-primary">{stats.totalMessages}</div>
              <div className="text-xs text-text-secondary">총 메시지</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-text-primary">{Math.round(stats.resolutionRate)}%</div>
              <div className="text-xs text-text-secondary">해결률</div>
            </div>
          </div>
        )}

        {/* 검색 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="질문 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-border-primary rounded-lg pl-10 pr-4 py-2 text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* 필터 토글 */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 w-full px-3 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border-primary rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4 text-text-secondary" />
          <span className="text-text-primary">필터</span>
          <ChevronDown className={`w-4 h-4 text-text-secondary ml-auto transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* 필터 옵션 */}
        {showFilters && (
          <div className="mt-3 space-y-3 p-3 bg-bg-secondary rounded-lg border border-border-primary">
            {/* 상태 필터 */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">상태</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-bg-primary border border-border-primary rounded px-3 py-2 text-text-primary"
              >
                <option value="all">전체</option>
                <option value="active">활성</option>
                <option value="closed">완료</option>
                <option value="archived">보관</option>
              </select>
            </div>

            {/* 정렬 */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">정렬</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-bg-primary border border-border-primary rounded px-3 py-2 text-text-primary"
              >
                <option value="newest">최근 순</option>
                <option value="oldest">오래된 순</option>
                <option value="most_replies">답변 많은 순</option>
                <option value="most_votes">투표 많은 순</option>
              </select>
            </div>

            {/* 태그 필터 */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">태그</label>
              <div className="flex flex-wrap gap-1">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-2 py-1 rounded-full text-xs transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary-500 text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 대화 목록 */}
      <div className="overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">대화가 없습니다</h3>
            <p className="text-text-secondary mb-4">
              {searchQuery || selectedTags.length > 0 || selectedStatus !== 'all'
                ? '검색 조건에 맞는 대화가 없습니다.'
                : '첫 번째 질문을 작성해보세요.'}
            </p>
            <button
              onClick={onNewConversation}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              새 질문 작성
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-primary">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation)}
                className={`p-4 hover:bg-bg-secondary cursor-pointer transition-colors ${
                  selectedConversationId === conversation.id ? 'bg-primary-500/10 border-r-2 border-primary-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(conversation.status)}
                    <h4 className="font-medium text-text-primary line-clamp-1">
                      {conversation.title}
                    </h4>
                  </div>
                  <span className="text-xs text-text-muted">
                    {formatTimeAgo(conversation.updatedAt)}
                  </span>
                </div>

                {conversation.description && (
                  <p className="text-sm text-text-secondary mb-2 line-clamp-2">
                    {conversation.description}
                  </p>
                )}

                {/* 마지막 메시지 */}
                {conversation.lastMessage && (
                  <div className="flex items-center space-x-2 mb-2">
                    {conversation.lastMessage.isAIGenerated && (
                      <Bot className="w-3 h-3 text-primary-500" />
                    )}
                    <span className="text-xs text-text-muted">
                      {conversation.lastMessage.userName}:
                    </span>
                    <span className="text-xs text-text-secondary line-clamp-1">
                      {conversation.lastMessage.content}
                    </span>
                  </div>
                )}

                {/* 태그와 통계 */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {conversation.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-bg-tertiary text-text-muted text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {conversation.tags.length > 2 && (
                      <span className="text-xs text-text-muted">
                        +{conversation.tags.length - 2}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-text-muted">
                    {(conversation.messageCount || 0) > 0 && (
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{conversation.messageCount}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <span className={`w-2 h-2 rounded-full ${
                        conversation.status === 'active' ? 'bg-accent-green' :
                        conversation.status === 'closed' ? 'bg-text-muted' :
                        'bg-accent-orange'
                      }`} />
                      <span>{getStatusLabel(conversation.status)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default QAConversationList