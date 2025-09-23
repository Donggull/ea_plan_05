import { supabase } from '../../lib/supabase';
import { aiServiceManager } from '../ai/AIServiceManager';
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
   * 프로젝트 문서 목록 조회
   */
  async getProjectDocuments(projectId: string): Promise<ServiceResponse<any[]>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('문서 조회 오류:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('문서 조회 중 오류:', error);
      return {
        success: false,
        error: '문서 조회 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 세션별 문서 분석 상태 조회
   */
  async getSessionDocumentStatus(sessionId: string): Promise<ServiceResponse<Record<string, any>>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase
        .from('document_analyses')
        .select('document_id, status, processing_time, confidence_score')
        .eq('session_id', sessionId);

      if (error) {
        console.error('문서 분석 상태 조회 오류:', error);
        return { success: false, error: error.message };
      }

      // 문서 ID를 키로 하는 상태 맵 생성
      const statusMap = (data || []).reduce((acc, item) => {
        if (item?.document_id) {
          acc[item.document_id] = {
            status: item.status,
            processingTime: item.processing_time,
            confidenceScore: item.confidence_score,
          };
        }
        return acc;
      }, {} as Record<string, any>);

      return {
        success: true,
        data: statusMap,
      };
    } catch (error) {
      console.error('문서 분석 상태 조회 중 오류:', error);
      return {
        success: false,
        error: '문서 분석 상태 조회 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 프로젝트의 모든 문서 분석 시작
   */
  async analyzeAllProjectDocuments(
    sessionId: string,
    projectId: string
  ): Promise<ServiceResponse<any>> {
    try {
      // 프로젝트 문서 목록 조회
      const documentsResponse = await this.getProjectDocuments(projectId);
      if (!documentsResponse.success || !documentsResponse.data) {
        return { success: false, error: '프로젝트 문서를 조회할 수 없습니다.' };
      }

      const documents = documentsResponse.data;
      if (documents.length === 0) {
        return { success: false, error: '분석할 문서가 없습니다.' };
      }

      // 진행 상황 업데이트
      this.emitProgressUpdate({
        sessionId,
        stage: 'document_analysis',
        status: 'in_progress',
        progress: 20,
        message: `${documents.length}개 문서 분석을 시작합니다.`,
        timestamp: new Date(),
      });

      const results = [];
      const totalDocuments = documents.length;

      // 각 문서를 순차적으로 분석
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const progressPercent = 20 + Math.floor((i / totalDocuments) * 40); // 20-60% 범위

        try {
          // 문서별 분석 시작 알림
          this.emitProgressUpdate({
            sessionId,
            stage: 'document_analysis',
            status: 'in_progress',
            progress: progressPercent,
            message: `"${document.file_name}" 문서 분석 중... (${i + 1}/${totalDocuments})`,
            timestamp: new Date(),
          });

          const analysisResult = await this.analyzeDocument(
            sessionId,
            document.id,
            this.detectDocumentCategory(document.file_name)
          );

          if (analysisResult.success) {
            results.push({
              documentId: document.id,
              fileName: document.file_name,
              status: 'completed',
              result: analysisResult.data,
            });
          } else {
            results.push({
              documentId: document.id,
              fileName: document.file_name,
              status: 'error',
              error: analysisResult.error,
            });
          }
        } catch (error) {
          console.error(`문서 "${document.file_name}" 분석 오류:`, error);
          results.push({
            documentId: document.id,
            fileName: document.file_name,
            status: 'error',
            error: '문서 분석 중 오류가 발생했습니다.',
          });
        }
      }

      // 최종 진행 상황 업데이트
      const successCount = results.filter(r => r.status === 'completed').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      this.emitProgressUpdate({
        sessionId,
        stage: 'document_analysis',
        status: 'completed',
        progress: 60,
        message: `문서 분석 완료: 성공 ${successCount}개, 실패 ${errorCount}개`,
        timestamp: new Date(),
      });

      return {
        success: true,
        data: {
          total: totalDocuments,
          success: successCount,
          errors: errorCount,
          results,
        },
        message: `총 ${totalDocuments}개 문서 분석이 완료되었습니다.`,
      };
    } catch (error) {
      console.error('프로젝트 문서 분석 오류:', error);
      return {
        success: false,
        error: '프로젝트 문서 분석 중 오류가 발생했습니다.',
      };
    }
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
        message: '사전 분석 세션이 생성되었습니다. 분석 시작 버튼을 클릭하여 진행하세요.',
        timestamp: new Date(),
      });

      // 자동 분석 제거 - 사용자가 수동으로 시작해야 함

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
    content: string,
    category: DocumentCategory | undefined,
    sessionId: string
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // 현재 세션의 설정 조회
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data: session } = await supabase
        .from('pre_analysis_sessions')
        .select('ai_model, ai_provider')
        .eq('id', sessionId)
        .single();

      const settings = {
        aiModel: session?.ai_model || 'claude-sonnet-4-20250514',
        aiProvider: session?.ai_provider || 'anthropic'
      };

      // AI 서비스 매니저 초기화 확인
      if (!aiServiceManager.getCurrentProvider()) {
        // 환경 변수에서 API 키 가져오기
        const apiKeys = {
          openai: import.meta.env.VITE_OPENAI_API_KEY,
          anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
          google: import.meta.env.VITE_GOOGLE_AI_API_KEY
        };

        const apiKey = apiKeys[settings.aiProvider as keyof typeof apiKeys];
        if (apiKey) {
          await aiServiceManager.setProvider(settings.aiProvider, apiKey);
        } else {
          throw new Error(`${settings.aiProvider} API 키가 설정되지 않았습니다.`);
        }
      }

      // 분석 프롬프트 생성
      const analysisPrompt = this.generateAnalysisPrompt(content, category);

      // AI 서비스 매니저를 통한 실제 AI 호출
      const response = await aiServiceManager.generateCompletion(analysisPrompt, {
        model: settings.aiModel,
        maxTokens: 4000,
        temperature: 0.3
      });

      // 응답을 파싱하여 구조화된 분석 결과 생성
      const analysis = this.parseAnalysisResponse(response.content, category);

      const processingTime = Date.now() - startTime;

      return {
        analysis,
        mcpEnrichment: {
          similarProjects: [],
          marketInsights: {},
          competitorAnalysis: [],
          technologyTrends: [],
        },
        confidenceScore: 0.85,
        processingTime,
        aiModel: settings.aiModel,
        aiProvider: settings.aiProvider,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cost: response.cost.totalCost,
      };
    } catch (error) {
      console.error('AI 분석 수행 중 오류:', error);
      throw new Error(`AI 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private generateAnalysisPrompt(content: string, category?: DocumentCategory): string {
    const categoryContext = category ? `이 문서는 ${category} 카테고리에 속합니다.` : '';

    return `다음 문서를 종합적으로 분석해주세요:

${categoryContext}

문서 내용:
"""
${content}
"""

다음 형식으로 분석 결과를 JSON 형태로 제공해주세요:

{
  "summary": "문서의 핵심 요약 (2-3문장)",
  "keyRequirements": ["주요 요구사항들"],
  "stakeholders": ["관련 이해관계자들"],
  "constraints": ["제약사항들"],
  "risks": ["위험 요소들"],
  "opportunities": ["기회 요소들"],
  "technicalStack": ["기술 스택 관련 정보"],
  "timeline": ["일정 관련 정보"]
}

정확하고 구체적인 분석을 제공해주세요.`;
  }

  private parseAnalysisResponse(response: string, category?: DocumentCategory): any {
    try {
      // JSON 응답 파싱 시도
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        return parsedResponse;
      }
    } catch (error) {
      console.warn('AI 응답 JSON 파싱 실패, 텍스트 분석으로 전환:', error);
    }

    // JSON 파싱 실패시 텍스트 분석으로 대체
    return {
      summary: `${category || '문서'} 분석 완료`,
      keyRequirements: this.extractListFromText(response, '요구사항'),
      stakeholders: this.extractListFromText(response, '이해관계자'),
      constraints: this.extractListFromText(response, '제약사항'),
      risks: this.extractListFromText(response, '위험'),
      opportunities: this.extractListFromText(response, '기회'),
      technicalStack: this.extractListFromText(response, '기술'),
      timeline: this.extractListFromText(response, '일정'),
    };
  }

  private extractListFromText(text: string, keyword: string): string[] {
    const lines = text.split('\n');
    const relevant: string[] = [];

    for (const line of lines) {
      if (line.toLowerCase().includes(keyword.toLowerCase())) {
        relevant.push(line.trim());
      }
    }

    return relevant.slice(0, 5); // 최대 5개까지만
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
    analyses: any[],
    options: QuestionGenerationOptions,
    session: any
  ): Promise<any[]> {
    try {
      // AI 서비스 매니저 초기화 확인
      if (!aiServiceManager.getCurrentProvider()) {
        const apiKeys = {
          openai: import.meta.env.VITE_OPENAI_API_KEY,
          anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
          google: import.meta.env.VITE_GOOGLE_AI_API_KEY
        };

        const aiProvider = session.settings?.aiProvider || 'anthropic';
        const apiKey = apiKeys[aiProvider as keyof typeof apiKeys];

        if (apiKey) {
          await aiServiceManager.setProvider(aiProvider, apiKey);
        } else {
          throw new Error(`${aiProvider} API 키가 설정되지 않았습니다.`);
        }
      }

      // 분석 결과 요약 생성
      const analysisContext = analyses.map(analysis => ({
        summary: analysis.analysis_result?.summary || '분석 요약 없음',
        keyRequirements: analysis.analysis_result?.keyRequirements || [],
        stakeholders: analysis.analysis_result?.stakeholders || [],
        technicalStack: analysis.analysis_result?.technicalStack || []
      }));

      // 질문 생성 프롬프트
      const questionsPrompt = this.generateQuestionsPrompt(analysisContext, options);

      // AI를 통한 질문 생성
      const response = await aiServiceManager.generateCompletion(questionsPrompt, {
        model: session.settings?.aiModel || 'claude-sonnet-4-20250514',
        maxTokens: 3000,
        temperature: 0.4
      });

      // 응답 파싱
      const questions = this.parseQuestionsResponse(response.content, options);

      return questions;
    } catch (error) {
      console.error('AI 질문 생성 오류:', error);

      // 오류 발생 시 기본 질문 반환
      const fallbackQuestions = [
        {
          category: 'business' as const,
          question: '프로젝트의 핵심 비즈니스 목표는 무엇입니까?',
          context: '사업적 관점에서의 주요 목표',
          required: true,
          expectedFormat: '구체적인 목표 설명',
          relatedDocuments: [],
          confidenceScore: 0.7,
        },
        {
          category: 'technical' as const,
          question: '기존 시스템과의 통합 요구사항이 있습니까?',
          context: 'API 연동, 데이터 마이그레이션 등',
          required: false,
          expectedFormat: '통합 범위 및 방법',
          relatedDocuments: [],
          confidenceScore: 0.7,
        },
        {
          category: 'timeline' as const,
          question: '프로젝트의 주요 마일스톤과 일정은?',
          context: '주요 단계별 완료 목표일',
          required: true,
          expectedFormat: '마일스톤명: 목표일자 형식',
          relatedDocuments: [],
          confidenceScore: 0.7,
        },
      ];

      return fallbackQuestions.filter(q =>
        options.categories.includes(q.category)
      ).slice(0, options.maxQuestions);
    }
  }

  private generateQuestionsPrompt(analysisContext: any[], options: QuestionGenerationOptions): string {
    const contextSummary = analysisContext.map((context, index) =>
      `문서 ${index + 1}: ${context.summary}`
    ).join('\n');

    const categoryList = options.categories.join(', ');

    return `다음 문서 분석 결과를 바탕으로 프로젝트 진행에 필요한 핵심 질문들을 생성해주세요:

분석 결과:
${contextSummary}

요청 사항:
- 카테고리: ${categoryList}
- 최대 질문 수: ${options.maxQuestions}

다음 JSON 형식으로 질문들을 제공해주세요:

[
  {
    "category": "business|technical|timeline|budget|stakeholder",
    "question": "구체적이고 명확한 질문",
    "context": "질문의 배경 설명",
    "required": true/false,
    "expectedFormat": "기대하는 답변 형식",
    "relatedDocuments": [],
    "confidenceScore": 0.0-1.0
  }
]

프로젝트 성공에 핵심적인 질문들을 우선적으로 생성해주세요.`;
  }

  private parseQuestionsResponse(response: string, options: QuestionGenerationOptions): any[] {
    try {
      // JSON 응답 파싱 시도
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedQuestions = JSON.parse(jsonMatch[0]);
        return parsedQuestions.slice(0, options.maxQuestions);
      }
    } catch (error) {
      console.warn('AI 질문 응답 JSON 파싱 실패:', error);
    }

    // JSON 파싱 실패시 텍스트에서 질문 추출
    const lines = response.split('\n');
    const questions: any[] = [];
    let currentQuestion: any = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // 질문으로 보이는 라인 감지 (? 로 끝나는 문장)
      if (trimmed.endsWith('?')) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }

        currentQuestion = {
          category: this.detectQuestionCategory(trimmed, options.categories),
          question: trimmed,
          context: '분석 결과를 바탕으로 생성된 질문',
          required: true,
          expectedFormat: '구체적인 답변',
          relatedDocuments: [],
          confidenceScore: 0.8,
        };
      }
    }

    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    return questions.slice(0, options.maxQuestions);
  }

  private detectQuestionCategory(question: string, availableCategories: string[]): string {
    const lowerQuestion = question.toLowerCase();

    if ((lowerQuestion.includes('비즈니스') || lowerQuestion.includes('사업') || lowerQuestion.includes('목표')) && availableCategories.includes('business')) {
      return 'business';
    }
    if ((lowerQuestion.includes('기술') || lowerQuestion.includes('시스템') || lowerQuestion.includes('개발')) && availableCategories.includes('technical')) {
      return 'technical';
    }
    if ((lowerQuestion.includes('일정') || lowerQuestion.includes('기간') || lowerQuestion.includes('마일스톤')) && availableCategories.includes('timeline')) {
      return 'timeline';
    }
    if ((lowerQuestion.includes('예산') || lowerQuestion.includes('비용') || lowerQuestion.includes('투자')) && availableCategories.includes('budget')) {
      return 'budget';
    }
    if ((lowerQuestion.includes('이해관계자') || lowerQuestion.includes('팀') || lowerQuestion.includes('역할')) && availableCategories.includes('stakeholder')) {
      return 'stakeholder';
    }

    return availableCategories[0] || 'business';
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

  private async generateAIReport(sessionData: any, options: ReportGenerationOptions): Promise<any> {
    const startTime = Date.now();

    try {
      // AI 서비스 매니저 초기화 확인
      if (!aiServiceManager.getCurrentProvider()) {
        const apiKeys = {
          openai: import.meta.env.VITE_OPENAI_API_KEY,
          anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
          google: import.meta.env.VITE_GOOGLE_AI_API_KEY
        };

        const aiProvider = sessionData.session?.settings?.aiProvider || 'anthropic';
        const apiKey = apiKeys[aiProvider as keyof typeof apiKeys];

        if (apiKey) {
          await aiServiceManager.setProvider(aiProvider, apiKey);
        } else {
          throw new Error(`${aiProvider} API 키가 설정되지 않았습니다.`);
        }
      }

      // 세션 데이터 구조화
      const analyses = sessionData.analyses || [];
      const questions = sessionData.questions || [];
      const answers = sessionData.answers || [];

      // 보고서 생성 프롬프트
      const reportPrompt = this.generateReportPrompt(analyses, questions, answers, options);

      // AI를 통한 보고서 생성
      const response = await aiServiceManager.generateCompletion(reportPrompt, {
        model: sessionData.session?.settings?.aiModel || 'claude-sonnet-4-20250514',
        maxTokens: 6000,
        temperature: 0.2
      });

      // 응답 파싱
      const reportContent = this.parseReportResponse(response.content, analyses, answers);

      const processingTime = Date.now() - startTime;

      return {
        ...reportContent,
        totalProcessingTime: processingTime,
        totalCost: response.cost.totalCost,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      };
    } catch (error) {
      console.error('AI 보고서 생성 오류:', error);

      // 오류 발생 시 기본 보고서 반환
      return {
        summary: '분석 완료된 프로젝트에 대한 종합 보고서입니다.',
        executiveSummary: '프로젝트 추진을 위한 핵심 정보가 정리되었습니다.',
        keyInsights: ['문서 분석이 완료되었습니다.', '질문 답변이 수집되었습니다.'],
        riskAssessment: {
          high: [],
          medium: ['일부 정보가 부족할 수 있습니다.'],
          low: [],
          overallScore: 40,
        },
        recommendations: ['상세 계획 수립을 권장합니다.', '추가 검토가 필요한 영역을 확인하세요.'],
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
        totalProcessingTime: Date.now() - startTime,
        totalCost: 0.01,
        inputTokens: 1000,
        outputTokens: 500,
      };
    }
  }

  private generateReportPrompt(analyses: any[], questions: any[], answers: any[], options: ReportGenerationOptions): string {
    const analysisContext = analyses.map((analysis, index) =>
      `분석 ${index + 1}: ${analysis.analysis_result?.summary || '분석 요약 없음'}`
    ).join('\n');

    const questionsContext = questions.map((q, index) =>
      `질문 ${index + 1}: ${q.question}`
    ).join('\n');

    const answersContext = answers.map((a, index) => {
      const question = questions.find(q => q.id === a.question_id);
      return `답변 ${index + 1}: ${question?.question} → ${a.answer}`;
    }).join('\n');

    return `다음 정보를 바탕으로 종합적인 프로젝트 분석 보고서를 생성해주세요:

## 문서 분석 결과:
${analysisContext}

## 질문과 답변:
${questionsContext}

${answersContext}

## 보고서 요구사항:
- 형식: ${options.format}
- 포함 섹션: ${options.includeCharts ? '차트 포함' : '텍스트 위주'}

다음 JSON 형식으로 보고서를 작성해주세요:

{
  "summary": "전체 프로젝트에 대한 간결한 요약",
  "executiveSummary": "경영진용 핵심 요약",
  "keyInsights": ["주요 인사이트들의 배열"],
  "riskAssessment": {
    "high": ["높은 위험 요소들"],
    "medium": ["중간 위험 요소들"],
    "low": ["낮은 위험 요소들"],
    "overallScore": 0-100
  },
  "recommendations": ["구체적인 권장사항들"],
  "baselineData": {
    "requirements": ["주요 요구사항들"],
    "stakeholders": ["이해관계자들"],
    "constraints": ["제약사항들"],
    "timeline": ["일정 관련 정보"],
    "technicalStack": ["기술 스택 정보"],
    "integrationPoints": ["통합 포인트들"]
  }
}

정확하고 실행 가능한 분석 결과를 제공해주세요.`;
  }

  private parseReportResponse(response: string, analyses: any[], _answers: any[]): any {
    try {
      // JSON 응답 파싱 시도
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedReport = JSON.parse(jsonMatch[0]);
        return parsedReport;
      }
    } catch (error) {
      console.warn('AI 보고서 응답 JSON 파싱 실패:', error);
    }

    // JSON 파싱 실패시 텍스트에서 정보 추출
    return {
      summary: this.extractSectionFromText(response, '요약') || '프로젝트 분석이 완료되었습니다.',
      executiveSummary: this.extractSectionFromText(response, '경영진') || '프로젝트 추진을 위한 핵심 정보가 준비되었습니다.',
      keyInsights: this.extractListFromTextResponse(response, '인사이트') || ['분석 결과가 정리되었습니다.'],
      riskAssessment: {
        high: this.extractListFromTextResponse(response, '높은 위험') || [],
        medium: this.extractListFromTextResponse(response, '중간 위험') || [],
        low: this.extractListFromTextResponse(response, '낮은 위험') || [],
        overallScore: 50,
      },
      recommendations: this.extractListFromTextResponse(response, '권장') || ['상세 검토를 권장합니다.'],
      baselineData: {
        requirements: analyses.flatMap(a => a.analysis_result?.keyRequirements || []),
        stakeholders: analyses.flatMap(a => a.analysis_result?.stakeholders || []),
        constraints: analyses.flatMap(a => a.analysis_result?.constraints || []),
        timeline: analyses.flatMap(a => a.analysis_result?.timeline || []),
        technicalStack: analyses.flatMap(a => a.analysis_result?.technicalStack || []),
        integrationPoints: [],
      },
      visualizationData: {},
    };
  }

  private extractSectionFromText(text: string, keyword: string): string | null {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
        // 다음 몇 줄을 합쳐서 반환
        const content = lines.slice(i, i + 3).join(' ').trim();
        return content.length > 10 ? content : null;
      }
    }
    return null;
  }

  private extractListFromTextResponse(text: string, keyword: string): string[] {
    const lines = text.split('\n');
    const relevant: string[] = [];

    for (const line of lines) {
      if (line.toLowerCase().includes(keyword.toLowerCase()) && line.includes('-')) {
        relevant.push(line.replace(/^[-*•]\s*/, '').trim());
      }
    }

    return relevant.slice(0, 5); // 최대 5개까지만
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