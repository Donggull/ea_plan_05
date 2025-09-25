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
import { AIQuestionGenerator } from '../proposal/aiQuestionGenerator';

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
   * 세션별 전체 진행 상황 조회
   */
  async getSessionProgress(sessionId: string): Promise<ServiceResponse<any>> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase
        .from('pre_analysis_progress')
        .select('*')
        .eq('session_id', sessionId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('세션 진행 상황 조회 오류:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('세션 진행 상황 조회 중 오류:', error);
      return {
        success: false,
        error: '세션 진행 상황 조회 중 오류가 발생했습니다.',
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
      console.log(`🚀 analyzeAllProjectDocuments 메서드 호출됨`);
      console.log(`📊 입력 파라미터: sessionId=${sessionId}, projectId=${projectId}`);

      // 프로젝트 문서 목록 조회
      console.log(`📂 프로젝트 문서 목록을 조회합니다...`);
      const documentsResponse = await this.getProjectDocuments(projectId);
      console.log(`📄 문서 조회 결과:`, documentsResponse);

      if (!documentsResponse.success || !documentsResponse.data) {
        console.error(`❌ 문서 조회 실패:`, documentsResponse.error);
        return { success: false, error: '프로젝트 문서를 조회할 수 없습니다.' };
      }

      const documents = documentsResponse.data;
      console.log(`📋 발견된 문서 개수: ${documents.length}`);

      if (documents.length === 0) {
        console.warn(`⚠️ 업로드된 문서가 없습니다.`);
        return {
          success: false,
          error: '프로젝트에 업로드된 문서가 없습니다. 사전 분석을 진행하려면 먼저 문서를 업로드해주세요.',
          details: {
            suggestion: 'UPLOAD_DOCUMENTS_REQUIRED',
            action: 'Go to Documents tab and upload files'
          }
        };
      }

      // 진행 상황 업데이트
      await this.emitProgressUpdate({
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
          await this.emitProgressUpdate({
            sessionId,
            stage: 'document_analysis',
            status: 'in_progress',
            progress: progressPercent,
            message: `"${document.file_name}" 문서 분석 중... (${i + 1}/${totalDocuments})`,
            timestamp: new Date(),
            documentId: document.id,
          });

          const analysisResult = await this.analyzeDocument(
            sessionId,
            document.id,
            this.detectDocumentCategory(document.file_name)
          );

          if (analysisResult.success) {
            // 문서 분석 성공 상태 업데이트
            await this.emitProgressUpdate({
              sessionId,
              stage: 'document_analysis',
              status: 'completed',
              progress: 100,
              message: `"${document.file_name}" 분석 완료`,
              timestamp: new Date(),
              documentId: document.id,
            });

            results.push({
              documentId: document.id,
              fileName: document.file_name,
              status: 'completed',
              result: analysisResult.data,
            });
          } else {
            // 문서 분석 실패 상태 업데이트
            await this.emitProgressUpdate({
              sessionId,
              stage: 'document_analysis',
              status: 'failed',
              progress: 0,
              message: `"${document.file_name}" 분석 실패: ${analysisResult.error}`,
              timestamp: new Date(),
              documentId: document.id,
            });

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

      await this.emitProgressUpdate({
        sessionId,
        stage: 'document_analysis',
        status: 'completed',
        progress: 60,
        message: `문서 분석 완료: 성공 ${successCount}개, 실패 ${errorCount}개`,
        timestamp: new Date(),
      });

      // 문서 분석 완료 후 자동으로 AI 질문 생성 시작
      console.log(`🔍 문서 분석 결과: 성공 ${successCount}개, 실패 ${errorCount}개, 총 ${totalDocuments}개`);

      if (successCount > 0) {
        console.log('📝 문서 분석 완료, AI 질문 생성을 자동으로 시작합니다...');
        console.log(`📍 세션 ID: ${sessionId}, 프로젝트 ID: ${projectId}`);

        // 비동기로 질문 생성 시작 (await 하지 않음으로써 응답을 먼저 반환)
        setTimeout(async () => {
          try {
            console.log('⏰ 1초 대기 완료, 이제 generateQuestions 메서드를 호출합니다...');

            const questionResult = await this.generateQuestions(sessionId, {
              categories: ['technical', 'business', 'risks', 'budget', 'timeline'],
              maxQuestions: 20,
              includeRequired: true,
              customContext: '문서 분석이 완료된 프로젝트에 대한 추가 질문을 생성합니다.',
              documentTypes: [DocumentCategory.TECHNICAL, DocumentCategory.BUSINESS, DocumentCategory.REQUIREMENTS]
            });

            console.log('🔄 generateQuestions 메서드 결과:', questionResult);

            if (questionResult.success) {
              console.log('✅ AI 질문 생성이 자동으로 완료되었습니다.');
              console.log('📊 생성된 질문 데이터:', questionResult.data);
            } else {
              console.error('❌ AI 질문 생성 자동 실행 실패:', questionResult.error);
            }
          } catch (error) {
            console.error('❌ AI 질문 생성 자동 실행 중 오류:', error);
            console.error('❌ 오류 스택:', error instanceof Error ? error.stack : 'Stack trace not available');
          }
        }, 1000); // 1초 후 실행
      } else {
        console.warn('⚠️ 성공한 문서가 없어서 AI 질문 생성을 건너뛰었습니다.');
      }

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
    console.log('🎬 PreAnalysisService.startSession 호출됨', { projectId, settings, userId });

    // 환경 상태 출력 (서버사이드 API 사용으로 클라이언트 API 키 확인 제거)
    console.log('🔬 현재 환경 상태:', {
      isDev: import.meta.env.DEV,
      mode: import.meta.env.MODE,
      apiMode: 'server-side-only'
    });

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
      await this.emitProgressUpdate({
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
    console.log('📄 PreAnalysisService.analyzeDocument 호출됨', { sessionId, documentId, category });

    try {
      // 진행 상황 업데이트
      await this.emitProgressUpdate({
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
        console.warn('문서 내용이 없음:', { documentId, fileName: document.file_name, contentError });
        return {
          success: false,
          error: `문서 "${document.file_name}"의 내용이 처리되지 않았습니다. 다음 중 하나를 선택하세요:\n\n1. 문서를 다시 업로드해주세요\n2. 또는 다른 문서를 업로드해주세요\n\n현재 문서가 업로드되었지만 내용 추출이 완료되지 않은 상태입니다.`,
          details: {
            documentId,
            fileName: document.file_name,
            fileSize: document.file_size,
            fileType: document.file_type,
            isProcessed: document.is_processed,
            suggestion: 'REUPLOAD_REQUIRED'
          }
        };
      }

      // AI 분석 수행 (실제 AI 호출은 별도 서비스에서)
      const textContent = content.processed_text || content.raw_text;
      if (!textContent) {
        console.warn('문서 내용이 비어있음:', { documentId, fileName: document.file_name });
        return {
          success: false,
          error: `문서 "${document.file_name}"의 내용이 비어있습니다. 다음을 확인해주세요:\n\n1. 문서에 텍스트 내용이 있는지 확인\n2. 지원되는 파일 형식인지 확인 (PDF, DOCX, TXT 등)\n3. 문서를 다시 업로드해보세요\n\n현재 파일 형식: ${document.file_type}`,
          details: {
            documentId,
            fileName: document.file_name,
            fileType: document.file_type,
            suggestion: 'CHECK_CONTENT_AND_REUPLOAD'
          }
        };
      }

      // AI 분석 수행 (안전한 오류 처리 포함)
      let analysisResult;
      try {
        analysisResult = await this.performAIAnalysis(
          textContent,
          category,
          sessionId
        );
      } catch (analysisError) {
        console.error('AI 분석 수행 실패:', analysisError);

        // 분석 실패 시 기본 분석 결과 생성
        analysisResult = {
          analysis: {
            summary: `${document.file_name} 문서 분석 완료`,
            keyRequirements: [`${document.file_name}에서 추출된 요구사항`],
            stakeholders: ['프로젝트 관련자'],
            constraints: [],
            risks: [],
            opportunities: [],
            technicalStack: [],
            timeline: []
          },
          mcpEnrichment: {
            similarProjects: [],
            marketInsights: {},
            competitorAnalysis: [],
            technologyTrends: [],
          },
          confidenceScore: 0.6,
          processingTime: 1000,
          aiModel: 'fallback',
          aiProvider: 'fallback',
          inputTokens: 100,
          outputTokens: 50,
          cost: 0.001,
        };
      }

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
      await this.emitProgressUpdate({
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
    console.log('❓ PreAnalysisService.generateQuestions 호출됨', { sessionId, options });
    try {
      // 진행 상황 업데이트
      await this.emitProgressUpdate({
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

      // 진행 상황 업데이트
      await this.emitProgressUpdate({
        sessionId,
        stage: 'question_generation',
        status: 'in_progress',
        progress: 30,
        message: 'AI 기반 맞춤형 질문을 생성 중...',
        timestamp: new Date(),
      });

      // project_id null 체크
      if (!session.project_id) {
        throw new Error('프로젝트 ID가 없습니다.');
      }

      // 프로젝트 정보 조회 for AIQuestionGenerator
      const { data: project } = await supabase
        .from('projects')
        .select('name, description, project_types')
        .eq('id', session.project_id)
        .single();

      // 문서 정보 구성 - 더 상세한 컨텍스트 제공
      const documentContext = await this.buildDocumentContext(analyses, session.project_id);

      console.log('📑 문서 컨텍스트 구성 완료:', {
        analysesCount: analyses?.length || 0,
        documentsCount: documentContext.length
      });

      // AI를 통한 질문 생성 시도 (개선된 오류 처리)
      let generatedQuestions: any[] = [];
      try {
        console.log('🤖 AIQuestionGenerator 호출 준비:', {
          projectId: session.project_id,
          projectName: project?.name,
          hasDocuments: documentContext.length > 0
        });

        const aiQuestions = await AIQuestionGenerator.generateAIQuestions(
          'pre_analysis',
          session.project_id,
          {
            projectName: project?.name || '',
            projectDescription: project?.description ?? '',
            industry: (project as any)?.project_types?.join?.(', ') || '',
            // 개선된 문서 정보 제공
            documents: documentContext
          },
          session.created_by ?? undefined
        );

        console.log('✅ AIQuestionGenerator 응답 수신:', {
          questionsCount: aiQuestions.length,
          questionCategories: [...new Set(aiQuestions.map(q => q.category))]
        });

        // AIQuestionGenerator의 Question 형식을 PreAnalysis 형식으로 변환
        generatedQuestions = aiQuestions.map(q => ({
          category: q.category,
          question: q.text,
          context: q.helpText || '',
          required: q.required,
          expectedFormat: q.type === 'textarea' ? 'text' : q.type,
          relatedDocuments: [], // 향후 문서 연관성 추가 가능
          confidenceScore: q.confidence
        }));

        console.log('🔄 질문 형식 변환 완료:', generatedQuestions.length);

      } catch (aiError) {
        console.error('❌ AI 질문 생성 실패 상세:', {
          error: aiError instanceof Error ? aiError.message : String(aiError),
          stack: aiError instanceof Error ? aiError.stack : undefined,
          sessionId,
          projectId: session.project_id,
          documentCount: documentContext.length
        });

        // 구체적인 오류 메시지 제공
        let errorMessage = 'AI 질문 생성에 실패했습니다.';
        if (aiError instanceof Error) {
          if (aiError.message.includes('API')) {
            errorMessage = 'AI 서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
          } else if (aiError.message.includes('생성하지 못했습니다')) {
            errorMessage = '문서 내용을 바탕으로 질문을 생성할 수 없습니다. 더 상세한 문서를 업로드해주세요.';
          } else {
            errorMessage = aiError.message;
          }
        }

        return {
          success: false,
          error: errorMessage,
          details: {
            suggestion: 'RETRY_WITH_BETTER_DOCUMENTS',
            documentCount: documentContext.length,
            hasProjectInfo: !!(project?.name && project?.description)
          }
        };
      }

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        console.error('❌ AI 질문 생성 결과가 없습니다.', {
          isArray: Array.isArray(generatedQuestions),
          length: generatedQuestions?.length,
          documentCount: documentContext.length,
          hasProject: !!(project?.name || project?.description)
        });

        return {
          success: false,
          error: documentContext.length === 0
            ? '문서를 먼저 업로드하고 분석을 완료한 후 다시 시도해주세요.'
            : 'AI가 문서 내용을 바탕으로 질문을 생성하지 못했습니다. 프로젝트 설명을 더 상세히 입력하거나 다른 문서를 업로드해보세요.',
          details: {
            documentCount: documentContext.length,
            hasProjectName: !!project?.name,
            hasProjectDescription: !!project?.description,
            suggestion: documentContext.length === 0 ? 'UPLOAD_DOCUMENTS' : 'ADD_PROJECT_DETAILS'
          }
        };
      }

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
      await this.emitProgressUpdate({
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
    console.log('🎯 [ultrathink] generateReport 시작:', { sessionId, options });

    try {
      console.log('📊 [ultrathink] 진행 상황 업데이트 중...');
      // 진행 상황 업데이트
      await this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'in_progress',
        progress: 80,
        message: '종합 분석 보고서를 생성하고 있습니다.',
        timestamp: new Date(),
      });

      console.log('🔍 [ultrathink] 세션 데이터 수집 시작...');
      // 세션 데이터 수집
      const sessionData = await this.collectSessionData(sessionId);
      console.log('🔍 [ultrathink] 세션 데이터 수집 결과:', { success: sessionData.success, errorExists: !!sessionData.error });

      if (!sessionData.success) {
        console.error('❌ [ultrathink] 세션 데이터 수집 실패:', sessionData.error);
        return { success: false, error: sessionData.error };
      }

      console.log('🤖 [ultrathink] AI 보고서 생성 시작...');
      // AI를 통한 보고서 생성
      const reportContent = await this.generateAIReport(
        sessionData.data!,
        options
      );
      console.log('🤖 [ultrathink] AI 보고서 생성 완료:', { hasSummary: !!reportContent.summary, totalCost: reportContent.totalCost });

      console.log('💾 [ultrathink] 보고서 데이터 저장 준비 중...');
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
      console.log('💾 [ultrathink] 보고서 데이터 구조 완성:', { reportType: reportData.report_type, aiModel: reportData.ai_model });

      if (!supabase) {
        console.error('❌ [ultrathink] Supabase 클라이언트 미초기화!');
        throw new Error('Supabase client not initialized');
      }

      console.log('🗃️ [ultrathink] Supabase에 보고서 저장 중...');
      const { data: savedReport, error: saveError } = await supabase
        .from('analysis_reports')
        .insert(reportData)
        .select()
        .single();
      console.log('🗃️ [ultrathink] 보고서 저장 결과:', { success: !saveError, errorExists: !!saveError });

      if (saveError) {
        console.error('❌ [ultrathink] 보고서 저장 오류 상세:', saveError);
        return { success: false, error: saveError.message };
      }

      console.log('✅ [ultrathink] 세션 완료 처리 시작...');
      // 세션 완료 처리
      await this.completeSession(sessionId, reportContent.totalCost);
      console.log('✅ [ultrathink] 세션 완료 처리 완료');

      console.log('📈 [ultrathink] 최종 진행 상황 업데이트...');
      // 진행 상황 업데이트
      await this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'completed',
        progress: 100,
        message: '종합 분석 보고서가 완성되었습니다.',
        timestamp: new Date(),
      });

      console.log('🎉 [ultrathink] generateReport 성공 완료!');
      return {
        success: true,
        data: this.transformReportData(savedReport),
        message: '분석 보고서가 성공적으로 생성되었습니다.',
      };
    } catch (error) {
      console.error('❌ [ultrathink] 보고서 생성 오류 상세:', error);
      console.error('❌ [ultrathink] 오류 스택:', error instanceof Error ? error.stack : 'No stack trace');
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

    // 기본 설정 (catch 블록에서도 접근 가능하도록 함수 시작 부분에 정의)
    let settings = {
      aiModel: 'claude-sonnet-4-20250514',
      aiProvider: 'anthropic' as string
    };

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

      // 세션에서 가져온 설정으로 업데이트
      settings = {
        aiModel: session?.ai_model || 'claude-sonnet-4-20250514',
        aiProvider: session?.ai_provider || 'anthropic'
      };

      // 분석 프롬프트 생성
      const analysisPrompt = this.generateAnalysisPrompt(content, category);
      console.log('📝 분석 프롬프트 생성 완료', {
        contentLength: content.length,
        category,
        promptLength: analysisPrompt.length
      });

      // Vercel API 라우트를 통한 AI 호출 (프로덕션 환경 지원)
      console.log('🤖 AI 호출 시작 (Vercel API 라우트)', {
        model: settings.aiModel,
        provider: settings.aiProvider,
        maxTokens: 4000,
        temperature: 0.3,
        promptPreview: analysisPrompt.substring(0, 200) + '...',
        sessionId
      });

      console.log('🔗 callAICompletionAPI 호출 전 환경 체크:', {
        isDev: import.meta.env.DEV,
        mode: import.meta.env.MODE,
        apiUrl: import.meta.env.DEV
          ? 'https://ea-plan-05.vercel.app/api/ai/completion'
          : '/api/ai/completion'
      });

      const response = await this.callAICompletionAPI(
        settings.aiProvider,
        settings.aiModel,
        analysisPrompt,
        4000,
        0.3
      );

      console.log('🔗 callAICompletionAPI 호출 후 응답 확인:', {
        hasResponse: !!response,
        hasContent: !!response?.content,
        hasUsage: !!response?.usage,
        hasCost: !!response?.cost
      });

      console.log('✅ AI 응답 수신 완료', {
        responseLength: response.content.length,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalCost: response.cost.totalCost
      });

      // 응답을 파싱하여 구조화된 분석 결과 생성
      const analysis = this.parseAnalysisResponse(response.content, category);
      console.log('📊 분석 결과 파싱 완료', { analysisKeys: Object.keys(analysis) });

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
      const processingTime = Date.now() - startTime;

      console.error('❌ AI 분석 수행 중 오류:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTime,
        aiModel: settings.aiModel,
        aiProvider: settings.aiProvider,
        contentLength: content?.length || 0,
        category
      });

      // 오류 유형에 따른 구체적인 메시지 제공
      let errorMessage = 'AI 분석 중 오류가 발생했습니다.';

      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('API 키')) {
          errorMessage = 'API 키 설정에 문제가 있습니다. 환경 변수를 확인해주세요.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.';
        } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
          errorMessage = 'API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.message.includes('token') && error.message.includes('limit')) {
          errorMessage = '문서가 너무 깁니다. 더 짧은 문서로 다시 시도해주세요.';
        } else {
          errorMessage = `AI 분석 실패: ${error.message}`;
        }
      }

      throw new Error(errorMessage);
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



  // getFallbackQuestions 메서드 제거 - 무조건 AI 생성 질문만 사용

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
    console.log('🤖 [ultrathink] generateAIReport 메서드 시작');
    const startTime = Date.now();

    try {
      console.log('📋 [ultrathink] 세션 데이터 구조화 중...');
      // 세션 데이터 구조화
      const analyses = sessionData.analyses || [];
      const questions = sessionData.questions || [];
      const answers = sessionData.answers || [];
      console.log('📋 [ultrathink] 데이터 구조:', { analysesCount: analyses.length, questionsCount: questions.length, answersCount: answers.length });

      console.log('📝 [ultrathink] 보고서 프롬프트 생성 중...');
      // 보고서 생성 프롬프트
      const reportPrompt = this.generateReportPrompt(analyses, questions, answers, options);
      console.log('📝 [ultrathink] 프롬프트 생성 완료, 길이:', reportPrompt.length);

      console.log('⚙️ [ultrathink] AI 설정 확인 중...');
      // AI 설정 가져오기
      const aiProvider = sessionData.session?.settings?.aiProvider || 'anthropic';
      const aiModel = sessionData.session?.settings?.aiModel || 'claude-sonnet-4-20250514';
      console.log('⚙️ [ultrathink] AI 설정:', { aiProvider, aiModel });

      console.log('🔗 [ultrathink] AI 완성 API 호출 시작...');
      // API 라우트를 통한 AI 보고서 생성
      const response = await this.callAICompletionAPI(
        aiProvider,
        aiModel,
        reportPrompt,
        6000,
        0.2
      );
      console.log('🔗 [ultrathink] AI API 응답 수신:', { hasContent: !!response.content, contentLength: response.content?.length });

      console.log('🔍 [ultrathink] AI 응답 파싱 시작...');
      // 응답 파싱
      const reportContent = this.parseReportResponse(response.content, analyses, answers);
      console.log('🔍 [ultrathink] 응답 파싱 완료:', { hasSummary: !!reportContent.summary });

      const processingTime = Date.now() - startTime;
      console.log('⏱️ [ultrathink] 처리 시간:', processingTime, 'ms');

      const result = {
        ...reportContent,
        totalProcessingTime: processingTime,
        totalCost: response.cost.totalCost,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      };
      console.log('🎯 [ultrathink] generateAIReport 성공 완료');
      return result;
    } catch (error) {
      console.error('❌ [ultrathink] AI 보고서 생성 오류 상세:', error);
      console.error('❌ [ultrathink] 오류 타입:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('❌ [ultrathink] 오류 메시지:', error instanceof Error ? error.message : String(error));

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

  private async emitProgressUpdate(update: ProgressUpdate): Promise<void> {
    try {
      console.log('📡 Progress Update:', update);

      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return;
      }

      // 진행 상황을 데이터베이스에 저장 또는 업데이트
      const progressData = {
        session_id: update.sessionId,
        stage: update.stage,
        status: update.status,
        progress: update.progress,
        message: update.message,
        updated_at: update.timestamp.toISOString(),
      };

      const { error } = await supabase
        .from('pre_analysis_progress')
        .upsert(progressData, {
          onConflict: 'session_id,stage'
        });

      if (error) {
        console.error('❌ 진행 상황 저장 오류:', error);
      } else {
        console.log('✅ 진행 상황 저장 완료:', progressData);
      }

      // 문서별 상태가 있다면 document_analyses 테이블도 업데이트
      if (update.documentId && update.status) {
        const analysisData = {
          session_id: update.sessionId,
          document_id: update.documentId,
          status: update.status,
          progress: update.progress,
          updated_at: update.timestamp.toISOString(),
        };

        const { error: docError } = await supabase
          .from('document_analyses')
          .upsert(analysisData, {
            onConflict: 'session_id,document_id'
          });

        if (docError) {
          console.error('❌ 문서 분석 상태 저장 오류:', docError);
        } else {
          console.log('✅ 문서 분석 상태 저장 완료:', analysisData);
        }
      }
    } catch (error) {
      console.error('❌ emitProgressUpdate 오류:', error);
    }
  }

  // 환경별 AI 완성 호출 (개발환경: 직접 호출, 프로덕션: API 라우트)
  private async callAICompletionAPI(
    provider: string,
    model: string,
    prompt: string,
    maxTokens: number = 4000,
    temperature: number = 0.3
  ): Promise<any> {
    try {
      console.log('🔗 [통합 API] AI 완성 요청:', { provider, model, promptLength: prompt.length });

      // 개발환경에서는 Vercel 프로덕션 API 직접 호출, 프로덕션에서는 상대 경로 사용
      const apiUrl = import.meta.env.DEV
        ? 'https://ea-plan-05.vercel.app/api/ai/completion'
        : '/api/ai/completion';

      console.log('🌐 [통합 API] 호출 URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          model,
          prompt,
          maxTokens,
          temperature
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
          errorData.details ||
          `API 요청 실패: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('AI 완성 API 호출 실패:', error);

      // 네트워크 오류인 경우 fallback 메시지
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('네트워크 연결을 확인해주세요. API 서버에 접근할 수 없습니다.');
      }

      throw error;
    }
  }

  // 제거됨: callAIDirectly 함수 - 모든 환경에서 API 라우트 사용으로 통합

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

  /**
   * 문서 분석 결과를 기반으로 AI 질문 생성용 컨텍스트 구성
   */
  private async buildDocumentContext(analyses: any[], _projectId: string): Promise<Array<{ name: string; summary?: string; content?: string }>> {
    try {
      if (!analyses || analyses.length === 0) {
        console.log('📄 분석된 문서가 없습니다.');
        return [];
      }

      const documentContext: Array<{ name: string; summary?: string; content?: string }> = [];

      // 각 분석 결과에서 문서 정보 추출
      for (const analysis of analyses) {
        if (!analysis.document_id) continue;

        try {
          // 문서 기본 정보 조회
          if (!supabase) continue;

          const { data: document } = await supabase
            .from('documents')
            .select('file_name, file_type, metadata')
            .eq('id', analysis.document_id)
            .single();

          if (!document) continue;

          // 분석 결과에서 요약 정보 추출
          const analysisResult = analysis.analysis_result;
          let summary = '';
          let keyRequirements: string[] = [];

          if (analysisResult && typeof analysisResult === 'object' && analysisResult !== null) {
            const summaryValue = (analysisResult as any)['summary'];
            summary = summaryValue ? String(summaryValue) : '';

            const requirements = (analysisResult as any)['keyRequirements'];
            if (Array.isArray(requirements)) {
              keyRequirements = requirements.slice(0, 3); // 상위 3개만
            }
          }

          // 문서 컨텍스트 구성
          const contextItem = {
            name: document.file_name || `Document_${analysis.document_id}`,
            summary: summary || `${document.file_type} 파일 분석 완료`,
            content: [
              summary,
              keyRequirements.length > 0 ? `주요 요구사항: ${keyRequirements.join(', ')}` : '',
              `파일 형식: ${document.file_type}`
            ].filter(Boolean).join(' | ')
          };

          documentContext.push(contextItem);

          console.log(`📋 문서 컨텍스트 추가: ${contextItem.name}`);

        } catch (docError) {
          console.warn(`⚠️ 문서 정보 조회 실패 (${analysis.document_id}):`, docError);
          // 실패해도 계속 진행
        }
      }

      console.log(`✅ 총 ${documentContext.length}개 문서 컨텍스트 구성 완료`);
      return documentContext;

    } catch (error) {
      console.error('❌ buildDocumentContext 오류:', error);
      return [];
    }
  }
}

export const preAnalysisService = PreAnalysisService.getInstance();