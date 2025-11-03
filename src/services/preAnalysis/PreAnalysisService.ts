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
        additionalInfoNeeded: []
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

  private generateAnalysisPrompt(content: string, category?: DocumentCategory, fileName: string = ''): string {
    const categoryContext = category ? `이 문서는 "${category}" 카테고리에 속하며, 해당 관점을 중심으로 분석해야 합니다.` : '';

    // 🆕 플랫폼 타입 감지
    const platformType = this.detectPlatformType(content, fileName);
    const platformContext = platformType === 'app'
      ? '이 문서는 **모바일 앱(APP) 개발** 프로젝트입니다. 웹 브라우저 관련 질문은 생성하지 마세요.'
      : platformType === 'web'
      ? '이 문서는 **웹사이트(WEB) 개발** 프로젝트입니다. 모바일 앱스토어 관련 질문은 생성하지 마세요.'
      : '이 문서는 **웹 또는 앱** 프로젝트입니다. 문서 내용을 바탕으로 플랫폼에 맞는 분석을 수행하세요.';

    // 🆕 플랫폼별 체크리스트 생성
    const platformChecklist = this.generatePlatformChecklist(platformType);

    return `🚨 **CRITICAL: JSON 형식만 반환하세요** 🚨

**절대 규칙**:
1. ❌ 설명 텍스트, 마크다운, 주석 **절대 금지**
2. ❌ 코드 블록 백틱(\`\`\`json) **절대 금지**
3. ✅ 순수 JSON만 반환 (첫 글자는 {, 마지막 글자는 })
4. ✅ 모든 필수 필드 반드시 포함 (summary, keyRequirements, stakeholders, constraints, risks, opportunities, technicalStack, timeline, additionalInfoNeeded)

---

# 📄 웹에이전시 엘루오씨앤씨 - 문서 심층 분석

당신은 **웹에이전시 엘루오씨앤씨**의 수석 프로젝트 분석가입니다.

## 🏢 회사 정보
- **담당 업무**: 웹사이트 기획, UI/UX 디자인, 퍼블리싱 (HTML/CSS), 프론트엔드/백엔드 개발
- **분석 목표**: 프로젝트 실행에 필요한 사실 기반 정보를 문서에서 최대한 상세히 추출
- **핵심 원칙**: 사실만 추출, 추측 금지, 구체적 작성, 실무 용어 사용

## 📋 문서 정보
${categoryContext}

## 🎯 플랫폼 타입 (중요!)
${platformContext}

---

## 📝 문서 내용
"""
${content}
"""

---

## 🎯 웹에이전시 실무 분석 체크리스트

문서 분석 시 다음 4가지 관점을 **반드시** 체크하여 정보를 추출하세요:

### 1. 기획 관점 ✅
- ✅ **사용자 페르소나**: 타겟 사용자 특성, 연령대, 직군, 사용 목적
- ✅ **정보구조도(IA)**: 사이트 구조, 메뉴 구성, 페이지 계층
- ✅ **핵심 기능**: 회원가입/로그인, 결제, 검색, 알림 등 주요 기능
- ✅ **콘텐츠 유형**: 텍스트, 이미지, 동영상, 파일 다운로드 등
- ✅ **비즈니스 목표**: KPI, 전환율 목표, 매출 목표 등

### 2. 디자인 관점 🎨
- ✅ **디자인 시스템**: 디자인 가이드, 컬러 팔레트, 타이포그래피
- ✅ **UI/UX 요구사항**: 사용성, 인터랙션, 애니메이션
- ✅ **반응형 중단점**: Mobile (320px~), Tablet (768px~), Desktop (1024px~)
- ✅ **브랜드 아이덴티티**: 로고, 컬러, 폰트, 이미지 스타일
- ✅ **디자인 산출물**: 와이어프레임, 목업, 프로토타입 여부

${platformChecklist}

---

## 📊 좋은 분석 결과 예시

### ✅ 예시 1: keyRequirements (좋은 예)
\`\`\`json
[
  "회원가입/로그인 기능 구현 (이메일, 카카오, 네이버 소셜 로그인 3종)",
  "상품 검색 및 필터링 기능 (카테고리, 가격대, 평점, 브랜드별)",
  "반응형 웹 디자인 적용 (Mobile 320px, Tablet 768px, Desktop 1024px 중단점)",
  "관리자 페이지 구축 (상품 관리, 주문 관리, 통계 대시보드)",
  "결제 모듈 연동 (토스페이먼츠, 카카오페이, 네이버페이)"
]
\`\`\`
**포인트**: 구체적 숫자, 브랜드명, 기술 용어 포함

### ✅ 예시 2: technicalStack (좋은 예)
\`\`\`json
[
  "프론트엔드: React 18 + TypeScript 5 + Vite 5",
  "상태관리: Zustand 4 + React Query",
  "백엔드: Node.js 20 + Express.js + PostgreSQL 15",
  "배포: Vercel (프론트엔드) + AWS EC2 (백엔드)",
  "기타: Supabase (인증/DB), Tailwind CSS 3"
]
\`\`\`
**포인트**: 버전 정보, 구체적 기술명 명시

### ❌ 나쁜 분석 결과 예시

### ❌ 예시 1: keyRequirements (나쁜 예)
\`\`\`json
[
  "다양한 기능 필요",
  "사용자 편의성 개선",
  "기술 스택 미확인"
]
\`\`\`
**문제점**: 모호함, 구체성 부족, "미확인" 남발

### ❌ 예시 2: timeline (나쁜 예)
\`\`\`json
[
  "일정 정보 미확인"
]
\`\`\`
**문제점**: 문서에서 암시적 일정 정보도 찾지 못함

---

## 📤 출력 형식 (JSON)

다음 JSON 형식으로 **정확하게** 출력하세요.

\\\`\\\`\\\`json
{
  "summary": "문서 전체 요약 (최소 200자 이상, 프로젝트명, 목적, 범위, 핵심 특징, 기대효과 포함)",

  "keyRequirements": [
    "핵심 기능 요구사항 1 (최소 50자, 구체적 숫자/기술명 포함, 예: 'React 18 기반 SPA 구축')",
    "핵심 기능 요구사항 2 (예: '회원 1만명 동시 접속 지원, 응답시간 1초 이하')",
    "핵심 기능 요구사항 3",
    "핵심 기능 요구사항 4",
    "핵심 기능 요구사항 5 (최소 5개 이상, 문서에서 최대한 추출)"
  ],

  "stakeholders": [
    "이해관계자 이름/역할 (예: '홍길동 - 프로젝트 오너, 최종 의사결정권자')",
    "이해관계자 이름/역할 (예: '김철수 - 기획팀장, 요구사항 정의 담당')",
    "최소 2개 이상. 문서에 명시되지 않았다면 '프로젝트 오너 정보 미확인 - 질문 필요'"
  ],

  "constraints": [
    "제약사항 1 (구체적 날짜/금액 포함, 예: '2025년 6월 30일까지 완료 필수')",
    "제약사항 2 (예: '예산 5,000만원 이내, 인력 3명 이하')",
    "제약사항 3 (기술적/일정/예산/법적 제약 모두 포함)",
    "최소 3개 이상. 없으면 '명시된 제약사항 없음 - 예산/일정 확인 질문 필요'"
  ],

  "risks": [
    "위험 요소 1 (문서에서 추출 또는 암시된 리스크, 예: 'API 연동 대상 시스템 불안정성 언급')",
    "위험 요소 2 (예: '타이트한 일정으로 인한 품질 저하 우려')",
    "최소 2개 이상. 없으면 '명시된 리스크 없음 - 기술적/일정 리스크 질문 필요'"
  ],

  "opportunities": [
    "기회 요소 1 (문서에서 추출, 예: '기존 시스템 사용자 5만명 데이터 활용 가능')",
    "기회 요소 2 (예: '경쟁사 대비 차별화 포인트: AI 추천 기능')",
    "최소 2개 이상. 없으면 '명시된 기회 요소 없음 - 비즈니스 가치 확인 질문 필요'"
  ],

  "technicalStack": [
    "기술 스택 1 (구체적 기술명+버전, 예: 'React 18 + TypeScript 5 + Vite')",
    "기술 스택 2 (예: 'Node.js 20 + Express + PostgreSQL 15')",
    "기술 스택 3 (프론트엔드, 백엔드, DB, 인프라 모두 포함)",
    "최소 3개 이상. 없으면 '기술 스택 미확인 - 선호 기술 및 제약사항 질문 필요'"
  ],

  "timeline": [
    "일정 정보 1 (구체적 날짜/기간, 예: '기획 2주(2025.3.1~3.14), 디자인 3주(3.15~4.4)')",
    "일정 정보 2 (예: '개발 8주(4.5~5.30), QA 2주(6.1~6.14), 오픈 6.15')",
    "최소 2개 이상. 없으면 '일정 정보 미확인 - 목표 오픈일 및 마일스톤 질문 필요'"
  ],

  "additionalInfoNeeded": [
    {
      "field": "technicalStack",
      "currentInfo": "React 18 사용 확인됨",
      "neededInfo": "상태관리 라이브러리(Zustand/Redux/Recoil), 라우터(React Router), 스타일링(Tailwind/Emotion/Styled-components), 빌드 도구(Vite/Webpack)",
      "priority": "high",
      "reason": "개발 아키텍처 설계 및 공수 산정에 필수"
    },
    {
      "field": "timeline",
      "currentInfo": "2025년 상반기 오픈 목표",
      "neededInfo": "구체적 오픈 날짜(월/일), 기획/디자인/개발/QA 단계별 일정, 주요 마일스톤",
      "priority": "high",
      "reason": "프로젝트 일정 수립 및 인력 배치 계획에 필수"
    }
  ]
}
\\\`\\\`\\\`

**🔥 \`additionalInfoNeeded\` 필드 작성 가이드:**
- **목적**: 문서에서 일부 확인되었으나 **상세 정보가 부족한 항목** 표시
- **작성 조건**: 정보가 일부만 있거나 모호할 때만 포함
- **우선순위**: high(필수), medium(권장), low(선택)
- **field**: keyRequirements, stakeholders, constraints, risks, opportunities, technicalStack, timeline 중 하나
- **필수 아님**: 모든 정보가 충분하면 빈 배열 [] 반환 가능

---

## ⚠️ 필수 준수 지침

### 1. 품질 기준
- ✅ **summary**: 최소 200자, 프로젝트 전체 그림 파악 가능하도록
- ✅ **keyRequirements**: 각 항목 최소 50자, 구체적 숫자/기술명 포함
- ✅ **모든 배열**: 최소 개수 준수 (keyRequirements 5개, stakeholders 2개 등)
- ✅ **"미확인" 사용 시**: 반드시 "질문 필요" 추가하여 후속 질문 유도

### 2. 실무 용어 사용
- ✅ 반응형 중단점: "Mobile 320px, Tablet 768px, Desktop 1024px"
- ✅ 인증: "JWT 토큰 기반 인증, OAuth 2.0 소셜 로그인"
- ✅ API: "REST API", "GraphQL", "gRPC"
- ✅ 배포: "CI/CD 파이프라인", "Docker 컨테이너", "AWS EC2"

### 3. JSON 형식 엄수
- ❌ 마크다운 코드 블록 밖에 설명 추가 금지
- ✅ 순수 JSON 객체만 반환 ({ 로 시작, } 로 끝)
- ✅ 모든 문자열은 큰따옴표(") 사용
- ✅ 배열 형태 유지 (객체 사용 금지)

### 4. 정보 부족 시 대응
문서에 정보가 부족해도 **최소 개수는 반드시 채워야 합니다**.
- ✅ 좋은 예: "예산 정보 미확인 - 예산 범위 및 배분 우선순위 질문 필요"
- ❌ 나쁜 예: "미확인"

### 5. 🔥 추가 보강 필요 항목 처리 (additionalInfoNeeded)
**핵심 원칙**: 문서에서 일부 확인되었으나 **상세 정보가 부족한 경우** 반드시 표시
- ✅ **완전 누락**: 기존 필드에 "미확인 - 질문 필요" 형태로 작성
- ✅ **부분 정보**: additionalInfoNeeded 배열에 객체로 추가
- ✅ **충분한 정보**: additionalInfoNeeded에 포함하지 않음 (빈 배열 가능)

**작성 예시:**
- ✅ 좋은 예: technicalStack에 "React 18" 있음 → additionalInfoNeeded에 상태관리/라우터 등 추가 필요 표시
- ✅ 좋은 예: timeline에 "상반기" 있음 → additionalInfoNeeded에 구체적 날짜/단계별 일정 추가 필요 표시
- ❌ 나쁜 예: 완전 누락된 정보를 additionalInfoNeeded에 표시 (기존 필드에 "미확인" 작성이 맞음)

위 지침을 **모두 준수**하여 **JSON 형식으로만** 분석 결과를 출력하세요.`;
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

    // 2. additionalInfoNeeded 필드 검증
    const hasAdditionalInfoNeeded =
      'additionalInfoNeeded' in analysis &&
      Array.isArray(analysis.additionalInfoNeeded);

    if (!hasAdditionalInfoNeeded) {
      failureReasons.push('additionalInfoNeeded 필드 누락 또는 잘못된 타입');
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
    const additionalInfoNeeded = this.extractAdditionalInfoNeeded(response);

    return {
      summary: `${category || '문서'} 분석 완료 (JSON 파싱 실패로 텍스트 분석 수행)`,
      keyRequirements: this.extractListFromText(response, '요구사항'),
      stakeholders: this.extractListFromText(response, '이해관계자'),
      constraints: this.extractListFromText(response, '제약사항'),
      risks: this.extractListFromText(response, '위험'),
      opportunities: this.extractListFromText(response, '기회'),
      technicalStack: this.extractListFromText(response, '기술'),
      timeline: this.extractListFromText(response, '일정'),
      additionalInfoNeeded // 🆕 추출된 배열 사용
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

    console.log('⚠️ Fallback 모드: additionalInfoNeeded 추출 실패, 빈 배열 반환');
    return [];
  }

  /**
   * 🆕 플랫폼별 체크리스트 생성
   */
  private generatePlatformChecklist(platformType: 'web' | 'app' | 'hybrid'): string {
    if (platformType === 'app') {
      return `### 3. UI/UX 구현 관점 💻
- ✅ **지원 OS**: iOS (최소 버전), Android (최소 버전), 하이브리드 여부
- ✅ **디바이스 대응**: 스마트폰, 태블릿 지원 범위, 화면 크기 대응
- ✅ **접근성**: VoiceOver, TalkBack 지원, 시각/청각 장애인 대응
- ✅ **다국어 지원**: 언어 종류, 번역 범위, RTL 지원
- ✅ **앱 권한**: 카메라, 위치, 알림, 파일 접근 등 필요 권한

### 4. 개발 관점 ⚙️
- ✅ **프론트엔드**: React Native/Flutter/Swift/Kotlin, 상태관리
- ✅ **백엔드**: Node.js/Django/Spring, API 명세(REST/GraphQL)
- ✅ **데이터베이스**: MySQL/PostgreSQL/MongoDB, ERD
- ✅ **인증/권한**: JWT, OAuth, 생체인증, RBAC
- ✅ **배포 환경**: App Store, Google Play Store, 인하우스 배포
- ✅ **보안/성능**: HTTPS, 암호화, 앱 시작 시간, 배터리 소모`;
    } else {
      // web 또는 hybrid
      return `### 3. 퍼블리싱 관점 💻
- ✅ **지원 브라우저**: Chrome, Safari, Firefox, Edge 버전
- ✅ **반응형 웹**: Mobile-first, Desktop-first 전략
- ✅ **접근성 등급**: WCAG 2.1 AA 이상 준수 여부
- ✅ **다국어 지원**: 언어 종류, 번역 범위
- ✅ **SEO 최적화**: 메타 태그, Open Graph, Schema.org
- ✅ **크로스브라우징**: IE11 지원 여부, 폴리필 필요성

### 4. 개발 관점 ⚙️
- ✅ **프론트엔드**: React/Vue/Angular, TypeScript, 상태관리
- ✅ **백엔드**: Node.js/Django/Spring, API 명세(REST/GraphQL)
- ✅ **데이터베이스**: MySQL/PostgreSQL/MongoDB, ERD
- ✅ **인증/권한**: JWT, OAuth, Session, RBAC
- ✅ **배포 환경**: AWS/GCP/Azure, CI/CD, Docker
- ✅ **보안/성능**: HTTPS, CORS, 응답시간 목표, 동시접속자 수`;
    }
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

  // 🔥 NEW: 2단계 생성 방식으로 완전히 재작성
  private async generateAIReport(sessionId: string, sessionData: any, _options: ReportGenerationOptions): Promise<any> {
    console.log('🤖 [2-Phase Generation] generateAIReport 메서드 시작');
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
      // Phase 1: 핵심 비즈니스 분석 생성
      // ========================================
      console.log('🚀 [Phase 1] 핵심 비즈니스 분석 시작...');
      const phase1Prompt = this.generateReportPhase1Prompt(analyses, questions, answers);
      console.log('📝 [Phase 1] 프롬프트 길이:', phase1Prompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 40,
        message: 'Phase 1: 핵심 비즈니스 분석 생성 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase1Response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase1Prompt,
        8000, // Phase 1: 핵심 분석만 생성 (충분한 공간)
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(70, 40 + Math.floor(charCount / 300));
          console.log(`📊 [Phase 1 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 1 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 1] 응답 완료:', { length: phase1Response.content?.length });
      const phase1Content = this.parseReportResponse(phase1Response.content, analyses, answers);
      console.log('✅ [Phase 1] 파싱 완료:', {
        hasSummary: !!phase1Content.summary,
        hasAgencyPerspective: !!phase1Content.agencyPerspective,
        keyInsightsCount: phase1Content.keyInsights?.length,
        recommendationsCount: phase1Content.recommendations?.length
      });

      // ========================================
      // Phase 2: 기초 데이터 생성
      // ========================================
      console.log('🚀 [Phase 2] 기초 데이터 구조화 시작...');
      const phase2Prompt = this.generateReportPhase2Prompt(analyses, questions, answers, phase1Content);
      console.log('📝 [Phase 2] 프롬프트 길이:', phase2Prompt.length);

      this.emitProgressUpdate({
        sessionId,
        stage: 'report_generation',
        status: 'processing',
        progress: 70,
        message: 'Phase 2: 기초 데이터 구조화 중...',
        timestamp: new Date(),
      }).catch(() => {});

      const phase2Response = await this.callAICompletionAPIStreaming(
        aiProvider,
        aiModel,
        phase2Prompt,
        4000, // Phase 2: 기초 데이터만 생성 (더 적은 토큰)
        0.2,
        (_chunk, fullContent) => {
          const charCount = fullContent.length;
          const progress = Math.min(95, 70 + Math.floor(charCount / 200));
          console.log(`📊 [Phase 2 Streaming] ${charCount} chars, ${progress}%`);

          this.emitProgressUpdate({
            sessionId,
            stage: 'report_generation',
            status: 'processing',
            progress,
            message: `Phase 2 생성 중... (${Math.floor(charCount / 100) * 100}자)`,
            timestamp: new Date(),
          }).catch(() => {});
        }
      );

      console.log('✅ [Phase 2] 응답 완료:', { length: phase2Response.content?.length });
      const phase2Content = this.parseReportResponse(phase2Response.content, analyses, answers);
      console.log('✅ [Phase 2] 파싱 완료:', {
        hasBaselineData: !!phase2Content.baselineData,
        requirementsCount: phase2Content.baselineData?.requirements?.length || 0,
        stakeholdersCount: phase2Content.baselineData?.stakeholders?.length || 0,
        constraintsCount: phase2Content.baselineData?.constraints?.length || 0,
        techStackCount: phase2Content.baselineData?.technicalStack?.length || 0
      });

      // ========================================
      // 두 Phase 결과 병합
      // ========================================
      console.log('🔗 [Merge] Phase 1 + Phase 2 병합 중...');
      const mergedReport = {
        ...phase1Content,
        baselineData: phase2Content.baselineData || phase1Content.baselineData || {},
      };

      console.log('✅ [Merge] 병합 완료:', {
        hasSummary: !!mergedReport.summary,
        hasAgencyPerspective: !!mergedReport.agencyPerspective,
        hasBaselineData: !!mergedReport.baselineData,
        keyInsightsCount: mergedReport.keyInsights?.length,
        recommendationsCount: mergedReport.recommendations?.length,
        requirementsCount: mergedReport.baselineData?.requirements?.length || 0
      });

      const processingTime = Date.now() - startTime;
      const totalCost = phase1Response.cost.totalCost + phase2Response.cost.totalCost;
      const totalInputTokens = phase1Response.usage.inputTokens + phase2Response.usage.inputTokens;
      const totalOutputTokens = phase1Response.usage.outputTokens + phase2Response.usage.outputTokens;

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
      console.error('❌ [2-Phase Generation] 오류 발생:', error);
      throw error;
    }
  }

  // 🔥 NEW: Phase 1 프롬프트 생성 - 핵심 비즈니스 분석
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

    return `# 🎯 웹에이전시 엘루오씨앤씨 - 프로젝트 핵심 분석 (Phase 1)

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
  },

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
  ]
}
\`\`\`

**⚠️ Phase 1 필수 작성 필드**:
1. ✅ **summary** - 프로젝트 종합 요약 (300자 이상)
2. ✅ **executiveSummary** - 경영진용 요약 (200자 이상)
3. ✅ **keyInsights** - 핵심 인사이트 (5개 이상)
4. ✅ **agencyPerspective** - projectDecision + perspectives (4가지 관점 모두 포함)
   * 각 관점마다 challenges (3개), risks (2개) 필수
5. ✅ **riskAssessment** - 위험 평가 (high/medium/low 각각 최소 1개)
6. ✅ **recommendations** - 권장사항 (10개 이상)

**출력 형식 규칙**:
- ❌ 설명문 없이
- ❌ 마크다운 코드 블록 없이
- ✅ 오직 순수 JSON 객체만 반환 ({ 로 시작, } 로 끝)

위 JSON 형식을 **정확히 준수**하여 **Phase 1 핵심 분석**을 완성해주세요.`;
  }

  // 🔥 NEW: Phase 2 프롬프트 생성 - 기초 데이터 구조화
  private generateReportPhase2Prompt(analyses: any[], questions: any[], answers: any[], phase1Result: any): string {
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

    return `# 🎯 웹에이전시 엘루오씨앤씨 - 프로젝트 기초 데이터 (Phase 2)

당신은 **웹에이전시 엘루오씨앤씨**의 수석 프로젝트 분석가입니다.
이 단계에서는 **기초 데이터 구조화**를 수행합니다.

## 📋 수집된 프로젝트 데이터

### 1. 업로드된 문서 분석 결과 (${analyses.length}개):
${analysisContext || '분석된 문서가 없습니다.'}

### 2. 질문-답변 데이터 (${answers.length}/${questions.length}개 답변 완료):
${qaContext || '질문-답변 데이터가 없습니다.'}

### 3. Phase 1 분석 결과 (참고용):
- 프로젝트명: ${phase1Result.summary?.substring(0, 100) || 'N/A'}
- 수락 결정: ${phase1Result.agencyPerspective?.projectDecision?.recommendation || 'N/A'}
- 핵심 인사이트 수: ${phase1Result.keyInsights?.length || 0}개

---

## 🎨 Phase 2 작성 지침

### 목표:
- 문서와 답변에서 **구체적이고 측정 가능한 데이터** 추출
- 프로젝트 실행에 필요한 **기초 정보 구조화**

---

## 📝 Phase 2 출력 형식 (JSON)

**⚠️ 이 단계에서는 기초 데이터(baselineData)만 생성합니다.**

다음 JSON 형식으로 **기초 데이터**를 작성하세요:

\`\`\`json
{
  "baselineData": {
    "requirements": [
      "문서와 답변에서 식별된 핵심 기능 요구사항 (10개 이상)",
      "각 요구사항은 구체적이고 명확하게 작성"
    ],
    "stakeholders": [
      "이해관계자 이름 + 역할 (예: 김철수 PM - 프로젝트 총괄)",
      "이해관계자 이름 + 역할 (예: 박영희 디자이너 - UI/UX 담당)",
      "⚠️ 주의: 문자열 배열로 작성 (객체 금지)"
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
  }
}
\`\`\`

**⚠️ Phase 2 필수 작성 필드**:
1. ✅ **baselineData.requirements** - 핵심 기능 요구사항 (10개 이상)
2. ✅ **baselineData.stakeholders** - 이해관계자 목록 (3개 이상)
3. ✅ **baselineData.constraints** - 제약사항 (5개 이상)
4. ✅ **baselineData.timeline** - 일정 계획 (최소 3단계)
5. ✅ **baselineData.budgetEstimates** - 예산 배분 (development, design, testing, infrastructure)
6. ✅ **baselineData.technicalStack** - 기술 스택 (5개 이상)
7. ✅ **baselineData.integrationPoints** - 통합 포인트 (3개 이상)

**출력 형식 규칙**:
- ❌ 설명문 없이
- ❌ 마크다운 코드 블록 없이
- ✅ 오직 순수 JSON 객체만 반환 ({ 로 시작, } 로 끝)

위 JSON 형식을 **정확히 준수**하여 **Phase 2 기초 데이터**를 완성해주세요.`;
  }

  // 🔥 DEPRECATED: 기존 generateReportPrompt 메서드는 제거됨 (2단계 생성 방식으로 대체)
  // Phase 1과 Phase 2를 각각 호출하는 방식으로 변경되었습니다.

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

    let prompt = `# 🎯 웹에이전시 엘루오씨앤씨 - 프로젝트 핵심 질문 생성

당신은 **웹에이전시 엘루오씨앤씨**의 수석 프로젝트 컨설턴트입니다.
문서 분석 결과를 바탕으로 프로젝트 실행에 필요한 **구체적이고 실무적인 질문**을 생성하세요.

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

    prompt += `## 🎯 질문 생성 전략

### 📊 문서 복잡도: ${complexityScore}/100점
- **권장 질문 개수**: 최소 ${questionRange.min}개 ~ 최대 ${questionRange.max}개
- **생성 전략**:
  - 복잡도가 높을수록 → 더 많은 심화 질문 생성 (범위 상한 활용)
  - 복잡도가 낮을수록 → 핵심 필수 질문만 생성 (범위 하한 활용)

### 🔥 웹에이전시 실무 질문 가이드

#### 1. 기획 관점 질문 (business, stakeholders)
- ✅ **사용자 페르소나**: "주요 타겟 사용자는 누구이며, 연령대/직군/사용 목적은?"
- ✅ **정보구조도(IA)**: "사이트 메뉴 구성과 주요 페이지 계층은 어떻게 구성하실 계획인가요?"
- ✅ **핵심 기능**: "회원가입/로그인 방식은? (이메일, 소셜 로그인 등)"
- ✅ **비즈니스 목표**: "프로젝트 성공을 측정할 KPI는? (전환율, MAU, 매출 등)"

#### 2. 디자인 관점 질문 (design)
- ✅ **디자인 시스템**: "기존 디자인 가이드나 브랜드 컬러가 있나요?"
- ✅ **반응형 중단점**: "모바일/태블릿/데스크톱 각각의 디자인이 필요한가요?"
- ✅ **디자인 산출물**: "와이어프레임/목업/프로토타입 중 어디까지 필요한가요?"
- ✅ **브랜드 아이덴티티**: "로고, 폰트, 이미지 스타일 등 브랜드 가이드가 있나요?"

#### 3. 퍼블리싱 관점 질문 (technical)
- ✅ **지원 브라우저**: "지원해야 할 브라우저와 버전은? (IE11 포함 여부)"
- ✅ **접근성**: "웹 접근성 WCAG 2.1 AA 등급 준수가 필요한가요?"
- ✅ **다국어**: "다국어 지원이 필요한가요? (언어 종류와 범위)"
- ✅ **SEO**: "검색엔진 최적화(SEO)가 중요한 프로젝트인가요?"

#### 4. 개발 관점 질문 (technical, risks)
- ✅ **프론트엔드**: "선호하는 프론트엔드 기술 스택은? (React/Vue/Angular)"
- ✅ **백엔드**: "백엔드 API는 자체 구축인가요, 외부 서비스 연동인가요?"
- ✅ **인증/권한**: "사용자 인증 방식은? (JWT, OAuth, 세션)"
- ✅ **배포 환경**: "배포 환경은 어디인가요? (AWS, GCP, Azure, 자체 서버)"
- ✅ **보안/성능**: "예상 동시 접속자 수와 응답 시간 목표는?"

#### 5. 일정/예산 관점 질문 (timeline, budget)
- ✅ **목표 일정**: "프로젝트 오픈 희망 일자와 주요 마일스톤은?"
- ✅ **단계별 출시**: "MVP 먼저 출시 후 단계적 기능 추가 계획이 있나요?"
- ✅ **예산 범위**: "프로젝트 예산 범위와 우선순위는?"
- ✅ **인력 계획**: "프로젝트 참여 인력 구성은? (내부팀/외주)"

---

## 📤 출력 형식 (JSON)

\`\`\`json
{
  "questions": [
    {
      "category": "business|technical|design|timeline|budget|risks|stakeholders",
      "question": "구체적이고 실무적인 질문 (50자 이상, 예시: '지원해야 할 브라우저와 최소 버전은 무엇인가요? IE11 지원이 필요한가요?')",
      "context": "질문 배경 설명 (왜 이 질문이 중요한지, 예시: '구형 브라우저 지원은 개발 공수와 비용에 큰 영향을 미칩니다')",
      "required": true,
      "expectedFormat": "textarea",
      "confidenceScore": 0.9
    }
  ]
}
\`\`\`

---

## ⚠️ 필수 준수 지침

### 1. 우선순위 기반 질문 생성
${missingItems.length > 0 ? `- **우선순위 1 (필수)**: 위에 나열된 ${missingItems.length}개 확인되지 않은 항목에 대한 질문 필수 생성` : ''}
${incompleteItems.length > 0 ? `- **우선순위 2 (권장)**: 위에 나열된 ${incompleteItems.length}개 추가 보강 필요 항목에 대한 상세 질문 생성` : ''}
${missingItems.length === 0 && incompleteItems.length === 0 ? '- 문서 분석 결과에서 누락되거나 불충분한 정보를 확인하는 질문 생성' : ''}

### 2. 질문 품질 기준
- ✅ **구체성**: 모호한 질문 금지 (예: "요구사항은?" ❌ → "회원가입 시 이메일 인증이 필요한가요?" ✅)
- ✅ **실무 용어**: 웹에이전시 실무 용어 사용 (예: "반응형 중단점", "크로스브라우징")
- ✅ **최소 길이**: 각 질문 최소 50자 이상
- ✅ **실행 가능성**: 명확한 답변을 유도하는 질문

### 3. 카테고리 분배
- ✅ **균형**: 7개 카테고리를 골고루 포함 (한 카테고리 집중 금지)
- ✅ **우선순위**: business(30%), technical(25%), design(15%), timeline(10%), budget(10%), stakeholders(5%), risks(5%)

### 4. 필수 필드
- ✅ **category**: 반드시 지정된 7개 중 하나 (business, technical, design, timeline, budget, risks, stakeholders)
- ✅ **question**: 질문 본문 (최소 50자)
- ✅ **context**: 질문 배경 설명 (최소 30자)
- ✅ **required**: 필수 여부 (미확인 항목 관련 질문은 반드시 true)
- ✅ **expectedFormat**: textarea (기본값)
- ✅ **confidenceScore**: 0.7~0.9 (미확인 항목은 0.9 이상)

### 5. JSON 형식
- ❌ 마크다운 코드 블록 밖에 설명 추가 금지
- ✅ 순수 JSON 객체만 반환 ({ 로 시작, } 로 끝)

---

위 지침을 **모두 준수**하여 **최소 ${questionRange.min}개, 최대 ${questionRange.max}개**의 실무적 질문을 생성하세요.`;

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

      // 필드 매핑
      const fieldMapping: Record<string, string> = {
        projectGoals: '프로젝트 목표',
        targetAudience: '타겟 사용자',
        functionalRequirements: '핵심 기능 요구사항',
        stakeholders: '이해관계자',
        constraints: '제약사항',
        risks: '위험 요소',
        opportunities: '기회 요소',
        technicalStack: '기술 스택',
        timeline: '일정 정보',
        budget: '예산 정보'
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

    const unclearKeywords = ['미확인', '없음', '명시되지 않음', '정보 없음', '질문 필요'];

    analyses.forEach(analysis => {
      const result = analysis.analysis_result;
      if (!result) return;

      // 🔥 1단계: 완전히 누락된 정보 추출 (기존 로직)
      const fieldsToCheck = [
        { key: 'stakeholders', label: '이해관계자' },
        { key: 'constraints', label: '제약사항' },
        { key: 'risks', label: '위험 요소' },
        { key: 'opportunities', label: '기회 요소' },
        { key: 'technicalStack', label: '기술 스택' },
        { key: 'timeline', label: '일정 정보' }
      ];

      fieldsToCheck.forEach(({ key, label }) => {
        const values = Array.isArray(result[key]) ? result[key] : [];

        values.forEach((value: string) => {
          // 미확인 키워드가 포함되어 있으면 추가 (완전 누락)
          if (unclearKeywords.some(keyword => value.includes(keyword))) {
            items.push({
              field: label,
              type: 'missing',
              neededInfo: value,
              priority: 'high'
            });
          }
        });
      });

      // 🔥 2단계: 추가 보강 필요 항목 추출 (신규)
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
              'budget': '예산 정보'
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

    console.log('📊 추출된 미확인/보강필요 항목:', {
      total: items.length,
      missing: items.filter(item => item.type === 'missing').length,
      incomplete: items.filter(item => item.type === 'incomplete').length
    });

    return items;
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