// Q&A 시스템 서비스
// 일반적인 질문-답변 시스템을 위한 서비스 레이어

import { supabase } from '../../lib/supabase'
import {
  QAConversation,
  QAMessage,
  QAAttachment,
  QASearchFilter,
  QASearchResult,
  QAStats,
  QAServiceResponse,
  QARealtimeEvent
} from '../../types/qa'

export class QAService {
  private static instance: QAService
  private typingUsers: Map<string, Set<string>> = new Map() // conversationId -> Set<userId>

  static getInstance(): QAService {
    if (!QAService.instance) {
      QAService.instance = new QAService()
    }
    return QAService.instance
  }

  constructor() {
    this.setupRealtimeSubscriptions()
  }

  // ===== 대화 관리 =====

  /**
   * 새로운 Q&A 대화 시작
   */
  async createConversation(
    projectId: string,
    title: string,
    description?: string,
    tags: string[] = [],
    isPublic: boolean = true
  ): Promise<QAServiceResponse<QAConversation>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const currentUser = await supabase.auth.getUser()
      const userId = currentUser.data.user?.id

      if (!userId) {
        throw new Error('사용자가 인증되지 않았습니다.')
      }

      const { data, error } = await supabase
        .from('qa_conversations')
        .insert({
          project_id: projectId,
          title,
          description,
          tags,
          is_public: isPublic,
          created_by: userId
        })
        .select()
        .single()

      if (error) {
        console.error('Q&A 대화 생성 오류:', error)
        return { success: false, error: error.message }
      }

      const conversation = this.transformConversationData(data)

      // 실시간 이벤트 발송
      this.emitRealtimeEvent({
        type: 'conversation_updated',
        conversationId: conversation.id,
        data: conversation,
        timestamp: new Date()
      })

