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
          sessionId,
          document.file_name // 🆕 파일명 추가 (플랫폼 타입 감지용)
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
    sessionId: string,
    fileName: string = '' // 🆕 파일명 추가 (플랫폼 타입 감지용)
  ): Promise<any> {
    const startTime = Date.now();

    // 기본 설정 (catch 블록에서도 접근 가능하도록 함수 시작 부분에 정의)
    let settings = {
      aiModel: 'claude-sonnet-4-5-20250929',
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

      // 🆕 재시도 메커니즘 구현 (최대 3회 시도)
      const MAX_RETRIES = 3;
      let lastAnalysis: any = null;
      let cumulativeInputTokens = 0;
      let cumulativeOutputTokens = 0;
      let cumulativeCost = 0;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`\n🔄 [시도 ${attempt}/${MAX_RETRIES}] JSON 파싱 안정화 재시도 시작`);

        try {
          // 분석 프롬프트 생성 (시도마다 동일)
          const analysisPrompt = this.generateAnalysisPrompt(content, category, fileName);
          console.log('📝 분석 프롬프트 생성 완료', {
            contentLength: content.length,
            category,
            fileName: fileName.substring(0, 50),
            promptLength: analysisPrompt.length,
            attempt
          });

          // Vercel API 라우트를 통한 AI 호출 (프로덕션 환경 지원)
          console.log('🤖 AI 호출 시작 (Vercel API 라우트)', {
            model: settings.aiModel,
            provider: settings.aiProvider,
            maxTokens: 4000,
            temperature: 0.3,
            promptPreview: analysisPrompt.substring(0, 200) + '...',
            sessionId,
            attempt
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
            hasCost: !!response?.cost,
            attempt
          });

          console.log('✅ AI 응답 수신 완료', {
            responseLength: response.content.length,
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            totalCost: response.cost.totalCost,
            attempt
          });

          // 비용 누적
          cumulativeInputTokens += response.usage.inputTokens;
          cumulativeOutputTokens += response.usage.outputTokens;
          cumulativeCost += response.cost.totalCost;

          // 응답을 파싱하여 구조화된 분석 결과 생성
          const analysis = this.parseAnalysisResponse(response.content, category);
          lastAnalysis = analysis;

          console.log('📊 분석 결과 파싱 완료', {
            analysisKeys: Object.keys(analysis),
            attempt
          });

          // 🆕 강화된 JSON 검증 - Fallback 모드 감지
          const validation = this.validateAnalysisQuality(analysis);

          if (validation.isValid) {
            console.log(`✅ [시도 ${attempt}] JSON 파싱 성공 - 품질 검증 통과`, {
              hasAdditionalInfoNeeded: validation.hasAdditionalInfoNeeded,
              hasValidContent: validation.hasValidContent
            });

            // 성공 시 즉시 반환
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
              inputTokens: cumulativeInputTokens,
              outputTokens: cumulativeOutputTokens,
              cost: cumulativeCost,
            };
          } else {
            console.warn(`⚠️ [시도 ${attempt}] JSON 품질 검증 실패 - 재시도 필요`, {
              isFallbackMode: validation.isFallbackMode,
              hasAdditionalInfoNeeded: validation.hasAdditionalInfoNeeded,
              hasValidContent: validation.hasValidContent,
              failureReasons: validation.failureReasons
            });

            if (attempt < MAX_RETRIES) {
              // 지수 백오프 대기
              const waitMs = 1000 * attempt;
              console.log(`⏳ ${waitMs}ms 대기 후 재시도...`);
              await new Promise(resolve => setTimeout(resolve, waitMs));
            }
          }

        } catch (attemptError) {
          console.error(`❌ [시도 ${attempt}] AI 호출 또는 파싱 실패:`, attemptError);

          if (attempt < MAX_RETRIES) {
            const waitMs = 1000 * attempt;
            console.log(`⏳ ${waitMs}ms 대기 후 재시도...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
          } else {
            console.error(`❌ 최대 재시도 횟수 도달 - 마지막 결과 사용`);
          }
        }
      }

      // 🆕 모든 재시도 실패 시 마지막 결과 반환 (또는 기본 구조)
      console.warn(`⚠️ ${MAX_RETRIES}회 재시도 모두 실패 - 마지막 결과로 진행`);

      const finalAnalysis = lastAnalysis || {
        summary: `${category || '문서'} 분석 완료 (JSON 검증 실패)`,
        keyRequirements: ['분석 정보 추출 실패 - 문서 확인 필요'],
        stakeholders: ['이해관계자 정보 미확인 - 질문 필요'],
        constraints: ['제약사항 미확인 - 질문 필요'],
        risks: ['위험 요소 미확인 - 질문 필요'],
        opportunities: ['기회 요소 미확인 - 질문 필요'],
        technicalStack: ['기술 스택 미확인 - 질문 필요'],
        timeline: ['일정 정보 미확인 - 질문 필요'],
        additionalInfoNeeded: [
          // 🔥 최소한의 필수 정보 항목 보장 (질문 생성을 위해)
          {
            field: 'technicalStack',
            currentInfo: '정보 없음',
            neededInfo: '프론트엔드, 백엔드, 데이터베이스, 인프라 등 기술 스택 전체',
            priority: 'high',
            reason: '개발 아키텍처 설계 및 개발 공수 산정에 필수'
          },
          {
            field: 'timeline',
            currentInfo: '정보 없음',
            neededInfo: '프로젝트 시작일, 주요 마일스톤, 최종 완료 목표일',
            priority: 'high',
            reason: '프로젝트 일정 계획 수립 및 리소스 배분에 필수'
          },
          {
            field: 'budget',
            currentInfo: '정보 없음',
            neededInfo: '총 프로젝트 예산 규모 및 주요 비용 항목',
            priority: 'high',
            reason: '프로젝트 범위 결정 및 기술 선택에 영향'
          },
          {
            field: 'requirements',
            currentInfo: '정보 없음',
            neededInfo: '주요 기능 요구사항 및 우선순위',
            priority: 'high',
            reason: 'MVP 범위 정의 및 개발 계획 수립에 필수'
          },
          {
            field: 'stakeholders',
            currentInfo: '정보 없음',
            neededInfo: '프로젝트 주요 의사결정권자 및 담당자 정보',
            priority: 'medium',
            reason: '커뮤니케이션 체계 수립 및 승인 프로세스 정의에 필요'
          }
        ]
      };

      const processingTime = Date.now() - startTime;

      return {
        analysis: finalAnalysis,
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
        inputTokens: cumulativeInputTokens,
        outputTokens: cumulativeOutputTokens,
        cost: cumulativeCost,
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

  private generateAnalysisPrompt(content: string, _category?: DocumentCategory, fileName: string = ''): string {
    // 플랫폼 타입 감지
    const platformType = this.detectPlatformType(content, fileName);
    const platformHint = platformType === 'app'
      ? '(모바일 앱 프로젝트: iOS/Android 관련 정보 우선 추출)'
      : platformType === 'web'
      ? '(웹사이트 프로젝트: 브라우저/SEO 관련 정보 우선 추출)'
      : '';

    return `🚨 JSON만 반환 🚨
설명 없이 { 로 시작하는 순수 JSON만 반환하세요.
코드 블록(\`\`\`json) 절대 사용 금지!

아래 JSON 스키마를 정확히 따르세요:

{
  "summary": "프로젝트 전체 요약 (200자 이상)",
  "keyRequirements": ["핵심 요구사항 1", "핵심 요구사항 2", "..."],
  "stakeholders": ["이해관계자명 - 역할", "..."],
  "constraints": ["제약사항 (예산/일정/기술) 1", "..."],
  "risks": ["위험 요소 1", "..."],
  "opportunities": ["기회 요소 1", "..."],
  "technicalStack": ["기술 스택 (버전 포함) 1", "..."],
  "timeline": ["일정 정보 (날짜 포함) 1", "..."],
  "additionalInfoNeeded": [
    {
      "field": "technicalStack",
      "currentInfo": "React 사용 확인",
      "neededInfo": "상태관리 라이브러리, 라우터, 스타일링 도구",
      "priority": "high",
      "reason": "아키텍처 설계 및 공수 산정에 필수"
    },
    {
      "field": "timeline",
      "currentInfo": "대략적인 기간만 명시",
      "neededInfo": "구체적 시작일, 마일스톤 날짜, 최종 완료일",
      "priority": "high",
      "reason": "프로젝트 일정 계획 수립에 필수"
    }
  ]
}

---

문서 내용 ${platformHint}:
"""
${content}
"""

---

분석 가이드:
1. 문서에서 **명시된 사실만** 추출 (추측 금지)
2. 구체적 숫자, 날짜, 기술명, 버전 포함
3. "미확인" 항목은 additionalInfoNeeded에 반드시 추가
4. 각 배열은 최소 2개 이상 항목 포함
5. 🔥 **additionalInfoNeeded는 최소 3개 이상 필수!** 🔥
   - field: 필드명 (requirements, technicalStack, timeline, budget, stakeholders 등)
   - currentInfo: 문서에서 확인된 정보 (없으면 "정보 없음")
   - neededInfo: 추가로 필요한 구체적 정보
   - priority: high/medium/low
   - reason: 왜 이 정보가 필요한지 명확한 이유

⚠️ 다시 한번 강조: 설명 없이 JSON만 반환!
⚠️ 첫 글자 {, 마지막 글자 }로 시작/종료
⚠️ additionalInfoNeeded 최소 3개! 정보 완벽한 문서는 없음!`;
  }

  /**
   * 🆕 JSON 파싱 결과 검증 메서드
   * 필수 필드가 모두 존재하고 유효한 값인지 확인
   */
  private isValidAnalysisJSON(parsedData: any): { valid: boolean; missingFields: string[] } {
    const requiredFields = [
      'summary',
      'keyRequirements',
      'stakeholders',
      'constraints',
      'risks',
      'opportunities',
      'technicalStack',
      'timeline'
    ];

    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!parsedData[field]) {
        missingFields.push(field);
      } else if (Array.isArray(parsedData[field]) && parsedData[field].length === 0) {
        // 빈 배열도 누락으로 간주
        missingFields.push(field);
      } else if (typeof parsedData[field] === 'string' && parsedData[field].trim().length === 0) {
        // 빈 문자열도 누락으로 간주
        missingFields.push(field);
      }
    }

    const valid = missingFields.length === 0;

    if (!valid) {
      console.warn(`⚠️ JSON 검증 실패: ${missingFields.length}개 필드 누락`, missingFields);
    } else {
      console.log('✅ JSON 검증 성공: 모든 필수 필드 존재');
    }

    return { valid, missingFields };
  }

  /**
   * 🆕 분석 품질 검증 메서드 (Fallback 모드 감지 포함)
   * JSON 파싱 성공 여부와 내용 품질을 종합적으로 검증
   */
  private validateAnalysisQuality(analysis: any): {
    isValid: boolean;
    isFallbackMode: boolean;
    hasAdditionalInfoNeeded: boolean;
    hasValidContent: boolean;
    failureReasons: string[];
  } {
    const failureReasons: string[] = [];

    // 1. Fallback 모드 감지 (summary에 "JSON 파싱 실패" 포함)
    const isFallbackMode =
      analysis.summary &&
      typeof analysis.summary === 'string' &&
      (analysis.summary.includes('JSON 파싱 실패') ||
       analysis.summary.includes('텍스트 분석 수행'));

    if (isFallbackMode) {
      failureReasons.push('Fallback 모드 감지: AI가 JSON 형식을 반환하지 않음');
    }

    // 2. additionalInfoNeeded 필드 검증 (🆕 빈 배열 거부 추가)
    const hasAdditionalInfoNeeded =
      'additionalInfoNeeded' in analysis &&
      Array.isArray(analysis.additionalInfoNeeded) &&
      analysis.additionalInfoNeeded.length > 0; // 🆕 최소 1개 이상 필요

    if (!('additionalInfoNeeded' in analysis)) {
      failureReasons.push('additionalInfoNeeded 필드 누락');
    } else if (!Array.isArray(analysis.additionalInfoNeeded)) {
      failureReasons.push('additionalInfoNeeded 필드가 배열이 아님');
    } else if (analysis.additionalInfoNeeded.length === 0) {
      // 🆕 빈 배열 거부: 최종 보고서 작성을 위해 반드시 추가 정보 필요 항목이 있어야 함
      failureReasons.push('additionalInfoNeeded 배열이 비어있음 (최소 1개 이상 필요)');
    }

    // 3. 필수 필드 내용 품질 검증
    const requiredFields = [
      'summary',
      'keyRequirements',
      'stakeholders',
      'constraints',
      'risks',
      'opportunities',
      'technicalStack',
      'timeline'
    ];

    let hasValidContent = true;
    const fallbackKeywords = ['분석 정보 추출 실패', '미확인 - 질문 필요', '정보 부족', '확인 필요'];

    for (const field of requiredFields) {
      if (!analysis[field]) {
        failureReasons.push(`${field} 필드 누락`);
        hasValidContent = false;
        continue;
      }

      // 배열 필드 검증
      if (Array.isArray(analysis[field])) {
        if (analysis[field].length === 0) {
          failureReasons.push(`${field} 배열이 비어있음`);
          hasValidContent = false;
        } else {
          // 모든 항목이 Fallback 키워드를 포함하는지 확인
          const allFallback = analysis[field].every((item: any) =>
            typeof item === 'string' &&
            fallbackKeywords.some(keyword => item.includes(keyword))
          );

          if (allFallback) {
            failureReasons.push(`${field} 배열의 모든 항목이 Fallback 키워드 포함`);
            hasValidContent = false;
          }
        }
      }

      // 문자열 필드 검증 (summary)
      if (typeof analysis[field] === 'string') {
        if (analysis[field].trim().length === 0) {
          failureReasons.push(`${field} 문자열이 비어있음`);
          hasValidContent = false;
        } else if (analysis[field].length < 50 && field === 'summary') {
          failureReasons.push(`${field} 문자열이 너무 짧음 (최소 50자 필요)`);
          hasValidContent = false;
        }
      }
    }

    // 4. 최종 검증 결과
    const isValid =
      !isFallbackMode &&
      hasAdditionalInfoNeeded &&
      hasValidContent &&
      failureReasons.length === 0;

    if (!isValid) {
      console.warn('⚠️ 분석 품질 검증 실패:', {
        isFallbackMode,
        hasAdditionalInfoNeeded,
        hasValidContent,
        failureCount: failureReasons.length,
        failureReasons: failureReasons.slice(0, 3) // 처음 3개만 로깅
      });
    } else {
      console.log('✅ 분석 품질 검증 성공: 모든 기준 충족');
    }

    return {
      isValid,
      isFallbackMode,
      hasAdditionalInfoNeeded,
      hasValidContent,
      failureReasons
    };
  }

  private parseAnalysisResponse(response: string, category?: DocumentCategory): any {
    try {
      // Step 1: JSON 코드 블록 추출 시도 (```json ... ```)
      let jsonString = response;
      const codeBlockMatch = response.match(/```json\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
        console.log('✅ JSON 코드 블록 감지 및 추출 성공');
      }

      // Step 2: JSON 객체 추출 (중첩 객체 지원)
      // 첫 번째 { 부터 마지막 } 까지 추출
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
        throw new Error('JSON 형식을 찾을 수 없습니다.');
      }

      const extractedJson = jsonString.substring(firstBrace, lastBrace + 1);
      const parsedResponse = JSON.parse(extractedJson);

      console.log('✅ JSON 파싱 성공:', {
        hasSummary: !!parsedResponse.summary,
        keyRequirementsCount: parsedResponse.keyRequirements?.length || 0,
        stakeholdersCount: parsedResponse.stakeholders?.length || 0
      });

      // Step 3: 🆕 필수 필드 검증 (강화됨)
      const validation = this.isValidAnalysisJSON(parsedResponse);

      if (!validation.valid) {
        // 필수 필드 누락 시 기본값 설정 (기존 동작 보존)
        validation.missingFields.forEach(field => {
          if (field === 'summary') {
            parsedResponse[field] = `${category || '문서'} 분석 완료 (요약 정보 부족)`;
          } else {
            parsedResponse[field] = [`${field} 정보 미확인 - 질문 필요`];
          }
        });

        console.log('🔧 누락된 필드에 기본값 설정 완료');
      }

      return parsedResponse;

    } catch (error) {
      console.warn('❌ AI 응답 JSON 파싱 실패, 텍스트 분석으로 전환:', error);
      console.log('📝 원본 응답 (처음 500자):', response.substring(0, 500));
    }

    // 🔥 기존 폴백 로직 완전 보존 - JSON 파싱 실패 시 텍스트 분석
    console.log('🔄 폴백 모드: 텍스트 기반 정보 추출 시작');

    // 🆕 additionalInfoNeeded 추출 시도
    let additionalInfoNeeded = this.extractAdditionalInfoNeeded(response);

    // 🔥 Fallback 모드에서도 최소 1개 이상 보장
    if (additionalInfoNeeded.length === 0) {
      console.warn('⚠️ Fallback 모드: additionalInfoNeeded 추출 실패 - 기본 항목 추가');
      additionalInfoNeeded = [
        {
          field: 'requirements',
          currentInfo: '문서에서 부분적으로만 확인됨',
          neededInfo: '구체적인 기능 요구사항 및 우선순위',
          priority: 'high',
          reason: 'JSON 파싱 실패로 상세 분석 불가 - 추가 확인 필요'
        },
        {
          field: 'technicalStack',
          currentInfo: '문서에서 부분적으로만 확인됨',
          neededInfo: '사용 기술 스택, 프레임워크, 라이브러리 및 버전',
          priority: 'high',
          reason: 'JSON 파싱 실패로 상세 분석 불가 - 추가 확인 필요'
        },
        {
          field: 'timeline',
          currentInfo: '문서에서 부분적으로만 확인됨',
          neededInfo: '프로젝트 일정, 마일스톤, 주요 데드라인',
          priority: 'high',
          reason: 'JSON 파싱 실패로 상세 분석 불가 - 추가 확인 필요'
        }
      ];
    }

    return {
      summary: `${category || '문서'} 분석 완료 (JSON 파싱 실패로 텍스트 분석 수행)`,
      keyRequirements: this.extractListFromText(response, '요구사항'),
      stakeholders: this.extractListFromText(response, '이해관계자'),
      constraints: this.extractListFromText(response, '제약사항'),
      risks: this.extractListFromText(response, '위험'),
      opportunities: this.extractListFromText(response, '기회'),
      technicalStack: this.extractListFromText(response, '기술'),
      timeline: this.extractListFromText(response, '일정'),
      additionalInfoNeeded // 🆕 추출된 배열 사용 (최소 1개 보장)
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

  /**
   * 🆕 Fallback 모드에서 additionalInfoNeeded 추출 시도
   * AI 응답에 포함된 additionalInfoNeeded 배열을 찾아 파싱
   */
  private extractAdditionalInfoNeeded(text: string): Array<{
    field: string;
    currentInfo: string;
    neededInfo: string;
    priority: string;
    reason: string;
  }> {
    try {
      // 1. "additionalInfoNeeded" 키워드 찾기
      const additionalInfoPattern = /"additionalInfoNeeded"\s*:\s*\[([\s\S]*?)\]/;
      const match = text.match(additionalInfoPattern);

      if (!match) {
        console.log('⚠️ Fallback 모드: additionalInfoNeeded 패턴을 찾을 수 없음');
        return [];
      }

      const arrayContent = match[1];
      console.log('✅ Fallback 모드: additionalInfoNeeded 패턴 발견, 파싱 시도');

      // 2. 배열 내용을 JSON으로 파싱 시도
      try {
        const parsed = JSON.parse(`[${arrayContent}]`);

        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`✅ Fallback 모드: ${parsed.length}개의 additionalInfoNeeded 항목 추출 성공`);

          // 3. 유효성 검증 - 필수 필드가 있는 항목만 반환
          const validItems = parsed.filter((item: any) => {
            return (
              item &&
              typeof item === 'object' &&
              item.field &&
              item.neededInfo &&
              item.priority &&
              item.reason
            );
          });

          console.log(`✅ Fallback 모드: ${validItems.length}개의 유효한 항목 검증 완료`);
          return validItems;
        }
      } catch (parseError) {
        console.warn('⚠️ Fallback 모드: additionalInfoNeeded JSON 파싱 실패', parseError);
      }

      // 4. 정규식으로 개별 항목 추출 시도 (JSON 파싱 실패 시)
      console.log('🔄 Fallback 모드: 정규식으로 개별 항목 추출 시도');
      const items: Array<any> = [];
      const itemPattern = /\{[\s\S]*?"field"\s*:\s*"([^"]+)"[\s\S]*?"neededInfo"\s*:\s*"([^"]+)"[\s\S]*?"priority"\s*:\s*"([^"]+)"[\s\S]*?"reason"\s*:\s*"([^"]+)"[\s\S]*?\}/g;

      let itemMatch;
      while ((itemMatch = itemPattern.exec(arrayContent)) !== null) {
        items.push({
          field: itemMatch[1],
          currentInfo: '', // regex로는 추출 어려움
          neededInfo: itemMatch[2],
          priority: itemMatch[3],
          reason: itemMatch[4]
        });
      }

      if (items.length > 0) {
        console.log(`✅ Fallback 모드: 정규식으로 ${items.length}개 항목 추출 성공`);
        return items;
      }

    } catch (error) {
      console.error('❌ Fallback 모드: additionalInfoNeeded 추출 중 오류', error);
    }

    // 5. 🆕 텍스트 기반 추출: 키워드 감지 및 필수 필드 검증
    console.log('🔄 Fallback 모드: 텍스트 기반 추출 시작');
    const textBasedItems = this.extractFromTextContent(text);

    if (textBasedItems.length > 0) {
      console.log(`✅ Fallback 모드: 텍스트 기반으로 ${textBasedItems.length}개 항목 추출 성공`);
      return textBasedItems;
    }

    console.log('⚠️ Fallback 모드: 모든 추출 방법 실패, 빈 배열 반환');
    return [];
  }

  /**
   * 🆕 텍스트 내용 분석으로 additionalInfoNeeded 항목 생성
   * JSON 파싱 실패 시 텍스트 분석을 통해 누락된 정보 감지
   */
  private extractFromTextContent(text: string): Array<{
    field: string;
    currentInfo: string;
    neededInfo: string;
    priority: string;
    reason: string;
  }> {
    const items: Array<any> = [];
    const lowerText = text.toLowerCase();

    // 1. 키워드 기반 감지 ("미확인", "질문 필요", "확인 필요", "불명확", "명시되지 않음")
    const uncertainKeywords = ['미확인', '질문 필요', '확인 필요', '불명확', '명시되지 않음', '정보 부족', '추가 확인', '불분명'];
    const lines = text.split('\n');

    for (const line of lines) {
      for (const keyword of uncertainKeywords) {
        if (line.includes(keyword)) {
          // 해당 라인에서 필드명 추출 시도
          const fieldMatch = line.match(/(기술|일정|예산|인력|목표|범위|제약|요구사항)/);
          if (fieldMatch) {
            items.push({
              field: this.mapKoreanFieldToEnglish(fieldMatch[1]),
              currentInfo: line.substring(0, 50).trim(),
              neededInfo: `${fieldMatch[1]} 관련 구체적 정보 필요`,
              priority: 'high',
              reason: `문서에 "${keyword}" 표시됨`
            });
          }
        }
      }
    }

    // 2. 필수 필드 규칙 기반 검증
    const essentialFields = [
      { field: 'technicalStack', keyword: ['기술', 'tech', 'stack', 'framework', '프레임워크'], neededInfo: '사용 기술 스택 및 버전' },
      { field: 'timeline', keyword: ['일정', 'schedule', 'timeline', 'deadline', '기한'], neededInfo: '프로젝트 일정 및 마일스톤' },
      { field: 'budget', keyword: ['예산', 'budget', 'cost', '비용'], neededInfo: '프로젝트 예산 규모' },
      { field: 'stakeholders', keyword: ['담당자', 'stakeholder', '이해관계자', '팀', 'team'], neededInfo: '주요 이해관계자 및 역할' },
      { field: 'requirements', keyword: ['요구사항', 'requirement', '필요', 'need'], neededInfo: '구체적 기능 요구사항' }
    ];

    for (const essential of essentialFields) {
      const hasKeyword = essential.keyword.some(kw => lowerText.includes(kw.toLowerCase()));
      const alreadyAdded = items.some(item => item.field === essential.field);

      if (!hasKeyword && !alreadyAdded) {
        // 문서에 해당 키워드가 전혀 없는 경우 = 누락
        items.push({
          field: essential.field,
          currentInfo: '정보 없음',
          neededInfo: essential.neededInfo,
          priority: 'high',
          reason: '문서에 해당 정보가 명시되지 않음'
        });
      }
    }

    // 3. 최소 3개 항목 보장
    if (items.length < 3) {
      const defaultItems = [
        {
          field: 'technicalStack',
          currentInfo: '부분적 정보',
          neededInfo: '상세 기술 스택 및 버전 정보',
          priority: 'high',
          reason: '아키텍처 설계 및 공수 산정에 필수'
        },
        {
          field: 'timeline',
          currentInfo: '부분적 정보',
          neededInfo: '구체적 일정 및 마일스톤',
          priority: 'high',
          reason: '프로젝트 계획 수립에 필수'
        },
        {
          field: 'constraints',
          currentInfo: '부분적 정보',
          neededInfo: '예산, 일정, 기술적 제약사항',
          priority: 'medium',
          reason: '리스크 분석 및 대응 계획 수립에 필요'
        }
      ];

      // 이미 추가된 field는 제외하고 추가
      for (const defaultItem of defaultItems) {
        if (items.length >= 3) break;
        const alreadyAdded = items.some(item => item.field === defaultItem.field);
        if (!alreadyAdded) {
          items.push(defaultItem);
        }
      }
    }

    // 중복 제거 (field 기준)
    const uniqueItems = items.filter((item, index, self) =>
      index === self.findIndex(t => t.field === item.field)
    );

    return uniqueItems.slice(0, 10); // 최대 10개까지
  }

  /**
   * 🆕 한글 필드명을 영문 필드명으로 매핑
   */
  private mapKoreanFieldToEnglish(koreanField: string): string {
    const mapping: Record<string, string> = {
      '기술': 'technicalStack',
      '일정': 'timeline',
      '예산': 'budget',
      '인력': 'stakeholders',
      '목표': 'keyRequirements',
      '범위': 'keyRequirements',
      '제약': 'constraints',
      '요구사항': 'keyRequirements'
    };

    return mapping[koreanField] || 'keyRequirements';
  }

  /**
   * 🆕 문서 내용에서 플랫폼 타입 감지 (웹/앱/하이브리드)
   */
  private detectPlatformType(content: string, fileName: string = ''): 'web' | 'app' | 'hybrid' {
    const lowerContent = content.toLowerCase();
    const lowerFileName = fileName.toLowerCase();

    // 키워드 기반 점수 계산
    const appKeywords = [
      'app', '앱', 'application', '어플리케이션', 'mobile', '모바일',
      'ios', 'android', 'flutter', 'react native', 'swift', 'kotlin',
      '앱스토어', 'app store', 'play store', '플레이스토어', 'apk', 'ipa'
    ];

    const webKeywords = [
      'website', '웹사이트', 'web', '웹', 'homepage', '홈페이지',
      'browser', '브라우저', 'chrome', 'safari', 'firefox',
      'responsive', '반응형', 'seo', 'domain', '도메인', 'url'
    ];

    let appScore = 0;
    let webScore = 0;

    // 파일명 검사 (가중치 2배)
    appKeywords.forEach(keyword => {
      if (lowerFileName.includes(keyword)) appScore += 2;
    });
    webKeywords.forEach(keyword => {
      if (lowerFileName.includes(keyword)) webScore += 2;
    });

    // 내용 검사
    appKeywords.forEach(keyword => {
      const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
      appScore += matches;
    });
    webKeywords.forEach(keyword => {
      const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
      webScore += matches;
    });

    console.log('🔍 플랫폼 타입 감지 결과:', {
      appScore,
      webScore,
      fileName: fileName.substring(0, 50)
    });

    // 점수 기반 판단
    if (appScore > webScore * 1.5) {
      console.log('✅ 감지된 플랫폼: APP (앱 개발)');
      return 'app';
    } else if (webScore > appScore * 1.5) {
      console.log('✅ 감지된 플랫폼: WEB (웹사이트)');
      return 'web';
    } else {
      console.log('✅ 감지된 플랫폼: HYBRID (웹+앱 또는 불명확)');
      return 'hybrid';
    }
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

  // 🔥 NEW: 6-Phase 생성 방식으로 완전히 재작성 (데이터 누락 방지)
// 🔥 NEW: 12-Phase 생성 방식으로 완전히 재작성 (JSON 파싱 안정성 확보)
  private async generateAIReport(sessionId: string, sessionData: any, _options: ReportGenerationOptions): Promise<any> {
    console.log('🤖 [12-Phase Generation] generateAIReport 메서드 시작');
    const startTime = Date.now();

    try {
      console.log('📋 [Phase Setup] 세션 데이터 구조화...');
      const analyses = sessionData.analyses || [];
      const questions = sessionData.questions || [];
      const answers = sessionData.answers || [];
      console.log('📋 [Phase Setup] 데이터:', { analyses: analyses.length, questions: questions.length, answers: answers.length });

      console.log('⚙️ [Phase Setup] AI 설정 확인...');
      const aiProvider = sessionData.session?.ai_provider;
      const aiModel = sessionData.session?.ai_model;

      if (!aiProvider || !aiModel) {
        throw new Error(`AI 모델 정보가 세션에 저장되지 않았습니다. Left 사이드바에서 AI 모델을 선택한 후 다시 시작해주세요.`);
      }

      // ========================================
      // Phase 1A: 핵심 비즈니스 분석만 (40-44%)
      // ========================================
      console.log('🚀 [Phase 1A/12] 핵심 비즈니스 분석 시작...');
      const phase1APrompt = this.generateReportPhase1Prompt(analyses, questions, answers); // 기존 Phase1 재사용
      console.log('📝 [Phase 1A/12] 프롬프트 길이:', phase1APrompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 40,
        message: 'Phase 1A/12: 핵심 비즈니스 분석 생성 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase1AResponse = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase1APrompt,
        3500, // Phase 1A: 비즈니스 분석만
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(44, 40 + Math.floor(charCount / 900));
          console.log(`📊 [Phase 1A/12 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 1A/12 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 1A/12] 응답 완료:', { length: phase1AResponse.content?.length });
      const phase1AContent = this.parseReportResponse(phase1AResponse.content, analyses, answers);
      console.log('✅ [Phase 1A/12] 파싱 완료:', {
        hasSummary: !!phase1AContent.summary,
        hasExecutiveSummary: !!phase1AContent.executiveSummary,
        hasKeyInsights: !!phase1AContent.keyInsights,
        keyInsightsCount: phase1AContent.keyInsights?.length || 0
      });

      // ========================================
      // Phase 1B: 프로젝트 수락 결정만 (44-48%)
      // ========================================
      console.log('🚀 [Phase 1B/12] 프로젝트 수락 결정 시작...');
      const phase1BPrompt = this.generateReportPhase1Prompt(analyses, questions, answers); // 임시로 같은 함수 사용
      console.log('📝 [Phase 1B/12] 프롬프트 길이:', phase1BPrompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 44,
        message: 'Phase 1B/12: 프로젝트 수락 결정 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase1BResponse = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase1BPrompt,
        2500, // Phase 1B: 수락 결정만
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(48, 44 + Math.floor(charCount / 625));
          console.log(`📊 [Phase 1B/12 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 1B/12 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 1B/12] 응답 완료:', { length: phase1BResponse.content?.length });
      const phase1BContent = this.parseReportResponse(phase1BResponse.content, analyses, answers);
      console.log('✅ [Phase 1B/12] 파싱 완료:', {
        hasAgencyPerspective: !!phase1BContent.agencyPerspective,
        hasProjectDecision: !!phase1BContent.agencyPerspective?.projectDecision
      });

      // ========================================
      // Phase 2: 리스크 평가 (48-52%)
      // ========================================
      console.log('🚀 [Phase 2/12] 리스크 평가 시작...');
      const phase2Prompt = this.generateReportPhase2Prompt(analyses, questions, answers, phase1AContent);
      console.log('📝 [Phase 2/12] 프롬프트 길이:', phase2Prompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 48,
        message: 'Phase 2/12: 리스크 평가 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase2Response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase2Prompt,
        3000, // Phase 2: 리스크
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(52, 48 + Math.floor(charCount / 750));
          console.log(`📊 [Phase 2/12 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 2/12 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 2/12] 응답 완료:', { length: phase2Response.content?.length });
      const phase2Content = this.parseReportResponse(phase2Response.content, analyses, answers);
      console.log('✅ [Phase 2/12] 파싱 완료:', {
        hasRiskAssessment: !!phase2Content.riskAssessment,
        highRisksCount: phase2Content.riskAssessment?.high?.length || 0
      });

      // ========================================
      // Phase 3: 권장사항 (52-56%)
      // ========================================
      console.log('🚀 [Phase 3/12] 실행 권장사항 작성 시작...');
      const phase3Prompt = this.generateReportPhase3Prompt(analyses, questions, answers, phase1AContent, phase2Content);
      console.log('📝 [Phase 3/12] 프롬프트 길이:', phase3Prompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 52,
        message: 'Phase 3/12: 실행 권장사항 작성 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase3Response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase3Prompt,
        3000, // Phase 3: 권장사항
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(56, 52 + Math.floor(charCount / 750));
          console.log(`📊 [Phase 3/12 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 3/12 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 3/12] 응답 완료:', { length: phase3Response.content?.length });
      const phase3Content = this.parseReportResponse(phase3Response.content, analyses, answers);
      console.log('✅ [Phase 3/12] 파싱 완료:', {
        hasRecommendations: !!phase3Content.recommendations,
        recommendationsCount: phase3Content.recommendations?.length || 0
      });

      // ========================================
      // Phase 4: 기초 데이터 (56-60%)
      // ========================================
      console.log('🚀 [Phase 4/12] 기초 데이터 구조화 시작...');
      const phase4Prompt = this.generateReportPhase4Prompt(analyses, questions, answers, phase1AContent, phase2Content, phase3Content);
      console.log('📝 [Phase 4/12] 프롬프트 길이:', phase4Prompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 56,
        message: 'Phase 4/12: 기초 데이터 구조화 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase4Response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase4Prompt,
        3500, // Phase 4: 기초 데이터
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(60, 56 + Math.floor(charCount / 875));
          console.log(`📊 [Phase 4/12 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 4/12 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 4/12] 응답 완료:', { length: phase4Response.content?.length });
      const phase4Content = this.parseReportResponse(phase4Response.content, analyses, answers);
      console.log('✅ [Phase 4/12] 파싱 완료:', {
        hasBaselineData: !!phase4Content.baselineData,
        requirementsCount: phase4Content.baselineData?.requirements?.length || 0,
        stakeholdersCount: phase4Content.baselineData?.stakeholders?.length || 0
      });

      // ========================================
      // Phase 5A: 기획/디자인 관점 (60-65%)
      // ========================================
      console.log('🚀 [Phase 5A/12] 기획/디자인 관점 분석 시작...');
      const phase5APrompt = this.generateReportPhase5Prompt(analyses, questions, answers, phase1AContent, phase2Content, phase3Content, phase4Content); // 기존 Phase5 재사용
      console.log('📝 [Phase 5A/12] 프롬프트 길이:', phase5APrompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 60,
        message: 'Phase 5A/12: 기획/디자인 관점 분석 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase5AResponse = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase5APrompt,
        3500, // Phase 5A: 기획/디자인
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(65, 60 + Math.floor(charCount / 700));
          console.log(`📊 [Phase 5A/12 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 5A/12 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 5A/12] 응답 완료:', { length: phase5AResponse.content?.length });
      const phase5AContent = this.parseReportResponse(phase5AResponse.content, analyses, answers);
      console.log('✅ [Phase 5A/12] 파싱 완료:', {
        hasDetailedPerspectives: !!phase5AContent.agencyDetailedAnalysis?.detailedPerspectives,
        hasPlanningPerspective: !!phase5AContent.agencyDetailedAnalysis?.detailedPerspectives?.planning,
        hasDesignPerspective: !!phase5AContent.agencyDetailedAnalysis?.detailedPerspectives?.design
      });

      // ========================================
      // Phase 5B: 퍼블리싱/개발 관점 (65-70%)
      // ========================================
      console.log('🚀 [Phase 5B/12] 퍼블리싱/개발 관점 분석 시작...');
      const phase5BPrompt = this.generateReportPhase5Prompt(analyses, questions, answers, phase1AContent, phase2Content, phase3Content, phase4Content); // 임시로 같은 함수 사용
      console.log('📝 [Phase 5B/12] 프롬프트 길이:', phase5BPrompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 65,
        message: 'Phase 5B/12: 퍼블리싱/개발 관점 분석 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase5BResponse = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase5BPrompt,
        3500, // Phase 5B: 퍼블/개발
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(70, 65 + Math.floor(charCount / 700));
          console.log(`📊 [Phase 5B/12 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 5B/12 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 5B/12] 응답 완료:', { length: phase5BResponse.content?.length });
      const phase5BContent = this.parseReportResponse(phase5BResponse.content, analyses, answers);
      console.log('✅ [Phase 5B/12] 파싱 완료:', {
        hasPublishingPerspective: !!phase5BContent.agencyDetailedAnalysis?.detailedPerspectives?.publishing,
        hasDevelopmentPerspective: !!phase5BContent.agencyDetailedAnalysis?.detailedPerspectives?.development
      });

      // ========================================
      // Phase 6: 수익성+경쟁력+최종결정 (70-75%)
      // ========================================
      console.log('🚀 [Phase 6/12] 수익성 분석 + 최종 수주 결정 시작...');
      const phase6Prompt = this.generateReportPhase6Prompt(analyses, questions, answers, phase1AContent, phase2Content, phase3Content, phase4Content, phase5AContent);
      console.log('📝 [Phase 6/12] 프롬프트 길이:', phase6Prompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 70,
        message: 'Phase 6/12: 수익성 분석 및 최종 수주 결정 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase6Response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase6Prompt,
        3500, // Phase 6: 수익성+최종결정
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(75, 70 + Math.floor(charCount / 700));
          console.log(`📊 [Phase 6/12 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 6/12 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 6/12] 응답 완료:', { length: phase6Response.content?.length });
      const phase6Content = this.parseReportResponse(phase6Response.content, analyses, answers);
      console.log('✅ [Phase 6/12] 파싱 완료:', {
        hasProfitability: !!phase6Content.agencyDetailedAnalysis?.profitability,
        hasFinalDecision: !!phase6Content.agencyDetailedAnalysis?.finalDecision,
        profitMargin: phase6Content.agencyDetailedAnalysis?.profitability?.profitMargin || 0
      });

      // ========================================
      // Phase 7A: WBS (75-82%)
      // ========================================
      console.log('🚀 [Phase 7A/12] WBS 작성 시작...');
      const phase7APrompt = this.generateReportPhase7Prompt(analyses, questions, answers, phase1AContent, phase2Content, phase3Content, phase4Content, phase5AContent, phase6Content); // 기존 Phase7 재사용
      console.log('📝 [Phase 7A/12] 프롬프트 길이:', phase7APrompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 75,
        message: 'Phase 7A/12: WBS 작성 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase7AResponse = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase7APrompt,
        4500, // Phase 7A: WBS (가장 큼)
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(82, 75 + Math.floor(charCount / 650));
          console.log(`📊 [Phase 7A/12 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 7A/12 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 7A/12] 응답 완료:', { length: phase7AResponse.content?.length });
      const phase7AContent = this.parseReportResponse(phase7AResponse.content, analyses, answers);
      console.log('✅ [Phase 7A/12] 파싱 완료:', {
        hasExecutionPlan: !!phase7AContent.executionPlan,
        hasWBS: !!phase7AContent.executionPlan?.wbs,
        wbsCount: phase7AContent.executionPlan?.wbs?.length || 0
      });

      // ========================================
      // Phase 7B-1: 팀 구성 (82-85%) - NEW
      // ========================================
      console.log('🚀 [Phase 7B-1/14] 팀 구성 작성 시작...');
      const phase7B1Prompt = this.generateReportPhase7B1Prompt(analyses, questions, answers, phase4Content, phase5AContent, phase6Content, phase7AContent);
      console.log('📝 [Phase 7B-1/14] 프롬프트 길이:', phase7B1Prompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 82,
        message: 'Phase 7B-1/14: 팀 구성 작성 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase7B1Response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase7B1Prompt,
        2000, // Phase 7B-1: 팀 구성
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(85, 82 + Math.floor(charCount / 667));
          console.log(`📊 [Phase 7B-1/14 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 7B-1/14 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 7B-1/14] 응답 완료:', { length: phase7B1Response.content?.length });
      const phase7B1Content = this.parseReportResponse(phase7B1Response.content, analyses, answers);
      console.log('✅ [Phase 7B-1/14] 파싱 완료:', {
        hasTeamComposition: !!phase7B1Content.executionPlan?.resourcePlan?.teamComposition,
        teamSize: phase7B1Content.executionPlan?.resourcePlan?.teamComposition?.length || 0
      });

      // ========================================
      // Phase 7B-2: 비용 산정 (85-88%) - NEW
      // ========================================
      console.log('🚀 [Phase 7B-2/14] 비용 산정 작성 시작...');
      const phase7B2Prompt = this.generateReportPhase7B2Prompt(analyses, questions, answers, phase6Content, phase7B1Content);
      console.log('📝 [Phase 7B-2/14] 프롬프트 길이:', phase7B2Prompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 85,
        message: 'Phase 7B-2/14: 비용 산정 작성 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase7B2Response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase7B2Prompt,
        2000, // Phase 7B-2: 비용 산정
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(88, 85 + Math.floor(charCount / 667));
          console.log(`📊 [Phase 7B-2/14 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 7B-2/14 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 7B-2/14] 응답 완료:', { length: phase7B2Response.content?.length });
      const phase7B2Content = this.parseReportResponse(phase7B2Response.content, analyses, answers);
      console.log('✅ [Phase 7B-2/14] 파싱 완료:', {
        hasCostBreakdown: !!phase7B2Content.executionPlan?.resourcePlan?.costBreakdown,
        hasPaymentSchedule: !!phase7B2Content.executionPlan?.resourcePlan?.paymentSchedule
      });

      // ========================================
      // Phase 8A-1: 제안서 목차 (88-91%) - NEW
      // ========================================
      console.log('🚀 [Phase 8A-1/14] 제안서 목차 작성 시작...');
      const phase8A1Prompt = this.generateReportPhase8A1Prompt(analyses, questions, answers, phase1AContent, phase6Content);
      console.log('📝 [Phase 8A-1/14] 프롬프트 길이:', phase8A1Prompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 88,
        message: 'Phase 8A-1/14: 제안서 목차 작성 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase8A1Response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase8A1Prompt,
        1500, // Phase 8A-1: 제안서 목차
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(91, 88 + Math.floor(charCount / 500));
          console.log(`📊 [Phase 8A-1/14 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 8A-1/14 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 8A-1/14] 응답 완료:', { length: phase8A1Response.content?.length });
      const phase8A1Content = this.parseReportResponse(phase8A1Response.content, analyses, answers);
      console.log('✅ [Phase 8A-1/14] 파싱 완료:', {
        hasProposalOutline: !!phase8A1Content.executionPlan?.proposalOutline,
        sectionsCount: phase8A1Content.executionPlan?.proposalOutline?.sections?.length || 0
      });

      // ========================================
      // Phase 8A-2: 제안서 핵심 내용 (91-94%) - NEW
      // ========================================
      console.log('🚀 [Phase 8A-2/14] 제안서 핵심 내용 작성 시작...');
      const phase8A2Prompt = this.generateReportPhase8A2Prompt(analyses, questions, answers, phase4Content, phase5AContent, phase6Content, phase7AContent);
      console.log('📝 [Phase 8A-2/14] 프롬프트 길이:', phase8A2Prompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 91,
        message: 'Phase 8A-2/14: 제안서 핵심 내용 작성 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase8A2Response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase8A2Prompt,
        2500, // Phase 8A-2: 제안서 핵심 내용
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(94, 91 + Math.floor(charCount / 833));
          console.log(`📊 [Phase 8A-2/14 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 8A-2/14 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 8A-2/14] 응답 완료:', { length: phase8A2Response.content?.length });
      const phase8A2Content = this.parseReportResponse(phase8A2Response.content, analyses, answers);
      console.log('✅ [Phase 8A-2/14] 파싱 완료:', {
        hasProposalContent: !!phase8A2Content.executionPlan?.proposalContent,
        hasExecutiveSummary: !!phase8A2Content.executionPlan?.proposalContent?.executiveSummary
      });

      // ========================================
      // Phase 8B: 발표자료+다음단계 (94-100%)
      // ========================================
      console.log('🚀 [Phase 8B/14] 발표자료 및 다음 단계 작성 시작...');
      const phase8BPrompt = this.generateReportPhase8Prompt(analyses, questions, answers, phase1AContent, phase2Content, phase3Content, phase4Content, phase5AContent, phase6Content, phase7AContent); // 임시로 같은 함수 사용
      console.log('📝 [Phase 8B/14] 프롬프트 길이:', phase8BPrompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 94,
        message: 'Phase 8B/14: 발표자료 및 다음 단계 작성 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase8BResponse = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase8BPrompt,
        3000, // Phase 8B: 발표+다음단계
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(100, 94 + Math.floor(charCount / 500));
          console.log(`📊 [Phase 8B/14 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 8B/14 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 8B/14] 응답 완료:', { length: phase8BResponse.content?.length });
      const phase8BContent = this.parseReportResponse(phase8BResponse.content, analyses, answers);
      console.log('✅ [Phase 8B/14] 파싱 완료:', {
        hasPresentationOutline: !!phase8BContent.executionPlan?.presentationOutline,
        hasNextSteps: !!phase8BContent.executionPlan?.nextSteps,
        nextStepsCount: phase8BContent.executionPlan?.nextSteps?.length || 0
      });

      // ========================================
      // 14개 Phase 결과 병합
      // ========================================
      console.log('🔗 [Merge] 14개 Phase 병합 시작...');
      const mergedReport = {
        // Phase 1A: 핵심 비즈니스 분석
        summary: phase1AContent.summary || '',
        executiveSummary: phase1AContent.executiveSummary || '',
        keyInsights: phase1AContent.keyInsights || [],

        // Phase 1B: agencyPerspective (projectDecision만)
        agencyPerspective: {
          projectDecision: phase1BContent.agencyPerspective?.projectDecision || {},
        },

        // Phase 2: 리스크 (중첩 속성 방어 강화)
        riskAssessment: {
          high: phase2Content.riskAssessment?.high || [],
          medium: phase2Content.riskAssessment?.medium || [],
          low: phase2Content.riskAssessment?.low || [],
          overallScore: phase2Content.riskAssessment?.overallScore || 0,
          mitigation: phase2Content.riskAssessment?.mitigation || [],
          timeline: phase2Content.riskAssessment?.timeline || {},
        },

        // Phase 3: 권장사항
        recommendations: phase3Content.recommendations || [],

        // Phase 4: 기초 데이터
        baselineData: phase4Content.baselineData || {
          requirements: [],
          stakeholders: [],
          constraints: [],
          timeline: [],
          budgetEstimates: {},
          technicalStack: [],
          integrationPoints: [],
        },

        // Phase 5A + 5B + Phase 6: 웹에이전시 상세 분석 (중첩 속성 방어 강화)
        agencyDetailedAnalysis: {
          detailedPerspectives: {
            planning: phase5AContent.agencyDetailedAnalysis?.detailedPerspectives?.planning || {
              scope: {},
              timeline: {},
              resources: {},
              risks: [],
              successFactors: [],
            },
            design: phase5AContent.agencyDetailedAnalysis?.detailedPerspectives?.design || {
              uxStrategy: {},
              designSystem: {},
              responsiveApproach: {},
              accessibility: [],
              deliverables: [],
            },
            publishing: phase5BContent.agencyDetailedAnalysis?.detailedPerspectives?.publishing || {
              hostingStrategy: {},
              domainSetup: {},
              seoStrategy: {},
              performanceTargets: {},
              launchChecklist: [],
            },
            development: phase5BContent.agencyDetailedAnalysis?.detailedPerspectives?.development || {
              architecture: {},
              techStack: [],
              apiIntegration: [],
              qualityAssurance: {},
              deploymentStrategy: {},
            },
          },
          profitability: phase6Content.agencyDetailedAnalysis?.profitability || {
            costAnalysis: {},
            revenueProjection: {},
            roi: {},
            breakEven: {},
          },
          competitiveness: phase6Content.agencyDetailedAnalysis?.competitiveness || {
            marketPosition: {},
            strengths: [],
            weaknesses: [],
            opportunities: [],
            threats: [],
          },
          finalDecision: phase6Content.agencyDetailedAnalysis?.finalDecision || {
            recommendation: '',
            rationale: '',
            conditions: [],
            nextSteps: [],
          },
        },

        // Phase 7A + 7B-1 + 7B-2 + 8A-1 + 8A-2 + 8B: 실행 계획 (중첩 속성 방어 강화)
        executionPlan: {
          wbs: phase7AContent.executionPlan?.wbs || [],
          // 🔥 Phase 7B-1 (teamComposition) + Phase 7B-2 (cost) 병합
          resourcePlan: {
            teamComposition: phase7B1Content.executionPlan?.resourcePlan?.teamComposition || [],
            totalManMonths: phase7B2Content.executionPlan?.resourcePlan?.totalManMonths || 0,
            totalCost: phase7B2Content.executionPlan?.resourcePlan?.totalCost || 0,
            timeline: phase7B2Content.executionPlan?.resourcePlan?.timeline || {},
            costBreakdown: phase7B2Content.executionPlan?.resourcePlan?.costBreakdown || {},
            paymentSchedule: phase7B2Content.executionPlan?.resourcePlan?.paymentSchedule || [],
          },
          // 🔥 Phase 8A-1 (proposalOutline) + Phase 8A-2 (proposalContent) 병합
          proposalOutline: phase8A1Content.executionPlan?.proposalOutline || {
            title: '',
            sections: [],
            appendix: [],
          },
          proposalContent: phase8A2Content.executionPlan?.proposalContent || {
            executiveSummary: '',
            problemStatement: '',
            proposedSolution: '',
            keyBenefits: [],
            differentiators: [],
            successMetrics: [],
          },
          presentationOutline: phase8BContent.executionPlan?.presentationOutline || [],
          nextSteps: phase8BContent.executionPlan?.nextSteps || [],
        },

        // 시각화 데이터 (병합)
        visualizationData: {
          ...(phase1AContent.visualizationData || {}),
          ...(phase1BContent.visualizationData || {}),
          ...(phase2Content.visualizationData || {}),
          ...(phase3Content.visualizationData || {}),
          ...(phase4Content.visualizationData || {}),
          ...(phase5AContent.visualizationData || {}),
          ...(phase5BContent.visualizationData || {}),
          ...(phase6Content.visualizationData || {}),
          ...(phase7AContent.visualizationData || {}),
          ...(phase7B1Content.visualizationData || {}),
          ...(phase7B2Content.visualizationData || {}),
          ...(phase8A1Content.visualizationData || {}),
          ...(phase8A2Content.visualizationData || {}),
          ...(phase8BContent.visualizationData || {}),
        },
      };

      console.log('✅ [Merge] 병합 완료 - 데이터 무결성 검증:', {
        hasSummary: !!mergedReport.summary,
        hasExecutiveSummary: !!mergedReport.executiveSummary,
        hasKeyInsights: (mergedReport.keyInsights?.length || 0) > 0,
        hasProjectDecision: !!mergedReport.agencyPerspective?.projectDecision,
        hasRiskAssessment: !!mergedReport.riskAssessment,
        hasRecommendations: (mergedReport.recommendations?.length || 0) > 0,
        hasBaselineData: !!mergedReport.baselineData,
        hasDetailedPerspectives: !!mergedReport.agencyDetailedAnalysis?.detailedPerspectives,
        hasProfitability: !!mergedReport.agencyDetailedAnalysis?.profitability,
        hasFinalDecision: !!mergedReport.agencyDetailedAnalysis?.finalDecision,
        hasExecutionPlan: !!mergedReport.executionPlan,
        hasWBS: !!mergedReport.executionPlan?.wbs,
        hasProposalOutline: !!mergedReport.executionPlan?.proposalOutline,

        // 상세 카운트
        keyInsightsCount: mergedReport.keyInsights?.length || 0,
        recommendationsCount: mergedReport.recommendations?.length || 0,
        requirementsCount: mergedReport.baselineData?.requirements?.length || 0,
        stakeholdersCount: mergedReport.baselineData?.stakeholders?.length || 0,
        highRisksCount: mergedReport.riskAssessment?.high?.length || 0,
        wbsCount: mergedReport.executionPlan?.wbs?.length || 0,
        nextStepsCount: mergedReport.executionPlan?.nextSteps?.length || 0,
      });

      const processingTime = Date.now() - startTime;
      const totalCost =
        phase1AResponse.cost.totalCost +
        phase1BResponse.cost.totalCost +
        phase2Response.cost.totalCost +
        phase3Response.cost.totalCost +
        phase4Response.cost.totalCost +
        phase5AResponse.cost.totalCost +
        phase5BResponse.cost.totalCost +
        phase6Response.cost.totalCost +
        phase7AResponse.cost.totalCost +
        phase7B1Response.cost.totalCost +
        phase7B2Response.cost.totalCost +
        phase8A1Response.cost.totalCost +
        phase8A2Response.cost.totalCost +
        phase8BResponse.cost.totalCost;

      const totalInputTokens =
        phase1AResponse.usage.inputTokens +
        phase1BResponse.usage.inputTokens +
        phase2Response.usage.inputTokens +
        phase3Response.usage.inputTokens +
        phase4Response.usage.inputTokens +
        phase5AResponse.usage.inputTokens +
        phase5BResponse.usage.inputTokens +
        phase6Response.usage.inputTokens +
        phase7AResponse.usage.inputTokens +
        phase7B1Response.usage.inputTokens +
        phase7B2Response.usage.inputTokens +
        phase8A1Response.usage.inputTokens +
        phase8A2Response.usage.inputTokens +
        phase8BResponse.usage.inputTokens;

      const totalOutputTokens =
        phase1AResponse.usage.outputTokens +
        phase1BResponse.usage.outputTokens +
        phase2Response.usage.outputTokens +
        phase3Response.usage.outputTokens +
        phase4Response.usage.outputTokens +
        phase5AResponse.usage.outputTokens +
        phase5BResponse.usage.outputTokens +
        phase6Response.usage.outputTokens +
        phase7AResponse.usage.outputTokens +
        phase7B1Response.usage.outputTokens +
        phase7B2Response.usage.outputTokens +
        phase8A1Response.usage.outputTokens +
        phase8A2Response.usage.outputTokens +
        phase8BResponse.usage.outputTokens;

      console.log('⏱️ [Complete] 총 처리 시간:', processingTime, 'ms');
      console.log('💰 [Complete] 총 비용:', totalCost);
      console.log('🎯 [Complete] 토큰 사용:', { input: totalInputTokens, output: totalOutputTokens });

      return {
        ...mergedReport,
        totalProcessingTime: processingTime,
        totalCost,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      };
    } catch (error) {
      console.error('❌ [12-Phase Generation] 오류 발생:', error);
      throw error;
    }
  }

  // 🔥 6-Phase: Phase 1 프롬프트 - 핵심 비즈니스 분석 + 프로젝트 수락 결정
  private generateReportPhase1Prompt(analyses: any[], questions: any[], answers: any[]): string {
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

    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 1/6: 핵심 분석 + 수락 결정

당신은 **웹에이전시 엘루오씨앤씨**의 수석 프로젝트 분석가입니다.
이 단계에서는 **핵심 비즈니스 분석**을 수행합니다.

## 📋 수집된 프로젝트 데이터

### 1. 업로드된 문서 분석 결과 (${analyses.length}개):
${analysisContext || '분석된 문서가 없습니다.'}

### 2. 질문-답변 데이터 (${answers.length}/${questions.length}개 답변 완료):
${qaContext || '질문-답변 데이터가 없습니다.'}

---

## 🎨 Phase 1 작성 지침

### 역할 및 관점:
- **회사**: 웹에이전시 엘루오씨앤씨
- **담당**: 웹사이트 기획, UI/UX 디자인, 퍼블리싱, 프론트엔드/백엔드 개발
- **목표**: 프로젝트의 **수락 여부 결정** 및 **핵심 분석**

### 분석 관점 (필수):
1. **기획 관점**: 요구사항 명확성, 비즈니스 가치, 실행 가능성
2. **디자인 관점**: UI/UX 복잡도, 디자인 시스템 필요성, 브랜딩 요소
3. **퍼블리싱 관점**: 브라우저 호환성, 반응형 난이도, 접근성 요구사항
4. **개발 관점**: 기술적 복잡도, 아키텍처 설계, 보안/성능 고려사항

---

## 📝 Phase 1 출력 형식 (JSON)

**⚠️ 이 단계에서는 핵심 분석 정보만 생성합니다.**

다음 JSON 형식으로 **핵심 비즈니스 분석**을 작성하세요:

\`\`\`json
{
  "summary": "프로젝트 전체에 대한 300자 이상의 종합 요약 (프로젝트명, 목적, 범위, 핵심 특징)",
  "executiveSummary": "경영진용 핵심 요약 (200자 이상): 비즈니스 가치, 투자 대비 효과, 주요 리스크, 최종 권장사항",

  "keyInsights": [
    "프로젝트의 핵심 강점 또는 기회 (5개 이상)",
    "각 인사이트는 구체적이고 실행 가능한 내용으로 작성"
  ],

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
        "estimatedEffort": "예상 공수 (예: 2주, 3개월)",
        "challenges": [
          "기획 단계에서 예상되는 구체적인 어려움 3개",
          "각 어려움은 웹에이전시 입장에서 실제 직면할 문제 중심"
        ],
        "risks": [
          "기획 관련 리스크 2개",
          "각 리스크는 프로젝트 실패 가능성과 관련"
        ]
      },
      "design": {
        "complexity": "low|medium|high|very_high",
        "estimatedHours": 예상 시간,
        "challenges": [
          "디자인 단계 예상 어려움 3개",
          "UI/UX 복잡도, 디자인 시스템 구축 난이도 등"
        ],
        "risks": [
          "디자인 리스크 2개",
          "고객 요구 변경, 디자인 피드백 반복 등"
        ]
      },
      "publishing": {
        "responsiveComplexity": "low|medium|high",
        "estimatedHours": 예상 시간,
        "challenges": [
          "퍼블리싱 어려움 3개",
          "크로스브라우징, 반응형 구현 복잡도 등"
        ],
        "risks": [
          "퍼블리싱 리스크 2개",
          "브라우저 호환성 문제, 디바이스 대응 이슈 등"
        ]
      },
      "development": {
        "technicalComplexity": "low|medium|high|very_high",
        "estimatedManMonths": 예상 인월,
        "challenges": [
          "개발 어려움 3개 (개발이 없으면 '개발 불필요 - 우리가 처리할 영역 아님')",
          "기술 스택 난이도, 외부 API 연동, 보안 요구사항 등"
        ],
        "risks": [
          "개발 리스크 2개 (개발이 없으면 '해당없음')",
          "기술적 불확실성, 일정 지연 가능성 등"
        ]
      }
    }
  }
}
\`\`\`

**⚠️ Phase 1 필수 작성 필드**:
1. ✅ **summary** - 프로젝트 종합 요약 (300자 이상)
2. ✅ **executiveSummary** - 경영진용 요약 (200자 이상)
3. ✅ **keyInsights** - 핵심 인사이트 (5개 이상)
4. ✅ **agencyPerspective** - projectDecision + perspectives (4가지 관점 모두 포함)
   * 각 관점마다 challenges (3개), risks (2개) 필수

**📌 Phase 1에서는 위의 4가지 핵심 분석만 생성합니다.**
**리스크 평가(riskAssessment)와 권장사항(recommendations)은 Phase 2에서 작성됩니다.**

**출력 형식 규칙**:
- ❌ 설명문 없이
- ❌ 마크다운 코드 블록 없이
- ✅ 오직 순수 JSON 객체만 반환 ({ 로 시작, } 로 끝)

위 JSON 형식을 **정확히 준수**하여 **Phase 1 핵심 분석**을 완성해주세요.`;
  }

  // 🔥 Phase 2 프롬프트 생성 - 리스크 평가 + 권장사항
  private generateReportPhase2Prompt(_analyses: any[], _questions: any[], _answers: any[], phase1Result: any): string {
    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 2/8: 리스크 평가

당신은 **웹에이전시 엘루오씨앤씨**의 **리스크 관리 전문가**입니다.
이 단계에서는 Phase 1 분석을 기반으로 **프로젝트 리스크 평가**만 작성합니다.
**권장사항은 Phase 3에서 별도로 작성**되므로 이 단계에서는 제외합니다.

## 📋 Phase 1 핵심 분석 결과 (참고용)

- **프로젝트 수락 권장**: ${phase1Result.agencyPerspective?.projectDecision?.recommendation || 'N/A'}
- **결정 확신도**: ${phase1Result.agencyPerspective?.projectDecision?.confidence || 0}%
- **핵심 인사이트 수**: ${phase1Result.keyInsights?.length || 0}개
- **기획 실행 가능성**: ${phase1Result.agencyPerspective?.perspectives?.planning?.feasibility || 0}%
- **디자인 복잡도**: ${phase1Result.agencyPerspective?.perspectives?.design?.complexity || 'N/A'}
- **퍼블리싱 복잡도**: ${phase1Result.agencyPerspective?.perspectives?.publishing?.responsiveComplexity || 'N/A'}
- **개발 복잡도**: ${phase1Result.agencyPerspective?.perspectives?.development?.technicalComplexity || 'N/A'}

---

## 🎨 Phase 2 작성 지침

### 목표:
1. **리스크 식별 및 평가**: Phase 1에서 확인된 challenges와 risks를 기반으로 구체적 리스크 분석
2. **완화 방안 수립**: 각 리스크에 대한 실행 가능한 대응 전략
3. **전체 위험도 점수 산정**: overallScore 계산

### 리스크 카테고리:
- **technical**: 기술적 복잡도, 아키텍처, 보안, 성능
- **business**: 비즈니스 가치, ROI, 시장 적합성
- **timeline**: 일정 지연, 마일스톤 미준수
- **budget**: 비용 초과, 자원 부족
- **resource**: 인력 부족, 역량 격차

---

## 📝 Phase 2 출력 형식 (JSON)

**⚠️ 이 단계에서는 리스크 평가만 생성합니다. 권장사항은 Phase 3에서 작성됩니다.**

다음 JSON 형식으로 작성하세요:

\`\`\`json
{
  "riskAssessment": {
    "high": [
      {
        "id": "risk-h1",
        "category": "technical",
        "title": "고위험 제목 (명확하고 구체적으로, 예: '레거시 시스템 통합 실패 가능성')",
        "description": "위험 발생 시나리오와 영향 상세 설명 (150자 이상). 예: 'API 호환성 문제로 데이터 동기화 실패 시 전체 서비스 중단 가능'",
        "probability": 75,
        "impact": 85,
        "severity": "high",
        "mitigation": "구체적이고 실행 가능한 완화 방안 (100자 이상). 예: 'POC 단계에서 API 연동 테스트 필수, 대체 통합 방안 사전 준비'"
      },
      {
        "id": "risk-h2",
        "category": "timeline",
        "title": "두 번째 고위험 항목",
        "description": "위험 설명 (100자 이상)",
        "probability": 70,
        "impact": 80,
        "severity": "high",
        "mitigation": "완화 방안 (50자 이상)"
      }
    ],
    "medium": [
      {
        "id": "risk-m1",
        "category": "business",
        "title": "중위험 제목 (예: '사용자 채택률 미달 가능성')",
        "description": "위험 설명 (100자 이상)",
        "probability": 55,
        "impact": 60,
        "severity": "medium",
        "mitigation": "완화 방안 (50자 이상)"
      },
      {
        "id": "risk-m2",
        "category": "resource",
        "title": "두 번째 중위험 항목",
        "description": "위험 설명 (100자 이상)",
        "probability": 50,
        "impact": 55,
        "severity": "medium",
        "mitigation": "완화 방안 (50자 이상)"
      },
      {
        "id": "risk-m3",
        "category": "budget",
        "title": "세 번째 중위험 항목",
        "description": "위험 설명 (100자 이상)",
        "probability": 45,
        "impact": 60,
        "severity": "medium",
        "mitigation": "완화 방안 (50자 이상)"
      }
    ],
    "low": [
      {
        "id": "risk-l1",
        "category": "technical",
        "title": "저위험 제목 (예: '마이너 브라우저 호환성 이슈')",
        "description": "위험 설명 (100자 이상)",
        "probability": 30,
        "impact": 35,
        "severity": "low",
        "mitigation": "완화 방안 (50자 이상)"
      },
      {
        "id": "risk-l2",
        "category": "business",
        "title": "두 번째 저위험 항목",
        "description": "위험 설명 (100자 이상)",
        "probability": 25,
        "impact": 40,
        "severity": "low",
        "mitigation": "완화 방안 (50자 이상)"
      },
      {
        "id": "risk-l3",
        "category": "resource",
        "title": "세 번째 저위험 항목",
        "description": "위험 설명 (100자 이상)",
        "probability": 20,
        "impact": 30,
        "severity": "low",
        "mitigation": "완화 방안 (50자 이상)"
      }
    ],
    "overallScore": 62
  }
}
\`\`\`

**⚠️ Phase 2 필수 작성 필드**:
1. ✅ **riskAssessment.high** - 고위험 항목 (최소 3개, probability ≥ 60 AND impact ≥ 70)
2. ✅ **riskAssessment.medium** - 중위험 항목 (최소 4개, probability 40-70 OR impact 50-70)
3. ✅ **riskAssessment.low** - 저위험 항목 (최소 3개, probability < 50 AND impact < 60)
4. ✅ **riskAssessment.overallScore** - 전체 위험 점수 (0-100, 높을수록 위험함)

**리스크 평가 공식**:
- overallScore = (Σ(probability × impact × weight) / total_risks)
  - high weight = 3, medium weight = 2, low weight = 1

**출력 형식 규칙**:
- ❌ 설명문이나 주석 없이
- ❌ 마크다운 코드 블록 없이
- ✅ 오직 순수 JSON 객체만 반환 ({ 로 시작, } 로 끝)
- ✅ 모든 문자열 필드는 큰따옴표(") 사용
- ✅ description과 mitigation은 충분히 상세하게 작성 (각각 150자, 100자 이상)

위 JSON 형식을 **정확히 준수**하여 **Phase 2 리스크 평가**를 완성해주세요.`;
  }

  // 🔥 Phase 3 프롬프트 생성 - 권장사항 (recommendations)
  private generateReportPhase3Prompt(
    _analyses: any[],
    _questions: any[],
    _answers: any[],
    phase1Result: any,
    phase2Result: any
  ): string {
    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 3/8: 실행 권장사항

당신은 **웹에이전시 엘루오씨앤씨**의 **프로젝트 컨설턴트**입니다.
이 단계에서는 Phase 1 분석과 Phase 2 리스크 평가를 기반으로 **프로젝트 성공을 위한 실행 권장사항**을 작성합니다.

## 📋 이전 Phase 결과 (참고용)

**Phase 1 - 프로젝트 결정**:
- 수락 권장: ${phase1Result.agencyPerspective?.projectDecision?.recommendation || 'N/A'}
- 확신도: ${phase1Result.agencyPerspective?.projectDecision?.confidence || 0}%

**Phase 2 - 리스크 평가**:
- 전체 위험도: ${phase2Result.riskAssessment?.overallScore || 0}/100
- 고위험 항목: ${phase2Result.riskAssessment?.high?.length || 0}개
- 중위험 항목: ${phase2Result.riskAssessment?.medium?.length || 0}개

---

## 📝 Phase 3 출력 형식 (JSON)

**⚠️ 이 단계에서는 실행 권장사항만 생성합니다.**

다음 JSON 형식으로 작성하세요:

\`\`\`json
{
  "recommendations": [
    "기술적 권장사항 1: 구체적 액션 아이템 (80자 이상). 예: 'React 18 + TypeScript 기반 SPA 구조 채택, Tailwind CSS로 디자인 시스템 구축하여 개발 생산성 30% 향상'",
    "기술적 권장사항 2: 아키텍처 설계 관련 구체적 제안 (80자 이상)",
    "기술적 권장사항 3: 성능 최적화 전략 (80자 이상)",
    "비즈니스적 권장사항 1: 사용자 가치 극대화 방안 (80자 이상)",
    "비즈니스적 권장사항 2: ROI 개선 전략 및 수익 모델 (80자 이상)",
    "비즈니스적 권장사항 3: 시장 진입 전략 및 경쟁 우위 확보 (80자 이상)",
    "관리적 권장사항 1: 프로젝트 관리 프로세스 및 도구 (80자 이상)",
    "관리적 권장사항 2: 커뮤니케이션 체계 및 의사결정 프로세스 (80자 이상)",
    "품질 관리 권장사항 1: 테스트 전략 및 자동화 계획 (80자 이상)",
    "품질 관리 권장사항 2: 코드 리뷰 프로세스 및 품질 기준 (80자 이상)",
    "일정 관리 권장사항: 마일스톤 설정 및 버퍼 계획 (80자 이상)",
    "리소스 관리 권장사항: 팀 구성, 역할 분담 및 외부 리소스 활용 (80자 이상)"
  ]
}
\`\`\`

**⚠️ Phase 3 필수 작성 필드**:
1. ✅ **recommendations** - 최소 12개 이상의 실행 가능한 권장사항
   - 각 권장사항은 80자 이상으로 구체적으로 작성
   - 기술적 측면 (3개 이상)
   - 비즈니스적 측면 (3개 이상)
   - 관리적 측면 (2개 이상)
   - 품질 관리 (2개 이상)
   - 일정/리소스 관리 (2개 이상)

**권장사항 작성 가이드**:
- Phase 2의 리스크 완화와 연계하여 구체적인 실행 방안 제시
- 단순한 제안이 아닌, 실제로 적용 가능한 구체적 액션 아이템
- 효과나 목표를 명시 (예: "개발 생산성 30% 향상", "배포 주기 50% 단축")
- 우선순위와 의존성 고려

**출력 형식 규칙**:
- ❌ 설명문이나 주석 없이
- ❌ 마크다운 코드 블록 없이
- ✅ 오직 순수 JSON 객체만 반환 ({ 로 시작, } 로 끝)
- ✅ 모든 문자열 필드는 큰따옴표(") 사용
- ✅ 각 권장사항은 충분히 상세하게 작성 (80자 이상)

위 JSON 형식을 **정확히 준수**하여 **Phase 3 실행 권장사항**을 완성해주세요.`;
  }

  // 🔥 Phase 4 프롬프트 생성 - 기초 데이터 (baselineData)
  private generateReportPhase4Prompt(
    analyses: any[],
    questions: any[],
    answers: any[],
    phase1Result: any,
    _phase2Result: any,
    _phase3Result: any
  ): string {
    const analysisContext = analyses.map((analysis, index) =>
      `### 문서 ${index + 1}: ${analysis.file_name || '제목 없음'}
- 요약: ${analysis.analysis_result?.summary || '분석 요약 없음'}
- 주요 내용: ${JSON.stringify(analysis.analysis_result?.keyPoints || []).substring(0, 300)}`
    ).join('\n\n');

    const qaContext = answers.map((a, index) => {
      const question = questions.find(q => q.id === a.question_id);
      return `**Q${index + 1}**: ${question?.question || '질문 없음'}
**A${index + 1}**: ${a.answer || '답변 없음'}`;
    }).join('\n\n');

    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 4/8: 기초 데이터 구조화

당신은 **웹에이전시 엘루오씨앤씨**의 **데이터 분석가**입니다.
이 단계에서는 문서와 답변에서 **프로젝트 실행에 필요한 기초 데이터**를 구조화합니다.

## 📋 수집된 데이터

### 1. 업로드된 문서 분석 결과 (${analyses.length}개):
${analysisContext || '분석된 문서가 없습니다.'}

### 2. 질문-답변 데이터 (${answers.length}/${questions.length}개 답변 완료):
${qaContext || '질문-답변 데이터가 없습니다.'}

### 3. Phase 1 핵심 분석:
- 프로젝트 수락: ${phase1Result.agencyPerspective?.projectDecision?.recommendation || 'N/A'}
- 핵심 인사이트: ${phase1Result.keyInsights?.length || 0}개

### 4. Phase 2 리스크 평가:
- 고위험: ${_phase2Result.riskAssessment?.high?.length || 0}개
- 중위험: ${_phase2Result.riskAssessment?.medium?.length || 0}개
- 전체 위험도: ${_phase2Result.riskAssessment?.overallScore || 0}점

### 5. Phase 3 권장사항:
- 실행 권장사항: ${_phase3Result.recommendations?.length || 0}개

---

## 🎨 Phase 4 작성 지침

### 목표:
- 문서와 답변에서 **구체적이고 측정 가능한 데이터** 추출
- 프로젝트 실행에 필요한 **기초 정보 구조화**

---

## 📝 Phase 4 출력 형식 (JSON)

**⚠️ 이 단계에서는 기초 데이터(baselineData)만 생성합니다.**

다음 JSON 형식으로 **기초 데이터**를 작성하세요:

\`\`\`json
{
  "baselineData": {
    "requirements": [
      "문서와 답변에서 식별된 핵심 기능 요구사항 1 (구체적이고 명확하게)",
      "핵심 기능 요구사항 2",
      "핵심 기능 요구사항 3",
      "⚠️ 최소 10개 이상 작성 (문서 내용 기반)"
    ],
    "stakeholders": [
      "김철수 PM - 프로젝트 총괄 및 의사결정",
      "박영희 디자이너 - UI/UX 담당",
      "이민수 개발자 - 프론트엔드 개발",
      "⚠️ 최소 3개 이상, 문자열 배열로 작성 (객체 금지)"
    ],
    "constraints": [
      "일정 제약: 2025년 6월 30일까지 오픈 필수",
      "예산 제약: 총 예산 5천만원 이하",
      "기술 제약: 기존 레거시 시스템과 연동 필수",
      "규제 제약: 개인정보보호법 준수 (GDPR 등)",
      "리소스 제약: 팀 인원 5명 이하",
      "⚠️ 최소 5개 이상 작성"
    ],
    "timeline": [
      {
        "phase": "Phase 1: 기획 및 설계",
        "startDate": "2025-01-15",
        "endDate": "2025-02-15",
        "duration": 30,
        "milestones": [
          "요구사항 정의 완료",
          "화면 설계서 승인"
        ]
      },
      {
        "phase": "Phase 2: 디자인 및 개발",
        "startDate": "2025-02-16",
        "endDate": "2025-04-30",
        "duration": 75,
        "milestones": [
          "UI 디자인 완료",
          "프론트엔드 개발 완료",
          "백엔드 API 개발 완료"
        ]
      },
      {
        "phase": "Phase 3: 테스트 및 오픈",
        "startDate": "2025-05-01",
        "endDate": "2025-06-30",
        "duration": 60,
        "milestones": [
          "통합 테스트 완료",
          "운영 환경 구축",
          "서비스 오픈"
        ]
      }
    ],
    "budgetEstimates": {
      "development": 60,
      "design": 20,
      "testing": 15,
      "infrastructure": 5
    },
    "technicalStack": [
      "프론트엔드: React 18 + TypeScript",
      "백엔드: Node.js + Express",
      "데이터베이스: PostgreSQL",
      "인프라: AWS (EC2, RDS, S3)",
      "기타: Docker, GitHub Actions",
      "⚠️ 최소 5개 이상 (문서에 없으면 프로젝트에 적합한 스택 추천)"
    ],
    "integrationPoints": [
      "결제 시스템 연동 (PG사 API)",
      "인증 시스템 연동 (OAuth 2.0)",
      "레거시 데이터베이스 연동 (REST API)",
      "⚠️ 최소 3개 이상 (문서 기반 추출, 각 통합 포인트의 목적과 데이터 흐름 포함)"
    ]
  }
}
\`\`\`

**⚠️ Phase 4 필수 작성 필드**:
1. ✅ **baselineData.requirements** - 핵심 기능 요구사항 (최소 10개, 문서 내용 기반)
2. ✅ **baselineData.stakeholders** - 이해관계자 목록 (최소 3개, 문자열 배열)
3. ✅ **baselineData.constraints** - 제약사항 (최소 5개, 일정/예산/기술/규제/리소스)
4. ✅ **baselineData.timeline** - 일정 계획 (최소 3개 Phase, 각 Phase마다 milestones 포함)
5. ✅ **baselineData.budgetEstimates** - 예산 배분 (development, design, testing, infrastructure)
6. ✅ **baselineData.technicalStack** - 기술 스택 (최소 5개, 프론트/백/DB/인프라 모두 포함)
7. ✅ **baselineData.integrationPoints** - 통합 포인트 (최소 3개, 각 포인트의 목적과 데이터 흐름)

**출력 형식 규칙**:
- ❌ 설명문이나 주석 없이
- ❌ 마크다운 코드 블록 없이
- ✅ 오직 순수 JSON 객체만 반환 ({ 로 시작, } 로 끝)
- ✅ 모든 문자열 필드는 큰따옴표(") 사용
- ✅ timeline 배열의 각 객체는 위 형식 준수

위 JSON 형식을 **정확히 준수**하여 **Phase 4 기초 데이터**를 완성해주세요.`;
  }

  // 🔥 Phase 5 프롬프트 생성 - 4가지 관점 상세 분석 (detailedPerspectives)
  private generateReportPhase5Prompt(
    _analyses: any[],
    _questions: any[],
    _answers: any[],
    phase1Result: any,
    _phase2Result: any,
    _phase3Result: any,
    phase4Result: any
  ): string {
    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 5/8: 4가지 관점 상세 분석

당신은 **웹에이전시 엘루오씨앤씨**의 **수석 프로젝트 전략가**입니다.
이 단계에서는 **기획/디자인/퍼블리싱/개발** 4가지 관점에서 **상세 분석**을 수행합니다.

## 📋 이전 단계 결과

### Phase 1 핵심 분석:
- 프로젝트 수락: ${phase1Result.agencyPerspective?.projectDecision?.recommendation || 'N/A'}
- 기획 실행가능성: ${phase1Result.agencyPerspective?.perspectives?.planning?.feasibility || 0}%
- 디자인 복잡도: ${phase1Result.agencyPerspective?.perspectives?.design?.complexity || 'N/A'}
- 퍼블리싱 복잡도: ${phase1Result.agencyPerspective?.perspectives?.publishing?.responsiveComplexity || 'N/A'}
- 개발 복잡도: ${phase1Result.agencyPerspective?.perspectives?.development?.technicalComplexity || 'N/A'}

### Phase 2 리스크:
- 고위험: ${_phase2Result.riskAssessment?.high?.length || 0}개
- 중위험: ${_phase2Result.riskAssessment?.medium?.length || 0}개

### Phase 3 권장사항:
- 실행 권장사항: ${_phase3Result.recommendations?.length || 0}개

### Phase 4 기초 데이터:
- 핵심 요구사항: ${phase4Result.baselineData?.requirements?.length || 0}개
- 제약사항: ${phase4Result.baselineData?.constraints?.length || 0}개
- 기술 스택: ${phase4Result.baselineData?.technicalStack?.slice(0, 3).join(', ') || 'N/A'}

---

## 🎨 Phase 5 작성 지침

### 목표:
- 각 영역별 **상세 범위, 공수, 비용, 산출물** 도출
- 각 영역별 **어려움(challenges)과 리스크** 식별
- 각 영역별 **기회 요소(opportunities)** 발견

### 분석 영역:
1. **기획 (Planning)**: 요구사항 정의, 화면 설계, 프로세스 정의
2. **디자인 (Design)**: UI/UX 디자인, 디자인 시스템, 프로토타입
3. **퍼블리싱 (Publishing)**: HTML/CSS, 반응형, 크로스브라우징, 접근성
4. **개발 (Development)**: 프론트엔드, 백엔드, 데이터베이스, 배포 (개발 없으면 명시)

---

## 📝 Phase 5 출력 형식 (JSON)

**⚠️ 이 단계에서는 4가지 관점 상세 분석(detailedPerspectives)만 생성합니다.**

다음 JSON 형식으로 작성하세요:

\`\`\`json
{
  "agencyDetailedAnalysis": {
    "detailedPerspectives": {
      "planning": {
        "scope": {
          "overview": "기획 범위 전반에 대한 상세 설명 (200자 이상)",
          "keyActivities": [
            "요구사항 정의서 작성",
            "화면 설계서 (Wireframe) 작성",
            "기능 명세서 작성",
            "프로세스 정의 및 플로우차트"
          ],
          "deliverables": [
            "요구사항 정의서 (RFP)",
            "화면 설계서 (Wireframe)",
            "기능 명세서",
            "프로세스 플로우차트"
          ]
        },
        "complexity": {
          "level": "중",
          "factors": [
            "복잡도 영향 요인 1 (예: 다중 사용자 권한 시스템)",
            "복잡도 영향 요인 2 (예: 복잡한 비즈니스 로직)"
          ],
          "technicalChallenges": [
            "기술적 난이도 1",
            "기술적 난이도 2"
          ]
        },
        "estimatedEffort": {
          "hours": 160,
          "manMonths": 1.0,
          "duration": "4주",
          "breakdown": [
            { "activity": "요구사항 정의", "hours": 40 },
            { "activity": "화면 설계", "hours": 60 },
            { "activity": "기능 명세", "hours": 40 },
            { "activity": "프로세스 정의", "hours": 20 }
          ]
        },
        "estimatedCost": {
          "total": 16000000,
          "breakdown": [
            { "item": "기획자 인건비", "cost": 12000000 },
            { "item": "도구 및 라이선스", "cost": 2000000 },
            { "item": "기타 비용", "cost": 2000000 }
          ],
          "currency": "KRW"
        },
        "keyDeliverables": [
          {
            "name": "요구사항 정의서",
            "description": "프로젝트 요구사항 상세 문서",
            "format": "PDF/Word",
            "estimatedPages": 30
          },
          {
            "name": "화면 설계서",
            "description": "모든 화면의 Wireframe",
            "format": "Figma/Sketch",
            "estimatedScreens": 25
          }
        ],
        "challenges": [
          {
            "challenge": "요구사항 불명확성",
            "impact": "중",
            "mitigation": "정기적인 고객 미팅 및 프로토타입 검증"
          },
          {
            "challenge": "범위 변경 가능성",
            "impact": "중",
            "mitigation": "변경 관리 프로세스 수립 및 우선순위 관리"
          }
        ],
        "risks": [
          {
            "risk": "고객 요구사항 변경",
            "probability": "중",
            "impact": "중",
            "mitigation": "Agile 방법론 적용 및 스프린트별 검토"
          }
        ],
        "opportunities": [
          {
            "opportunity": "추가 기능 제안",
            "benefit": "프로젝트 확장 및 매출 증대",
            "feasibility": "높음"
          }
        ]
      },

      "design": {
        "scope": {
          "overview": "디자인 범위 전반에 대한 상세 설명 (200자 이상)",
          "keyActivities": [
            "UI/UX 디자인 시안 작성",
            "디자인 시스템 구축",
            "프로토타입 제작",
            "사용자 테스트 및 개선"
          ],
          "deliverables": [
            "디자인 시안 (Figma)",
            "디자인 시스템 가이드",
            "인터랙티브 프로토타입",
            "사용자 테스트 보고서"
          ]
        },
        "complexity": {
          "level": "중상",
          "factors": [
            "복잡도 영향 요인 1 (예: 반응형 디자인 요구)",
            "복잡도 영향 요인 2 (예: 다크모드 지원)"
          ],
          "technicalChallenges": [
            "크로스 플랫폼 일관성 유지",
            "접근성(a11y) 준수"
          ]
        },
        "estimatedEffort": {
          "hours": 240,
          "manMonths": 1.5,
          "duration": "6주",
          "breakdown": [
            { "activity": "UI/UX 디자인", "hours": 120 },
            { "activity": "디자인 시스템 구축", "hours": 60 },
            { "activity": "프로토타입 제작", "hours": 40 },
            { "activity": "사용자 테스트", "hours": 20 }
          ]
        },
        "estimatedCost": {
          "total": 24000000,
          "breakdown": [
            { "item": "디자이너 인건비", "cost": 18000000 },
            { "item": "디자인 도구 라이선스", "cost": 3000000 },
            { "item": "사용자 테스트 비용", "cost": 3000000 }
          ],
          "currency": "KRW"
        },
        "keyDeliverables": [
          {
            "name": "디자인 시안",
            "description": "모든 화면의 최종 디자인",
            "format": "Figma",
            "estimatedScreens": 30
          },
          {
            "name": "디자인 시스템",
            "description": "재사용 가능한 컴포넌트 라이브러리",
            "format": "Figma Component Library",
            "components": 50
          }
        ],
        "challenges": [
          {
            "challenge": "브랜드 아이덴티티 일관성",
            "impact": "중",
            "mitigation": "디자인 시스템 초기 구축 및 가이드라인 수립"
          }
        ],
        "risks": [
          {
            "risk": "디자인 승인 지연",
            "probability": "중",
            "impact": "중",
            "mitigation": "단계별 승인 프로세스 및 빠른 피드백 루프"
          }
        ],
        "opportunities": [
          {
            "opportunity": "디자인 시스템 재사용",
            "benefit": "향후 프로젝트 디자인 기간 단축",
            "feasibility": "높음"
          }
        ]
      },

      "publishing": {
        "scope": {
          "overview": "퍼블리싱 범위 전반에 대한 상세 설명 (200자 이상)",
          "keyActivities": [
            "HTML/CSS 마크업",
            "반응형 웹 구현",
            "크로스브라우징 대응",
            "웹 접근성(WCAG 2.1 AA) 준수"
          ],
          "deliverables": [
            "HTML/CSS 정적 페이지",
            "반응형 레이아웃 (Mobile/Tablet/Desktop)",
            "크로스브라우징 테스트 보고서",
            "웹 접근성 검증 보고서"
          ]
        },
        "complexity": {
          "level": "중",
          "factors": [
            "복잡도 영향 요인 1 (예: 다양한 디바이스 지원)",
            "복잡도 영향 요인 2 (예: 애니메이션 및 인터랙션)"
          ],
          "technicalChallenges": [
            "구형 브라우저 지원",
            "성능 최적화 (LCP, FID, CLS)"
          ]
        },
        "estimatedEffort": {
          "hours": 200,
          "manMonths": 1.25,
          "duration": "5주",
          "breakdown": [
            { "activity": "HTML 마크업", "hours": 80 },
            { "activity": "CSS 스타일링", "hours": 60 },
            { "activity": "반응형 구현", "hours": 40 },
            { "activity": "접근성 준수", "hours": 20 }
          ]
        },
        "estimatedCost": {
          "total": 18000000,
          "breakdown": [
            { "item": "퍼블리셔 인건비", "cost": 15000000 },
            { "item": "테스트 도구", "cost": 2000000 },
            { "item": "기타 비용", "cost": 1000000 }
          ],
          "currency": "KRW"
        },
        "keyDeliverables": [
          {
            "name": "정적 HTML 페이지",
            "description": "모든 화면의 HTML/CSS 마크업",
            "format": "HTML/CSS/JS",
            "estimatedPages": 25
          },
          {
            "name": "스타일 가이드",
            "description": "CSS 컴포넌트 및 사용법",
            "format": "HTML Documentation",
            "components": 30
          }
        ],
        "challenges": [
          {
            "challenge": "다양한 브라우저 호환성",
            "impact": "중",
            "mitigation": "BrowserStack을 활용한 실시간 테스트"
          }
        ],
        "risks": [
          {
            "risk": "디자인 변경으로 인한 재작업",
            "probability": "중",
            "impact": "중",
            "mitigation": "디자인 확정 후 퍼블리싱 시작"
          }
        ],
        "opportunities": [
          {
            "opportunity": "컴포넌트 라이브러리 구축",
            "benefit": "향후 프로젝트 퍼블리싱 재사용",
            "feasibility": "높음"
          }
        ]
      },

      "development": {
        "scope": {
          "overview": "개발 범위 전반에 대한 상세 설명 (200자 이상)",
          "keyActivities": [
            "프론트엔드 개발 (React/TypeScript)",
            "백엔드 API 개발 (Node.js)",
            "데이터베이스 설계 및 구축 (PostgreSQL)",
            "배포 및 CI/CD 파이프라인 구축"
          ],
          "deliverables": [
            "프론트엔드 애플리케이션",
            "백엔드 REST API",
            "데이터베이스 스키마",
            "배포 파이프라인 및 문서"
          ]
        },
        "complexity": {
          "level": "상",
          "factors": [
            "복잡도 영향 요인 1 (예: 실시간 기능 요구)",
            "복잡도 영향 요인 2 (예: 외부 API 통합)"
          ],
          "technicalChallenges": [
            "확장 가능한 아키텍처 설계",
            "보안 및 인증/권한 관리"
          ]
        },
        "estimatedEffort": {
          "hours": 800,
          "manMonths": 5.0,
          "duration": "12주",
          "breakdown": [
            { "activity": "프론트엔드 개발", "hours": 320 },
            { "activity": "백엔드 API 개발", "hours": 280 },
            { "activity": "데이터베이스 설계", "hours": 120 },
            { "activity": "배포 및 CI/CD", "hours": 80 }
          ]
        },
        "estimatedCost": {
          "total": 80000000,
          "breakdown": [
            { "item": "프론트엔드 개발자 인건비", "cost": 36000000 },
            { "item": "백엔드 개발자 인건비", "cost": 28000000 },
            { "item": "인프라 비용", "cost": 10000000 },
            { "item": "라이선스 및 도구", "cost": 6000000 }
          ],
          "currency": "KRW"
        },
        "keyDeliverables": [
          {
            "name": "프론트엔드 애플리케이션",
            "description": "React 기반 SPA",
            "format": "Web Application",
            "features": 30
          },
          {
            "name": "백엔드 API",
            "description": "RESTful API 서버",
            "format": "Node.js/Express",
            "endpoints": 50
          },
          {
            "name": "데이터베이스",
            "description": "PostgreSQL 스키마 및 마이그레이션",
            "format": "SQL Scripts",
            "tables": 20
          }
        ],
        "challenges": [
          {
            "challenge": "성능 최적화",
            "impact": "높음",
            "mitigation": "코드 스플리팅, 캐싱, CDN 활용"
          },
          {
            "challenge": "보안 취약점",
            "impact": "높음",
            "mitigation": "정기적인 보안 감사 및 침투 테스트"
          }
        ],
        "risks": [
          {
            "risk": "기술 스택 변경 요구",
            "probability": "낮음",
            "impact": "높음",
            "mitigation": "초기 기술 스택 확정 및 고객 승인"
          },
          {
            "risk": "외부 API 의존성",
            "probability": "중",
            "impact": "중",
            "mitigation": "API Fallback 전략 및 에러 핸들링"
          }
        ],
        "opportunities": [
          {
            "opportunity": "마이크로서비스 아키텍처 적용",
            "benefit": "확장성 및 유지보수성 향상",
            "feasibility": "중"
          },
          {
            "opportunity": "자동화된 테스트 및 CI/CD",
            "benefit": "배포 속도 및 품질 향상",
            "feasibility": "높음"
          }
        ]
      }
    }
  }
}
\`\`\`

**⚠️ Phase 5 필수 작성 필드**:
1. ✅ **planning** - 기획 관점 상세 분석
   * scope (overview, keyActivities, deliverables)
   * complexity (level, factors, technicalChallenges)
   * estimatedEffort (hours, manMonths, duration, breakdown)
   * estimatedCost (total, breakdown, currency)
   * keyDeliverables (최소 2개: name, description, format, 특성 필드)
   * challenges (최소 2개: challenge, impact, mitigation)
   * risks (최소 1개: risk, probability, impact, mitigation)
   * opportunities (최소 1개: opportunity, benefit, feasibility)

2. ✅ **design** - 디자인 관점 상세 분석
   * scope, complexity, estimatedEffort, estimatedCost, keyDeliverables, challenges, risks, opportunities

3. ✅ **publishing** - 퍼블리싱 관점 상세 분석
   * scope, complexity, estimatedEffort, estimatedCost, keyDeliverables, challenges, risks, opportunities

4. ✅ **development** - 개발 관점 상세 분석
   * scope, complexity, estimatedEffort, estimatedCost, keyDeliverables, challenges, risks, opportunities
**출력 형식 규칙**:
- ❌ 설명문 없이
- ❌ 마크다운 코드 블록 없이
- ✅ 오직 순수 JSON 객체만 반환 ({ 로 시작, } 로 끝)

위 JSON 형식을 **정확히 준수**하여 **Phase 5 상세 분석**을 완성해주세요.`;
  }

  // 🔥 6-Phase: Phase 6 프롬프트 - 수익성 + 경쟁력 + 최종 수주 결정
  private generateReportPhase6Prompt(
    _analyses: any[],
    _questions: any[],
    _answers: any[],
    phase1Result: any,
    _phase2Result: any,
    _phase3Result: any,
    phase4Result: any,
    phase5Result: any
  ): string {
    const phase1Summary = {
      recommendation: phase1Result.agencyPerspective?.projectDecision?.recommendation || 'N/A',
      confidence: phase1Result.agencyPerspective?.projectDecision?.confidence || 0,
    };

    const phase4Summary = {
      requirementsCount: phase4Result.baselineData?.requirements?.length || 0,
      techStack: phase4Result.baselineData?.technicalStack?.slice(0, 3).join(', ') || 'N/A',
    };

    const phase5Summary = {
      planningEstimatedEffort: phase5Result.agencyDetailedAnalysis?.detailedPerspectives?.planning?.estimatedEffort || 'N/A',
      designEstimatedCost: phase5Result.agencyDetailedAnalysis?.detailedPerspectives?.design?.estimatedCost || 0,
      publishingEstimatedCost: phase5Result.agencyDetailedAnalysis?.detailedPerspectives?.publishing?.estimatedCost || 0,
      developmentEstimatedCost: phase5Result.agencyDetailedAnalysis?.detailedPerspectives?.development?.estimatedCost || 0,
    };

    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 6/8: 수익성 + 경쟁력 + 최종 결정

이전 Phase 결과:
- Phase 1 수락 권장: ${phase1Summary.recommendation} (확신도: ${phase1Summary.confidence}%)
- Phase 4 핵심 요구사항: ${phase4Summary.requirementsCount}개
- Phase 5 기획 공수: ${phase5Summary.planningEstimatedEffort}
- Phase 5 예상 비용: 디자인 ${phase5Summary.designEstimatedCost / 1000000}백만원, 퍼블리싱 ${phase5Summary.publishingEstimatedCost / 1000000}백만원, 개발 ${phase5Summary.developmentEstimatedCost / 1000000}백만원

다음 JSON 형식으로 수익성 분석, 경쟁력 분석, 최종 수주 결정을 작성하세요:

\`\`\`json
{
  "agencyDetailedAnalysis": {
    "profitability": {
      "totalEstimatedRevenue": 100000000,
      "costBreakdown": {
        "planning": 10000000,
        "design": 15000000,
        "publishing": 8000000,
        "development": 40000000,
        "overhead": 7000000,
        "buffer": 5000000
      },
      "totalEstimatedCost": 85000000,
      "totalProfit": 15000000,
      "profitMargin": 15.0,
      "roi": 17.6,
      "paybackPeriod": "3개월",
      "analysis": "수익성 분석 설명 (100자 이상)"
    },
    "competitiveness": {
      "ourStrengths": ["우리 회사 강점 3개"],
      "ourWeaknesses": ["우리 회사 약점 2개"],
      "differentiators": ["경쟁사 대비 차별화 요소 3개"],
      "competitiveAdvantage": "종합 경쟁 우위 평가 (100자 이상)"
    },
    "finalDecision": {
      "recommendation": "accept|conditional_accept|decline",
      "confidence": 85,
      "reasoning": "최종 결정 근거 (200자 이상)",
      "conditions": ["조건부 수락 시 필요 조건 (2개 이상, 없으면 빈 배열)"],
      "strategicValue": {
        "portfolioValue": 80,
        "brandValue": 75,
        "futureOpportunities": 70,
        "customerRelationship": 85,
        "analysis": "전략적 가치 설명 (100자 이상)"
      }
    }
  }
}
\`\`\`

⚠️ 출력 형식 엄수:
- JSON 객체만 반환 ({ 로 시작, } 로 끝)
- 절대로 \`\`\`를 사용하지 마세요
- 절대로 마크다운 코드블록을 사용하지 마세요
- 설명, 주석, 추가 텍스트 일체 금지`;
  }

  // 🔥 Phase 7 프롬프트 - WBS + 리소스 계획
  private generateReportPhase7Prompt(
    _analyses: any[],
    _questions: any[],
    _answers: any[],
    _phase1Result: any,
    _phase2Result: any,
    _phase3Result: any,
    phase4Result: any,
    phase5Result: any,
    phase6Result: any
  ): string {
    const phase4Summary = {
      requirementsCount: phase4Result.baselineData?.requirements?.length || 0,
      techStack: phase4Result.baselineData?.technicalStack?.slice(0, 3).join(', ') || 'N/A',
    };

    const phase5Summary = {
      planningHours: phase5Result.agencyDetailedAnalysis?.detailedPerspectives?.planning?.estimatedEffort || 'N/A',
      designHours: phase5Result.agencyDetailedAnalysis?.detailedPerspectives?.design?.estimatedEffort || 'N/A',
    };

    const phase6Summary = {
      finalRecommendation: phase6Result.agencyDetailedAnalysis?.finalDecision?.recommendation || 'N/A',
      confidence: phase6Result.agencyDetailedAnalysis?.finalDecision?.confidence || 0,
      totalRevenue: phase6Result.agencyDetailedAnalysis?.profitability?.totalEstimatedRevenue || 0,
      profitMargin: phase6Result.agencyDetailedAnalysis?.profitability?.profitMargin || 0,
    };

    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 7/8: WBS + 리소스 계획

이전 Phase 결과:
- Phase 4 핵심 요구사항: ${phase4Summary.requirementsCount}개
- Phase 5 기획 공수: ${phase5Summary.planningHours}, 디자인 공수: ${phase5Summary.designHours}
- Phase 6 최종 권장: ${phase6Summary.finalRecommendation} (확신도: ${phase6Summary.confidence}%)
- Phase 6 예상 매출: ${(phase6Summary.totalRevenue / 1000000).toFixed(1)}백만원, 이익률: ${phase6Summary.profitMargin.toFixed(1)}%

**⚠️ 이 단계에서는 WBS(작업 분해 구조)와 리소스 계획만 작성합니다.**
**제안서와 다음 단계는 Phase 8에서 작성됩니다.**

다음 JSON 형식으로 WBS와 리소스 계획을 작성하세요:

\`\`\`json
{
  "executionPlan": {
    "wbs": [
      {
        "id": "1",
        "task": "기획 단계",
        "description": "요구사항 정의 및 화면 설계",
        "subtasks": [
          {
            "id": "1.1",
            "task": "요구사항 정의서 작성",
            "estimatedHours": 40,
            "assignee": "기획자",
            "deliverable": "요구사항 정의서",
            "dependencies": []
          }
        ],
        "totalHours": 80,
        "duration": "2주",
        "startDate": "2025-02-01",
        "endDate": "2025-02-14"
      }
    ],
    "resourcePlan": {
      "teamComposition": [
        {
          "role": "프로젝트 매니저",
          "count": 1,
          "allocation": "50%",
          "manMonths": 0.5,
          "responsibilities": ["프로젝트 총괄", "일정 관리"],
          "requiredSkills": ["프로젝트 관리", "커뮤니케이션"]
        }
      ],
      "totalManMonths": 6.0,
      "totalCost": 60000000,
      "timeline": "3개월"
    }
  }
}
\`\`\`

**⚠️ Phase 7 필수 작성 필드**:
1. ✅ **executionPlan.wbs** - 작업 분해 구조 (최소 4개 주요 작업)
   * 각 작업은 id, task, description, subtasks, totalHours, duration, startDate, endDate 포함
   * 각 subtask는 id, task, estimatedHours, assignee, deliverable, dependencies 포함
2. ✅ **executionPlan.resourcePlan** - 리소스 계획
   * teamComposition (최소 5개 역할)
   * totalManMonths, totalCost, timeline 포함

⚠️ 출력 형식 엄수:
- JSON 객체만 반환 ({ 로 시작, } 로 끝)
- 절대로 \`\`\`를 사용하지 마세요
- 절대로 마크다운 코드블록을 사용하지 마세요
- 설명, 주석, 추가 텍스트 일체 금지`;
  }

  // 🔥 Phase 8 프롬프트 - 제안서 + 발표자료 + 다음 단계
  private generateReportPhase8Prompt(
    _analyses: any[],
    _questions: any[],
    _answers: any[],
    phase1Result: any,
    _phase2Result: any,
    _phase3Result: any,
    _phase4Result: any,
    _phase5Result: any,
    phase6Result: any,
    phase7Result: any
  ): string {
    const phase1Summary = {
      projectName: phase1Result.summary?.substring(0, 50) || '프로젝트',
    };

    const phase6Summary = {
      finalRecommendation: phase6Result.agencyDetailedAnalysis?.finalDecision?.recommendation || 'N/A',
      totalRevenue: phase6Result.agencyDetailedAnalysis?.profitability?.totalEstimatedRevenue || 0,
    };

    const phase7Summary = {
      totalManMonths: phase7Result.executionPlan?.resourcePlan?.totalManMonths || 0,
      timeline: phase7Result.executionPlan?.resourcePlan?.timeline || 'N/A',
    };

    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 8/8: 제안서 + 발표자료 + 다음 단계

이전 Phase 결과:
- Phase 1 프로젝트: ${phase1Summary.projectName}
- Phase 6 최종 권장: ${phase6Summary.finalRecommendation}
- Phase 6 예상 매출: ${(phase6Summary.totalRevenue / 1000000).toFixed(1)}백만원
- Phase 7 총 공수: ${phase7Summary.totalManMonths} 맨먼스, 기간: ${phase7Summary.timeline}

**⚠️ 이 단계에서는 제안서 개요, 발표자료 개요, 다음 단계만 작성합니다.**

다음 JSON 형식으로 작성하세요:

\`\`\`json
{
  "executionPlan": {
    "proposalOutline": {
      "title": "프로젝트명 - 웹사이트/모바일앱 구축 제안서",
      "sections": [
        {
          "section": "1. 제안 개요",
          "content": "프로젝트 배경, 목적, 범위를 구체적으로 설명 (300자 이상)",
          "keyPoints": [
            "프로젝트 배경 및 필요성 - 고객사 현황과 문제점 분석",
            "프로젝트 목표 및 기대효과 - 정량적/정성적 목표",
            "프로젝트 범위 - 포함/제외 사항 명확히"
          ]
        },
        {
          "section": "2. 프로젝트 이해",
          "content": "고객 요구사항 분석 및 우리의 이해도 (300자 이상)",
          "keyPoints": [
            "핵심 요구사항 정리",
            "기술적 과제 및 해결 방안",
            "성공 기준 및 KPI"
          ]
        },
        {
          "section": "3. 제안 솔루션",
          "content": "기술 아키텍처, 주요 기능, 차별화 포인트 (300자 이상)",
          "keyPoints": [
            "기술 스택 및 아키텍처",
            "주요 기능 상세 설명",
            "우리의 강점 및 차별화"
          ]
        },
        {
          "section": "4. 프로젝트 수행 방안",
          "content": "개발 방법론, 일정, 리스크 관리 (300자 이상)",
          "keyPoints": [
            "Agile 개발 방법론 적용",
            "단계별 일정 및 마일스톤",
            "품질 관리 및 테스트 계획",
            "리스크 관리 및 대응 방안"
          ]
        },
        {
          "section": "5. 프로젝트 조직 및 투입 인력",
          "content": "팀 구성, 역할 및 책임 (200자 이상)",
          "keyPoints": [
            "프로젝트 조직도",
            "주요 인력 프로필 및 경력",
            "역할 및 책임 (RACI)"
          ]
        },
        {
          "section": "6. 프로젝트 비용",
          "content": "견적 내역, 지급 조건 (200자 이상)",
          "keyPoints": [
            "단계별 비용 내역",
            "지급 조건 (착수금/중도금/잔금)",
            "추가 비용 및 유지보수"
          ]
        },
        {
          "section": "7. 레퍼런스 및 포트폴리오",
          "content": "유사 프로젝트 수행 경험 (200자 이상)",
          "keyPoints": [
            "유사 프로젝트 3개 이상 소개",
            "고객사 및 성과",
            "수상 경력 및 인증"
          ]
        }
      ],
      "appendix": [
        "참고 자료 1: 회사 소개서",
        "참고 자료 2: 포트폴리오 상세",
        "참고 자료 3: 기술 스택 상세 문서",
        "참고 자료 4: 계약서 샘플"
      ]
    },
    "presentationOutline": [
      {
        "slideNumber": 1,
        "title": "표지",
        "content": "프로젝트명, 엘루오씨앤씨, 제안 날짜",
        "talkingPoints": ["간단한 인사 및 회사 소개"]
      },
      {
        "slideNumber": 2,
        "title": "회사 소개",
        "content": "엘루오씨앤씨 소개 (설립 연도, 비전, 주요 고객사)",
        "talkingPoints": [
          "웹에이전시 전문성 강조",
          "주요 레퍼런스 3개 소개",
          "팀의 강점 및 차별화"
        ]
      },
      {
        "slideNumber": 3,
        "title": "프로젝트 이해",
        "content": "고객 요구사항 및 문제점 분석",
        "talkingPoints": [
          "현황 분석 (As-Is)",
          "문제점 및 개선 필요 사항",
          "프로젝트 목표 (To-Be)"
        ]
      },
      {
        "slideNumber": 4,
        "title": "제안 솔루션",
        "content": "기술 아키텍처 및 주요 기능",
        "talkingPoints": [
          "시스템 아키텍처 다이어그램",
          "주요 기능 3개 강조",
          "기술 스택 선정 이유"
        ]
      },
      {
        "slideNumber": 5,
        "title": "프로젝트 일정",
        "content": "단계별 일정 및 마일스톤",
        "talkingPoints": [
          "전체 일정 (Gantt Chart 형태)",
          "주요 마일스톤 및 산출물",
          "기간 및 공수 설명"
        ]
      },
      {
        "slideNumber": 6,
        "title": "프로젝트 비용",
        "content": "견적 내역 및 지급 조건",
        "talkingPoints": [
          "총 비용 및 단계별 내역",
          "비용 대비 가치 (ROI)",
          "지급 조건 (착수금 30%, 중도금 40%, 잔금 30%)"
        ]
      },
      {
        "slideNumber": 7,
        "title": "기대 효과",
        "content": "프로젝트 성공 시 기대되는 효과",
        "talkingPoints": [
          "정량적 효과 (매출 증대, 비용 절감)",
          "정성적 효과 (브랜드 이미지, 사용자 만족도)",
          "장기적 비전"
        ]
      },
      {
        "slideNumber": 8,
        "title": "Q&A",
        "content": "질문 및 답변",
        "talkingPoints": [
          "예상 질문 대비 (기술, 일정, 비용)",
          "추가 설명 준비"
        ]
      }
    ],
    "nextSteps": [
      {
        "step": 1,
        "action": "제안서 최종 검토 및 승인",
        "owner": "프로젝트 매니저",
        "deadline": "제안 발표 3일 전",
        "status": "pending"
      },
      {
        "step": 2,
        "action": "고객사 제안 발표 (PT)",
        "owner": "프로젝트 매니저 + 기술 리드",
        "deadline": "제안 마감일",
        "status": "pending"
      },
      {
        "step": 3,
        "action": "고객사 피드백 수렴 및 보완",
        "owner": "전체 팀",
        "deadline": "발표 후 1주일",
        "status": "pending"
      },
      {
        "step": 4,
        "action": "계약 협상 및 계약서 작성",
        "owner": "프로젝트 매니저",
        "deadline": "보완 완료 후 3일",
        "status": "pending"
      },
      {
        "step": 5,
        "action": "프로젝트 킥오프 미팅",
        "owner": "전체 팀",
        "deadline": "계약 체결 후 1주일",
        "status": "pending"
      }
    ]
  }
}
\`\`\`

**⚠️ Phase 8 필수 작성 필드**:
1. ✅ **executionPlan.proposalOutline** - 제안서 개요
   * title (프로젝트명 포함)
   * sections (최소 7개 섹션, 각 섹션마다 content 300자 이상, keyPoints 3개 이상)
   * appendix (최소 4개 참고 자료)
2. ✅ **executionPlan.presentationOutline** - 발표자료 개요
   * 최소 8개 슬라이드
   * 각 슬라이드마다 slideNumber, title, content, talkingPoints 포함
3. ✅ **executionPlan.nextSteps** - 다음 단계
   * 최소 5개 단계
   * 각 단계마다 step, action, owner, deadline, status 포함

⚠️ 출력 형식 엄수:
- JSON 객체만 반환 ({ 로 시작, } 로 끝)
- 절대로 \`\`\`를 사용하지 마세요
- 절대로 마크다운 코드블록을 사용하지 마세요
- 설명, 주석, 추가 텍스트 일체 금지`;
  }

  // 🔥 NEW: Phase 7B-1 프롬프트 - 팀 구성 (Team Composition)
  private generateReportPhase7B1Prompt(
    _analyses: any[],
    _questions: any[],
    _answers: any[],
    phase4Result: any,
    _phase5Result: any,
    phase6Result: any,
    phase7AResult: any
  ): string {
    const phase4Summary = {
      requirementsCount: phase4Result.baselineData?.requirements?.length || 0,
      techStack: phase4Result.baselineData?.technicalStack?.slice(0, 3).join(', ') || 'N/A',
    };

    const phase6Summary = {
      totalRevenue: phase6Result.agencyDetailedAnalysis?.profitability?.totalEstimatedRevenue || 0,
    };

    const phase7ASummary = {
      wbsCount: phase7AResult.executionPlan?.wbs?.length || 0,
    };

    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 7B-1/14: 팀 구성 (Team Composition)

이전 Phase 결과:
- Phase 4 핵심 요구사항: ${phase4Summary.requirementsCount}개, 기술 스택: ${phase4Summary.techStack}
- Phase 6 예상 매출: ${(phase6Summary.totalRevenue / 1000000).toFixed(1)}백만원
- Phase 7A WBS: ${phase7ASummary.wbsCount}개 작업

**⚠️ 이 단계에서는 팀 구성(teamComposition)만 작성합니다.**
**비용 산정은 Phase 7B-2에서 작성됩니다.**

다음 JSON 형식으로 팀 구성을 작성하세요:

\`\`\`json
{
  "executionPlan": {
    "resourcePlan": {
      "teamComposition": [
        {
          "role": "프로젝트 매니저",
          "count": 1,
          "allocation": "50%",
          "manMonths": 0.5,
          "responsibilities": ["프로젝트 총괄", "일정 관리", "리스크 관리"],
          "requiredSkills": ["프로젝트 관리", "커뮤니케이션", "이슈 해결"]
        },
        {
          "role": "기획자",
          "count": 1,
          "allocation": "100%",
          "manMonths": 2.0,
          "responsibilities": ["요구사항 분석", "화면 설계", "기능 정의"],
          "requiredSkills": ["UX 기획", "Figma", "문서 작성"]
        },
        {
          "role": "디자이너",
          "count": 1,
          "allocation": "100%",
          "manMonths": 1.5,
          "responsibilities": ["UI 디자인", "디자인 시스템 구축"],
          "requiredSkills": ["UI 디자인", "Figma", "디자인 시스템"]
        },
        {
          "role": "퍼블리셔",
          "count": 1,
          "allocation": "100%",
          "manMonths": 1.25,
          "responsibilities": ["HTML/CSS", "반응형 구현"],
          "requiredSkills": ["HTML5", "CSS3", "반응형 웹"]
        },
        {
          "role": "프론트엔드 개발자",
          "count": 2,
          "allocation": "100%",
          "manMonths": 4.0,
          "responsibilities": ["React 개발", "API 연동", "상태 관리"],
          "requiredSkills": ["React", "TypeScript", "API 연동"]
        },
        {
          "role": "백엔드 개발자",
          "count": 2,
          "allocation": "100%",
          "manMonths": 3.5,
          "responsibilities": ["API 개발", "데이터베이스 설계", "서버 구축"],
          "requiredSkills": ["Node.js", "PostgreSQL", "RESTful API"]
        },
        {
          "role": "QA 엔지니어",
          "count": 1,
          "allocation": "50%",
          "manMonths": 0.75,
          "responsibilities": ["테스트 계획", "품질 검증", "버그 리포팅"],
          "requiredSkills": ["테스트 자동화", "품질 관리", "이슈 트래킹"]
        }
      ]
    }
  }
}
\`\`\`

**⚠️ Phase 7B-1 필수 작성 필드**:
1. ✅ **executionPlan.resourcePlan.teamComposition** - 팀 구성 (최소 5개 역할)
   * 각 역할은 role, count, allocation, manMonths, responsibilities, requiredSkills 포함
   * responsibilities는 최소 2개, requiredSkills는 최소 2개

⚠️ 출력 형식 엄수:
- JSON 객체만 반환 ({ 로 시작, } 로 끝)
- 절대로 \`\`\`를 사용하지 마세요
- 절대로 마크다운 코드블록을 사용하지 마세요
- 설명, 주석, 추가 텍스트 일체 금지
- **최대 2000자 엄수**`;
  }

  // 🔥 NEW: Phase 7B-2 프롬프트 - 비용 산정 (Cost Estimate)
  private generateReportPhase7B2Prompt(
    _analyses: any[],
    _questions: any[],
    _answers: any[],
    phase6Result: any,
    phase7B1Result: any
  ): string {
    const phase6Summary = {
      totalRevenue: phase6Result.agencyDetailedAnalysis?.profitability?.totalEstimatedRevenue || 0,
      totalCost: phase6Result.agencyDetailedAnalysis?.profitability?.totalEstimatedCost || 0,
    };

    const phase7B1Summary = {
      teamSize: phase7B1Result.executionPlan?.resourcePlan?.teamComposition?.length || 0,
    };

    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 7B-2/14: 비용 산정 (Cost Estimate)

이전 Phase 결과:
- Phase 6 예상 매출: ${(phase6Summary.totalRevenue / 1000000).toFixed(1)}백만원
- Phase 6 예상 비용: ${(phase6Summary.totalCost / 1000000).toFixed(1)}백만원
- Phase 7B-1 팀 구성: ${phase7B1Summary.teamSize}개 역할

**⚠️ 이 단계에서는 비용 산정(totalManMonths, totalCost, timeline)만 작성합니다.**

다음 JSON 형식으로 비용 산정을 작성하세요:

\`\`\`json
{
  "executionPlan": {
    "resourcePlan": {
      "totalManMonths": 13.5,
      "totalCost": 135000000,
      "timeline": "3개월",
      "costBreakdown": {
        "planning": 10000000,
        "design": 15000000,
        "publishing": 12500000,
        "frontendDevelopment": 36000000,
        "backendDevelopment": 31500000,
        "qa": 7500000,
        "projectManagement": 12500000,
        "overhead": 10000000
      },
      "paymentSchedule": [
        {
          "phase": "계약금",
          "percentage": 30,
          "amount": 40500000,
          "timing": "계약 체결 시"
        },
        {
          "phase": "중도금",
          "percentage": 40,
          "amount": 54000000,
          "timing": "개발 완료 50% 시점"
        },
        {
          "phase": "잔금",
          "percentage": 30,
          "amount": 40500000,
          "timing": "최종 검수 완료 후"
        }
      ]
    }
  }
}
\`\`\`

**⚠️ Phase 7B-2 필수 작성 필드**:
1. ✅ **executionPlan.resourcePlan.totalManMonths** - 총 맨먼스
2. ✅ **executionPlan.resourcePlan.totalCost** - 총 비용 (원화)
3. ✅ **executionPlan.resourcePlan.timeline** - 프로젝트 기간
4. ✅ **executionPlan.resourcePlan.costBreakdown** - 비용 세부 내역 (최소 6개 항목)
5. ✅ **executionPlan.resourcePlan.paymentSchedule** - 지급 일정 (3단계)

⚠️ 출력 형식 엄수:
- JSON 객체만 반환 ({ 로 시작, } 로 끝)
- 절대로 \`\`\`를 사용하지 마세요
- 절대로 마크다운 코드블록을 사용하지 마세요
- 설명, 주석, 추가 텍스트 일체 금지
- **최대 2000자 엄수**`;
  }

  // 🔥 NEW: Phase 8A-1 프롬프트 - 제안서 목차 (Proposal Outline)
  private generateReportPhase8A1Prompt(
    _analyses: any[],
    _questions: any[],
    _answers: any[],
    phase1Result: any,
    phase6Result: any
  ): string {
    const phase1Summary = {
      projectName: phase1Result.summary?.substring(0, 50) || '프로젝트',
    };

    const phase6Summary = {
      finalRecommendation: phase6Result.agencyDetailedAnalysis?.finalDecision?.recommendation || 'N/A',
    };

    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 8A-1/14: 제안서 목차 (Proposal Outline)

이전 Phase 결과:
- Phase 1 프로젝트: ${phase1Summary.projectName}
- Phase 6 최종 권장: ${phase6Summary.finalRecommendation}

**⚠️ 이 단계에서는 제안서 목차(proposalOutline.sections)만 작성합니다.**
**제안서 핵심 내용은 Phase 8A-2에서 작성됩니다.**

다음 JSON 형식으로 제안서 목차를 작성하세요:

\`\`\`json
{
  "executionPlan": {
    "proposalOutline": {
      "title": "${phase1Summary.projectName} - 웹사이트/모바일앱 구축 제안서",
      "sections": [
        {
          "section": "1. 제안 개요",
          "description": "프로젝트 배경, 목적, 범위",
          "keyPoints": [
            "프로젝트 배경 및 필요성",
            "프로젝트 목표 및 기대효과",
            "프로젝트 범위 - 포함/제외 사항"
          ]
        },
        {
          "section": "2. 프로젝트 이해",
          "description": "고객 요구사항 분석 및 우리의 이해도",
          "keyPoints": [
            "핵심 요구사항 정리",
            "기술적 과제 및 해결 방안",
            "성공 기준 및 KPI"
          ]
        },
        {
          "section": "3. 제안 솔루션",
          "description": "기술 아키텍처, 주요 기능, 차별화 포인트",
          "keyPoints": [
            "기술 스택 및 아키텍처",
            "주요 기능 상세 설명",
            "우리의 강점 및 차별화"
          ]
        },
        {
          "section": "4. 프로젝트 수행 방안",
          "description": "개발 방법론, 일정, 리스크 관리",
          "keyPoints": [
            "Agile 개발 방법론",
            "단계별 일정 및 마일스톤",
            "품질 관리 및 테스트 계획"
          ]
        },
        {
          "section": "5. 프로젝트 조직 및 투입 인력",
          "description": "팀 구성, 역할 및 책임",
          "keyPoints": [
            "프로젝트 조직도",
            "주요 인력 프로필",
            "역할 및 책임"
          ]
        },
        {
          "section": "6. 프로젝트 비용",
          "description": "견적 내역, 지급 조건",
          "keyPoints": [
            "단계별 비용 내역",
            "지급 조건",
            "유지보수 비용"
          ]
        },
        {
          "section": "7. 레퍼런스 및 포트폴리오",
          "description": "유사 프로젝트 수행 경험",
          "keyPoints": [
            "유사 프로젝트 소개",
            "고객사 및 성과",
            "수상 경력"
          ]
        }
      ],
      "appendix": [
        "참고 자료 1: 회사 소개서",
        "참고 자료 2: 포트폴리오 상세",
        "참고 자료 3: 기술 스택 상세 문서",
        "참고 자료 4: 계약서 샘플"
      ]
    }
  }
}
\`\`\`

**⚠️ Phase 8A-1 필수 작성 필드**:
1. ✅ **executionPlan.proposalOutline.title** - 제안서 제목
2. ✅ **executionPlan.proposalOutline.sections** - 제안서 섹션 (최소 7개)
   * 각 섹션은 section, description, keyPoints 포함
   * keyPoints는 최소 3개
3. ✅ **executionPlan.proposalOutline.appendix** - 참고 자료 (최소 4개)

⚠️ 출력 형식 엄수:
- JSON 객체만 반환 ({ 로 시작, } 로 끝)
- 절대로 \`\`\`를 사용하지 마세요
- 절대로 마크다운 코드블록을 사용하지 마세요
- 설명, 주석, 추가 텍스트 일체 금지
- **최대 1500자 엄수**`;
  }

  // 🔥 NEW: Phase 8A-2 프롬프트 - 제안서 핵심 내용 (Key Content)
  private generateReportPhase8A2Prompt(
    _analyses: any[],
    _questions: any[],
    _answers: any[],
    phase4Result: any,
    _phase5Result: any,
    phase6Result: any,
    phase7Result: any
  ): string {
    const phase4Summary = {
      requirementsCount: phase4Result.baselineData?.requirements?.length || 0,
    };

    const phase6Summary = {
      totalRevenue: phase6Result.agencyDetailedAnalysis?.profitability?.totalEstimatedRevenue || 0,
    };

    const phase7Summary = {
      totalManMonths: phase7Result.executionPlan?.resourcePlan?.totalManMonths || 0,
      timeline: phase7Result.executionPlan?.resourcePlan?.timeline || 'N/A',
    };

    return `# 🎯 웹에이전시 엘루오씨앤씨 - Phase 8A-2/14: 제안서 핵심 내용 (Key Content)

이전 Phase 결과:
- Phase 4 핵심 요구사항: ${phase4Summary.requirementsCount}개
- Phase 6 예상 매출: ${(phase6Summary.totalRevenue / 1000000).toFixed(1)}백만원
- Phase 7 총 공수: ${phase7Summary.totalManMonths} 맨먼스, 기간: ${phase7Summary.timeline}

**⚠️ 이 단계에서는 제안서 각 섹션의 상세 내용(content)만 작성합니다.**

다음 JSON 형식으로 제안서 핵심 내용을 작성하세요:

\`\`\`json
{
  "executionPlan": {
    "proposalContent": {
      "executiveSummary": "프로젝트 전체를 한눈에 볼 수 있는 경영진 요약 (300자 이상)",
      "problemStatement": "고객이 직면한 문제와 해결 필요성 (200자 이상)",
      "proposedSolution": "우리가 제안하는 솔루션과 접근 방식 (300자 이상)",
      "keyBenefits": [
        {
          "benefit": "비즈니스 효과 1",
          "description": "구체적인 효과 설명 (100자 이상)",
          "impact": "높음"
        },
        {
          "benefit": "비즈니스 효과 2",
          "description": "구체적인 효과 설명 (100자 이상)",
          "impact": "중간"
        },
        {
          "benefit": "비즈니스 효과 3",
          "description": "구체적인 효과 설명 (100자 이상)",
          "impact": "높음"
        }
      ],
      "differentiators": [
        "경쟁 우위 요소 1",
        "경쟁 우위 요소 2",
        "경쟁 우위 요소 3"
      ],
      "successMetrics": [
        {
          "metric": "성공 지표 1",
          "target": "목표 값",
          "measurement": "측정 방법"
        },
        {
          "metric": "성공 지표 2",
          "target": "목표 값",
          "measurement": "측정 방법"
        }
      ]
    }
  }
}
\`\`\`

**⚠️ Phase 8A-2 필수 작성 필드**:
1. ✅ **executionPlan.proposalContent.executiveSummary** - 경영진 요약 (300자 이상)
2. ✅ **executionPlan.proposalContent.problemStatement** - 문제 정의 (200자 이상)
3. ✅ **executionPlan.proposalContent.proposedSolution** - 제안 솔루션 (300자 이상)
4. ✅ **executionPlan.proposalContent.keyBenefits** - 핵심 이점 (최소 3개)
5. ✅ **executionPlan.proposalContent.differentiators** - 차별화 요소 (최소 3개)
6. ✅ **executionPlan.proposalContent.successMetrics** - 성공 지표 (최소 2개)

⚠️ 출력 형식 엄수:
- JSON 객체만 반환 ({ 로 시작, } 로 끝)
- 절대로 \`\`\`를 사용하지 마세요
- 절대로 마크다운 코드블록을 사용하지 마세요
- 설명, 주석, 추가 텍스트 일체 금지
- **최대 2500자 엄수**`;
  }

  private parseReportResponse(response: string, analyses: any[], _answers: any[]): any {
    console.log('🔍 [parseReportResponse] 파싱 시작');
    console.log('📏 [parseReportResponse] 응답 길이:', response.length);
    console.log('📝 [parseReportResponse] 응답 미리보기:', response.substring(0, 500));

    // 🔥 STEP 1: 모든 코드블록 마커 제거 (강화)
    let cleanedResponse = response
      // 백틱 코드블록 완전 제거
      .replace(/```json\s*/g, '')  // ```json 제거
      .replace(/```\s*/g, '')       // ``` 제거
      .replace(/`/g, '')            // 단일 백틱 제거
      // "json" 단어 제거 (코드블록 잔여물)
      .replace(/^json\s*/i, '')     // 시작 부분의 json 제거
      // 제어 문자 제거
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // 잘못된 이스케이프 제거
      .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '')
      .trim();

    console.log('🧹 [parseReportResponse] 정제 후 길이:', cleanedResponse.length);
    console.log('🧹 [parseReportResponse] 정제 후 미리보기:', cleanedResponse.substring(0, 300));

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
            // 기존 레코드가 없으면 upsert (중복 방지)
            const { error: upsertError } = await supabase
              .from('document_analyses')
              .upsert({
                session_id: update.sessionId,
                document_id: update.documentId,
                status: update.status,
                category: 'business', // 허용된 카테고리 중 business 사용
                analysis_result: {}, // 기본값
                mcp_enrichment: {} // 기본값
              });

            if (upsertError) {
              console.error('❌ 문서 분석 상태 저장 오류:', upsertError);
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
    maxTokens: number = 16000, // 🔥 6000 → 16000: 복잡한 JSON 보고서를 위한 충분한 토큰 할당 (Claude는 8192까지 지원)
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
                'claude-sonnet-4-5-20250929': { inputCost: 3, outputCost: 15 },
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
    // 🆕 분석 결과에서 "확인된 정보" 추출 (중복 질문 방지)
    const confirmedInfo = this.extractConfirmedInfo(analyses);

    // 분석 결과에서 "미확인" 항목 추출
    const unclearItems = this.extractUnclearItemsFromAnalyses(analyses);

    // 🔥 분석 결과 기반 문서 복잡도 계산
    const complexityScore = this.calculateDocumentComplexity(documentContext, analyses);
    const questionRange = this.calculateQuestionRange(complexityScore, maxQuestions);

    console.log('📊 질문 생성 컨텍스트:', {
      complexityScore,
      questionRange,
      documentsCount: documentContext.length,
      analysesCount: analyses.length,
      confirmedInfoCount: confirmedInfo.length,
      unclearItemsCount: unclearItems.length
    });

    // ========== 상단: JSON 형식 극도 강조 (15줄) ==========
    let prompt = `🚨 CRITICAL: JSON 형식만 반환하세요 🚨

설명 없이 { 로 시작하는 순수 JSON만 반환하세요.
코드 블록(\`\`\`json), 마크다운, 설명 텍스트 절대 금지!

필수 JSON 형식:
{
  "questions": [
    {
      "category": "business",
      "question": "주요 타겟 사용자는 누구이며, 연령대와 사용 목적은 무엇인가요?",
      "context": "사용자 페르소나 정의는 UX 설계와 기능 우선순위 결정에 필수적입니다.",
      "required": true,
      "expectedFormat": "textarea",
      "confidenceScore": 0.9
    }
  ]
}

---

# 웹에이전시 엘루오씨앤씨 - 프로젝트 질문 생성

## 📋 프로젝트 정보
- **프로젝트명**: ${projectName || '미정'}
- **프로젝트 설명**: ${projectDescription || '미정'}
- **프로젝트 유형**: ${projectTypes.length > 0 ? projectTypes.join(', ') : '미정'}

`;

    if (documentContext.length > 0) {
      prompt += `## 📄 업로드된 문서 분석 결과 (${documentContext.length}개)
${documentContext.map((doc, index) =>
  `${index + 1}. ${doc.name}${doc.summary ? ` - ${doc.summary}` : ''}`
).join('\n')}

`;
    }

    // 🆕 확인된 정보 섹션 추가 (중복 질문 방지)
    if (confirmedInfo.length > 0) {
      prompt += `## ✅ 문서에서 이미 확인된 정보 (질문 생성 제외)

다음 항목들은 문서에서 **명확히 확인**되었으므로 **질문을 생성하지 마세요**:

${confirmedInfo.map((info, index) =>
  `${index + 1}. **${info.field}**: ${info.value}`
).join('\n')}

⚠️ **중요**: 위 항목들에 대해서는 절대 질문을 생성하지 마세요. 이미 문서에 답이 있습니다.

---

`;
    }

    // 🔥 미확인 항목과 추가 보강 필요 항목 분리
    const missingItems = unclearItems.filter(item => item.type === 'missing');
    const incompleteItems = unclearItems.filter(item => item.type === 'incomplete');

    if (missingItems.length > 0) {
      prompt += `## ⚠️ 문서 분석에서 확인되지 않은 항목 (${missingItems.length}개)
다음 항목들은 문서에서 **전혀 확인되지 않아** 반드시 질문으로 확인해야 합니다:

${missingItems.map((item, index) =>
  `${index + 1}. **${item.field}**: ${item.neededInfo}${item.reason ? ` (이유: ${item.reason})` : ''}`
).join('\n')}

→ **우선순위 1: 이 항목들에 대한 질문을 반드시 생성하세요.**

`;
    }

    if (incompleteItems.length > 0) {
      prompt += `## 🔍 추가 보강이 필요한 항목 (${incompleteItems.length}개)
다음 항목들은 문서에서 **일부 확인**되었으나 상세 정보가 부족합니다:

${incompleteItems.map((item, index) =>
  `${index + 1}. **${item.field}**
   - 현재 확인된 정보: ${item.currentInfo}
   - 추가 필요 정보: ${item.neededInfo}
   - 우선순위: ${item.priority}
   ${item.reason ? `- 이유: ${item.reason}` : ''}`
).join('\n\n')}

→ **우선순위 2: 이 항목들의 상세 정보를 확인하는 질문을 생성하세요.**

`;
    }

    // ========== 중단: 필수 컨텍스트 + 핵심 가이드 (강화된 버전) ==========
    prompt += `## 🎯 질문 생성 필수 가이드

### 📊 문서 복잡도: ${complexityScore}/100점
- 권장 질문 개수: 최소 ${questionRange.min}개 ~ 최대 ${questionRange.max}개

---

### ⚠️ 절대 금지사항 (중복 질문 방지)
위에 "✅ 문서에서 이미 확인된 정보" 섹션에 나열된 항목들은 **절대 질문을 생성하지 마세요**.
이미 문서에서 명확히 파악된 정보입니다.

---

### ✅ 반드시 질문을 생성해야 하는 항목

**우선순위 1: 미확인 항목 (${missingItems.length}개)**
문서에서 전혀 확인되지 않았으므로 반드시 명확한 정보 수집 질문을 생성하세요.
${missingItems.length > 0 ? missingItems.slice(0, 3).map((item, index) =>
`
${index + 1}. 필요 정보: ${item.neededInfo}
   - 추천 질문 예시: "${item.neededInfo}에 대해 구체적으로 어떤 계획이나 요구사항이 있으신가요?"
   - category: "${this.inferCategory(item.field)}"
   - required: true
   - 이유: ${item.reason || '프로젝트 진행에 필수적인 정보입니다.'}`
).join('\n') : '(없음)'}

**우선순위 2: 추가 보강 필요 항목 (${incompleteItems.length}개)**
문서에서 일부 확인되었으나 상세 정보가 부족하므로 구체적인 추가 정보 확인 질문을 생성하세요.
${incompleteItems.length > 0 ? incompleteItems.slice(0, 3).map((item, index) =>
`
${index + 1}. 현재 확인된 정보: ${item.currentInfo}
   - 추가 필요 정보: ${item.neededInfo}
   - 추천 질문 예시: "문서에서 '${item.currentInfo}'가 확인되었습니다. ${item.neededInfo}를 구체적으로 명세해주실 수 있나요?"
   - category: "${this.inferCategory(item.field)}"
   - required: ${item.priority === 'high' ? 'true' : 'false'}
   - 우선순위: ${item.priority}
   - 이유: ${item.reason || '프로젝트 계획 수립에 필요합니다.'}`
).join('\n') : '(없음)'}

---

### 📝 질문 생성 원칙

1. **프로젝트 컨텍스트 반영**: 일반적인 질문 대신, 위에 제시된 구체적인 미확인/보강 항목을 기반으로 질문 생성
2. **이미 확인된 정보 인정**: 문서에서 이미 확인된 정보는 "현재 ~로 확인되었는데, 추가로 ~" 형식으로 질문
3. **구체성 우선**: "기술 스택은?" (X) → "문서에서 iOS/Android가 언급되었는데, React Native/Flutter 중 선호하시는 프레임워크는?" (O)
4. **우선순위 준수**: 위의 미확인 항목과 보강 필요 항목을 기반으로 질문 생성
5. **카테고리 정확도**: business, technical, design, timeline, budget, risks, stakeholders 중 적절한 카테고리 선택

---

### 🚨 다시 한번: JSON만 반환하세요 🚨

설명 텍스트, 마크다운 코드 블록, 주석 절대 금지!
순수 JSON 객체만 반환: { "questions": [...] }

필수 JSON 형식:
{
  "questions": [
    {
      "category": "business|technical|design|timeline|budget|risks|stakeholders",
      "question": "문서 분석 결과를 반영한 구체적 질문 (최소 50자)",
      "context": "이 질문이 왜 필요한지 설명 (최소 30자)",
      "required": true|false,
      "expectedFormat": "text|select|multiselect|number|textarea",
      "confidenceScore": 0.7~0.9
    }
  ]
}

필수 조건:
- question: 최소 50자 이상, 문서 분석 내용 반영
- context: 최소 30자 이상, 질문 필요성 명확히 설명
- required: true (미확인 항목), false (보강 항목)
- confidenceScore: 0.7~0.9
${missingItems.length > 0 ? `- 우선순위 1: ${missingItems.length}개 미확인 항목 기반 필수 질문 생성` : ''}
${incompleteItems.length > 0 ? `- 우선순위 2: ${incompleteItems.length}개 보강 필요 항목 기반 상세 질문 생성` : ''}
- 총 질문 개수: ${questionRange.min}개 이상, ${questionRange.max}개 이하

⚠️⚠️⚠️ 최종 확인 ⚠️⚠️⚠️
첫 글자: {
마지막 글자: }
코드 블록 없음
설명 없음
일반적 예시 질문 금지
문서 분석 결과 반영 필수`;

    return prompt;
  }

  /**
   * 🆕 분석 결과에서 "확인된 정보" 추출 (중복 질문 방지용)
   */
  private extractConfirmedInfo(analyses: any[]): Array<{
    field: string;
    value: string;
  }> {
    const confirmedInfo: Array<{ field: string; value: string }> = [];
    const unclearKeywords = ['미확인', '정보 없음', '명시되지 않음', '확인 필요', '질문 필요'];

    analyses.forEach(analysis => {
      const result = analysis.analysis_result;
      if (!result || typeof result !== 'object') return;

      // 필드 매핑 (실제 analysis_result 구조에 맞게 수정)
      const fieldMapping: Record<string, string> = {
        summary: '프로젝트 요약',           // 🔥 추가: 가장 중요한 정보
        keyRequirements: '핵심 기능 요구사항', // 🔥 수정: functionalRequirements → keyRequirements
        stakeholders: '이해관계자',
        constraints: '제약사항',
        risks: '위험 요소',
        opportunities: '기회 요소',
        technicalStack: '기술 스택',
        timeline: '일정 정보'
      };

      for (const [key, label] of Object.entries(fieldMapping)) {
        const value = result[key];

        if (!value) continue;

        // 배열인 경우
        if (Array.isArray(value)) {
          const validValues = value.filter((item: any) => {
            if (typeof item !== 'string') return false;
            if (item.length < 10) return false; // 너무 짧은 값 제외
            // "미확인" 키워드가 없으면 유효한 정보
            return !unclearKeywords.some(keyword => item.includes(keyword));
          });

          if (validValues.length > 0) {
            // 최대 2개까지만 표시 (프롬프트 길이 제한)
            const displayValue = validValues.slice(0, 2).join(', ');
            const suffix = validValues.length > 2 ? ` 외 ${validValues.length - 2}개` : '';
            confirmedInfo.push({
              field: label,
              value: displayValue + suffix
            });
          }
        }
        // 문자열인 경우
        else if (typeof value === 'string') {
          if (value.length >= 10 && !unclearKeywords.some(keyword => value.includes(keyword))) {
            // 너무 긴 값은 잘라서 표시
            const displayValue = value.length > 150 ? value.substring(0, 150) + '...' : value;
            confirmedInfo.push({
              field: label,
              value: displayValue
            });
          }
        }
      }
    });

    console.log('✅ 추출된 확인된 정보:', {
      total: confirmedInfo.length,
      fields: confirmedInfo.map(info => info.field)
    });

    return confirmedInfo;
  }

  /**
   * 분석 결과에서 "미확인" 및 "추가 보강 필요" 항목 추출
   */
  private extractUnclearItemsFromAnalyses(analyses: any[]): Array<{
    field: string;
    type: 'missing' | 'incomplete';
    currentInfo?: string;
    neededInfo: string;
    priority: 'high' | 'medium' | 'low';
    reason?: string;
  }> {
    const items: Array<{
      field: string;
      type: 'missing' | 'incomplete';
      currentInfo?: string;
      neededInfo: string;
      priority: 'high' | 'medium' | 'low';
      reason?: string;
    }> = [];

    const unclearKeywords = ['미확인', '없음', '명시되지 않음', '정보 없음', '질문 필요', '확인 필요', '불명확', '부족'];

    analyses.forEach(analysis => {
      const result = analysis.analysis_result;
      if (!result) return;

      // 🔥 1단계: 완전히 누락된 정보 추출 (🆕 더 많은 필드 추가)
      const fieldsToCheck = [
        { key: 'keyRequirements', label: '핵심 요구사항' }, // 🆕 추가
        { key: 'stakeholders', label: '이해관계자' },
        { key: 'constraints', label: '제약사항' },
        { key: 'risks', label: '위험 요소' },
        { key: 'opportunities', label: '기회 요소' },
        { key: 'technicalStack', label: '기술 스택' },
        { key: 'timeline', label: '일정 정보' },
        { key: 'summary', label: '프로젝트 요약' } // 🆕 추가
      ];

      fieldsToCheck.forEach(({ key, label }) => {
        // 배열 필드 처리
        if (Array.isArray(result[key])) {
          const values = result[key];
          values.forEach((value: string) => {
            // 미확인 키워드가 포함되어 있으면 추가 (완전 누락)
            if (unclearKeywords.some(keyword => value.includes(keyword))) {
              items.push({
                field: label,
                type: 'missing',
                neededInfo: value.replace(/미확인|없음|명시되지 않음|정보 없음|질문 필요|확인 필요|불명확|부족/g, '').trim() || `${label} 정보 필요`,
                priority: 'high'
              });
            }
          });
        }
        // 문자열 필드 처리 (summary)
        else if (typeof result[key] === 'string' && result[key]) {
          const value = result[key];
          if (unclearKeywords.some(keyword => value.includes(keyword))) {
            items.push({
              field: label,
              type: 'missing',
              neededInfo: `${label} 상세 정보 필요`,
              priority: 'high'
            });
          }
        }
      });

      // 🔥 2단계: 추가 보강 필요 항목 추출 (additionalInfoNeeded 우선)
      if (result.additionalInfoNeeded && Array.isArray(result.additionalInfoNeeded)) {
        result.additionalInfoNeeded.forEach((item: any) => {
          if (item.field && item.neededInfo) {
            // field를 한글 라벨로 매핑
            const fieldMapping: Record<string, string> = {
              'stakeholders': '이해관계자',
              'constraints': '제약사항',
              'risks': '위험 요소',
              'opportunities': '기회 요소',
              'technicalStack': '기술 스택',
              'timeline': '일정 정보',
              'keyRequirements': '핵심 요구사항',
              'budget': '예산 정보',
              'requirements': '기능 요구사항', // 🆕 추가
              'design': '디자인 요구사항' // 🆕 추가
            };

            items.push({
              field: fieldMapping[item.field] || item.field,
              type: 'incomplete',
              currentInfo: item.currentInfo,
              neededInfo: item.neededInfo,
              priority: item.priority || 'medium',
              reason: item.reason
            });
          }
        });
      }
    });

    // 🆕 3단계: 중복 제거 (field + neededInfo 기준)
    const uniqueItems = items.filter((item, index, self) =>
      index === self.findIndex(t =>
        t.field === item.field && t.neededInfo === item.neededInfo
      )
    );

    // 🆕 4단계: 최소 5개 항목 보장
    if (uniqueItems.length < 5) {
      const defaultItems = [
        {
          field: '기술 스택',
          type: 'incomplete' as const,
          currentInfo: '부분적 정보',
          neededInfo: '프론트엔드/백엔드 상세 기술 스택 및 버전',
          priority: 'high' as const,
          reason: '아키텍처 설계 및 개발 공수 산정에 필수'
        },
        {
          field: '일정 정보',
          type: 'incomplete' as const,
          currentInfo: '부분적 정보',
          neededInfo: '프로젝트 시작/종료 일정 및 주요 마일스톤',
          priority: 'high' as const,
          reason: '프로젝트 일정 계획 수립에 필수'
        },
        {
          field: '예산 정보',
          type: 'missing' as const,
          neededInfo: '프로젝트 예산 범위 및 비용 제약사항',
          priority: 'high' as const,
          reason: '제안서 작성 및 리소스 계획에 필수'
        },
        {
          field: '이해관계자',
          type: 'incomplete' as const,
          currentInfo: '부분적 정보',
          neededInfo: '프로젝트 주요 이해관계자 및 의사결정권자',
          priority: 'medium' as const,
          reason: '커뮤니케이션 계획 수립에 필요'
        },
        {
          field: '핵심 요구사항',
          type: 'incomplete' as const,
          currentInfo: '부분적 정보',
          neededInfo: '필수 기능 및 우선순위',
          priority: 'high' as const,
          reason: '기능 범위 정의 및 MVP 계획에 필수'
        }
      ];

      // 이미 추가된 field는 제외하고 추가
      for (const defaultItem of defaultItems) {
        if (uniqueItems.length >= 5) break;
        const alreadyAdded = uniqueItems.some(item => item.field === defaultItem.field);
        if (!alreadyAdded) {
          uniqueItems.push(defaultItem);
        }
      }
    }

    console.log('📊 추출된 미확인/보강필요 항목:', {
      total: uniqueItems.length,
      missing: uniqueItems.filter(item => item.type === 'missing').length,
      incomplete: uniqueItems.filter(item => item.type === 'incomplete').length,
      duplicatesRemoved: items.length - uniqueItems.length
    });

    return uniqueItems;
  }

  /**
   * 필드 이름을 카테고리로 매핑 (헬퍼 메서드)
   */
  private inferCategory(field: string): string {
    const fieldLower = field.toLowerCase();

    if (fieldLower.includes('기술') || fieldLower.includes('tech') || fieldLower.includes('stack') || fieldLower.includes('아키텍처')) {
      return 'technical';
    }
    if (fieldLower.includes('일정') || fieldLower.includes('timeline') || fieldLower.includes('마일스톤') || fieldLower.includes('기간')) {
      return 'timeline';
    }
    if (fieldLower.includes('예산') || fieldLower.includes('budget') || fieldLower.includes('비용')) {
      return 'budget';
    }
    if (fieldLower.includes('디자인') || fieldLower.includes('design') || fieldLower.includes('ui') || fieldLower.includes('ux')) {
      return 'design';
    }
    if (fieldLower.includes('위험') || fieldLower.includes('risk') || fieldLower.includes('리스크')) {
      return 'risks';
    }
    if (fieldLower.includes('이해관계자') || fieldLower.includes('stakeholder') || fieldLower.includes('의사결정')) {
      return 'stakeholders';
    }
    if (fieldLower.includes('요구사항') || fieldLower.includes('requirement') || fieldLower.includes('기능')) {
      return 'business';
    }

    // 기본값
    return 'business';
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

      let parsed: any;

      // 🔥 여러 방법으로 JSON 추출 시도 (순서대로)
      const extractionMethods = [
        // 1. 마크다운 코드 블록 제거 후 JSON 추출
        () => {
          const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          const match = cleaned.match(/\{[\s\S]*"questions"[\s\S]*\}/);
          return match ? match[0] : null;
        },
        // 2. 첫 번째 {부터 괄호 카운팅으로 올바른 }까지 추출
        () => {
          const startIndex = response.indexOf('{');
          if (startIndex === -1) return null;

          let depth = 0;
          let inString = false;
          let escapeNext = false;

          for (let i = startIndex; i < response.length; i++) {
            const char = response[i];

            if (escapeNext) {
              escapeNext = false;
              continue;
            }

            if (char === '\\') {
              escapeNext = true;
              continue;
            }

            if (char === '"') {
              inString = !inString;
              continue;
            }

            if (!inString) {
              if (char === '{') depth++;
              if (char === '}') {
                depth--;
                if (depth === 0) {
                  return response.substring(startIndex, i + 1);
                }
              }
            }
          }
          return null;
        },
        // 3. 기존 방식 (greedy)
        () => {
          const match = response.match(/\{[\s\S]*\}/);
          return match ? match[0] : null;
        }
      ];

      // 추출 방법들을 순서대로 시도
      for (const method of extractionMethods) {
        try {
          const jsonString = method();
          if (jsonString) {
            parsed = JSON.parse(jsonString);
            if (parsed.questions && Array.isArray(parsed.questions)) {
              console.log('✅ JSON 파싱 성공:', {
                hasQuestions: true,
                questionsCount: parsed.questions.length,
                method: extractionMethods.indexOf(method) + 1
              });
              break;
            }
          }
        } catch (e) {
          // 다음 방법 시도
          continue;
        }
      }

      if (!parsed || !parsed.questions || !Array.isArray(parsed.questions)) {
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