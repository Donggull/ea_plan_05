import { supabase } from '../../lib/supabase'
import { Question, QuestionResponse, WorkflowStep } from './aiQuestionGenerator'

export interface ProposalWorkflowQuestion {
  id: string
  project_id: string
  workflow_step: WorkflowStep
  question_id: string
  category: string
  question_text: string
  question_type: 'text' | 'select' | 'multiselect' | 'number' | 'file' | 'textarea'
  options: string[]
  is_required: boolean
  display_order: number
  help_text?: string
  validation_rules: any
  is_dynamic: boolean
  created_at: string
  metadata: any
}

export interface ProposalWorkflowResponse {
  id: string
  project_id: string
  question_id: string
  workflow_step: WorkflowStep
  answer_text?: string
  answer_data: any
  confidence_score?: number
  notes?: string
  is_temporary: boolean
  responded_by?: string
  responded_at: string
  updated_at: string
  metadata: any
}

export interface ProposalWorkflowAnalysis {
  id: string
  project_id: string
  workflow_step: WorkflowStep
  analysis_type: 'step_completion' | 'document_analysis' | 'integrated_analysis'
  input_documents: string[]
  input_responses: string[]
  ai_provider: string
  ai_model: string
  prompt_template?: string
  analysis_prompt: string
  analysis_result: string
  structured_output: any
  recommendations: any[]
  next_questions: any[]
  confidence_score?: number
  processing_time?: number
  input_tokens: number
  output_tokens: number
  cost: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  created_by?: string
  created_at: string
  completed_at?: string
  metadata: any
}

