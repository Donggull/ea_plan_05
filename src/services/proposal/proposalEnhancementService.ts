import { supabase } from '../../lib/supabase'

export interface EnhancementRequest {
  projectId: string
  proposalVersion: number
  sectionName: string | null
  enhancementRequest: string
  createdBy: string
}

export interface EnhancementRecord {
  id: string
  project_id: string
  proposal_version: number
  section_name: string | null
  enhancement_request: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_by: string
  created_at: string
  completed_at: string | null
}

export interface EnhanceProposalParams {
  projectId: string
  currentProposal: any
  enhancementRequest: string
  targetSection: string | null
  version: number
  userId: string
  aiProvider?: string
  aiModel?: string
}

export class ProposalEnhancementService {
  /**
   * 보강 요청 저장
   */
  static async saveEnhancementRequest(
    request: EnhancementRequest
  ): Promise<EnhancementRecord> {
    const { data, error } = await supabase
      .from('proposal_enhancements')
      .insert({
        project_id: request.projectId,
        proposal_version: request.proposalVersion,
        section_name: request.sectionName,
        enhancement_request: request.enhancementRequest,
        created_by: request.createdBy,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving enhancement request:', error)
      throw new Error(`보강 요청 저장 실패: ${error.message}`)
    }

    return data
  }

  /**
   * AI가 보강 요청을 반영하여 제안서 업데이트
   */
  static async enhanceProposal(
    params: EnhanceProposalParams
  ): Promise<any> {
    try {
      // 1. 보강 요청 상태를 'processing'으로 업데이트
      await supabase
        .from('proposal_enhancements')
        .update({ status: 'processing' })
        .eq('project_id', params.projectId)
        .eq('proposal_version', params.version - 1)

      // 2. 보강 프롬프트 생성
      const enhancementPrompt = this.generateEnhancementPrompt(params)

      // 3. AI API 호출
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: enhancementPrompt,
          provider: params.aiProvider || 'anthropic',
          model: params.aiModel || 'claude-4-sonnet',
          userId: params.userId,
          maxTokens: 4000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'AI API 호출 실패')
      }

      const result = await response.json()

      // 4. 결과 파싱
      let enhancedContent
      try {
        enhancedContent = JSON.parse(result.content)
      } catch (e) {
        // JSON 파싱 실패 시 원본 텍스트 사용
        enhancedContent = { content: result.content }
      }

      // 5. 보강된 제안서를 analysis 테이블에 저장
      const { error: analysisError } = await supabase
        .from('proposal_workflow_analysis')
        .insert({
          project_id: params.projectId,
          workflow_step: 'proposal_draft',
          analysis_type: `enhancement_v${params.version}`,
          status: 'completed',
          result: enhancedContent,
          model_used: params.aiModel || 'claude-4-sonnet',
          tokens_used: result.tokensUsed || 0,
          cost: result.cost || 0,
          created_by: params.userId
        })

      if (analysisError) {
        console.error('Error saving enhanced proposal:', analysisError)
        throw new Error('보강된 제안서 저장 실패')
      }

      // 6. 보강 요청 상태를 'completed'로 업데이트
      await supabase
        .from('proposal_enhancements')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('project_id', params.projectId)
        .eq('proposal_version', params.version - 1)

      return enhancedContent
    } catch (error) {
      // 에러 발생 시 상태를 'failed'로 업데이트
      await supabase
        .from('proposal_enhancements')
        .update({ status: 'failed' })
        .eq('project_id', params.projectId)
        .eq('proposal_version', params.version - 1)

      console.error('Error enhancing proposal:', error)
      throw error
    }
  }

  /**
   * 보강 프롬프트 생성
   */
  private static generateEnhancementPrompt(
    params: EnhanceProposalParams
  ): string {
    const sectionContext = params.targetSection
      ? `\n특히 "${params.targetSection}" 섹션을 중점적으로 보강해주세요.`
      : '\n제안서 전체를 검토하여 보강해주세요.'

    return `당신은 전문 제안서 작성 전문가입니다.
아래의 현재 제안서 내용을 사용자의 보강 요청에 따라 개선해주세요.

## 현재 제안서 (버전 ${params.version - 1})
${JSON.stringify(params.currentProposal, null, 2)}

## 사용자 보강 요청
${params.enhancementRequest}
${sectionContext}

## 보강 지침
1. 기존 내용의 핵심 메시지는 유지하되, 요청된 부분을 구체적으로 보강하세요.
2. 새로운 정보를 추가할 때는 근거와 예시를 포함하세요.
3. 전문적이고 설득력 있는 문체를 유지하세요.
4. 기술 용어 사용 시 간단한 설명을 덧붙이세요.
5. 제안서의 전체 구조와 흐름을 해치지 마세요.

## 출력 형식
기존 JSON 구조를 유지하되, 보강된 내용으로 업데이트해주세요.
반드시 유효한 JSON 형식으로 응답해주세요.

{
  "title": "제안서 제목",
  "summary": "개선된 요약",
  "sections": [
    {
      "id": "section_id",
      "title": "섹션 제목",
      "content": "보강된 내용 (HTML 태그 사용 가능)",
      "order": 1
    }
  ],
  "version": ${params.version},
  "enhancementNotes": "이번 버전에서 개선된 주요 내용"
}`
  }

  /**
   * 보강 이력 조회
   */
  static async getEnhancementHistory(
    projectId: string
  ): Promise<EnhancementRecord[]> {
    const { data, error } = await supabase
      .from('proposal_enhancements')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching enhancement history:', error)
      throw new Error('보강 이력 조회 실패')
    }

    return data || []
  }

  /**
   * 특정 버전의 보강 요청 조회
   */
  static async getEnhancementByVersion(
    projectId: string,
    version: number
  ): Promise<EnhancementRecord | null> {
    const { data, error } = await supabase
      .from('proposal_enhancements')
      .select('*')
      .eq('project_id', projectId)
      .eq('proposal_version', version)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 데이터 없음
        return null
      }
      console.error('Error fetching enhancement by version:', error)
      throw new Error('보강 요청 조회 실패')
    }

    return data
  }

  /**
   * 최신 제안서 버전 조회
   */
  static async getLatestVersion(projectId: string): Promise<number> {
    const { data, error } = await supabase
      .from('proposal_workflow_analysis')
      .select('analysis_type')
      .eq('project_id', projectId)
      .eq('workflow_step', 'proposal_draft')
      .like('analysis_type', 'enhancement_v%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error getting latest version:', error)
      return 1
    }

    if (!data) {
      return 1
    }

    // 'enhancement_v2' -> 2 추출
    const match = data.analysis_type.match(/enhancement_v(\d+)/)
    return match ? parseInt(match[1], 10) : 1
  }
}
