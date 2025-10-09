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
        status: 'processing',
        progress: 20,
        message: `${documents.length}개 문서 분석을 시작합니다.`,
        timestamp: new Date(),
      });

      // 🔥 이미 분석 완료/진행 중인 문서 확인
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data: existingAnalyses } = await supabase
        .from('document_analyses')
        .select('document_id, status')
        .eq('session_id', sessionId);

      const completedDocumentIds = new Set(
        existingAnalyses
          ?.filter(a => a.status === 'completed')
          .map(a => a.document_id) || []
      );

      const processingDocumentIds = new Set(
        existingAnalyses
          ?.filter(a => a.status === 'processing')
          .map(a => a.document_id) || []
      );

      console.log(`✅ 이미 분석 완료된 문서: ${completedDocumentIds.size}개`);
      console.log(`⏳ 현재 분석 중인 문서: ${processingDocumentIds.size}개`);
      console.log(`📝 분석 필요한 문서: ${documents.length - completedDocumentIds.size - processingDocumentIds.size}개`);

      const results = [];
      const totalDocuments = documents.length;

      // 각 문서를 순차적으로 분석
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const progressPercent = 20 + Math.floor((i / totalDocuments) * 40); // 20-60% 범위

        // 🔥 이미 분석 완료된 문서는 건너뛰기
        if (completedDocumentIds.has(document.id)) {
          console.log(`⏭️ "${document.file_name}" - 이미 분석 완료, 건너뜀`);
          results.push({
            documentId: document.id,
            fileName: document.file_name,
            status: 'completed',
            result: null, // 기존 결과 재사용
          });
          continue;
        }

        // 🔥 현재 분석 중인 문서는 건너뛰기 (중복 API 호출 방지)
        if (processingDocumentIds.has(document.id)) {
          console.log(`⏳ "${document.file_name}" - 현재 분석 중, 건너뜀`);
          results.push({
            documentId: document.id,
            fileName: document.file_name,
            status: 'processing',
            result: null,
          });
          continue;
        }

        try {
          // 문서별 분석 시작 알림
          await this.emitProgressUpdate({
            sessionId,
            stage: 'document_analysis',
            status: 'processing',
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
        progress: 100,
        message: `문서 분석 완료: 성공 ${successCount}개, 실패 ${errorCount}개`,
        timestamp: new Date(),
      });

      // 문서 분석 완료
      console.log(`🔍 문서 분석 결과: 성공 ${successCount}개, 실패 ${errorCount}개, 총 ${totalDocuments}개`);

      // 🔥 중요: 질문 생성은 AnalysisProgress 컴포넌트에서만 관리
      // 중복 실행 방지를 위해 여기서는 질문 생성을 자동으로 트리거하지 않음
      // AnalysisProgress 컴포넌트가 문서 분석 완료를 감지하고 질문 생성을 시작함
      if (successCount > 0) {
        console.log('✅ 문서 분석 완료 - AnalysisProgress 컴포넌트가 질문 생성을 자동으로 시작할 예정');
      } else {
        console.warn('⚠️ 성공한 문서가 없어서 질문 생성을 진행할 수 없습니다.');
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
        status: 'processing',
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
        message: '사전 분석 세션이 생성되었습니다. 문서 분석을 시작합니다.',
        timestamp: new Date(),
      });

      // 세션 생성 후 자동으로 문서 분석 시작
      console.log('🚀 자동 문서 분석 시작...', { sessionId: data.id, projectId });

      // 비동기로 문서 분석 시작 (응답 지연 방지)
      setTimeout(async () => {
        try {
          const analysisResult = await this.analyzeAllProjectDocuments(data.id, projectId);
          console.log('📊 자동 문서 분석 완료:', analysisResult);
        } catch (error) {
          console.error('❌ 자동 문서 분석 실패:', error);
        }
      }, 1000); // 1초 후 시작

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
        status: 'processing',
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

      // 🔥 원자적 락: 기존 레코드 먼저 체크
      console.log('🔍 [문서분석] 기존 분석 레코드 확인 중...');
      const { data: existingAnalysis } = await supabase
        .from('document_analyses')
        .select('id, status')
        .eq('session_id', sessionId)
        .eq('document_id', documentId)
        .maybeSingle();

      if (existingAnalysis) {
        console.log(`⏭️ [문서분석] 이미 존재하는 분석 (ID: ${existingAnalysis.id}, 상태: ${existingAnalysis.status})`);

        if (existingAnalysis.status === 'processing') {
          console.log('⏳ [문서분석] 다른 프로세스가 현재 처리 중입니다. 폴링 대기');
          // 기존 processing 레코드 조회하여 상태 반환
          const { data: processingAnalysis } = await supabase
            .from('document_analyses')
            .select('*')
            .eq('id', existingAnalysis.id)
            .single();

          return {
            success: true,
            data: processingAnalysis ? this.transformAnalysisData(processingAnalysis) : undefined,
            message: '문서 분석이 진행 중입니다.',
          };
        } else if (existingAnalysis.status === 'completed') {
          console.log('✅ [문서분석] 이미 완료된 분석입니다. 건너뜀');
          // 기존 완료된 분석 조회
          const { data: completedAnalysis } = await supabase
            .from('document_analyses')
            .select('*')
            .eq('id', existingAnalysis.id)
            .single();

          return {
            success: true,
            data: this.transformAnalysisData(completedAnalysis),
            message: '이미 분석이 완료된 문서입니다.',
          };
        } else if (existingAnalysis.status === 'failed') {
          // 🔥 status가 'failed'인 경우 재시도 허용 → 기존 레코드 삭제 후 재생성
          console.log('♻️ [문서분석] 실패한 분석 레코드 삭제 후 재시도');
          const { error: deleteError } = await supabase
            .from('document_analyses')
            .delete()
            .eq('id', existingAnalysis.id);

          if (deleteError) {
            console.error('❌ [문서분석] 실패 레코드 삭제 실패:', deleteError);
            throw new Error(`실패한 분석 레코드 삭제 실패: ${deleteError.message}`);
          }
          console.log('✅ [문서분석] 실패 레코드 삭제 완료. 새 분석 시작');
        }
      }

      // 🔥 AI 호출 전 DB에 processing 상태 먼저 INSERT (중복 호출 방지)
      console.log('📝 [문서분석] processing 상태로 신규 레코드 생성');
      const initialAnalysisData = {
        session_id: sessionId,
        document_id: documentId,
        category: category || this.detectDocumentCategory(document.file_name),
        analysis_result: {},
        mcp_enrichment: {},
        confidence_score: 0,
        processing_time: 0,
        ai_model: '',
        ai_provider: '',
        input_tokens: 0,
        output_tokens: 0,
        cost: 0,
        status: 'processing', // 🔥 AI 호출 전 processing 상태로 저장
      };

      const { data: processingRecord, error: insertError } = await supabase
        .from('document_analyses')
        .insert(initialAnalysisData)
        .select()
        .single();

      if (insertError) {
        // 🔥 중복 INSERT 에러 (23505: unique_violation)
        if (insertError.code === '23505') {
          console.warn('⚠️ [문서분석] 동시 INSERT 충돌 감지. 기존 레코드 조회');
          // 다른 프로세스가 생성한 레코드 조회
          const { data: conflictedRecord } = await supabase
            .from('document_analyses')
            .select('*')
            .eq('session_id', sessionId)
            .eq('document_id', documentId)
            .single();

          return {
            success: true,
            data: conflictedRecord ? this.transformAnalysisData(conflictedRecord) : undefined,
            message: '문서 분석이 이미 진행 중입니다.',
          };
        }

        console.error('❌ [문서분석] 초기화 실패:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`🔒 [문서분석] processing 상태 기록 완료 (ID: ${processingRecord.id})`);

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

        // 🔥 분석 실패 시 status='failed'로 UPDATE
        await supabase
          .from('document_analyses')
          .update({ status: 'failed' })
          .eq('id', processingRecord.id);

        console.log(`❌ 문서 분석 실패 - status='failed'로 업데이트됨`);

        return {
          success: false,
          error: `AI 분석 실패: ${analysisError instanceof Error ? analysisError.message : String(analysisError)}`,
        };
      }

      // 🔥 분석 완료 후 status='completed'로 UPDATE
      const updateData = {
        analysis_result: analysisResult.analysis,
        mcp_enrichment: analysisResult.mcpEnrichment,
        confidence_score: analysisResult.confidenceScore,
        processing_time: analysisResult.processingTime,
        ai_model: analysisResult.aiModel,
        ai_provider: analysisResult.aiProvider,
        input_tokens: analysisResult.inputTokens,
        output_tokens: analysisResult.outputTokens,
        cost: analysisResult.cost,
        status: 'completed', // 🔥 AI 완료 후 completed로 변경
      };

      const { data: savedAnalysis, error: updateError } = await supabase
        .from('document_analyses')
        .update(updateData)
        .eq('id', processingRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error('문서 분석 업데이트 오류:', updateError);

        // 🔥 UPDATE 실패 시 status='failed'로 변경
        await supabase
          .from('document_analyses')
          .update({ status: 'failed' })
          .eq('id', processingRecord.id);

        return { success: false, error: updateError.message };
      }

      console.log(`✅ 문서 분석 완료 - status='completed'로 업데이트됨`)

      // 🔥 비용 정보 세션에 누적
      const analysisCost = analysisResult.cost;
      console.log('💰 [문서분석] 비용 정보:', {
        inputTokens: analysisResult.inputTokens,
        outputTokens: analysisResult.outputTokens,
        cost: analysisCost
      });

      // 현재 세션의 total_cost 조회 및 업데이트
      const { data: currentSession } = await supabase
        .from('pre_analysis_sessions')
        .select('total_cost')
        .eq('id', sessionId)
        .single();

      const currentTotalCost = Number(currentSession?.total_cost || 0);
      const newTotalCost = currentTotalCost + analysisCost;

      console.log('💰 [문서분석] 세션 비용 업데이트:', {
        이전_총비용: currentTotalCost,
        문서분석_비용: analysisCost,
        새_총비용: newTotalCost
      });

      await supabase
        .from('pre_analysis_sessions')
        .update({ total_cost: newTotalCost })
        .eq('id', sessionId);

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
      // 세션 정보 조회
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // 🔥 1단계: 세션의 metadata 확인 (질문 생성 진행 중인지)
      const { data: sessionData } = await supabase
        .from('pre_analysis_sessions')
        .select('metadata')
        .eq('id', sessionId)
        .single();

      const metadata = sessionData?.metadata as Record<string, any> | null;
      console.log('🔍 [질문생성] 세션 metadata 확인:', {
        hasMetadata: !!metadata,
        isGenerating: metadata?.['generating_questions'],
        attempts: metadata?.['question_generation_attempts'] || 0,
        startedAt: metadata?.['generation_started_at']
      });

      // 🔥 질문 생성 락 체크 - 타임스탬프 기반 무효화 (10분)
      const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10분
      const isGenerating = metadata?.['generating_questions'] === true;
      const generationStartedAt = metadata?.['generation_started_at'] as string | undefined;

      if (isGenerating && generationStartedAt) {
        const lockAge = Date.now() - new Date(generationStartedAt).getTime();

        if (lockAge < LOCK_TIMEOUT_MS) {
          // 락이 아직 유효함 (10분 이내)
          console.log(`⏳ 질문 생성이 이미 진행 중입니다 (${Math.floor(lockAge / 1000)}초 경과). 건너뜀`);
          return {
            success: false,
            error: '질문 생성이 이미 진행 중입니다. 잠시 후 다시 시도해주세요.',
          };
        } else {
          // 락이 만료됨 (10분 초과) - 강제 해제
          console.warn(`⚠️ 질문 생성 락이 만료되었습니다 (${Math.floor(lockAge / 60000)}분 경과). 락을 해제하고 재시도합니다.`);

          await supabase
            .from('pre_analysis_sessions')
            .update({
              metadata: {
                ...(metadata || {}),
                generating_questions: false,
                generation_started_at: null,
                question_generation_attempts: 0 // 성공 시 재시도 카운터 초기화
              } as any
            })
            .eq('id', sessionId);
        }
      }

      // 🔥 실패 추적: 최대 재시도 횟수 확인 (3회 실패 시 영구 중단)
      const attempts = (metadata?.['question_generation_attempts'] as number) || 0;
      const MAX_ATTEMPTS = 3;

      if (attempts >= MAX_ATTEMPTS) {
        console.error(`❌ 질문 생성이 ${MAX_ATTEMPTS}회 실패했습니다. 더 이상 재시도하지 않습니다.`);
        return {
          success: false,
          error: `질문 생성에 ${MAX_ATTEMPTS}회 실패했습니다. 네트워크 상태를 확인하거나 나중에 다시 시도해주세요.`,
        };
      }

      if (attempts > 0) {
        console.warn(`⚠️ 질문 생성 재시도 중 (${attempts}/${MAX_ATTEMPTS})`);
      }

      // 🔥 2단계: 이미 질문이 생성되었는지 확인 (중복 생성 방지)
      const { data: existingQuestions, error: questionCheckError } = await supabase
        .from('ai_questions')
        .select('id')
        .eq('session_id', sessionId);

      if (!questionCheckError && existingQuestions && existingQuestions.length > 0) {
        console.log(`⏭️ 이미 ${existingQuestions.length}개의 질문이 생성되어 있음, 건너뜀`);
        // 기존 질문 전체 데이터 조회
        const { data: fullQuestions } = await supabase
          .from('ai_questions')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        return {
          success: true,
          data: fullQuestions?.map(q => this.transformQuestionData(q)) || [],
          message: '기존에 생성된 질문을 반환합니다.',
        };
      }

      // 🔥 3단계: metadata에 generating_questions 플래그 + 타임스탬프 설정 (락 역할)
      const lockTimestamp = new Date().toISOString();
      console.log('🔐 [질문생성] 락 획득 시도:', lockTimestamp);

      const { error: lockError } = await supabase
        .from('pre_analysis_sessions')
        .update({
          metadata: {
            ...(metadata || {}),
            generating_questions: true,
            generation_started_at: lockTimestamp
          } as any
        })
        .eq('id', sessionId);

      if (lockError) {
        console.error('❌ [질문생성] 락 설정 실패:', lockError);
        return { success: false, error: '질문 생성 락 설정에 실패했습니다.' };
      }

      // 🔥 락 설정 확인 (다른 프로세스가 동시에 설정했을 수 있음)
      const { data: verifySession } = await supabase
        .from('pre_analysis_sessions')
        .select('metadata')
        .eq('id', sessionId)
        .single();

      const verifyMetadata = verifySession?.metadata as Record<string, any> | null;
      const verifyTimestamp = verifyMetadata?.['generation_started_at'] as string;

      // 타임스탬프가 내가 설정한 값과 다르면 → 다른 프로세스가 먼저 획득
      if (verifyTimestamp !== lockTimestamp) {
        console.warn(`⚠️ [질문생성] 락 경쟁 감지. 다른 프로세스가 먼저 획득. 기존 질문 조회 (내 시각: ${lockTimestamp}, 실제: ${verifyTimestamp})`);

        // 다른 프로세스가 생성 중이므로 기존 질문 조회
        const { data: existingQuestions } = await supabase
          .from('ai_questions')
          .select('*')
          .eq('session_id', sessionId)
          .order('order_index', { ascending: true });

        return {
          success: true,
          data: existingQuestions?.map(q => this.transformQuestionData(q)) || [],
          message: existingQuestions && existingQuestions.length > 0
            ? '이미 생성된 질문을 반환합니다.'
            : '질문 생성이 진행 중입니다.',
        };
      }

      console.log('✅ [질문생성] 락 획득 성공:', lockTimestamp);

      // 진행 상황 업데이트
      await this.emitProgressUpdate({
        sessionId,
        stage: 'question_generation',
        status: 'processing',
        progress: 60,
        message: 'AI 질문을 생성하고 있습니다.',
        timestamp: new Date(),
      });

      const { data: sessions, error: sessionError } = await supabase
        .from('pre_analysis_sessions')
        .select('*')
        .eq('id', sessionId);

      if (sessionError || !sessions || sessions.length === 0) {
        return { success: false, error: '세션을 찾을 수 없습니다.' };
      }

      const session = sessions[0];

      // 기존 문서 분석 결과 조회
      console.log('📊 [질문생성] 1단계: 문서 분석 결과 조회 시작');
      const { data: analyses, error: analysesError } = await supabase
        .from('document_analyses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'completed'); // 🔥 완료된 분석만 조회

      if (analysesError) {
        console.error('❌ [질문생성] 문서 분석 조회 실패:', analysesError);
        return { success: false, error: '문서 분석 결과를 조회할 수 없습니다.' };
      }

      console.log(`✅ [질문생성] 문서 분석 조회 완료: ${analyses?.length || 0}개`);

      // 🔥 완료된 분석이 없으면 에러
      if (!analyses || analyses.length === 0) {
        console.error('❌ [질문생성] 완료된 문서 분석이 없습니다');
        return {
          success: false,
          error: '문서 분석이 아직 완료되지 않았습니다. 문서 분석이 완료될 때까지 기다려주세요.'
        };
      }

      // 진행 상황 업데이트
      await this.emitProgressUpdate({
        sessionId,
        stage: 'question_generation',
        status: 'processing',
        progress: 30,
        message: 'AI 기반 맞춤형 질문을 생성 중...',
        timestamp: new Date(),
      });

      // project_id null 체크
      if (!session.project_id) {
        console.error('❌ [질문생성] 프로젝트 ID 없음');
        throw new Error('프로젝트 ID가 없습니다.');
      }

      // 프로젝트 정보 조회 for AIQuestionGenerator
      console.log('📊 [질문생성] 2단계: 프로젝트 정보 조회');
      const { data: project } = await supabase
        .from('projects')
        .select('name, description, project_types')
        .eq('id', session.project_id)
        .single();

      console.log('✅ [질문생성] 프로젝트 정보 조회 완료:', {
        name: project?.name,
        hasDescription: !!project?.description,
        projectTypes: (project as any)?.project_types
      });

      // 문서 정보 구성 - 더 상세한 컨텍스트 제공
      console.log('📊 [질문생성] 3단계: 문서 컨텍스트 빌드 시작');
      const documentContext = await this.buildDocumentContext(analyses, session.project_id);

      console.log('✅ [질문생성] 문서 컨텍스트 구성 완료:', {
        analysesCount: analyses?.length || 0,
        documentsCount: documentContext.length,
        totalContentLength: documentContext.reduce((sum, doc) => sum + (doc.content?.length || 0), 0)
      });

      // AI를 통한 질문 생성 (통합된 completion API 사용)
      let generatedQuestions: any[] = [];
      let questionResponse: any = null; // 🔥 비용 정보를 위해 스코프 밖에 선언
      try {
        console.log('📊 [질문생성] 4단계: AI 질문 생성 시작');
        console.log('🔍 세션에서 읽어온 AI 설정:', {
          provider: session.ai_provider,
          model: session.ai_model,
          projectId: session.project_id,
          projectName: project?.name,
          hasDocuments: documentContext.length > 0,
          hasProvider: !!session.ai_provider,
          hasModel: !!session.ai_model
        });

        // DB에 AI 모델 정보가 없으면 명확한 오류 발생
        if (!session.ai_provider || !session.ai_model) {
          const errorMsg = `AI 모델 정보가 세션에 저장되지 않았습니다. Left 사이드바에서 AI 모델을 선택한 후 다시 시작해주세요. (Provider: ${session.ai_provider || '없음'}, Model: ${session.ai_model || '없음'})`;
          console.error('❌ AI 모델 정보 누락:', errorMsg);
          throw new Error(errorMsg);
        }

        // 🔥 프롬프트 크기 제한 (50KB)
        const MAX_PROMPT_SIZE = 50000;

        // 질문 생성을 위한 프롬프트 구성
        console.log('📊 [질문생성] 5단계: 프롬프트 빌드 시작');
        const questionPrompt = this.buildQuestionGenerationPrompt(
          project?.name || '',
          project?.description || '',
          (project as any)?.project_types || [],
          documentContext,
          analyses || [], // 분석 결과 전달
          options.maxQuestions || 15
        );

        console.log('✅ [질문생성] 프롬프트 빌드 완료:', {
          promptLength: questionPrompt.length,
          promptSizeKB: (questionPrompt.length / 1024).toFixed(2),
          exceedsLimit: questionPrompt.length > MAX_PROMPT_SIZE,
          projectName: project?.name,
          documentCount: documentContext.length
        });

        // 🔥 프롬프트 크기 체크
        if (questionPrompt.length > MAX_PROMPT_SIZE) {
          console.error(`❌ [질문생성] 프롬프트가 너무 큽니다: ${(questionPrompt.length / 1024).toFixed(2)}KB > ${(MAX_PROMPT_SIZE / 1024).toFixed(2)}KB`);
          throw new Error(`프롬프트 크기가 ${(questionPrompt.length / 1024).toFixed(2)}KB로 제한(${(MAX_PROMPT_SIZE / 1024).toFixed(2)}KB)을 초과했습니다. 문서 개수를 줄이거나 더 짧은 문서로 다시 시도해주세요.`);
        }

        // completion API를 사용하여 질문 생성
        // 🔥 temperature를 0.9로 높여 더 다양한 질문 생성 (매번 다른 관점과 개수)
        console.log('📊 [질문생성] 6단계: AI API 호출 시작');
        questionResponse = await this.callAICompletionAPI(
          session.ai_provider,
          session.ai_model,
          questionPrompt,
          3000,
          0.9 // 높은 temperature로 더 창의적이고 다양한 질문 생성
        );

        console.log('✅ [질문생성] AI API 호출 성공');

        console.log('✅ AI 질문 생성 응답 수신:', {
          contentLength: questionResponse.content.length,
          inputTokens: questionResponse.usage.inputTokens,
          outputTokens: questionResponse.usage.outputTokens
        });

        // 🔥 복잡도 계산 및 권장 범위 확인
        const complexityScore = this.calculateDocumentComplexity(documentContext, analyses || []);
        const questionRange = this.calculateQuestionRange(complexityScore, options.maxQuestions || 25);

        // AI 응답을 파싱하여 질문 배열 생성
        generatedQuestions = this.parseQuestionResponse(questionResponse.content);

        console.log('🔄 질문 파싱 완료:', {
          questionsCount: generatedQuestions.length,
          questionRange,
          categories: [...new Set(generatedQuestions.map(q => q.category))]
        });

        // 🔥 질문 개수 검증 및 보완 (최소 개수 미만인 경우만)
        if (generatedQuestions.length < questionRange.min) {
          console.warn(`⚠️ AI가 생성한 질문(${generatedQuestions.length}개)이 최소 권장 개수(${questionRange.min}개)보다 적습니다. 기본 질문으로 보충합니다.`);

          const additionalQuestions = this.generateFallbackQuestions(
            questionRange.min - generatedQuestions.length,
            generatedQuestions.map(q => q.category)
          );

          generatedQuestions = [...generatedQuestions, ...additionalQuestions];

          console.log(`✅ 기본 질문 ${additionalQuestions.length}개 추가 완료. 총 ${generatedQuestions.length}개`);
        } else if (generatedQuestions.length > questionRange.max) {
          // 최대 개수를 초과한 경우 상위 질문만 사용
          console.warn(`⚠️ AI가 생성한 질문(${generatedQuestions.length}개)이 최대 권장 개수(${questionRange.max}개)를 초과했습니다. ${questionRange.max}개로 제한합니다.`);
          generatedQuestions = generatedQuestions.slice(0, questionRange.max);
        } else {
          console.log(`✅ 생성된 질문 개수(${generatedQuestions.length}개)가 권장 범위(${questionRange.min}-${questionRange.max}개) 내에 있습니다.`);
        }

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

        // 🔥 AI 실패 시 락 해제 + 실패 카운터 증가
        await supabase
          .from('pre_analysis_sessions')
          .update({
            metadata: {
              ...(metadata || {}),
              generating_questions: false,
              generation_started_at: null,
              question_generation_attempts: attempts + 1 // 실패 횟수 증가
            } as any
          })
          .eq('id', sessionId);

        console.error(`❌ AI 질문 생성 실패 (시도 ${attempts + 1}/${MAX_ATTEMPTS})`);

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

        // 🔥 질문 없음 시 락 해제 + 실패 카운터 증가
        await supabase
          .from('pre_analysis_sessions')
          .update({
            metadata: {
              ...(metadata || {}),
              generating_questions: false,
              generation_started_at: null,
              question_generation_attempts: attempts + 1 // 실패 횟수 증가
            } as any
          })
          .eq('id', sessionId);

        console.error(`❌ 질문 생성 실패 - 결과 없음 (시도 ${attempts + 1}/${MAX_ATTEMPTS})`);

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

        // 🔥 저장 실패 시 락 해제 + 실패 카운터 증가
        await supabase
          .from('pre_analysis_sessions')
          .update({
            metadata: {
              ...(metadata || {}),
              generating_questions: false,
              generation_started_at: null,
              question_generation_attempts: attempts + 1
            } as any
          })
          .eq('id', sessionId);

        console.error(`❌ 질문 DB 저장 실패 (시도 ${attempts + 1}/${MAX_ATTEMPTS})`);

        return { success: false, error: saveError.message };
      }

      // 진행 상황 업데이트
      await this.emitProgressUpdate({
        sessionId,
        stage: 'question_generation',
        status: 'completed',
        progress: 100,
        message: `${savedQuestions.length}개의 질문이 생성되었습니다.`,
        timestamp: new Date(),
      });

      // 🔥 비용 정보 세션에 누적
      let newTotalCost: number | undefined;

      if (!questionResponse || !questionResponse.cost) {
        console.warn('⚠️  [질문생성] questionResponse에 비용 정보가 없습니다. 비용 누적 건너뜀');
      } else {
        const questionCost = questionResponse.cost.totalCost;
        console.log('💰 [질문생성] 비용 정보:', {
          inputTokens: questionResponse.usage.inputTokens,
          outputTokens: questionResponse.usage.outputTokens,
          cost: questionCost
        });

        // 현재 세션의 total_cost 조회
        const { data: currentSession } = await supabase
          .from('pre_analysis_sessions')
          .select('total_cost')
          .eq('id', sessionId)
          .single();

        const currentTotalCost = Number(currentSession?.total_cost || 0);
        newTotalCost = currentTotalCost + questionCost;

        console.log('💰 [질문생성] 세션 비용 업데이트:', {
          이전_총비용: currentTotalCost,
          질문생성_비용: questionCost,
          새_총비용: newTotalCost
        });
      }

      // 🔥 성공 시 락 해제 + 재시도 카운터 초기화 (+ 비용 누적)
      const updateData: any = {
        metadata: {
          ...(metadata || {}),
          generating_questions: false,
          generation_started_at: null,
          question_generation_attempts: 0
        }
      };

      if (newTotalCost !== undefined) {
        updateData.total_cost = newTotalCost;
      }

      await supabase
        .from('pre_analysis_sessions')
        .update(updateData)
        .eq('id', sessionId);

      console.log('✅ 질문 생성 완료 - 락 해제, 재시도 카운터 초기화' + (newTotalCost !== undefined ? ', 비용 누적 완료' : ''));

      return {
        success: true,
        data: savedQuestions.map(this.transformQuestionData),
        message: '질문 생성이 성공적으로 완료되었습니다.',
      };
    } catch (error) {
      console.error('질문 생성 오류:', error);

      // 🔥 오류 발생 시에도 락 해제 + 실패 카운터 증가
      try {
        if (supabase) {
          const { data: currentSession } = await supabase
            .from('pre_analysis_sessions')
            .select('metadata')
            .eq('id', sessionId)
            .single();

          const currentMetadata = currentSession?.metadata as Record<string, any> | null;
          const currentAttempts = (currentMetadata?.['question_generation_attempts'] as number) || 0;

          await supabase
            .from('pre_analysis_sessions')
            .update({
              metadata: {
                ...(currentMetadata || {}),
                generating_questions: false,
                generation_started_at: null,
                question_generation_attempts: currentAttempts + 1
              } as any
            })
            .eq('id', sessionId);

          console.error(`❌ 예외 발생 - 락 해제 (시도 ${currentAttempts + 1}/${3})`);
        }
      } catch (unlockError) {
        console.error('락 해제 실패:', unlockError);
      }

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
        status: 'processing',
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
      // AI를 통한 보고서 생성 (스트리밍)
      const reportContent = await this.generateAIReport(
        sessionId, // 스트리밍 진행 상황 전달을 위해 sessionId 추가
        sessionData.data!,
        options
      );
      console.log('🤖 [ultrathink] AI 보고서 생성 완료:', { hasSummary: !!reportContent.summary, totalCost: reportContent.totalCost });

      console.log('💾 [ultrathink] 보고서 데이터 저장 준비 중...');
      // 🔥 보고서 저장 - 데이터베이스 스키마에 맞게 flat 구조로 변경
      const reportData = {
        session_id: sessionId,
        project_id: sessionData.data!.session.project_id,
        summary: reportContent.summary,
        executive_summary: reportContent.executiveSummary,
        key_insights: reportContent.keyInsights,
        risk_assessment: reportContent.riskAssessment,
        recommendations: reportContent.recommendations,
        baseline_data: reportContent.baselineData,
        agency_perspective: reportContent.agencyPerspective || {}, // 🔥 웹에이전시 관점 추가
        visualization_data: reportContent.visualizationData,
        ai_model: sessionData.data!.session.ai_model,
        ai_provider: sessionData.data!.session.ai_provider,
        total_processing_time: reportContent.totalProcessingTime,
        total_cost: reportContent.totalCost,
        input_tokens: reportContent.inputTokens,
        output_tokens: reportContent.outputTokens,
        generated_by: sessionData.data!.session.created_by,
      };
      console.log('💾 [ultrathink] 보고서 데이터 구조 완성:', { projectId: reportData.project_id, aiModel: reportData.ai_model });

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

      // 🔥 명확한 오류 메시지 제공
      let errorMessage = 'AI 보고서 생성 중 오류가 발생했습니다.';
      if (error instanceof Error) {
        errorMessage = `AI 보고서 생성 실패: ${error.message}`;
      }

      // 진행 상황 업데이트 (실패 상태)
      await this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'failed',
        progress: 0,
        message: errorMessage,
        timestamp: new Date(),
      });

      return {
        success: false,
        error: errorMessage,
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

      const { data: session, error: sessionError } = await supabase
        .from('pre_analysis_sessions')
        .select('ai_model, ai_provider')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error('❌ 세션 조회 실패:', sessionError);
        throw new Error('세션 정보를 가져올 수 없습니다.');
      }

      console.log('🔍 세션에서 읽어온 AI 설정:', {
        aiModel: session.ai_model,
        aiProvider: session.ai_provider,
        sessionId
      });

      // DB에 AI 모델 정보가 없으면 명확한 오류 발생
      if (!session.ai_model || !session.ai_provider) {
        const errorMsg = `AI 모델 정보가 세션에 저장되지 않았습니다. Left 사이드바에서 AI 모델을 선택한 후 다시 시작해주세요. (Provider: ${session.ai_provider || '없음'}, Model: ${session.ai_model || '없음'})`;
        console.error('❌ AI 모델 정보 누락:', errorMsg);
        throw new Error(errorMsg);
      }

      // 세션에서 가져온 설정으로 업데이트
      settings = {
        aiModel: session.ai_model,
        aiProvider: session.ai_provider
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
        supabase.from('pre_analysis_sessions').select('*').eq('id', sessionId),
        supabase.from('document_analyses').select('*').eq('session_id', sessionId),
        supabase.from('ai_questions').select('*').eq('session_id', sessionId),
        supabase.from('user_answers').select('*').eq('session_id', sessionId),
      ]);

      if (sessionRes.error) {
        return { success: false, error: sessionRes.error.message };
      }

      if (!sessionRes.data || sessionRes.data.length === 0) {
        return { success: false, error: '세션을 찾을 수 없습니다.' };
      }

      return {
        success: true,
        data: {
          session: sessionRes.data[0],
          analyses: analysesRes.data || [],
          questions: questionsRes.data || [],
          answers: answersRes.data || [],
        },
      };
    } catch (error) {
      return { success: false, error: '세션 데이터 수집 중 오류가 발생했습니다.' };
    }
  }

  private async generateAIReport(sessionId: string, sessionData: any, options: ReportGenerationOptions): Promise<any> {
    console.log('🤖 [ultrathink] generateAIReport 메서드 시작 (스트리밍)');
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
      // AI 설정 가져오기 - DB 세션 데이터에서 직접 추출
      const aiProvider = sessionData.session?.ai_provider;
      const aiModel = sessionData.session?.ai_model;

      console.log('⚙️ [ultrathink] DB에서 읽어온 AI 설정:', {
        aiProvider,
        aiModel,
        sessionId: sessionData.session?.id,
        hasProvider: !!aiProvider,
        hasModel: !!aiModel
      });

      // DB에 AI 모델 정보가 없으면 명확한 오류 발생
      if (!aiProvider || !aiModel) {
        const errorMsg = `AI 모델 정보가 세션에 저장되지 않았습니다. Left 사이드바에서 AI 모델을 선택한 후 다시 시작해주세요. (Provider: ${aiProvider || '없음'}, Model: ${aiModel || '없음'})`;
        console.error('❌ [ultrathink] AI 모델 정보 누락:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('🔗 [ultrathink] AI 스트리밍 API 호출 시작...');
      // API 라우트를 통한 AI 보고서 생성 (스트리밍)
      const response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        reportPrompt,
        16000, // 🔥 8000→16000으로 증가: 배열/객체 포함 완전한 보고서 생성
        0.2,
        (_chunk, fullContent) => {
          // 실시간 진행 상황 전달
          const charCount = fullContent.length;
          const estimatedProgress = Math.min(95, 80 + Math.floor(charCount / 500)); // 80~95% 진행률

          console.log(`📊 [Streaming] 진행 중: ${charCount} chars, ${estimatedProgress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress: estimatedProgress,
            message: `보고서 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(err => {
            console.warn('⚠️ 진행 상황 업데이트 실패:', err);
          });
        }
      );
      console.log('🔗 [ultrathink] AI 스트리밍 응답 완료:', {
        hasContent: !!response.content,
        contentLength: response.content?.length,
        contentPreview: response.content?.substring(0, 200)
      });

      console.log('🔍 [ultrathink] AI 응답 파싱 시작...');
      console.log('📝 [ultrathink] 전체 AI 응답 길이:', response.content?.length);
      console.log('📝 [ultrathink] AI 응답 시작 500자:', response.content?.substring(0, 500));
      console.log('📝 [ultrathink] AI 응답 끝 500자:', response.content?.substring(Math.max(0, (response.content?.length || 0) - 500)));

      // 🔥 baselineData와 agencyPerspective 포함 여부 사전 체크
      const hasBaselineDataKeyword = response.content?.includes('baselineData') || response.content?.includes('baseline_data');
      const hasAgencyPerspectiveKeyword = response.content?.includes('agencyPerspective') || response.content?.includes('agency_perspective');
      console.log('🔍 [ultrathink] 핵심 필드 키워드 존재 여부:', {
        hasBaselineData: hasBaselineDataKeyword,
        hasAgencyPerspective: hasAgencyPerspectiveKeyword,
      });

      // 응답 파싱
      const reportContent = this.parseReportResponse(response.content, analyses, answers);
      console.log('🔍 [ultrathink] 응답 파싱 완료:', {
        hasSummary: !!reportContent.summary,
        summaryLength: reportContent.summary?.length,
        keyInsightsCount: reportContent.keyInsights?.length,
        // 🔥 baselineData 상세 로깅 추가
        hasBaselineData: !!reportContent.baselineData,
        baselineDataKeys: reportContent.baselineData ? Object.keys(reportContent.baselineData) : [],
        requirementsCount: reportContent.baselineData?.requirements?.length || 0,
        techStackCount: reportContent.baselineData?.technicalStack?.length || reportContent.baselineData?.technical_stack?.length || 0,
      });

      // 🔥 baselineData 전체 구조 출력 (디버깅)
      console.log('📋 [ultrathink] baselineData 전체:', JSON.stringify(reportContent.baselineData, null, 2));

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
      console.error('❌ [ultrathink] 오류 스택:', error instanceof Error ? error.stack : 'No stack trace');

      // 🔥 오류를 throw하여 상위에서 처리하도록 함
      throw error;
    }
  }

  private generateReportPrompt(analyses: any[], questions: any[], answers: any[], _options: ReportGenerationOptions): string {
    const analysisContext = analyses.map((analysis, index) =>
      `### 문서 ${index + 1}: ${analysis.file_name || '제목 없음'}
- 요약: ${analysis.analysis_result?.summary || '분석 요약 없음'}
- 주요 내용: ${JSON.stringify(analysis.analysis_result?.keyPoints || []).substring(0, 500)}
- 복잡도: ${analysis.analysis_result?.complexity || 'N/A'}`
    ).join('\n\n');

    const qaContext = answers.map((a, index) => {
      const question = questions.find(q => q.id === a.question_id);
      return `**Q${index + 1}**: ${question?.question || '질문 없음'}
**A${index + 1}**: ${a.answer || '답변 없음'}
**확신도**: ${a.confidence || 50}%
**카테고리**: ${question?.category || 'general'}`;
    }).join('\n\n');

    return `# 🎯 웹에이전시 엘루오씨앤씨 - 프로젝트 사전 분석 보고서 작성

당신은 **웹에이전시 엘루오씨앤씨**의 수석 프로젝트 분석가입니다.
다음 프로젝트에 대한 **심층적이고 전문적인 분석 보고서**를 작성해야 합니다.

## 📋 수집된 프로젝트 데이터

### 1. 업로드된 문서 분석 결과 (${analyses.length}개):
${analysisContext || '분석된 문서가 없습니다.'}

### 2. 질문-답변 데이터 (${answers.length}/${questions.length}개 답변 완료):
${qaContext || '질문-답변 데이터가 없습니다.'}

---

## 🎨 보고서 작성 지침

### 역할 및 관점:
- **회사**: 웹에이전시 엘루오씨앤씨
- **담당**: 웹사이트 기획, UI/UX 디자인, 퍼블리싱, 프론트엔드/백엔드 개발
- **목표**: 프로젝트의 **수락 여부 결정** 및 **실행 계획 수립**

### 분석 관점 (필수):
1. **기획 관점**: 요구사항 명확성, 비즈니스 가치, 실행 가능성
2. **디자인 관점**: UI/UX 복잡도, 디자인 시스템 필요성, 브랜딩 요소
3. **퍼블리싱 관점**: 브라우저 호환성, 반응형 난이도, 접근성 요구사항
4. **개발 관점**: 기술적 복잡도, 아키텍처 설계, 보안/성능 고려사항

### 심층 분석 요구사항:
- **예상 문제점 및 리스크**: 기술적/비즈니스적/일정적/예산적 위험 요소를 **면밀히 분석**
- **실행 계획**: 단계별 구체적인 작업 계획 및 마일스톤
- **비용 추정**: 기획/디자인/개발/테스트/배포 단계별 상세 비용
- **프로젝트 수락/드랍 의견**: 명확한 근거와 함께 최종 의견 제시

---

## 📝 출력 형식 (JSON)

**⚠️ 중요: 아래 모든 필드는 필수입니다. 특히 baselineData와 agencyPerspective는 반드시 완전히 작성해야 합니다.**

다음 JSON 형식으로 **매우 상세하고 전문적인** 보고서를 작성하세요:

\`\`\`json
{
  "summary": "프로젝트 전체에 대한 300자 이상의 종합 요약 (프로젝트명, 목적, 범위, 핵심 특징)",
  "executiveSummary": "경영진용 핵심 요약 (200자 이상): 비즈니스 가치, 투자 대비 효과, 주요 리스크, 최종 권장사항",

  "keyInsights": [
    "프로젝트의 핵심 강점 또는 기회 (5개 이상)",
    "각 인사이트는 구체적이고 실행 가능한 내용으로 작성"
  ],

  "riskAssessment": {
    "high": [
      {
        "id": "risk-1",
        "category": "technical|business|timeline|budget|resource",
        "title": "위험 제목",
        "description": "위험에 대한 상세 설명 (100자 이상)",
        "probability": 0-100,
        "impact": 0-100,
        "severity": "high",
        "mitigation": "구체적인 완화 방안 (50자 이상)"
      }
    ],
    "medium": [],
    "low": [],
    "overallScore": 0-100
  },

  "recommendations": [
    "구체적이고 실행 가능한 권장사항 (10개 이상)",
    "기술적/비즈니스적/관리적 측면을 모두 포함"
  ],

  "baselineData": {
    "requirements": [
      "문서와 답변에서 식별된 핵심 기능 요구사항 (10개 이상)",
      "각 요구사항은 구체적이고 명확하게 작성"
    ],
    "stakeholders": [
      "프로젝트 관련 이해관계자 목록 (문서에서 추출)",
      "각 이해관계자의 역할과 관심사 포함"
    ],
    "constraints": [
      "프로젝트 제약사항 (일정, 예산, 기술, 규제 등, 5개 이상)",
      "각 제약사항은 구체적이고 측정 가능하게 작성"
    ],
    "timeline": [
      {
        "phase": "단계명",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "duration": 일수,
        "milestones": ["마일스톤"]
      }
    ],
    "budgetEstimates": {
      "development": 60,
      "design": 20,
      "testing": 15,
      "infrastructure": 5
    },
    "technicalStack": [
      "문서와 답변 기반 기술 스택 (5개 이상, 없으면 추천)",
      "프론트엔드, 백엔드, 데이터베이스, 인프라 등 모두 포함"
    ],
    "integrationPoints": [
      "외부 시스템 통합 포인트 (문서에서 추출, 3개 이상)",
      "각 통합 포인트의 목적과 데이터 흐름 포함"
    ]
  },

  "agencyPerspective": {
    "projectDecision": {
      "recommendation": "accept|conditional_accept|decline",
      "confidence": 0-100,
      "reasoning": "프로젝트 수락/조건부수락/거절 결정 근거 (100자 이상)",
      "conditions": ["조건부 수락 시 필요한 조건 (2개 이상, 없으면 빈 배열)"]
    },

    "perspectives": {
      "planning": {
        "feasibility": 0-100,
        "estimatedEffort": "예상 공수",
        "keyConsiderations": ["핵심 고려사항 3개"]
      },
      "design": {
        "complexity": "low|medium|high|very_high",
        "estimatedHours": 예상 시간,
        "requiredSkills": ["필요 스킬 2-3개"]
      },
      "publishing": {
        "responsiveComplexity": "low|medium|high",
        "estimatedHours": 예상 시간,
        "compatibility": ["브라우저 목록 2-3개"]
      },
      "development": {
        "technicalComplexity": "low|medium|high|very_high",
        "estimatedManMonths": 예상 인월,
        "criticalTechnologies": ["핵심 기술 3개"]
      }
    },

    "detailedRisks": [
      {
        "title": "주요 리스크 제목",
        "description": "리스크 설명 (50자 이상)",
        "severity": "low|medium|high|critical",
        "mitigation": "완화 방안"
      }
    ],

    "executionPlan": {
      "phases": [
        {
          "name": "단계명",
          "duration": 일수,
          "deliverables": ["산출물"]
        }
      ],
      "totalEstimatedDays": 전체 일수
    },

    "costEstimate": {
      "total": 총비용,
      "currency": "KRW",
      "confidence": 0-100
    }
  }
}
\`\`\`

**⚠️ 필수 작성 필드 (빠짐없이 모두 작성)**:
1. ✅ **summary** - 프로젝트 종합 요약 (200자 이상)
2. ✅ **executiveSummary** - 경영진용 요약 (150자 이상)
3. ✅ **keyInsights** - 핵심 인사이트 (5개 이상)
4. ✅ **riskAssessment** - 위험 평가 (high/medium/low)
5. ✅ **recommendations** - 권장사항 (10개 이상)
6. ✅ **baselineData** - requirements (10개), stakeholders (3개), constraints (5개), technicalStack (5개) 반드시 포함
7. ✅ **agencyPerspective** - projectDecision, perspectives (4가지 모두), detailedRisks (3개), executionPlan, costEstimate 포함

---

## 출력 형식 필수 규칙

**⚠️ 반드시 순수 JSON만 반환하세요:**
- ❌ 설명문 없이
- ❌ 마크다운 코드 블록 없이
- ❌ 추가 텍스트 없이
- ✅ 오직 중괄호 { 로 시작해서 } 로 끝나는 순수 JSON 객체만 반환

**⚠️ 필수 필드 누락 시 보고서가 저장되지 않습니다!**
다음 필드들은 **절대** 빈 배열이나 빈 객체로 남기지 마세요:
- summary, executiveSummary (각 150자 이상)
- keyInsights (최소 5개)
- recommendations (최소 10개)
- baselineData.requirements (최소 10개)
- baselineData.technicalStack (최소 5개)
- baselineData.stakeholders (최소 3개)
- baselineData.constraints (최소 5개)
- agencyPerspective.projectDecision (recommendation, confidence, reasoning 필수)
- agencyPerspective.perspectives (planning, design, publishing, development 모두 포함)
- agencyPerspective.detailedRisks (최소 3개)
- agencyPerspective.executionPlan (phases 최소 3개, totalEstimatedDays 필수)
- agencyPerspective.costEstimate (total, currency, confidence 필수)

**정확한 출력 형식**:
{ "summary": "...", "executiveSummary": "...", "keyInsights": [...], "riskAssessment": {...}, "recommendations": [...], "baselineData": {...}, "agencyPerspective": {...} }

위 JSON 형식을 **정확히 준수**하여 **모든 필드를 완전히 작성**해주세요.`;
  }

  private parseReportResponse(response: string, analyses: any[], _answers: any[]): any {
    console.log('🔍 [parseReportResponse] 파싱 시작');
    console.log('📏 [parseReportResponse] 응답 길이:', response.length);
    console.log('📝 [parseReportResponse] 응답 미리보기:', response.substring(0, 500));

    // 🔥 NEW: 응답 정제 - 제어 문자, 잘못된 이스케이프 시퀀스 제거
    let cleanedResponse = response
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // 제어 문자 제거
      .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '') // 잘못된 이스케이프 제거
      .trim();

    // =====================================================
    // 시도 1: ```json ``` 코드 블록에서 JSON 추출
    // =====================================================
    try {
      console.log('🔎 [parseReportResponse] 시도 1: 코드 블록에서 JSON 추출...');
      const codeBlockMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);

      if (codeBlockMatch && codeBlockMatch[1]) {
        const jsonString = codeBlockMatch[1].trim();
        console.log('✅ [parseReportResponse] 코드 블록 발견!');
        console.log('📝 [parseReportResponse] JSON 길이:', jsonString.length);
        console.log('📝 [parseReportResponse] JSON 시작:', jsonString.substring(0, 200));

        const parsedReport = JSON.parse(jsonString);
        console.log('✅ [parseReportResponse] 코드 블록 JSON 파싱 성공!');
        console.log('📊 [parseReportResponse] 파싱된 키:', Object.keys(parsedReport));

        // 🔥 baselineData 내용 상세 로깅
        console.log('📋 [parseReportResponse] baselineData 상세:', {
          exists: !!parsedReport.baselineData,
          requirementsCount: parsedReport.baselineData?.requirements?.length || 0,
          stakeholdersCount: parsedReport.baselineData?.stakeholders?.length || 0,
          constraintsCount: parsedReport.baselineData?.constraints?.length || 0,
          techStackCount: parsedReport.baselineData?.technicalStack?.length || 0,
        });
        console.log('🏢 [parseReportResponse] agencyPerspective 상세:', {
          exists: !!parsedReport.agencyPerspective,
          hasProjectDecision: !!parsedReport.agencyPerspective?.projectDecision,
          hasPerspectives: !!parsedReport.agencyPerspective?.perspectives,
        });

        return parsedReport;
      } else {
        console.log('ℹ️ [parseReportResponse] 코드 블록 없음, 다음 방법 시도...');
      }
    } catch (error) {
      console.error('❌ [parseReportResponse] 코드 블록 JSON 파싱 실패:', error);
    }

    // =====================================================
    // 시도 2: 순수 JSON 객체 추출 (중괄호로 시작하고 끝나는 부분)
    // =====================================================
    try {
      console.log('🔎 [parseReportResponse] 시도 2: 순수 JSON 객체 추출...');

      // 첫 번째 {를 찾고, 중괄호 균형을 맞춰서 JSON 추출
      const firstBrace = cleanedResponse.indexOf('{');
      if (firstBrace !== -1) {
        let braceCount = 0;
        let endIndex = -1;
        let inString = false;
        let escapeNext = false;

        for (let i = firstBrace; i < cleanedResponse.length; i++) {
          const char = cleanedResponse[i];

          // 문자열 내부 여부 추적
          if (char === '"' && !escapeNext) {
            inString = !inString;
          }

          // 이스케이프 문자 처리
          escapeNext = (char === '\\' && !escapeNext);

          // 문자열 외부에서만 중괄호 카운트
          if (!inString && !escapeNext) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;

            if (braceCount === 0) {
              endIndex = i + 1;
              break;
            }
          }
        }

        if (endIndex > firstBrace) {
          const jsonString = cleanedResponse.substring(firstBrace, endIndex);
          console.log('✅ [parseReportResponse] JSON 객체 발견!');
          console.log('📝 [parseReportResponse] JSON 길이:', jsonString.length);
          console.log('📝 [parseReportResponse] JSON 시작:', jsonString.substring(0, 200));
          console.log('📝 [parseReportResponse] JSON 끝:', jsonString.substring(jsonString.length - 200));

          const parsedReport = JSON.parse(jsonString);
          console.log('✅ [parseReportResponse] 순수 JSON 파싱 성공!');
          console.log('📊 [parseReportResponse] 파싱된 키:', Object.keys(parsedReport));

          // 🔥 baselineData 내용 상세 로깅
          console.log('📋 [parseReportResponse] baselineData 상세:', {
            exists: !!parsedReport.baselineData,
            requirementsCount: parsedReport.baselineData?.requirements?.length || 0,
            stakeholdersCount: parsedReport.baselineData?.stakeholders?.length || 0,
            constraintsCount: parsedReport.baselineData?.constraints?.length || 0,
            techStackCount: parsedReport.baselineData?.technicalStack?.length || 0,
          });
          console.log('🏢 [parseReportResponse] agencyPerspective 상세:', {
            exists: !!parsedReport.agencyPerspective,
            hasProjectDecision: !!parsedReport.agencyPerspective?.projectDecision,
            hasPerspectives: !!parsedReport.agencyPerspective?.perspectives,
          });

          return parsedReport;
        } else {
          console.warn('⚠️ [parseReportResponse] 중괄호 균형이 맞지 않음');
        }
      } else {
        console.warn('⚠️ [parseReportResponse] JSON 객체를 찾을 수 없음');
      }
    } catch (error) {
      console.error('❌ [parseReportResponse] 순수 JSON 파싱 실패:', error);
      console.error('파싱 에러 상세:', {
        message: (error as Error).message,
        name: (error as Error).name
      });
    }

    // =====================================================
    // 🔥 NEW 시도 2.5: 불완전한 JSON 복구 시도 (배열/객체 처리 강화)
    // =====================================================
    try {
      console.log('🔎 [parseReportResponse] 시도 2.5: 불완전한 JSON 복구 (배열/객체)...');

      const firstBrace = cleanedResponse.indexOf('{');
      if (firstBrace !== -1) {
        let jsonString = cleanedResponse.substring(firstBrace);

        // 🔥 여러 패턴으로 마지막 완전한 요소 찾기
        const patterns = [
          { pattern: /",\s*$/g, desc: '객체 필드 끝' },           // "value",
          { pattern: /"\s*\]/g, desc: '배열 문자열 끝' },         // "value"]
          { pattern: /},\s*$/g, desc: '배열 내 객체 끝' },        // {...},
          { pattern: /\}\s*\]/g, desc: '배열 내 마지막 객체' },   // {...}]
        ];

        let bestMatch = -1;
        let bestPattern = null;

        // 모든 패턴에서 가장 마지막 위치 찾기
        for (const { pattern, desc } of patterns) {
          const matches = [...jsonString.matchAll(pattern)];
          if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const matchEnd = lastMatch.index! + lastMatch[0].length;
            if (matchEnd > bestMatch) {
              bestMatch = matchEnd;
              bestPattern = desc;
            }
          }
        }

        console.log('🔍 [parseReportResponse] 마지막 완전한 요소:', {
          위치: bestMatch,
          패턴: bestPattern,
          원본길이: jsonString.length
        });

        if (bestMatch > 0) {
          // 마지막 완전한 요소까지 잘라냄
          let truncatedJson = jsonString.substring(0, bestMatch);

          // 🔥 닫히지 않은 배열과 객체 닫기
          const openBrackets = (truncatedJson.match(/\[/g) || []).length;
          const closeBrackets = (truncatedJson.match(/\]/g) || []).length;
          const openBraces = (truncatedJson.match(/\{/g) || []).length;
          const closeBraces = (truncatedJson.match(/\}/g) || []).length;

          const missingBrackets = openBrackets - closeBrackets;
          const missingBraces = openBraces - closeBraces;

          // 배열 먼저 닫기
          for (let i = 0; i < missingBrackets; i++) {
            truncatedJson += '\n]';
          }
          // 객체 닫기
          for (let i = 0; i < missingBraces; i++) {
            truncatedJson += '\n}';
          }

          console.log('🔧 [parseReportResponse] JSON 복구 시도:', {
            원본길이: jsonString.length,
            복구길이: truncatedJson.length,
            추가된배열닫기: missingBrackets,
            추가된객체닫기: missingBraces,
            미리보기: truncatedJson.substring(Math.max(0, truncatedJson.length - 300))
          });

          const parsedReport = JSON.parse(truncatedJson);
          console.warn('✅ [parseReportResponse] 불완전한 JSON 복구 성공!');
          console.log('📊 [parseReportResponse] 복구된 키:', Object.keys(parsedReport));

          // 복구된 데이터임을 표시
          parsedReport._recovered = true;
          parsedReport._recoveryNote = '응답이 중간에 끊겨서 일부 내용이 누락되었습니다.';

          // 🔥 baselineData 내용 상세 로깅
          console.log('📋 [parseReportResponse] baselineData 상세 (복구됨):', {
            exists: !!parsedReport.baselineData,
            requirementsCount: parsedReport.baselineData?.requirements?.length || 0,
            stakeholdersCount: parsedReport.baselineData?.stakeholders?.length || 0,
            constraintsCount: parsedReport.baselineData?.constraints?.length || 0,
            techStackCount: parsedReport.baselineData?.technicalStack?.length || 0,
          });

          return parsedReport;
        } else {
          console.warn('⚠️ [parseReportResponse] 완전한 요소를 찾을 수 없음');
        }
      }
    } catch (error) {
      console.error('❌ [parseReportResponse] JSON 복구 실패:', error);
    }

    // =====================================================
    // 🔥 NEW 시도 3: JSON.parse 직접 시도 (전체 응답)
    // =====================================================
    try {
      console.log('🔎 [parseReportResponse] 시도 3: 전체 응답 직접 파싱...');
      const parsedReport = JSON.parse(cleanedResponse);
      console.log('✅ [parseReportResponse] 전체 응답 직접 파싱 성공!');
      console.log('📊 [parseReportResponse] 파싱된 키:', Object.keys(parsedReport));

      // 🔥 baselineData 내용 상세 로깅
      console.log('📋 [parseReportResponse] baselineData 상세:', {
        exists: !!parsedReport.baselineData,
        requirementsCount: parsedReport.baselineData?.requirements?.length || 0,
        stakeholdersCount: parsedReport.baselineData?.stakeholders?.length || 0,
        constraintsCount: parsedReport.baselineData?.constraints?.length || 0,
        techStackCount: parsedReport.baselineData?.technicalStack?.length || 0,
      });

      return parsedReport;
    } catch (error) {
      console.error('❌ [parseReportResponse] 전체 응답 직접 파싱 실패:', error);
    }

    // =====================================================
    // 시도 4: 텍스트 폴백 - 텍스트에서 정보 추출
    // =====================================================
    console.warn('⚠️ [parseReportResponse] 모든 JSON 파싱 실패, 텍스트 추출 모드로 전환');
    console.log('📝 [parseReportResponse] 전체 응답 (처음 1000자):', cleanedResponse.substring(0, 1000));
    console.log('📝 [parseReportResponse] 전체 응답 (마지막 1000자):', cleanedResponse.substring(Math.max(0, cleanedResponse.length - 1000)));

    return {
      summary: this.extractSectionFromText(response, '요약') ||
               this.extractSectionFromText(response, 'summary') ||
               '프로젝트 분석이 완료되었습니다.',
      executiveSummary: this.extractSectionFromText(response, '경영진') ||
                        this.extractSectionFromText(response, 'executive') ||
                        '프로젝트 추진을 위한 핵심 정보가 준비되었습니다.',
      keyInsights: this.extractListFromTextResponse(response, '인사이트') ||
                   this.extractListFromTextResponse(response, 'insight') ||
                   ['분석 결과가 정리되었습니다.'],
      riskAssessment: {
        high: this.extractListFromTextResponse(response, '높은 위험') ||
              this.extractListFromTextResponse(response, 'high risk') || [],
        medium: this.extractListFromTextResponse(response, '중간 위험') ||
                this.extractListFromTextResponse(response, 'medium risk') || [],
        low: this.extractListFromTextResponse(response, '낮은 위험') ||
             this.extractListFromTextResponse(response, 'low risk') || [],
        overallScore: 50,
      },
      recommendations: this.extractListFromTextResponse(response, '권장') ||
                        this.extractListFromTextResponse(response, 'recommend') ||
                        ['상세 검토를 권장합니다.'],
      baselineData: {
        requirements: analyses.flatMap(a => a.analysis_result?.keyRequirements || []),
        stakeholders: analyses.flatMap(a => a.analysis_result?.stakeholders || []),
        constraints: analyses.flatMap(a => a.analysis_result?.constraints || []),
        timeline: analyses.flatMap(a => a.analysis_result?.timeline || []),
        technicalStack: analyses.flatMap(a => a.analysis_result?.technicalStack || []),
        integrationPoints: [],
      },
      visualizationData: {},
      __parseMethod: 'text_fallback', // 어떤 방법으로 파싱되었는지 표시
    };
  }

  private extractSectionFromText(text: string, keyword: string): string | null {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      // 키워드를 포함하는 줄 찾기 (섹션 헤더)
      if (line.includes(keyword.toLowerCase()) ||
          line.includes(`${keyword}:`) ||
          line.includes(`**${keyword}`) ||
          line.includes(`# ${keyword}`)) {

        // 다음 줄부터 빈 줄이 나올 때까지 또는 최대 10줄까지 수집
        const contentLines: string[] = [];
        for (let j = i + 1; j < Math.min(i + 11, lines.length); j++) {
          const contentLine = lines[j].trim();

          // 빈 줄이거나 다른 섹션 시작이면 중단
          if (!contentLine || contentLine.startsWith('#') || contentLine.startsWith('**')) {
            break;
          }

          contentLines.push(contentLine);
        }

        const content = contentLines.join(' ').trim();
        // 최소 30자 이상의 의미 있는 내용만 반환
        return content.length > 30 ? content : null;
      }
    }
    return null;
  }

  private extractListFromTextResponse(text: string, keyword: string): string[] {
    const lines = text.split('\n');
    const relevant: string[] = [];

    let inRelevantSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // 관련 섹션 시작 감지
      if (lowerLine.includes(keyword.toLowerCase())) {
        inRelevantSection = true;
        continue;
      }

      // 다른 섹션 시작 시 종료
      if (inRelevantSection && (line.startsWith('#') || line.startsWith('**'))) {
        break;
      }

      // 리스트 항목 추출 (-, *, •, 숫자. 등으로 시작)
      if (inRelevantSection) {
        const trimmed = line.trim();
        if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
          const item = trimmed
            .replace(/^[-*•]\s+/, '')
            .replace(/^\d+\.\s+/, '')
            .trim();

          if (item.length > 10) { // 최소 10자 이상
            relevant.push(item);
          }
        }
      }
    }

    return relevant.slice(0, 10); // 최대 10개까지 확장
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

      // 문서별 상태가 있고 분석이 완료된 경우에만 document_analyses에 저장
      // processing 상태는 아직 분석 결과가 없으므로 저장하지 않음
      if (update.documentId && update.status && update.status !== 'processing') {
        try {
          // 먼저 기존 레코드가 있는지 확인
          const { data: existingAnalyses, error: selectError } = await supabase
            .from('document_analyses')
            .select('id')
            .eq('session_id', update.sessionId)
            .eq('document_id', update.documentId);

          if (selectError && selectError.code !== 'PGRST116') {
            // PGRST116은 "no rows returned" 오류이므로 정상적인 경우
            console.error('❌ 기존 분석 데이터 조회 오류:', selectError);
            return;
          }

          const analysisData = {
            session_id: update.sessionId,
            document_id: update.documentId,
            status: update.status,
            // progress 컬럼은 document_analyses 테이블에 없으므로 제거
          };

          const existingAnalysis = existingAnalyses?.[0];
          if (existingAnalysis?.id) {
            // 기존 레코드가 있으면 update
            const { error: updateError } = await supabase
              .from('document_analyses')
              .update({ status: update.status })
              .eq('id', existingAnalysis.id);

            if (updateError) {
              console.error('❌ 문서 분석 상태 업데이트 오류:', updateError);
            } else {
              console.log('✅ 문서 분석 상태 업데이트 완료:', { id: existingAnalysis.id, status: update.status });
            }
          } else {
            // 기존 레코드가 없으면 insert (상태만 저장하는 간단한 레코드)
            const { error: insertError } = await supabase
              .from('document_analyses')
              .insert({
                session_id: update.sessionId,
                document_id: update.documentId,
                status: update.status,
                category: 'business', // 허용된 카테고리 중 business 사용
                analysis_result: {}, // 기본값
                mcp_enrichment: {} // 기본값
              });

            if (insertError) {
              console.error('❌ 문서 분석 상태 저장 오류:', insertError);
            } else {
              console.log('✅ 문서 분석 상태 저장 완료:', analysisData);
            }
          }
        } catch (docError) {
          console.error('❌ 문서 분석 상태 처리 중 오류:', docError);
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
    const maxRetries = 1; // 🔥 2 → 1로 감소 (총 2회만 시도, 비용 절감)
    const baseTimeout = 320000; // 320초 (5분 20초) - 서버 타임아웃(300초)보다 길게 설정

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 [${provider}/${model}] AI 완성 요청 (시도 ${attempt + 1}/${maxRetries + 1}):`, {
          provider,
          model,
          promptLength: prompt.length,
          timeout: baseTimeout
        });

        // 인증 토큰 추출
        let authToken: string | undefined
        try {
          const session = await supabase?.auth.getSession()
          authToken = session?.data.session?.access_token
          console.log(`🔐 [${provider}/${model}] 인증 토큰:`, authToken ? '있음' : '없음')
        } catch (authError) {
          console.warn(`🔐 [${provider}/${model}] 인증 토큰 추출 실패:`, authError)
        }

        // 개발환경에서는 Vercel 프로덕션 API 직접 호출, 프로덕션에서는 상대 경로 사용
        const apiUrl = import.meta.env.DEV
          ? 'https://ea-plan-05.vercel.app/api/ai/completion'
          : '/api/ai/completion';

        console.log(`🌐 [${provider}/${model}] 호출 URL:`, apiUrl);

        // 인증 헤더 구성
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`
        }

        // AbortController를 사용한 타임아웃 처리
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.warn(`⏰ [${provider}/${model}] 요청 타임아웃 (${baseTimeout}ms)`);
        }, baseTimeout);

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              provider,
              model,
              prompt,
              maxTokens,
              temperature
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // 🔍 상세한 에러 정보 로깅 (근본 원인 파악용)
            console.error(`❌ [${provider}/${model}] HTTP ${response.status} 오류 - 상세 정보:`, {
              status: response.status,
              statusText: response.statusText,
              provider,
              model,
              attempt: attempt + 1,
              errorData: JSON.stringify(errorData, null, 2), // 전체 에러 데이터 확인
              url: apiUrl,
              timestamp: new Date().toISOString()
            });

            // 504 Gateway Timeout인 경우에만 재시도
            if (response.status === 504 && attempt < maxRetries) {
              console.warn(`🔄 [${provider}/${model}] 504 Gateway Timeout, ${attempt + 2}차 시도 중...`);
              console.warn(`⚠️  재시도 시 추가 비용이 발생할 수 있습니다!`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              continue;
            }

            // 🚫 500 에러는 재시도하지 않음 (불필요한 중복 호출 방지)
            // 500은 서버 내부 오류이므로 재시도해도 같은 결과
            if (response.status === 500) {
              const detailedError = errorData.details || errorData.error || '서버 내부 오류';
              console.error(`🔴 [${provider}/${model}] 500 에러 - 재시도 없이 즉시 실패 처리:`, {
                provider,
                model,
                error: detailedError,
                fullErrorData: errorData
              });

              throw new Error(
                `AI API 서버 오류 (${provider} ${model}):\n${detailedError}\n\n` +
                `이 오류는 재시도하지 않습니다. 콘솔에서 상세 정보를 확인하세요.`
              );
            }

            // 기타 에러 (400번대 등)
            throw new Error(
              errorData.details ||
              errorData.error ||
              `API 요청 실패: ${response.status} ${response.statusText}`
            );
          }

          const data = await response.json();
          console.log(`✅ [${provider}/${model}] 성공 (${attempt + 1}차 시도)`, {
            inputTokens: data.usage?.inputTokens,
            outputTokens: data.usage?.outputTokens,
            cost: data.cost?.totalCost
          });
          return data;

        } catch (fetchError) {
          clearTimeout(timeoutId);

          // AbortError (타임아웃)인 경우 재시도
          if (fetchError instanceof Error && fetchError.name === 'AbortError' && attempt < maxRetries) {
            console.warn(`🔄 [${provider}/${model}] 요청 타임아웃, ${attempt + 2}차 시도 중...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1))); // 점진적 대기
            continue;
          }

          throw fetchError;
        }

      } catch (error) {
        // 마지막 시도에서도 실패한 경우에만 에러 처리
        if (attempt === maxRetries) {
          console.error(`❌ [${provider}/${model}] 모든 재시도 실패:`, error);

          // 타임아웃 관련 에러 메시지 개선
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              throw new Error(`API 요청이 ${baseTimeout / 1000}초 후 타임아웃되었습니다. 문서가 너무 크거나 AI 서비스가 지연되고 있습니다. 더 짧은 문서로 다시 시도해주세요.`);
            } else if (error.message.includes('504')) {
              throw new Error('AI 서비스에서 처리 시간이 초과되었습니다. 잠시 후 다시 시도하거나 더 짧은 문서로 분석해주세요.');
            } else if (error instanceof TypeError && error.message.includes('fetch')) {
              throw new Error('네트워크 연결을 확인해주세요. API 서버에 접근할 수 없습니다.');
            }
          }

          throw error;
        }

        // 재시도 가능한 에러인 경우 계속 진행
        console.warn(`⚠️ [${provider}/${model}] ${attempt + 1}차 시도 실패, 재시도 중...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    throw new Error('예상치 못한 오류가 발생했습니다.');
  }

  /**
   * AI 완성 API 호출 - 스트리밍 버전 (보고서 생성 전용)
   *
   * @param provider AI 제공자 (anthropic, openai, google)
   * @param model 모델 이름
   * @param prompt 프롬프트
   * @param maxTokens 최대 토큰 수
   * @param temperature 온도 값
   * @param onProgress 실시간 진행 콜백 (선택)
   * @returns AI 응답 데이터
   */
  private async callAICompletionAPIStreaming(
    provider: string,
    model: string,
    prompt: string,
    maxTokens: number = 6000,
    temperature: number = 0.3,
    onProgress?: (chunk: string, fullContent: string) => void
  ): Promise<any> {
    try {
      console.log(`🌊 [${provider}/${model}] AI 스트리밍 요청:`, {
        provider,
        model,
        promptLength: prompt.length,
        maxTokens,
        temperature
      });

      // 인증 토큰 추출
      let authToken: string | undefined
      try {
        const session = await supabase?.auth.getSession()
        authToken = session?.data.session?.access_token
        console.log(`🔐 [${provider}/${model}] 인증 토큰:`, authToken ? '있음' : '없음')
      } catch (authError) {
        console.warn(`🔐 [${provider}/${model}] 인증 토큰 추출 실패:`, authError)
      }

      // 개발환경에서는 Vercel 프로덕션 API 직접 호출, 프로덕션에서는 상대 경로 사용
      const apiUrl = import.meta.env.DEV
        ? 'https://ea-plan-05.vercel.app/api/ai/completion-streaming'
        : '/api/ai/completion-streaming';

      console.log(`🌐 [${provider}/${model}] 스트리밍 URL:`, apiUrl);

      // 인증 헤더 구성
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      // 스트리밍 요청 시작
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
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
        console.error(`❌ [${provider}/${model}] HTTP ${response.status} 오류:`, errorData);
        throw new Error(
          errorData.error ||
          `API 요청 실패: ${response.status} ${response.statusText}`
        );
      }

      // SSE 응답 처리
      if (!response.body) {
        throw new Error('응답 본문이 없습니다.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let finalData: any = null;
      const startTime = Date.now(); // 🔥 응답 시간 측정용

      console.log('📥 [Streaming] SSE 수신 시작');

      let chunkCount = 0;
      let textEventCount = 0;
      let doneEventCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        chunkCount++;

        // 🔥 스트림 종료 전 남은 버퍼 처리
        if (done) {
          console.log('✅ [Streaming] 스트림 완료', {
            chunkCount,
            textEventCount,
            doneEventCount,
            bufferLength: buffer.length,
            bufferContent: buffer.substring(0, 200)
          });

          // 남은 버퍼에 데이터가 있으면 처리
          if (buffer.trim()) {
            console.log('🔍 [Streaming] 남은 버퍼 처리 시작:', buffer.substring(0, 200));
            const remainingLines = buffer.split('\n');

            for (const line of remainingLines) {
              if (line.trim() && line.startsWith('data:')) {
                const data = line.slice(5).trim();
                console.log('🔍 [Streaming] 남은 버퍼 라인:', data.substring(0, 100));

                if (data && data !== '[DONE]') {
                  try {
                    const event = JSON.parse(data);
                    console.log('🔍 [Streaming] 남은 버퍼 이벤트 타입:', event.type);

                    if (event.type === 'done') {
                      doneEventCount++;
                      if (!finalData) {
                        finalData = event;
                        console.log('✅ [Streaming] 남은 버퍼에서 최종 데이터 발견!', {
                          contentLength: event.content?.length,
                          inputTokens: event.usage?.inputTokens,
                          outputTokens: event.usage?.outputTokens,
                        });
                      } else {
                        console.log('ℹ️ [Streaming] 남은 버퍼의 중복 done 이벤트 무시');
                      }
                    }
                  } catch (parseError) {
                    console.warn('⚠️ 남은 버퍼 파싱 오류:', data.substring(0, 100), parseError);
                  }
                }
              }
            }
          } else {
            console.warn('⚠️ [Streaming] 남은 버퍼가 비어있습니다!');
          }
          break;
        }

        // SSE 데이터 파싱
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // 마지막 불완전한 라인은 다음 청크로
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();

            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);

              // 실시간 텍스트 조각
              if (event.type === 'text') {
                textEventCount++;
                fullContent = event.fullContent || fullContent;

                // 진행 콜백 호출
                if (onProgress) {
                  onProgress(event.content, fullContent);
                }

                // 첫 이벤트와 마지막 몇 개만 로깅
                if (textEventCount <= 3 || textEventCount % 50 === 0) {
                  console.log(`📝 [Streaming] 텍스트 수신 #${textEventCount}:`, fullContent.length, 'chars');
                }
              }

              // 최종 완료 이벤트 (중복 방지: 첫 번째만 처리)
              if (event.type === 'done') {
                doneEventCount++;
                if (!finalData) {
                  finalData = event;
                  console.log('✅ [Streaming] 최종 데이터 수신 (루프 중):', {
                    contentLength: event.content?.length,
                    inputTokens: event.usage?.inputTokens,
                    outputTokens: event.usage?.outputTokens,
                    totalCost: event.cost?.totalCost
                  });
                } else {
                  console.log('ℹ️ [Streaming] 중복 done 이벤트 무시 (이미 수신함)');
                }
              }

              // 에러 이벤트
              if (event.type === 'error') {
                throw new Error(event.error || '스트리밍 중 오류가 발생했습니다.');
              }

            } catch (parseError) {
              console.warn('⚠️ SSE 파싱 오류:', data);
            }
          }
        }
      }

      // 최종 데이터 검증
      if (!finalData) {
        console.error('❌ [Streaming] 최종 데이터 누락!', {
          textEventCount,
          doneEventCount,
          fullContentLength: fullContent.length,
          fullContentPreview: fullContent.substring(0, 200),
          bufferWasEmpty: !buffer.trim()
        });

        // 🔥 Fallback: fullContent가 있으면 done 이벤트 없이도 처리
        if (fullContent && fullContent.length > 100) {
          console.warn('⚠️ [Streaming] Fallback 모드: fullContent로 최종 데이터 생성 (done 이벤트 누락)');

          // 토큰 추정 함수
          const estimateTokens = (text: string): number => {
            switch (provider) {
              case 'anthropic': return Math.ceil(text.length / 3.5)
              case 'openai': return Math.ceil(text.length / 4)
              case 'google': return Math.ceil(text.length / 4)
              default: return Math.ceil(text.length / 4)
            }
          }

          const inputTokens = estimateTokens(prompt)
          const outputTokens = estimateTokens(fullContent)

          // 모델별 가격 정보
          const getPricing = (): { inputCost: number; outputCost: number } => {
            if (provider === 'anthropic') {
              const pricing: Record<string, { inputCost: number; outputCost: number }> = {
                'claude-sonnet-4-20250514': { inputCost: 3, outputCost: 15 },
                'claude-3-5-sonnet-20241022': { inputCost: 3, outputCost: 15 },
                'claude-3-haiku-20240307': { inputCost: 0.25, outputCost: 1.25 }
              }
              return pricing[model] || { inputCost: 3, outputCost: 15 }
            } else if (provider === 'openai') {
              const pricing: Record<string, { inputCost: number; outputCost: number }> = {
                'gpt-4o': { inputCost: 5, outputCost: 15 },
                'gpt-4o-mini': { inputCost: 0.15, outputCost: 0.6 }
              }
              return pricing[model] || { inputCost: 5, outputCost: 15 }
            } else {
              const pricing: Record<string, { inputCost: number; outputCost: number }> = {
                'gemini-2.0-flash-exp': { inputCost: 0.075, outputCost: 0.3 },
                'gemini-1.5-pro': { inputCost: 1.25, outputCost: 5 }
              }
              return pricing[model] || { inputCost: 1.25, outputCost: 5 }
            }
          }

          const pricing = getPricing()
          const inputCost = (inputTokens * pricing.inputCost) / 1000000
          const outputCost = (outputTokens * pricing.outputCost) / 1000000

          finalData = {
            type: 'done',
            content: fullContent,
            usage: {
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens
            },
            cost: {
              inputCost,
              outputCost,
              totalCost: inputCost + outputCost
            },
            model,
            finishReason: 'stop',
            responseTime: Date.now() - startTime
          }

          console.log('✅ [Streaming] Fallback 데이터 생성 완료:', {
            contentLength: fullContent.length,
            inputTokens,
            outputTokens,
            totalCost: finalData.cost.totalCost,
            responseTime: finalData.responseTime
          });
        } else {
          throw new Error('스트리밍이 완료되었지만 최종 데이터를 받지 못했습니다.');
        }
      }

      console.log('🎉 [Streaming] 전체 통계:', {
        totalChunks: chunkCount,
        totalTextEvents: textEventCount,
        totalDoneEvents: doneEventCount,
        finalContentLength: finalData.content?.length,
        hasFinalData: !!finalData
      });

      console.log(`✅ [${provider}/${model}] 스트리밍 성공`, {
        inputTokens: finalData.usage?.inputTokens,
        outputTokens: finalData.usage?.outputTokens,
        cost: finalData.cost?.totalCost,
        responseTime: finalData.responseTime
      });

      return finalData;

    } catch (error) {
      console.error(`❌ [${provider}/${model}] 스트리밍 오류:`, error);

      // 타임아웃 관련 에러 메시지 개선
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('스트리밍 요청이 중단되었습니다. 네트워크 연결을 확인해주세요.');
        } else if (error.message.includes('504')) {
          throw new Error('AI 서비스에서 처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('네트워크 연결을 확인해주세요. API 서버에 접근할 수 없습니다.');
        }
      }

      throw error;
    }
  }

  // 제거됨: callAIDirectly 함수 - 모든 환경에서 API 라우트 사용으로 통합

  /**
   * AI 질문 생성을 위한 프롬프트 구성
   */
  private buildQuestionGenerationPrompt(
    projectName: string,
    projectDescription: string,
    projectTypes: string[],
    documentContext: Array<{ name: string; summary?: string; content?: string }>,
    analyses: any[],
    maxQuestions: number = 15
  ): string {
    let prompt = `당신은 전문 프로젝트 컨설턴트입니다. 사전 분석 단계에서 프로젝트 이해를 위한 핵심 질문들을 생성해주세요.

프로젝트 정보:
- 프로젝트명: ${projectName || '미정'}
- 프로젝트 설명: ${projectDescription || '미정'}
- 프로젝트 유형: ${projectTypes.length > 0 ? projectTypes.join(', ') : '미정'}

`;

    if (documentContext.length > 0) {
      prompt += `업로드된 문서 분석 결과:
${documentContext.map((doc, index) =>
  `${index + 1}. ${doc.name}${doc.summary ? ` - ${doc.summary}` : ''}`
).join('\n')}

`;
    }

    // 🔥 분석 결과 기반 문서 복잡도 계산
    const complexityScore = this.calculateDocumentComplexity(documentContext, analyses);
    const questionRange = this.calculateQuestionRange(complexityScore, maxQuestions);

    console.log('📊 문서 복잡도 분석:', {
      complexityScore,
      questionRange,
      documentsCount: documentContext.length,
      analysesCount: analyses.length
    });

    prompt += `요구사항:
1. 프로젝트 분석 결과를 기반으로 **최소 ${questionRange.min}개에서 최대 ${questionRange.max}개 사이의 질문**을 생성하세요.
   - 문서 복잡도: ${complexityScore}/100점
   - 권장 범위: ${questionRange.min}-${questionRange.max}개
   - 복잡도가 높을수록(상세한 요구사항, 기술스택, 이해관계자가 많을수록) 더 많은 심화 질문 생성 (범위 상한)
   - 복잡도가 낮으면 핵심적인 필수 질문만 생성 (범위 하한)
   - 동일한 문서라도 분석 관점에 따라 다른 질문을 생성할 수 있습니다

2. 다양한 관점을 포함하세요: 기술적 요구사항, 비즈니스 목표, 일정, 예산, 위험 요소, 이해관계자, 디자인 등
3. 각 질문은 구체적이고 실행 가능한 답변을 유도해야 합니다.
4. 업로드된 문서가 있다면 해당 내용을 반영한 질문을 포함하세요.
5. 질문이 부족하면 프로젝트 관리 일반론적인 질문으로 보충하세요.

**중요: category 필드는 반드시 다음 값 중 하나만 사용하세요:**
- technical: 기술적 요구사항, 기술 스택, 아키텍처 관련
- business: 비즈니스 목표, 프로젝트 개요, 사업 요구사항
- timeline: 일정, 스케줄, 마일스톤 관련
- budget: 예산, 비용, 자원 계획 관련
- risks: 위험 요소, 리스크 관리 관련
- stakeholders: 이해관계자, 팀 구성, 역할 관련
- design: 디자인, UI/UX, 사용자 경험 관련

출력 형식 (JSON):
{
  "questions": [
    {
      "category": "technical|business|timeline|budget|risks|stakeholders|design",
      "question": "구체적인 질문 내용",
      "context": "질문의 배경이나 도움말",
      "required": true|false,
      "expectedFormat": "text|textarea|select|number",
      "confidenceScore": 0.0-1.0
    }
  ]
}

정확한 JSON 형식만 반환하고 다른 설명은 포함하지 마세요.`;

    return prompt;
  }

  /**
   * 문서 내용 기반 복잡도 계산 (개선됨)
   */
  private calculateDocumentComplexity(
    documentContext: Array<{ name: string; summary?: string; content?: string }>,
    analyses: any[]
  ): number {
    let score = 0;

    // 🔥 기본 복잡도 보장 (최소 30점)
    // 이유: 아무리 간단한 프로젝트도 최소한의 질문은 필요
    let baseScore = 30;

    // 1. 문서 내용 분석 (최대 40점)
    let contentScore = 0;
    documentContext.forEach(doc => {
      const summaryLength = (doc.summary || '').length;
      const contentLength = (doc.content || '').length;
      const totalLength = summaryLength + contentLength;

      // 🔥 개선: 내용 길이 기준 완화 (200자당 1점 → 더 높은 점수)
      // 1000자: 5점, 2000자: 10점
      const docScore = Math.min(10, totalLength / 200);
      contentScore += docScore;
    });
    score += Math.min(40, contentScore);

    // 2. 분석 결과 복잡도 (최대 60점)
    let analysisScore = 0;
    analyses.forEach(analysis => {
      const result = analysis.analysis_result;
      if (!result) return;

      // 각 카테고리별 요소 개수 계산
      const requirements = Array.isArray(result.keyRequirements) ? result.keyRequirements.length : 0;
      const stakeholders = Array.isArray(result.stakeholders) ? result.stakeholders.length : 0;
      const constraints = Array.isArray(result.constraints) ? result.constraints.length : 0;
      const risks = Array.isArray(result.risks) ? result.risks.length : 0;
      const opportunities = Array.isArray(result.opportunities) ? result.opportunities.length : 0;
      const techStack = Array.isArray(result.technicalStack) ? result.technicalStack.length : 0;
      const timeline = Array.isArray(result.timeline) ? result.timeline.length : 0;

      // 총 요소 개수
      const totalElements = requirements + stakeholders + constraints + risks + opportunities + techStack + timeline;

      // 🔥 개선: 요소 개수 기준 완화 (15개당 15점 → 더 높은 점수)
      // 15개: 15점, 30개 이상: 30점
      const elementsScore = Math.min(30, (totalElements / 15) * 15);
      analysisScore += elementsScore;
    });
    score += Math.min(60, analysisScore);

    // 🔥 최소 복잡도 보장
    score = Math.max(baseScore, score);

    // 최종 점수를 0-100 범위로 정규화
    return Math.round(Math.min(100, score));
  }

  /**
   * 복잡도 기반 질문 개수 범위 계산 (동적 생성을 위한 범위 반환)
   */
  private calculateQuestionRange(complexityScore: number, maxQuestions: number): { min: number; max: number } {
    // 🔥 복잡도에 따른 질문 개수 범위 매핑
    // AI가 범위 내에서 자유롭게 선택하여 매번 다른 개수 생성 가능
    // 30-40점: 10-15개 (범위: 5개)
    // 41-60점: 12-18개 (범위: 6개)
    // 61-80점: 15-22개 (범위: 7개)
    // 81-100점: 18-25개 (범위: 7개)

    let min: number;
    let max: number;

    if (complexityScore <= 40) {
      min = 10;
      max = 15;
    } else if (complexityScore <= 60) {
      min = 12;
      max = 18;
    } else if (complexityScore <= 80) {
      min = 15;
      max = 22;
    } else {
      min = 18;
      max = 25;
    }

    // maxQuestions 제한 적용
    max = Math.min(max, maxQuestions);
    min = Math.min(min, max); // min이 max를 초과하지 않도록

    return { min, max };
  }

  /**
   * AI 카테고리를 데이터베이스 허용 카테고리로 매핑
   */
  private mapCategoryToAllowed(category: string): string {
    const categoryMap: Record<string, string> = {
      // 기술 관련
      '기술 요구사항': 'technical',
      '기술적 요구사항': 'technical',
      '기술': 'technical',
      '기술스택': 'technical',
      '기술 스택': 'technical',
      'technical': 'technical',
      'tech': 'technical',

      // 비즈니스 관련
      '비즈니스 목표': 'business',
      '비즈니스': 'business',
      '사업': 'business',
      '프로젝트 개요': 'business',
      'business': 'business',

      // 일정 관련
      '일정 관리': 'timeline',
      '일정': 'timeline',
      '스케줄': 'timeline',
      '타임라인': 'timeline',
      'timeline': 'timeline',
      'schedule': 'timeline',

      // 예산 관련
      '예산 계획': 'budget',
      '예산': 'budget',
      '비용': 'budget',
      'budget': 'budget',
      'cost': 'budget',

      // 위험 관리
      '위험 관리': 'risks',
      '위험': 'risks',
      '리스크': 'risks',
      'risks': 'risks',
      'risk': 'risks',

      // 이해관계자
      '이해관계자': 'stakeholders',
      '관계자': 'stakeholders',
      '팀': 'stakeholders',
      'stakeholders': 'stakeholders',
      'team': 'stakeholders',

      // 디자인
      '디자인': 'design',
      '설계': 'design',
      'design': 'design',
      'ui': 'design',
      'ux': 'design'
    };

    const normalized = category.toLowerCase().trim();

    // 직접 매칭
    if (categoryMap[category]) {
      return categoryMap[category];
    }

    if (categoryMap[normalized]) {
      return categoryMap[normalized];
    }

    // 키워드 포함 검사
    for (const [key, value] of Object.entries(categoryMap)) {
      if (category.includes(key) || normalized.includes(key.toLowerCase())) {
        return value;
      }
    }

    // 기본값
    return 'business';
  }

  /**
   * 질문 부족 시 기본 질문 생성
   */
  private generateFallbackQuestions(count: number, existingCategories: string[]): any[] {
    const fallbackQuestions = [
      // Business
      {
        category: 'business',
        question: '이 프로젝트의 핵심 비즈니스 목표는 무엇입니까?',
        context: '프로젝트를 통해 달성하고자 하는 사업적 성과와 기대 효과를 설명해주세요.',
        required: true,
        expectedFormat: 'textarea',
        confidenceScore: 0.9
      },
      {
        category: 'business',
        question: '주요 타겟 사용자 또는 고객은 누구입니까?',
        context: '서비스를 이용할 주요 사용자 그룹과 그들의 특징을 설명해주세요.',
        required: true,
        expectedFormat: 'textarea',
        confidenceScore: 0.9
      },
      // Technical
      {
        category: 'technical',
        question: '선호하는 기술 스택이나 플랫폼이 있습니까?',
        context: '프론트엔드, 백엔드, 데이터베이스 등 사용하고 싶은 기술이나 제약사항을 알려주세요.',
        required: false,
        expectedFormat: 'textarea',
        confidenceScore: 0.8
      },
      {
        category: 'technical',
        question: '예상되는 사용자 규모와 성능 요구사항은 어떻게 됩니까?',
        context: '동시 사용자 수, 데이터 처리량, 응답 시간 등 성능 관련 요구사항을 설명해주세요.',
        required: false,
        expectedFormat: 'textarea',
        confidenceScore: 0.8
      },
      // Timeline
      {
        category: 'timeline',
        question: '프로젝트의 목표 완료 시기는 언제입니까?',
        context: '프로젝트 완료 희망 시기와 주요 마일스톤을 알려주세요.',
        required: true,
        expectedFormat: 'textarea',
        confidenceScore: 0.9
      },
      {
        category: 'timeline',
        question: '단계별 출시 계획이 있습니까?',
        context: 'MVP(최소 기능 제품) 우선 출시 후 단계적 기능 추가 등의 계획을 설명해주세요.',
        required: false,
        expectedFormat: 'textarea',
        confidenceScore: 0.8
      },
      // Budget
      {
        category: 'budget',
        question: '프로젝트 예산 범위는 어떻게 됩니까?',
        context: '예산 규모와 예산 배분 우선순위를 알려주세요.',
        required: false,
        expectedFormat: 'textarea',
        confidenceScore: 0.7
      },
      // Stakeholders
      {
        category: 'stakeholders',
        question: '프로젝트 의사결정 주체는 누구입니까?',
        context: '주요 의사결정권자와 이해관계자를 알려주세요.',
        required: true,
        expectedFormat: 'textarea',
        confidenceScore: 0.9
      },
      {
        category: 'stakeholders',
        question: '내부 개발팀이 있습니까, 아니면 외부 개발이 필요합니까?',
        context: '개발 리소스 현황과 외주 필요 여부를 설명해주세요.',
        required: false,
        expectedFormat: 'select',
        confidenceScore: 0.8
      },
      // Risks
      {
        category: 'risks',
        question: '프로젝트의 주요 위험 요소나 우려 사항은 무엇입니까?',
        context: '기술적, 비즈니스적, 조직적 측면에서 예상되는 리스크를 알려주세요.',
        required: false,
        expectedFormat: 'textarea',
        confidenceScore: 0.8
      },
      // Design
      {
        category: 'design',
        question: '디자인 가이드나 브랜드 아이덴티티가 있습니까?',
        context: '기존 디자인 시스템, 브랜드 컬러, 스타일 가이드 등을 알려주세요.',
        required: false,
        expectedFormat: 'textarea',
        confidenceScore: 0.7
      },
      {
        category: 'design',
        question: '접근성(Accessibility) 요구사항이 있습니까?',
        context: 'WCAG 준수, 다국어 지원, 장애인 접근성 등의 요구사항을 설명해주세요.',
        required: false,
        expectedFormat: 'textarea',
        confidenceScore: 0.7
      }
    ];

    // 🔥 이미 존재하는 카테고리를 제외하고 다양한 카테고리 우선 선택
    const categoryCount: Record<string, number> = {};
    existingCategories.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // 카테고리 빈도가 낮은 순서로 정렬
    const sortedQuestions = [...fallbackQuestions].sort((a, b) => {
      const aCount = categoryCount[a.category] || 0;
      const bCount = categoryCount[b.category] || 0;
      return aCount - bCount;
    });

    return sortedQuestions.slice(0, count);
  }

  /**
   * AI 응답에서 질문 배열 파싱
   */
  private parseQuestionResponse(response: string): any[] {
    try {
      console.log('🔍 AI 질문 응답 파싱 시작:', { responseLength: response.length });

      // JSON 부분만 추출
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON 형식을 찾을 수 없습니다.');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ JSON 파싱 성공:', { hasQuestions: !!parsed.questions, questionsCount: parsed.questions?.length || 0 });

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('questions 배열을 찾을 수 없습니다.');
      }

      // 질문 형식 검증 및 정규화 (카테고리 매핑 적용)
      const validQuestions = parsed.questions
        .map((q: any) => ({
          category: this.mapCategoryToAllowed(q.category || '기타'),
          question: q.question || '',
          context: q.context || q.helpText || '',
          required: q.required || false,
          expectedFormat: q.expectedFormat || q.type || 'textarea',
          relatedDocuments: [],
          confidenceScore: q.confidenceScore || q.confidence || 0.8
        }))
        .filter((q: any) => q.question.trim() !== '');

      console.log('📊 질문 검증 완료:', {
        originalCount: parsed.questions.length,
        validCount: validQuestions.length,
        categories: [...new Set(validQuestions.map((q: any) => q.category))]
      });

      return validQuestions;

    } catch (error) {
      console.error('❌ 질문 파싱 실패:', error);
      console.error('❌ 응답 내용 (처음 500자):', response.substring(0, 500));

      // 파싱 실패 시 기본 질문 반환 (허용된 카테고리 사용)
      return [
        {
          category: 'business',
          question: '이 프로젝트의 주요 목표와 기대 효과는 무엇입니까?',
          context: '프로젝트의 핵심 목적과 성공 시 달성하고자 하는 구체적인 결과를 설명해주세요.',
          required: true,
          expectedFormat: 'textarea',
          relatedDocuments: [],
          confidenceScore: 0.9
        },
        {
          category: 'technical',
          question: '프로젝트에 필요한 주요 기술 스택과 기술적 제약사항은 무엇입니까?',
          context: '사용할 프로그래밍 언어, 프레임워크, 데이터베이스, 인프라 등과 기술적 한계를 포함해주세요.',
          required: true,
          expectedFormat: 'textarea',
          relatedDocuments: [],
          confidenceScore: 0.9
        },
        {
          category: 'timeline',
          question: '프로젝트의 목표 완료 시점과 주요 마일스톤은 언제입니까?',
          context: '전체 일정과 중요한 중간 단계들의 예상 완료 날짜를 설정해주세요.',
          required: true,
          expectedFormat: 'textarea',
          relatedDocuments: [],
          confidenceScore: 0.9
        },
        {
          category: 'budget',
          question: '프로젝트의 예상 예산 규모와 주요 비용 요소는 무엇입니까?',
          context: '인력비, 인프라비, 라이선스 비용 등 주요 예산 항목들을 포함해주세요.',
          required: false,
          expectedFormat: 'textarea',
          relatedDocuments: [],
          confidenceScore: 0.8
        },
        {
          category: 'risks',
          question: '프로젝트 진행 시 예상되는 주요 위험 요소와 대응 방안은 무엇입니까?',
          context: '기술적, 일정상, 예산상 위험 요소들과 이에 대한 대비책을 설명해주세요.',
          required: false,
          expectedFormat: 'textarea',
          relatedDocuments: [],
          confidenceScore: 0.8
        },
        {
          category: 'stakeholders',
          question: '프로젝트의 주요 이해관계자와 각자의 역할은 무엇입니까?',
          context: '클라이언트, 개발팀, 운영팀 등 관련된 사람들과 그들의 책임을 명확히 해주세요.',
          required: false,
          expectedFormat: 'textarea',
          relatedDocuments: [],
          confidenceScore: 0.8
        }
      ];
    }
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