      return {
        success: true,
        data: conversation,
        message: 'Q&A 대화가 성공적으로 생성되었습니다.'
      }
    } catch (error) {
      console.error('Q&A 대화 생성 중 오류:', error)
      return {
        success: false,
        error: 'Q&A 대화 생성 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 대화 목록 조회
   */
  async getConversations(
    projectId?: string,
    filters?: Partial<QASearchFilter>
  ): Promise<QAServiceResponse<QAConversation[]>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      let query = supabase
        .from('qa_conversations')
        .select(`
          *,
          last_message:qa_messages!qa_conversations_last_message_at_fkey(
            id, content, user_name, created_at, type
          )
        `)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      if (filters?.status) {
        query = query.in('status', filters.status)
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }

      if (filters?.userId) {
        query = query.eq('created_by', filters.userId)
      }

      // 정렬
      const sortBy = filters?.sortBy || 'newest'
      switch (sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'most_replies':
          query = query.order('message_count', { ascending: false })
          break
        default:
          query = query.order('updated_at', { ascending: false })
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Q&A 대화 조회 오류:', error)
        return { success: false, error: error.message }
      }

      const conversations = data.map(this.transformConversationData)

      return {
        success: true,
        data: conversations
      }
    } catch (error) {
      console.error('Q&A 대화 조회 중 오류:', error)
      return {
        success: false,
        error: 'Q&A 대화 조회 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 대화 상세 조회
   */
  async getConversation(conversationId: string): Promise<QAServiceResponse<QAConversation>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('qa_conversations')
        .select(`
          *,
          messages:qa_messages(
            *,
            votes:qa_message_votes(vote_type, user_id),
            attachments:qa_attachments(*),
            replies:qa_messages!parent_message_id(
              *,
              votes:qa_message_votes(vote_type, user_id)
            )
          )
        `)
        .eq('id', conversationId)
        .single()

      if (error || !data) {
        return { success: false, error: '대화를 찾을 수 없습니다.' }
      }

      const conversation = this.transformConversationData(data)

      return {
        success: true,
        data: conversation
      }
    } catch (error) {
      console.error('Q&A 대화 상세 조회 중 오류:', error)
      return {
        success: false,
        error: 'Q&A 대화 조회 중 오류가 발생했습니다.'
      }
    }
  }

  // ===== 메시지 관리 =====

  /**
   * 새 메시지 작성
   */
  async createMessage(
    conversationId: string,
    content: string,
    type: QAMessage['type'] = 'question',
    parentMessageId?: string
  ): Promise<QAServiceResponse<QAMessage>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
      }

      const { data, error } = await supabase
        .from('qa_messages')
        .insert({
          conversation_id: conversationId,
          parent_message_id: parentMessageId,
          type,
          content,
          user_id: user.id,
          user_name: user.user_metadata?.['name'] || user.email,
          user_role: user.user_metadata?.['role'] || 'user'
        })
        .select()
        .single()

      if (error) {
        console.error('Q&A 메시지 생성 오류:', error)
        return { success: false, error: error.message }
      }

      const message = this.transformMessageData(data)

      // 실시간 이벤트 발송
      this.emitRealtimeEvent({
        type: 'message_created',
        conversationId,
        userId: user.id,
        data: message,
        timestamp: new Date()
      })

      // 타이핑 상태 제거
      this.setTypingStatus(conversationId, user.id, false)

      return {
        success: true,
        data: message,
        message: '메시지가 성공적으로 작성되었습니다.'
      }
    } catch (error) {
      console.error('Q&A 메시지 생성 중 오류:', error)
      return {
        success: false,
        error: 'Q&A 메시지 생성 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 메시지 수정
   */
  async updateMessage(
    messageId: string,
    content: string
  ): Promise<QAServiceResponse<QAMessage>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('qa_messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single()

      if (error) {
        console.error('Q&A 메시지 수정 오류:', error)
        return { success: false, error: error.message }
      }

      const message = this.transformMessageData(data)

      // 실시간 이벤트 발송
      this.emitRealtimeEvent({
        type: 'message_updated',
        conversationId: message.conversationId,
        data: message,
        timestamp: new Date()
      })

      return {
        success: true,
        data: message,
        message: '메시지가 성공적으로 수정되었습니다.'
      }
    } catch (error) {
      console.error('Q&A 메시지 수정 중 오류:', error)
      return {
        success: false,
        error: 'Q&A 메시지 수정 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 메시지 투표
   */
  async voteMessage(
    messageId: string,
    voteType: 'up' | 'down'
  ): Promise<QAServiceResponse<boolean>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
      }

      // 기존 투표 확인
      const { data: existingVote } = await supabase
        .from('qa_message_votes')
        .select()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .single()

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // 같은 투표 취소
          await supabase
            .from('qa_message_votes')
            .delete()
            .eq('id', existingVote.id)
        } else {
          // 투표 변경
          await supabase
            .from('qa_message_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id)
        }
      } else {
        // 새 투표
        await supabase
          .from('qa_message_votes')
          .insert({
            message_id: messageId,
            user_id: user.id,
            vote_type: voteType
          })
      }

      return {
        success: true,
        data: true,
        message: '투표가 성공적으로 처리되었습니다.'
      }
    } catch (error) {
      console.error('Q&A 메시지 투표 중 오류:', error)
      return {
        success: false,
        error: 'Q&A 메시지 투표 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 답변으로 표시
   */
  async markAsAnswer(messageId: string): Promise<QAServiceResponse<boolean>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 먼저 해당 대화의 다른 답변 표시 제거
      const { data: message } = await supabase
        .from('qa_messages')
        .select('conversation_id')
        .eq('id', messageId)
        .single()

      if (message && message.conversation_id) {
        // 기존 답변 표시 제거
        await supabase
          .from('qa_messages')
          .update({ is_marked_as_answer: false })
          .eq('conversation_id', message.conversation_id)

        // 새 답변 표시
        await supabase
          .from('qa_messages')
          .update({ is_marked_as_answer: true })
          .eq('id', messageId)
      }

      return {
        success: true,
        data: true,
        message: '답변으로 표시되었습니다.'
      }
    } catch (error) {
      console.error('답변 표시 중 오류:', error)
      return {
        success: false,
        error: '답변 표시 중 오류가 발생했습니다.'
      }
    }
  }

  // ===== 검색 =====

  /**
   * Q&A 검색
   */
  async searchConversations(
    filters: QASearchFilter
  ): Promise<QAServiceResponse<QASearchResult>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 기본 쿼리 구성
      let query = supabase
        .from('qa_conversations')
        .select('*, messages:qa_messages(*)', { count: 'exact' })

      // 프로젝트 필터
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      // 텍스트 검색
      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%, description.ilike.%${filters.query}%`)
      }

      // 상태 필터
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      // 태그 필터
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }

      // 날짜 범위 필터
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString())
      }

      // 정렬
      const sortBy = filters.sortBy || 'relevance'
      switch (sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'most_replies':
          query = query.order('message_count', { ascending: false })
          break
        case 'most_votes':
          // 투표 수로 정렬 (구현 복잡하므로 일단 업데이트 시간으로)
          query = query.order('updated_at', { ascending: false })
          break
        default:
          query = query.order('updated_at', { ascending: false })
      }

      // 페이지네이션
      const limit = filters.limit || 20
      const offset = filters.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Q&A 검색 오류:', error)
        return { success: false, error: error.message }
      }

      const conversations = data?.map(this.transformConversationData) || []

      // 패싯 정보 수집 (간단한 구현)
      const facets = {
        tags: [],
        users: [],
        timeRanges: []
      }

      return {
        success: true,
        data: {
          conversations,
          totalCount: count || 0,
          facets
        }
      }
    } catch (error) {
      console.error('Q&A 검색 중 오류:', error)
      return {
        success: false,
        error: 'Q&A 검색 중 오류가 발생했습니다.'
      }
    }
  }

  // ===== 통계 =====

  /**
   * Q&A 통계 조회
   */
  async getStats(projectId?: string): Promise<QAServiceResponse<QAStats>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 기본 통계 쿼리들
      const queries = []

      // 대화 수
      let conversationQuery = supabase
        .from('qa_conversations')
        .select('*', { count: 'exact', head: true })
      if (projectId) {
        conversationQuery = conversationQuery.eq('project_id', projectId)
      }
      queries.push(conversationQuery)

      // 메시지 수 (간단한 쿼리로 변경)
      const messageQuery = supabase
        .from('qa_messages')
        .select('*', { count: 'exact', head: true })
      queries.push(messageQuery)

      const [conversationResult, messageResult] = await Promise.all(queries)

      const stats: QAStats = {
        totalConversations: conversationResult.count || 0,
        totalMessages: messageResult.count || 0,
        totalUsers: 0, // 별도 쿼리 필요
        avgResponseTime: 0, // 계산 필요
        resolutionRate: 0, // 계산 필요
        aiAssistanceRate: 0, // 계산 필요
        topTags: [], // 별도 쿼리 필요
        recentActivity: {
          daily: [],
          weekly: []
        }
      }

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('Q&A 통계 조회 중 오류:', error)
      return {
        success: false,
        error: 'Q&A 통계 조회 중 오류가 발생했습니다.'
      }
    }
  }

  // ===== 실시간 기능 =====

  /**
   * 타이핑 상태 설정
   */
  setTypingStatus(conversationId: string, userId: string, isTyping: boolean): void {
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set())
    }

    const typingSet = this.typingUsers.get(conversationId)!

    if (isTyping) {
      typingSet.add(userId)
    } else {
      typingSet.delete(userId)
    }

    // 실시간 이벤트 발송
    this.emitRealtimeEvent({
      type: 'typing',
      conversationId,
      userId,
      data: { isTyping },
      timestamp: new Date()
    })
  }

  /**
   * 실시간 구독 설정
   */
  private setupRealtimeSubscriptions(): void {
    if (!supabase) return

    // Q&A 메시지 실시간 구독
    supabase
      .channel('qa_messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'qa_messages'
      }, (payload) => {
        this.handleRealtimeMessage(payload)
      })
      .subscribe()

    // Q&A 대화 실시간 구독
    supabase
      .channel('qa_conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'qa_conversations'
      }, (payload) => {
        this.handleRealtimeConversation(payload)
      })
      .subscribe()
  }

  private handleRealtimeMessage(payload: any): void {
    // 실시간 메시지 이벤트 처리
    console.log('실시간 Q&A 메시지 이벤트:', payload)
  }

  private handleRealtimeConversation(payload: any): void {
    // 실시간 대화 이벤트 처리
    console.log('실시간 Q&A 대화 이벤트:', payload)
  }

  private emitRealtimeEvent(event: QARealtimeEvent): void {
    // 실시간 이벤트 발송 (추후 WebSocket 또는 Supabase Realtime 활용)
    console.log('Q&A 실시간 이벤트:', event)
  }

  // ===== 데이터 변환 메서드들 =====

  private transformConversationData(data: any): QAConversation {
    return {
      id: data.id,
      projectId: data.project_id,
      title: data.title,
      description: data.description,
      status: data.status,
      isPublic: data.is_public,
      tags: data.tags || [],
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      metadata: data.metadata || {},
      messages: data.messages?.map(this.transformMessageData) || [],
      messageCount: data.message_count || 0,
      lastMessage: data.last_message ? this.transformMessageData(data.last_message) : undefined
    }
  }

  private transformMessageData(data: any): QAMessage {
    return {
      id: data.id,
      conversationId: data.conversation_id,
      parentMessageId: data.parent_message_id,
      type: data.type,
      content: data.content,
      contentFormat: data.content_format || 'text',
      attachments: data.attachments?.map(this.transformAttachmentData) || [],
      isAIGenerated: data.is_ai_generated || false,
      aiModel: data.ai_model,
      aiProvider: data.ai_provider,
      aiConfidence: data.ai_confidence,
      processingTime: data.processing_time,
      tokenUsage: data.input_tokens && data.output_tokens ? {
        input: data.input_tokens,
        output: data.output_tokens,
        cost: data.ai_cost || 0
      } : undefined,
      votes: {
        up: data.votes_up || 0,
        down: data.votes_down || 0,
        userVote: null // 별도 쿼리 필요
      },
      isMarkedAsAnswer: data.is_marked_as_answer || false,
      isHelpful: data.is_helpful || false,
      userId: data.user_id,
      userName: data.user_name,
      userRole: data.user_role,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      editedAt: data.edited_at ? new Date(data.edited_at) : undefined,
      isEdited: data.is_edited || false,
      replies: data.replies?.map(this.transformMessageData) || [],
      replyCount: data.replies?.length || 0
    }
  }

  private transformAttachmentData(data: any): QAAttachment {
    return {
      id: data.id,
      messageId: data.message_id,
      fileName: data.file_name,
      fileSize: data.file_size,
      fileType: data.file_type,
      fileUrl: data.file_url,
      thumbnailUrl: data.thumbnail_url,
      uploadedBy: data.uploaded_by,
      uploadedAt: new Date(data.uploaded_at)
    }
  }
}

export const qaService = QAService.getInstance()