export class ProposalDataManager {
  /**
   * 프로젝트에 질문들 저장
   */
  static async saveQuestions(
    projectId: string,
    workflowStep: WorkflowStep,
    questions: Question[]
  ): Promise<ProposalWorkflowQuestion[]> {
    try {
      const questionsData = questions.map(question => ({
        project_id: projectId,
        workflow_step: workflowStep,
        question_id: question.id,
        category: question.category,
        question_text: question.text,
        question_type: question.type,
        options: question.options || [],
        is_required: question.required,
        display_order: question.order,
        help_text: question.helpText,
        validation_rules: question.validation || {},
        is_dynamic: question.id.includes('dynamic'),
        metadata: {}
      }))

      // 기존 질문 삭제 후 새로 저장 (단계별로)
      await supabase!!
        .from('proposal_workflow_questions' as any)
        .delete()
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)

      const { data, error } = await supabase!
        .from('proposal_workflow_questions' as any)
        .insert(questionsData)
        .select()

      if (error) throw error
      return (data as unknown as ProposalWorkflowQuestion[]) || []
    } catch (error) {
      console.error('Failed to save questions:', error)
      throw error
    }
  }

  /**
   * 프로젝트의 특정 단계 질문들 조회
   */
  static async getQuestions(
    projectId: string,
    workflowStep: WorkflowStep
  ): Promise<ProposalWorkflowQuestion[]> {
    try {
      const { data, error } = await supabase!
        .from('proposal_workflow_questions' as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)
        .order('display_order')

      if (error) throw error
      return (data as unknown as ProposalWorkflowQuestion[]) || []
    } catch (error) {
      console.error('Failed to get questions:', error)
      throw error
    }
  }

  /**
   * 답변 저장 (임시 저장 포함)
   */
  static async saveResponse(
    projectId: string,
    questionId: string,
    workflowStep: WorkflowStep,
    response: Partial<QuestionResponse>,
    isTemporary: boolean = false,
    userId?: string
  ): Promise<ProposalWorkflowResponse> {
    try {
      const responseData = {
        project_id: projectId,
        question_id: questionId,
        workflow_step: workflowStep,
        answer_text: typeof response.answer === 'string' ? response.answer : null,
        answer_data: {
          answer: response.answer,
          confidence: response.confidence,
          notes: response.notes
        },
        confidence_score: response.confidence,
        notes: response.notes,
        is_temporary: isTemporary,
        responded_by: userId,
        metadata: {}
      }

      // 기존 답변이 있는지 확인
      const { data: existing } = await supabase!
        .from('proposal_workflow_responses' as any)
        .select('id')
        .eq('project_id', projectId)
        .eq('question_id', questionId)
        .single()

      let result
      if (existing && 'id' in existing) {
        // 업데이트
        const { data, error } = await supabase!
          .from('proposal_workflow_responses' as any)
          .update({ ...responseData, updated_at: new Date().toISOString() })
          .eq('id', (existing as any).id)
          .select()
          .single()

        if (error) throw error
        result = data as unknown as ProposalWorkflowResponse
      } else {
        // 새로 생성
        const { data, error } = await supabase!
          .from('proposal_workflow_responses' as any)
          .insert(responseData)
          .select()
          .single()

        if (error) throw error
        result = data as unknown as ProposalWorkflowResponse
      }

      return result
    } catch (error) {
      console.error('Failed to save response:', error)
      throw error
    }
  }

  /**
   * 특정 단계의 모든 답변 조회
   */
  static async getResponses(
    projectId: string,
    workflowStep: WorkflowStep
  ): Promise<ProposalWorkflowResponse[]> {
    try {
      const { data, error } = await supabase!
        .from('proposal_workflow_responses' as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)
        .order('responded_at')

      if (error) throw error
      return (data as any) || []
    } catch (error) {
      console.error('Failed to get responses:', error)
      throw error
    }
  }

  /**
   * 단계별 완료 상태 확인
   */
  static async getStepCompletionStatus(
    projectId: string,
    workflowStep: WorkflowStep
  ): Promise<{
    totalQuestions: number
    answeredQuestions: number
    requiredQuestions: number
    answeredRequiredQuestions: number
    isCompleted: boolean
    completionRate: number
  }> {
    try {
      // 질문 조회
      const questions = await this.getQuestions(projectId, workflowStep)
      const totalQuestions = questions.length
      const requiredQuestions = questions.filter(q => q.is_required).length

      // 질문이 없으면 완료되지 않은 상태로 처리
      if (totalQuestions === 0) {
        return {
          totalQuestions: 0,
          answeredQuestions: 0,
          requiredQuestions: 0,
          answeredRequiredQuestions: 0,
          isCompleted: false,
          completionRate: 0
        }
      }

      // 답변 조회
      const responses = await this.getResponses(projectId, workflowStep)

      // 🔥 수정: 임시 저장 답변도 유효한 답변으로 카운트
      // 사용자가 답변을 입력하면 자동 저장되므로, is_temporary 여부와 관계없이 답변이 있으면 완료로 처리
      // 답변 데이터가 유효한지만 확인 (빈 문자열, 빈 배열 제외)
      const answeredQuestions = responses.filter(r => {
        const answer = r.answer_data?.answer
        if (answer === undefined || answer === null || answer === '') return false
        if (Array.isArray(answer) && answer.length === 0) return false
        return true
      }).length

      // 🔥 수정: 필수 질문 답변 확인 시 UUID(id)를 사용하고, 임시 저장 답변도 포함
      const requiredQuestionIds = questions
        .filter(q => q.is_required)
        .map(q => q.id) // UUID 사용

      const answeredRequiredQuestions = responses.filter(r => {
        // 필수 질문에 대한 답변이고
        if (!requiredQuestionIds.includes(r.question_id)) return false

        // 유효한 답변이 있으면 카운트
        const answer = r.answer_data?.answer
        if (answer === undefined || answer === null || answer === '') return false
        if (Array.isArray(answer) && answer.length === 0) return false
        return true
      }).length

      const isCompleted = requiredQuestions > 0 ? answeredRequiredQuestions === requiredQuestions : answeredQuestions === totalQuestions
      const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

      return {
        totalQuestions,
        answeredQuestions,
        requiredQuestions,
        answeredRequiredQuestions,
        isCompleted,
        completionRate
      }
    } catch (error) {
      console.error('Failed to get completion status:', error)
      // 에러 발생 시에도 기본값 반환
      return {
        totalQuestions: 0,
        answeredQuestions: 0,
        requiredQuestions: 0,
        answeredRequiredQuestions: 0,
        isCompleted: false,
        completionRate: 0
      }
    }
  }

  /**
   * 프로젝트 문서 조회 (분석용)
   */
  static async getProjectDocuments(projectId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase!
        .from('documents')
        .select(`
          id,
          file_name,
          storage_path,
          file_type,
          metadata,
          document_content (
            raw_text,
            processed_text,
            language
          )
        `)
        .eq('project_id', projectId)
        .eq('is_processed', true)

      if (error) throw error
      return (data as any) || []
    } catch (error) {
      console.error('Failed to get project documents:', error)
      throw error
    }
  }

  /**
   * 분석 결과 저장
   */
  static async saveAnalysis(
    analysisData: Omit<ProposalWorkflowAnalysis, 'id' | 'created_at' | 'completed_at'>
  ): Promise<ProposalWorkflowAnalysis> {
    try {
      const { data, error } = await supabase!
        .from('proposal_workflow_analysis' as any)
        .insert(analysisData)
        .select()
        .single()

      if (error) throw error
      return data as any
    } catch (error) {
      console.error('Failed to save analysis:', error)
      throw error
    }
  }

  /**
   * 분석 결과 조회
   */
  static async getAnalysis(
    projectId: string,
    workflowStep: WorkflowStep,
    analysisType?: string
  ): Promise<ProposalWorkflowAnalysis[]> {
    try {
      let query = supabase!
        .from('proposal_workflow_analysis' as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)

      if (analysisType) {
        query = query.eq('analysis_type', analysisType)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return (data as any) || []
    } catch (error) {
      console.error('Failed to get analysis:', error)
      throw error
    }
  }

  /**
   * 프로젝트 워크플로우 전체 진행 상황 조회
   */
  static async getProjectWorkflowProgress(projectId: string): Promise<{
    steps: Record<WorkflowStep, {
      status: 'not_started' | 'in_progress' | 'completed'
      completionRate: number
      questionsAnswered: number
      totalQuestions: number
      hasAnalysis: boolean
      lastUpdated?: string
    }>
    overallProgress: number
    currentStep?: WorkflowStep
  }> {
    try {
      const steps: WorkflowStep[] = ['market_research', 'personas', 'proposal', 'budget']
      const stepResults: any = {}

      for (const step of steps) {
        const completion = await this.getStepCompletionStatus(projectId, step)
        const analysis = await this.getAnalysis(projectId, step)

        let status: 'not_started' | 'in_progress' | 'completed'
        if (completion.completionRate === 0) {
          status = 'not_started'
        } else if (completion.isCompleted) {
          status = 'completed'
        } else {
          status = 'in_progress'
        }

        stepResults[step] = {
          status,
          completionRate: completion.completionRate,
          questionsAnswered: completion.answeredQuestions,
          totalQuestions: completion.totalQuestions,
          hasAnalysis: analysis.length > 0,
          lastUpdated: analysis[0]?.completed_at
        }
      }

      // 전체 진행률 계산
      const totalSteps = steps.length
      const completedSteps = Object.values(stepResults).filter((s: any) => s.status === 'completed').length
      const overallProgress = (completedSteps / totalSteps) * 100

      // 현재 단계 계산
      const currentStep = steps.find(step => stepResults[step].status === 'in_progress') ||
                         steps.find(step => stepResults[step].status === 'not_started')

      return {
        steps: stepResults,
        overallProgress,
        currentStep
      }
    } catch (error) {
      console.error('Failed to get project workflow progress:', error)
      throw error
    }
  }

  /**
   * 임시 저장된 답변들을 정식으로 저장
   */
  static async commitTemporaryResponses(
    projectId: string,
    workflowStep: WorkflowStep,
    _userId?: string
  ): Promise<void> {
    try {
      await supabase!
        .from('proposal_workflow_responses' as any)
        .update({
          is_temporary: false,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)
        .eq('is_temporary', true)
    } catch (error) {
      console.error('Failed to commit temporary responses:', error)
      throw error
    }
  }

  /**
   * 임시 저장된 답변들 삭제
   */
  static async clearTemporaryResponses(
    projectId: string,
    workflowStep: WorkflowStep
  ): Promise<void> {
    try {
      await supabase!
        .from('proposal_workflow_responses' as any)
        .delete()
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)
        .eq('is_temporary', true)
    } catch (error) {
      console.error('Failed to clear temporary responses:', error)
      throw error
    }
  }

  /**
   * 프로젝트 정보 조회
   */
  static async getProjectInfo(projectId: string): Promise<any> {
    try {
      const { data: project, error } = await supabase!
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        throw error
      }

      return project
    } catch (error) {
      console.error('Failed to get project info:', error)
      throw error
    }
  }

  /**
   * 사전 분석 보고서 조회 (시장 조사 등에서 활용)
   */
  static async getPreAnalysisReport(projectId: string): Promise<any | null> {
    try {
      // 최신 완료된 사전 분석 세션 조회
      const { data: session, error: sessionError } = await supabase!
        .from('pre_analysis_sessions')
        .select('id, status')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (sessionError || !session) {
        console.log('No completed pre-analysis session found for project:', projectId)
        return null
      }

      // 보고서 조회
      const { data: report, error: reportError } = await supabase!
        .from('analysis_reports')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (reportError || !report) {
        console.log('No analysis report found for session:', session.id)
        return null
      }

      return report
    } catch (error) {
      console.error('Failed to get pre-analysis report:', error)
      return null
    }
  }

  /**
   * 사전 분석 문서 분석 결과 조회
   */
  static async getPreAnalysisDocuments(projectId: string): Promise<any[]> {
    try {
      // 최신 완료된 사전 분석 세션 조회
      const { data: session, error: sessionError } = await supabase!
        .from('pre_analysis_sessions')
        .select('id, status')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (sessionError || !session) {
        console.log('No completed pre-analysis session found for project:', projectId)
        return []
      }

      // 문서 분석 결과 조회
      const { data: analyses, error: analysesError } = await supabase!
        .from('document_analyses')
        .select('*')
        .eq('session_id', session.id)
        .eq('status', 'completed')

      if (analysesError) {
        console.error('Failed to get document analyses:', analysesError)
        return []
      }

      return analyses || []
    } catch (error) {
      console.error('Failed to get pre-analysis documents:', error)
      return []
    }
  }

  /**
   * 사전 분석 데이터 종합 조회 (보고서 + 문서 분석)
   */
  static async getPreAnalysisData(projectId: string): Promise<{
    hasPreAnalysis: boolean
    report: any | null
    documentAnalyses: any[]
    summary: string
  }> {
    try {
      const [report, documentAnalyses] = await Promise.all([
        this.getPreAnalysisReport(projectId),
        this.getPreAnalysisDocuments(projectId)
      ])

      const hasPreAnalysis = report !== null || documentAnalyses.length > 0

      // 요약 생성
      let summary = ''
      if (report) {
        summary += `사전 분석 보고서: ${report.summary || '요약 없음'}\n\n`
        if (report.key_insights) {
          summary += `주요 인사이트:\n${JSON.stringify(report.key_insights, null, 2)}\n\n`
        }
      }

      if (documentAnalyses.length > 0) {
        summary += `문서 분석 ${documentAnalyses.length}건 완료\n`
      }

      return {
        hasPreAnalysis,
        report,
        documentAnalyses,
        summary: summary || '사전 분석 데이터가 없습니다.'
      }
    } catch (error) {
      console.error('Failed to get pre-analysis data:', error)
      return {
        hasPreAnalysis: false,
        report: null,
        documentAnalyses: [],
        summary: '사전 분석 데이터 조회 중 오류가 발생했습니다.'
      }
    }
  }
}