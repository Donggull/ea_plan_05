// Q&A AI 서비스
// AI 모델을 활용한 자동 답변 생성 서비스

import { supabase } from '../../lib/supabase'
import { AIProviderFactory } from '../ai/providerFactory'
import {
  QAAIRequest,
  QAAIResponse,
  QAContextData,
  QAServiceResponse,
  QAMessage
} from '../../types/qa'

export class QAAIService {
  private static instance: QAAIService

  static getInstance(): QAAIService {
    if (!QAAIService.instance) {
      QAAIService.instance = new QAAIService()
    }
    return QAAIService.instance
  }

  /**
   * AI를 통한 자동 답변 생성
   */
  async generateAnswer(request: QAAIRequest): Promise<QAServiceResponse<QAAIResponse>> {
    try {
      const startTime = Date.now()

      // 컨텍스트 데이터 수집
      const context = await this.collectContextData(request.conversationId, request.context)

      // AI 모델 호출
      const aiResponse = await this.callAIModel(request, context)

      const processingTime = Date.now() - startTime

      const response: QAAIResponse = {
        answer: aiResponse.content,
        confidence: aiResponse.confidence || 0.8,
        sources: context.sources,
        processingTime,
        tokenUsage: {
          input: aiResponse.inputTokens || 0,
          output: aiResponse.outputTokens || 0,
          cost: aiResponse.cost || 0
        },
        model: request.model || 'gpt-4o',
        provider: request.provider || 'openai',
        timestamp: new Date()
      }

      return {
        success: true,
        data: response,
        message: 'AI 답변이 성공적으로 생성되었습니다.'
      }
    } catch (error) {
      console.error('AI 답변 생성 중 오류:', error)
      return {
        success: false,
        error: 'AI 답변 생성 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 질문 자동 분류 및 태그 제안
   */
  async classifyQuestion(question: string): Promise<QAServiceResponse<{
    category: string
    tags: string[]
    priority: 'low' | 'medium' | 'high'
    relatedQuestions: string[]
  }>> {
    try {
      const prompt = `
질문을 분석하여 다음 정보를 JSON 형태로 제공해주세요:

질문: "${question}"

다음 형식으로 응답해주세요:
{
  "category": "기술적|비즈니스|설계|기타 중 하나",
  "tags": ["관련", "태그", "목록"],
  "priority": "low|medium|high 중 하나",
  "relatedQuestions": ["관련된", "질문", "예시들"]
}
`

      const response = await AIProviderFactory.generateCompletion('gpt-4o', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      })

      const result = JSON.parse(response.content)

      return {
        success: true,
        data: result,
        message: '질문 분류가 완료되었습니다.'
      }
    } catch (error) {
      console.error('질문 분류 중 오류:', error)
      return {
        success: false,
        error: '질문 분류 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 질문 품질 평가 및 개선 제안
   */
  async evaluateQuestion(question: string): Promise<QAServiceResponse<{
    score: number
    issues: string[]
    suggestions: string[]
    improvedQuestion?: string
  }>> {
    try {
      const prompt = `
다음 질문을 평가하고 개선 제안을 해주세요:

질문: "${question}"

평가 기준:
1. 명확성 (구체적이고 이해하기 쉬운가?)
2. 완성도 (필요한 정보가 모두 포함되어 있는가?)
3. 맥락 (배경 정보가 충분한가?)
4. 실행 가능성 (답변 가능한 질문인가?)

다음 JSON 형식으로 응답해주세요:
{
  "score": 1-10점 사이의 점수,
  "issues": ["발견된", "문제점들"],
  "suggestions": ["개선", "제안사항들"],
  "improvedQuestion": "개선된 질문 (선택사항)"
}
`

      const response = await AIProviderFactory.generateCompletion('gpt-4o', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3
      })

      const result = JSON.parse(response.content)

      return {
        success: true,
        data: result,
        message: '질문 평가가 완료되었습니다.'
      }
    } catch (error) {
      console.error('질문 평가 중 오류:', error)
      return {
        success: false,
        error: '질문 평가 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 유사한 질문 검색
   */
  async findSimilarQuestions(
    question: string,
    projectId?: string,
    limit: number = 5
  ): Promise<QAServiceResponse<QAMessage[]>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 벡터 검색 (실제 구현에서는 임베딩 사용)
      // 현재는 텍스트 유사도 검색으로 구현
      let query = supabase
        .from('qa_messages')
        .select(`
          *,
          conversation:qa_conversations!inner(project_id, title, is_public)
        `)
        .eq('type', 'question')
        .textSearch('content', question.split(' ').join(' | '))
        .limit(limit)

      if (projectId) {
        query = query.eq('conversation.project_id', projectId)
      }

      const { data, error } = await query

      if (error) {
        console.error('유사 질문 검색 오류:', error)
        return { success: false, error: error.message }
      }

      const messages = data?.map(item => ({
        id: item.id,
        conversationId: item.conversation_id,
        type: item.type,
        content: item.content,
        contentFormat: item.content_format || 'text',
        attachments: [],
        isAIGenerated: item.is_ai_generated || false,
        votes: {
          up: item.votes_up || 0,
          down: item.votes_down || 0,
          userVote: null
        },
        isMarkedAsAnswer: item.is_marked_as_answer || false,
        isHelpful: item.is_helpful || false,
        userId: item.user_id,
        userName: item.user_name,
        userRole: item.user_role,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        isEdited: item.is_edited || false,
        replyCount: 0
      })) as QAMessage[] || []

      return {
        success: true,
        data: messages,
        message: '유사한 질문을 찾았습니다.'
      }
    } catch (error) {
      console.error('유사 질문 검색 중 오류:', error)
      return {
        success: false,
        error: '유사 질문 검색 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 답변 품질 평가
   */
  async evaluateAnswer(
    question: string,
    answer: string
  ): Promise<QAServiceResponse<{
    score: number
    aspects: {
      relevance: number
      completeness: number
      clarity: number
      accuracy: number
    }
    feedback: string
    suggestions: string[]
  }>> {
    try {
      const prompt = `
다음 질문과 답변을 평가해주세요:

질문: "${question}"
답변: "${answer}"

평가 기준:
1. 관련성 (질문에 직접적으로 답변하는가?)
2. 완전성 (충분한 정보를 제공하는가?)
3. 명확성 (이해하기 쉽게 설명했는가?)
4. 정확성 (올바른 정보인가?)

다음 JSON 형식으로 응답해주세요:
{
  "score": 1-10점 사이의 전체 점수,
  "aspects": {
    "relevance": 1-10점,
    "completeness": 1-10점,
    "clarity": 1-10점,
    "accuracy": 1-10점
  },
  "feedback": "전반적인 피드백",
  "suggestions": ["개선", "제안사항들"]
}
`

      const response = await AIProviderFactory.generateCompletion('gpt-4o', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3
      })

      const result = JSON.parse(response.content)

      return {
        success: true,
        data: result,
        message: '답변 평가가 완료되었습니다.'
      }
    } catch (error) {
      console.error('답변 평가 중 오류:', error)
      return {
        success: false,
        error: '답변 평가 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 개인화된 답변 추천
   */
  async getPersonalizedRecommendations(
    userId: string,
    _projectId?: string
  ): Promise<QAServiceResponse<{
    recommendedQuestions: QAMessage[]
    trendingTopics: string[]
    suggestedExperts: string[]
  }>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 사용자의 과거 활동 기반 추천 (간단한 구현)
      const { data: _userActivity } = await supabase
        .from('qa_messages')
        .select('conversation_id, type, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      // 트렌딩 토픽 수집
      const { data: trendingData } = await supabase
        .from('qa_conversations')
        .select('tags')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      const allTags = trendingData?.flatMap(item => item.tags || []) || []
      const tagCounts = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const trendingTopics = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag)

      return {
        success: true,
        data: {
          recommendedQuestions: [], // 복잡한 로직 필요
          trendingTopics,
          suggestedExperts: [] // 전문가 추천 로직 필요
        },
        message: '개인화된 추천이 완료되었습니다.'
      }
    } catch (error) {
      console.error('개인화된 추천 중 오류:', error)
      return {
        success: false,
        error: '개인화된 추천 중 오류가 발생했습니다.'
      }
    }
  }

  // ===== 프라이빗 메서드들 =====

  /**
   * 컨텍스트 데이터 수집
   */
  private async collectContextData(
    conversationId: string,
    context: QAContextData
  ): Promise<{ content: string; sources: string[] }> {
    try {
      const contextParts: string[] = []
      const sources: string[] = []

      // 대화 히스토리
      if (supabase) {
        const { data: messages } = await supabase
          .from('qa_messages')
          .select('content, type, user_name, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(10)

        if (messages && messages.length > 0) {
          contextParts.push('대화 히스토리:')
          messages.forEach(msg => {
            contextParts.push(`${msg.user_name} (${msg.type}): ${msg.content}`)
          })
          sources.push('대화 히스토리')
        }
      }

      // 프로젝트 문서
      if (context.projectDocuments && context.projectDocuments.length > 0) {
        contextParts.push('관련 문서:')
        context.projectDocuments.forEach(doc => {
          contextParts.push(`- ${doc}`)
        })
        sources.push(...context.projectDocuments)
      }

      // 관련 대화
      if (context.relatedConversations && context.relatedConversations.length > 0) {
        contextParts.push('관련 대화:')
        context.relatedConversations.forEach(conv => {
          contextParts.push(`- ${conv}`)
        })
        sources.push(...context.relatedConversations)
      }

      return {
        content: contextParts.join('\n'),
        sources
      }
    } catch (error) {
      console.error('컨텍스트 데이터 수집 중 오류:', error)
      return { content: '', sources: [] }
    }
  }

  /**
   * AI 모델 호출
   */
  private async callAIModel(
    request: QAAIRequest,
    context: { content: string; sources: string[] }
  ): Promise<{
    content: string
    confidence?: number
    inputTokens?: number
    outputTokens?: number
    cost?: number
  }> {
    try {
      const model = request.model || 'gpt-4o'

      const systemPrompt = `
당신은 전문적인 Q&A 시스템의 AI 어시스턴트입니다.
주어진 질문에 대해 정확하고 유용한 답변을 제공해주세요.

답변 가이드라인:
1. 질문의 핵심을 정확히 파악하고 직접적으로 답변하세요
2. 단계별로 명확하게 설명하세요
3. 구체적인 예시나 코드가 필요하면 포함하세요
4. 불확실한 부분이 있으면 명시하세요
5. 추가 정보가 필요한 경우 어떤 정보가 필요한지 알려주세요

${context.content ? `컨텍스트 정보:\n${context.content}\n` : ''}
`

      const response = await AIProviderFactory.generateCompletion(model, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.question }
        ],
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7
      })

      return {
        content: response.content,
        confidence: 0.8, // 기본값
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        cost: response.usage?.total_tokens ? response.usage.total_tokens * 0.00001 : 0
      }
    } catch (error) {
      console.error('AI 모델 호출 중 오류:', error)
      throw error
    }
  }
}

export const qaAIService = QAAIService.getInstance()