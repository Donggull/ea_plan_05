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
        .from('proposal_workflow_questions')
        .delete()
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)

      const { data, error } = await supabase!
        .from('proposal_workflow_questions')
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
        .from('proposal_workflow_questions')
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
      // questionId(문자열)로 실제 질문의 UUID를 찾기
      const { data: questionData, error: questionError } = await supabase!
        .from('proposal_workflow_questions')
        .select('id')
        .eq('project_id', projectId)
        .eq('question_id', questionId)
        .eq('workflow_step', workflowStep)
        .single()

      if (questionError || !questionData) {
        throw new Error(`Question not found: ${questionId}`)
      }

      const questionUuid = (questionData as any).id

      const responseData = {
        project_id: projectId,
        question_id: questionUuid, // UUID 사용
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
        .from('proposal_workflow_responses')
        .select('id')
        .eq('project_id', projectId)
        .eq('question_id', questionUuid)
        .single()

      let result
      if (existing && 'id' in existing) {
        // 업데이트
        const { data, error } = await supabase!
          .from('proposal_workflow_responses')
          .update({ ...responseData, updated_at: new Date().toISOString() })
          .eq('id', (existing as any).id)
          .select()
          .single()

        if (error) throw error
        result = data as unknown as ProposalWorkflowResponse
      } else {
        // 새로 생성
        const { data, error } = await supabase!
          .from('proposal_workflow_responses')
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
      // JOIN을 통해 질문 정보와 함께 답변 조회
      const { data, error } = await supabase!
        .from('proposal_workflow_responses')
        .select(`
          *,
          proposal_workflow_questions!inner(question_id)
        `)
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)
        .order('responded_at')

      if (error) throw error

      // 응답 데이터를 정리하여 반환
      const responses = (data as any)?.map((item: any) => ({
        ...item,
        question_id: item.proposal_workflow_questions?.question_id || item.question_id
      })) || []

      return responses
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
      const answeredQuestions = responses.filter(r => !r.is_temporary).length

      // 필수 질문 답변 확인 - question_id (문자열) 기준으로 매핑
      const requiredQuestionIds = questions
        .filter(q => q.is_required)
        .map(q => q.question_id) // question_id 사용 (문자열)

      const answeredRequiredQuestions = responses.filter(r => {
        // 응답의 question_id는 이제 문자열로 매핑되어 있음
        return !r.is_temporary && requiredQuestionIds.includes(r.question_id)
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
      // 먼저 모든 문서를 조회
      const { data: allDocuments, error } = await supabase!
        .from('documents')
        .select(`
          id,
          file_name,
          storage_path,
          file_type,
          file_size,
          metadata,
          created_at,
          is_processed,
          document_content(
            id,
            raw_text,
            processed_text,
            extracted_metadata
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('📁 Total project documents:', allDocuments?.length || 0)

      // 문서가 없으면 빈 배열 반환
      if (!allDocuments || allDocuments.length === 0) {
        console.log('❌ No documents found for project:', projectId)
        return []
      }

      // 문서 내용이 있는 문서와 없는 문서 구분
      const documentsWithContent = allDocuments.filter((doc: any) =>
        doc.document_content && doc.document_content.length > 0
      )

      console.log('📄 Documents with content:', documentsWithContent.length)
      console.log('📑 Documents without content:', allDocuments.length - documentsWithContent.length)

      // 분석용으로는 모든 문서를 반환하되, 내용이 없는 문서는 표시만 함
      return allDocuments.map((doc: any) => ({
        ...doc,
        hasContent: doc.document_content && doc.document_content.length > 0,
        contentPreview: doc.document_content?.[0]?.processed_text?.substring(0, 200) ||
                       doc.document_content?.[0]?.raw_text?.substring(0, 200) ||
                       '텍스트 추출 대기 중...'
      }))
    } catch (error) {
      console.error('Failed to get project documents:', error)
      // 오류가 발생해도 빈 배열을 반환하여 페이지가 정상적으로 로드되도록 함
      return []
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
        .from('proposal_workflow_analysis')
        .insert(analysisData)
        .select()
        .single()

      if (error) throw error
      return data as unknown as ProposalWorkflowAnalysis
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
        .from('proposal_workflow_analysis')
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)

      if (analysisType) {
        query = query.eq('analysis_type', analysisType)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return (data as unknown as ProposalWorkflowAnalysis[]) || []
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
        .from('proposal_workflow_responses')
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
        .from('proposal_workflow_responses')
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
}