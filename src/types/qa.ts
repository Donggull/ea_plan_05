// 일반 Q&A 시스템 타입 정의

export interface QAConversation {
  id: string
  projectId: string
  title: string
  description?: string
  status: 'active' | 'archived' | 'closed'
  isPublic: boolean
  tags: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>

  // 관계형 데이터
  messages?: QAMessage[]
  participants?: string[]
  lastMessage?: QAMessage
  messageCount?: number
  unreadCount?: number
}

export interface QAMessage {
  id: string
  conversationId: string
  parentMessageId?: string // 스레드 지원용
  type: 'question' | 'answer' | 'comment' | 'system'
  content: string
  contentFormat: 'text' | 'markdown' | 'html'
  attachments: QAAttachment[]

  // AI 관련
  isAIGenerated: boolean
  aiModel?: string
  aiProvider?: string
  aiConfidence?: number
  processingTime?: number
  tokenUsage?: {
    input: number
    output: number
    cost: number
  }

  // 사용자 상호작용
  votes: {
    up: number
    down: number
    userVote?: 'up' | 'down' | null
  }
  isMarkedAsAnswer: boolean
  isHelpful: boolean

  // 메타데이터
  userId: string
  userName?: string
  userRole?: string
  createdAt: Date
  updatedAt: Date
  editedAt?: Date
  isEdited: boolean

  // 관계형 데이터
  replies?: QAMessage[]
  replyCount?: number
}

export interface QAAttachment {
  id: string
  messageId: string
  fileName: string
  fileSize: number
  fileType: string
  fileUrl: string
  thumbnailUrl?: string
  uploadedBy: string
  uploadedAt: Date
}

export interface QASearchFilter {
  query?: string
  projectId?: string
  status?: QAConversation['status'][]
  tags?: string[]
  userId?: string
  dateRange?: {
    start: Date
    end: Date
  }
  hasAnswers?: boolean
  isAIGenerated?: boolean
  sortBy?: 'newest' | 'oldest' | 'most_replies' | 'most_votes' | 'relevance'
  limit?: number
  offset?: number
}

export interface QASearchResult {
  conversations: QAConversation[]
  totalCount: number
  facets: {
    tags: { tag: string; count: number }[]
    users: { userId: string; userName: string; count: number }[]
    timeRanges: { period: string; count: number }[]
  }
}

export interface QAStats {
  totalConversations: number
  totalMessages: number
  totalUsers: number
  avgResponseTime: number // 분 단위
  resolutionRate: number // 해결된 질문 비율
  aiAssistanceRate: number // AI가 도움을 준 질문 비율
  topTags: { tag: string; count: number }[]
  recentActivity: {
    daily: { date: string; questions: number; answers: number }[]
    weekly: { week: string; questions: number; answers: number }[]
  }
}

export interface QANotification {
  id: string
  userId: string
  conversationId: string
  messageId?: string
  type: 'new_question' | 'new_answer' | 'mention' | 'vote' | 'marked_as_answer'
  title: string
  content: string
  isRead: boolean
  createdAt: Date
  actionUrl?: string
}

// AI 관련 타입
export interface QAContextData {
  projectDocuments: string[]
  relatedConversations: string[]
  userHistory: string[]
  relevantCodeSnippets: string[]
}

export interface QAAIRequest {
  conversationId: string
  question: string
  context: QAContextData
  useRAG: boolean
  maxTokens?: number
  temperature?: number
  model?: string
  provider?: string
}

export interface QAAIResponse {
  answer: string
  confidence: number
  sources: string[]
  processingTime: number
  tokenUsage: {
    input: number
    output: number
    cost: number
  }
  model: string
  provider: string
  timestamp: Date
}

// 서비스 응답 타입
export interface QAServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  metadata?: Record<string, any>
}

// 실시간 이벤트 타입
export interface QARealtimeEvent {
  type: 'message_created' | 'message_updated' | 'message_deleted' | 'conversation_updated' | 'user_joined' | 'user_left' | 'typing'
  conversationId: string
  userId?: string
  data: any
  timestamp: Date
}

export interface QATypingStatus {
  conversationId: string
  userId: string
  userName: string
  isTyping: boolean
  timestamp: Date
}