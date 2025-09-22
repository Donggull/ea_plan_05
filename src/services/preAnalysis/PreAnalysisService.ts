import { supabase } from '../../lib/supabase';
import {
  PreAnalysisSession,
  DocumentAnalysis,
  AIQuestion,
  UserAnswer,
  AnalysisReport,
  ServiceResponse,
  ProgressUpdate,
  AnalysisSettings,
  QuestionGenerationOptions,
  ReportGenerationOptions,
  DocumentCategory,
} from '../../types/preAnalysis';

export class PreAnalysisService {
  private static instance: PreAnalysisService;

  public static getInstance(): PreAnalysisService {
    if (!PreAnalysisService.instance) {
      PreAnalysisService.instance = new PreAnalysisService();
    }
    return PreAnalysisService.instance;
  }

  /**
   * 새로운 사전 분석 세션 시작
   */
  async startSession(
    projectId: string,
    settings: AnalysisSettings,
    userId: string
  ): Promise<ServiceResponse<PreAnalysisSession>> {
    try {
      const sessionData = {
        project_id: projectId,
        ai_model: settings.aiModel,
        ai_provider: settings.aiProvider,
        mcp_config: settings.mcpServers,
        analysis_depth: settings.analysisDepth,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        total_cost: 0,
        created_by: userId,
        metadata: {
          customInstructions: settings.customInstructions,
          outputFormat: settings.outputFormat,
        },
      };

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase
        .from('pre_analysis_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('사전 분석 세션 생성 오류:', error);
        return { success: false, error: error.message };
      }

      // 진행 상황 업데이트 발송
      this.emitProgressUpdate({
        sessionId: data.id,
        stage: 'session_created',
        status: 'completed',
        progress: 10,
        message: '사전 분석 세션이 생성되었습니다.',
        timestamp: new Date(),
      });

      return {
        success: true,
        data: this.transformSessionData(data),
        message: '사전 분석 세션이 성공적으로 시작되었습니다.',
      };
    } catch (error) {
      console.error('사전 분석 세션 시작 오류:', error);
      return {
        success: false,
        error: '사전 분석 세션 시작 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 문서 분석 수행
   */
  async analyzeDocument(
    sessionId: string,
    documentId: string,
    category?: DocumentCategory
  ): Promise<ServiceResponse<DocumentAnalysis>> {
    try {
      // 진행 상황 업데이트
      this.emitProgressUpdate({
        sessionId,
        stage: 'document_analysis',
        status: 'in_progress',
        progress: 30,
        message: '문서 분석을 시작합니다.',
        timestamp: new Date(),
      });

      // 문서 정보 조회
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        return { success: false, error: '문서를 찾을 수 없습니다.' };
      }

      // 문서 내용 조회
      const { data: content, error: contentError } = await supabase
        .from('document_content')
        .select('*')
        .eq('document_id', documentId)
        .single();

      if (contentError || !content) {
        return { success: false, error: '문서 내용을 찾을 수 없습니다.' };
      }

      // AI 분석 수행 (실제 AI 호출은 별도 서비스에서)
      const textContent = content.processed_text || content.raw_text;
      if (!textContent) {
        return { success: false, error: '문서 내용이 비어있습니다.' };
      }

      const analysisResult = await this.performAIAnalysis(
        textContent,
        category,
        sessionId
      );

      // 분석 결과 저장
      const analysisData = {
        session_id: sessionId,
        document_id: documentId,
        category: category || this.detectDocumentCategory(document.file_name),
        analysis_result: analysisResult.analysis,
        mcp_enrichment: analysisResult.mcpEnrichment,
        confidence_score: analysisResult.confidenceScore,
        processing_time: analysisResult.processingTime,
        ai_model: analysisResult.aiModel,
        ai_provider: analysisResult.aiProvider,
        input_tokens: analysisResult.inputTokens,
        output_tokens: analysisResult.outputTokens,
        cost: analysisResult.cost,
        status: 'completed',
      };

      const { data: savedAnalysis, error: saveError } = await supabase
        .from('document_analyses')
        .insert(analysisData)
        .select()
        .single();

      if (saveError) {
        console.error('문서 분석 저장 오류:', saveError);
        return { success: false, error: saveError.message };
      }

      // 진행 상황 업데이트
      this.emitProgressUpdate({
        sessionId,
        stage: 'document_analysis',
        status: 'completed',
        progress: 50,
        message: '문서 분석이 완료되었습니다.',
        timestamp: new Date(),
      });

      return {
        success: true,
        data: this.transformAnalysisData(savedAnalysis),
        message: '문서 분석이 성공적으로 완료되었습니다.',
      };
    } catch (error) {
      console.error('문서 분석 오류:', error);
      return {
        success: false,
        error: '문서 분석 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * AI 질문 생성
   */
  async generateQuestions(
    sessionId: string,
    options: QuestionGenerationOptions
  ): Promise<ServiceResponse<AIQuestion[]>> {
    try {
      // 진행 상황 업데이트
      this.emitProgressUpdate({
        sessionId,
        stage: 'question_generation',
        status: 'in_progress',
        progress: 60,
        message: 'AI 질문을 생성하고 있습니다.',
        timestamp: new Date(),
      });

      // 세션 정보 조회
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data: session, error: sessionError } = await supabase
        .from('pre_analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return { success: false, error: '세션을 찾을 수 없습니다.' };
      }

      // 기존 문서 분석 결과 조회
      const { data: analyses, error: analysesError } = await supabase
        .from('document_analyses')
        .select('*')
        .eq('session_id', sessionId);

      if (analysesError) {
        return { success: false, error: '문서 분석 결과를 조회할 수 없습니다.' };
      }

      // AI를 통한 질문 생성
      const generatedQuestions = await this.generateAIQuestions(
        analyses || [],
        options,
        session
      );

      // 질문들을 데이터베이스에 저장
      const questionsData = generatedQuestions.map((question, index) => ({
        session_id: sessionId,
        category: question.category,
        question: question.question,
        context: question.context,
        required: question.required,
        expected_format: question.expectedFormat,
        related_documents: question.relatedDocuments,
        order_index: index + 1,
        generated_by_ai: true,
        ai_model: session.ai_model,
        confidence_score: question.confidenceScore,
      }));

      const { data: savedQuestions, error: saveError } = await supabase
        .from('ai_questions')
        .insert(questionsData)
        .select();

      if (saveError) {
        console.error('질문 저장 오류:', saveError);
        return { success: false, error: saveError.message };
      }

      // 진행 상황 업데이트
      this.emitProgressUpdate({
        sessionId,
        stage: 'question_generation',
        status: 'completed',
        progress: 70,
        message: `${savedQuestions.length}개의 질문이 생성되었습니다.`,
        timestamp: new Date(),
      });

      return {
        success: true,
        data: savedQuestions.map(this.transformQuestionData),
        message: '질문 생성이 성공적으로 완료되었습니다.',
      };
    } catch (error) {
      console.error('질문 생성 오류:', error);
      return {
        success: false,
        error: '질문 생성 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 답변 수집 및 저장
   */
  async collectAnswers(
    sessionId: string,
    answers: Omit<UserAnswer, 'id' | 'sessionId' | 'answeredAt' | 'updatedAt'>[]
  ): Promise<ServiceResponse<UserAnswer[]>> {
    try {
      const answersData = answers.map((answer) => ({
        question_id: answer.questionId,
        session_id: sessionId,
        answer: answer.answer,
        answer_data: answer.answerData,
        confidence: answer.confidence,
        attachments: answer.attachments,
        notes: answer.notes,
        is_draft: answer.isDraft,
        answered_by: answer.answeredBy,
      }));

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data: savedAnswers, error } = await supabase
        .from('user_answers')
        .upsert(answersData, {
          onConflict: 'question_id,answered_by',
        })
        .select();

      if (error) {
        console.error('답변 저장 오류:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: savedAnswers.map(this.transformAnswerData),
        message: '답변이 성공적으로 저장되었습니다.',
      };
    } catch (error) {
      console.error('답변 수집 오류:', error);
      return {
        success: false,
        error: '답변 수집 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 최종 분석 보고서 생성
   */
  async generateReport(
    sessionId: string,
    options: ReportGenerationOptions
  ): Promise<ServiceResponse<AnalysisReport>> {
    try {
      // 진행 상황 업데이트
      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'in_progress',
        progress: 80,
        message: '종합 분석 보고서를 생성하고 있습니다.',
        timestamp: new Date(),
      });

      // 세션 데이터 수집
      const sessionData = await this.collectSessionData(sessionId);
      if (!sessionData.success) {
        return { success: false, error: sessionData.error };
      }

      // AI를 통한 보고서 생성
      const reportContent = await this.generateAIReport(
        sessionData.data!,
        options
      );

      // 보고서 저장
      const reportData = {
        session_id: sessionId,
        report_type: 'comprehensive',
        report_content: {
          summary: reportContent.summary,
          executive_summary: reportContent.executiveSummary,
          key_insights: reportContent.keyInsights,
          risk_assessment: reportContent.riskAssessment,
          recommendations: reportContent.recommendations,
          baseline_data: reportContent.baselineData,
          visualization_data: reportContent.visualizationData,
        },
        ai_model: sessionData.data!.session.ai_model,
        ai_provider: sessionData.data!.session.ai_provider,
        total_processing_time: reportContent.totalProcessingTime,
        total_cost: reportContent.totalCost,
        input_tokens: reportContent.inputTokens,
        output_tokens: reportContent.outputTokens,
        generated_by: sessionData.data!.session.created_by,
      };

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data: savedReport, error: saveError } = await supabase
        .from('analysis_reports')
        .insert(reportData)
        .select()
        .single();

      if (saveError) {
        console.error('보고서 저장 오류:', saveError);
        return { success: false, error: saveError.message };
      }

      // 세션 완료 처리
      await this.completeSession(sessionId, reportContent.totalCost);

      // 진행 상황 업데이트
      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'completed',
        progress: 100,
        message: '종합 분석 보고서가 완성되었습니다.',
        timestamp: new Date(),
      });

      return {
        success: true,
        data: this.transformReportData(savedReport),
        message: '분석 보고서가 성공적으로 생성되었습니다.',
      };
    } catch (error) {
      console.error('보고서 생성 오류:', error);
      return {
        success: false,
        error: '보고서 생성 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 세션 정보 조회
   */
  async getSession(sessionId: string): Promise<ServiceResponse<PreAnalysisSession>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase
        .from('pre_analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return { success: false, error: '세션을 찾을 수 없습니다.' };
      }

      return {
        success: true,
        data: this.transformSessionData(data),
      };
    } catch (error) {
      console.error('세션 조회 오류:', error);
      return {
        success: false,
        error: '세션 조회 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 프로젝트의 세션 목록 조회
   */
  async getProjectSessions(projectId: string): Promise<ServiceResponse<PreAnalysisSession[]>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase
        .from('pre_analysis_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data.map(this.transformSessionData),
      };
    } catch (error) {
      console.error('프로젝트 세션 조회 오류:', error);
      return {
        success: false,
        error: '프로젝트 세션 조회 중 오류가 발생했습니다.',
      };
    }
  }

  // 프라이빗 메서드들

  private async performAIAnalysis(
    _content: string,
    category: DocumentCategory | undefined,
    _sessionId: string
  ): Promise<any> {
    // AI 분석 로직 구현 (추후 AI 서비스와 연동)
    // 임시 구현
    return {
      analysis: {
        summary: `${category || '문서'} 분석 요약`,
        keyRequirements: ['요구사항 1', '요구사항 2'],
        stakeholders: ['이해관계자 1', '이해관계자 2'],
        constraints: ['제약사항 1', '제약사항 2'],
        risks: [],
        opportunities: ['기회 1', '기회 2'],
        technicalStack: ['기술 1', '기술 2'],
        timeline: [],
      },
      mcpEnrichment: {
        similarProjects: [],
        marketInsights: {},
        competitorAnalysis: [],
        technologyTrends: [],
      },
      confidenceScore: 0.85,
      processingTime: 30,
      aiModel: 'gpt-4o',
      aiProvider: 'openai',
      inputTokens: 1000,
      outputTokens: 500,
      cost: 0.03,
    };
  }

  private detectDocumentCategory(fileName: string): DocumentCategory {
    const name = fileName.toLowerCase();

    if (name.includes('requirement') || name.includes('요구사항')) {
      return DocumentCategory.REQUIREMENTS;
    }
    if (name.includes('tech') || name.includes('기술')) {
      return DocumentCategory.TECHNICAL;
    }
    if (name.includes('business') || name.includes('사업')) {
      return DocumentCategory.BUSINESS;
    }
    if (name.includes('design') || name.includes('디자인')) {
      return DocumentCategory.DESIGN;
    }
    if (name.includes('contract') || name.includes('계약')) {
      return DocumentCategory.CONTRACT;
    }
    if (name.includes('presentation') || name.includes('발표')) {
      return DocumentCategory.PRESENTATION;
    }

    return DocumentCategory.REFERENCE;
  }

  private async generateAIQuestions(
    _analyses: any[],
    _options: QuestionGenerationOptions,
    _session: any
  ): Promise<any[]> {
    // AI 질문 생성 로직 구현 (추후 AI 서비스와 연동)
    // 임시 구현
    const sampleQuestions = [
      {
        category: 'business' as const,
        question: '프로젝트의 핵심 비즈니스 목표는 무엇입니까?',
        context: '사업적 관점에서의 주요 목표',
        required: true,
        expectedFormat: '구체적인 목표 설명',
        relatedDocuments: [],
        confidenceScore: 0.9,
      },
      {
        category: 'technical' as const,
        question: '기존 시스템과의 통합 요구사항이 있습니까?',
        context: 'API 연동, 데이터 마이그레이션 등',
        required: false,
        expectedFormat: '통합 범위 및 방법',
        relatedDocuments: [],
        confidenceScore: 0.8,
      },
      {
        category: 'timeline' as const,
        question: '프로젝트의 주요 마일스톤과 일정은?',
        context: '주요 단계별 완료 목표일',
        required: true,
        expectedFormat: '마일스톤명: 목표일자 형식',
        relatedDocuments: [],
        confidenceScore: 0.85,
      },
    ];

    return sampleQuestions.filter(q =>
      _options.categories.includes(q.category)
    ).slice(0, _options.maxQuestions);
  }

  private async collectSessionData(sessionId: string): Promise<ServiceResponse<any>> {
    try {
      if (!supabase) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      const [sessionRes, analysesRes, questionsRes, answersRes] = await Promise.all([
        supabase.from('pre_analysis_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('document_analyses').select('*').eq('session_id', sessionId),
        supabase.from('ai_questions').select('*').eq('session_id', sessionId),
        supabase.from('user_answers').select('*').eq('session_id', sessionId),
      ]);

      if (sessionRes.error) {
        return { success: false, error: sessionRes.error.message };
      }

      return {
        success: true,
        data: {
          session: sessionRes.data,
          analyses: analysesRes.data || [],
          questions: questionsRes.data || [],
          answers: answersRes.data || [],
        },
      };
    } catch (error) {
      return { success: false, error: '세션 데이터 수집 중 오류가 발생했습니다.' };
    }
  }

  private async generateAIReport(_sessionData: any, _options: ReportGenerationOptions): Promise<any> {
    // AI 보고서 생성 로직 구현 (추후 AI 서비스와 연동)
    // 임시 구현
    return {
      summary: '프로젝트 종합 분석 요약',
      executiveSummary: '경영진용 요약',
      keyInsights: ['주요 인사이트 1', '주요 인사이트 2'],
      riskAssessment: {
        high: [],
        medium: [],
        low: [],
        overallScore: 30,
      },
      recommendations: ['권장사항 1', '권장사항 2'],
      baselineData: {
        requirements: [],
        stakeholders: [],
        constraints: [],
        timeline: [],
        budgetEstimates: {},
        technicalStack: [],
        integrationPoints: [],
      },
      visualizationData: {},
      totalProcessingTime: 120,
      totalCost: 0.15,
      inputTokens: 5000,
      outputTokens: 2000,
    };
  }

  private async completeSession(sessionId: string, totalCost: number): Promise<void> {
    if (!supabase) return;

    await supabase
      .from('pre_analysis_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_cost: totalCost,
      })
      .eq('id', sessionId);
  }

  private emitProgressUpdate(update: ProgressUpdate): void {
    // Supabase Realtime을 통한 진행 상황 업데이트
    // 추후 구현
    console.log('Progress Update:', update);
  }

  // 데이터 변환 메서드들
  private transformSessionData(data: any): PreAnalysisSession {
    return {
      id: data.id,
      projectId: data.project_id,
      aiModel: data.ai_model,
      aiProvider: data.ai_provider,
      mcpConfig: data.mcp_config,
      analysisDepth: data.analysis_depth,
      status: data.status,
      startedAt: new Date(data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      processingTime: data.processing_time,
      totalCost: data.total_cost,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      metadata: data.metadata,
    };
  }

  private transformAnalysisData(data: any): DocumentAnalysis {
    return {
      id: data.id,
      projectId: data.project_id,
      sessionId: data.session_id,
      documentId: data.document_id,
      category: data.category,
      analysis: data.analysis_result,
      mcpEnrichment: data.mcp_enrichment,
      confidenceScore: data.confidence_score,
      processingTime: data.processing_time,
      aiModel: data.ai_model,
      aiProvider: data.ai_provider,
      status: data.status,
      createdAt: new Date(data.created_at),
    };
  }

  private transformQuestionData(data: any): AIQuestion {
    return {
      id: data.id,
      sessionId: data.session_id,
      category: data.category,
      question: data.question,
      context: data.context,
      required: data.required,
      expectedFormat: data.expected_format,
      relatedDocuments: data.related_documents,
      orderIndex: data.order_index,
      generatedByAI: data.generated_by_ai,
      aiModel: data.ai_model,
      confidenceScore: data.confidence_score,
      createdAt: new Date(data.created_at),
    };
  }

  private transformAnswerData(data: any): UserAnswer {
    return {
      id: data.id,
      questionId: data.question_id,
      sessionId: data.session_id,
      answer: data.answer,
      answerData: data.answer_data,
      confidence: data.confidence,
      attachments: data.attachments,
      notes: data.notes,
      isDraft: data.is_draft,
      answeredBy: data.answered_by,
      answeredAt: new Date(data.answered_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private transformReportData(data: any): AnalysisReport {
    return {
      id: data.id,
      sessionId: data.session_id,
      projectId: data.project_id,
      summary: data.summary,
      executiveSummary: data.executive_summary,
      keyInsights: data.key_insights,
      riskAssessment: data.risk_assessment,
      recommendations: data.recommendations,
      baselineData: data.baseline_data,
      visualizationData: data.visualization_data,
      aiModel: data.ai_model,
      aiProvider: data.ai_provider,
      totalProcessingTime: data.total_processing_time,
      totalCost: data.total_cost,
      inputTokens: data.input_tokens,
      outputTokens: data.output_tokens,
      generatedBy: data.generated_by,
      createdAt: new Date(data.created_at),
    };
  }
}

export const preAnalysisService = PreAnalysisService.getInstance();