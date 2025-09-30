import { supabase } from '@/lib/supabase';

/**
 * 문서 분석 서비스
 * 프로젝트의 문서들을 AI로 분석하여 ai_analysis 테이블에 저장
 */

export interface DocumentAnalysisRequest {
  projectId: string;
  sessionId: string;
  aiModel: string;
  aiProvider: 'openai' | 'anthropic' | 'google';
  analysisDepth: 'quick' | 'standard' | 'deep';
  userId: string;
}

export interface AnalysisProgress {
  currentDocument: number;
  totalDocuments: number;
  progress: number;
  currentDocumentName?: string;
}

export interface AnalysisResult {
  success: boolean;
  analysisIds: string[];
  totalDocuments: number;
  successCount: number;
  failCount: number;
  error?: string;
}

export class DocumentAnalysisService {
  /**
   * 프로젝트의 모든 문서를 분석
   */
  static async analyzeProjectDocuments(
    request: DocumentAnalysisRequest,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResult> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      console.log('📚 문서 분석 시작:', request.projectId);

      // 1. 프로젝트 문서 조회
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('id, file_name, file_type, file_size, created_at')
        .eq('project_id', request.projectId)
        .order('created_at', { ascending: true });

      if (docError) {
        console.error('문서 조회 실패:', docError);
        throw new Error(`문서 조회 실패: ${docError.message}`);
      }

      if (!documents || documents.length === 0) {
        return {
          success: false,
          analysisIds: [],
          totalDocuments: 0,
          successCount: 0,
          failCount: 0,
          error: '분석할 문서가 없습니다',
        };
      }

      console.log(`📄 총 ${documents.length}개 문서 발견`);

      // 2. 각 문서에 대해 분석 수행
      const analysisIds: string[] = [];
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];

        // 진행 상황 콜백
        if (onProgress) {
          onProgress({
            currentDocument: i + 1,
            totalDocuments: documents.length,
            progress: Math.round(((i + 1) / documents.length) * 100),
            currentDocumentName: document.file_name,
          });
        }

        console.log(`\n🔍 문서 분석 중 (${i + 1}/${documents.length}): ${document.file_name}`);

        try {
          // 문서 내용 조회
          const { data: contentData, error: contentError } = await supabase
            .from('document_content')
            .select('raw_text, processed_text')
            .eq('document_id', document.id)
            .single();

          if (contentError || !contentData) {
            console.warn(`문서 내용 조회 실패: ${document.file_name}`, contentError);
            failCount++;
            continue;
          }

          const documentContent = contentData.processed_text || contentData.raw_text;

          if (!documentContent || documentContent.trim().length === 0) {
            console.warn(`문서 내용이 비어있음: ${document.file_name}`);
            failCount++;
            continue;
          }

          // AI 분석 수행
          const analysisResult = await this.analyzeDocument({
            documentId: document.id,
            documentName: document.file_name,
            documentContent,
            fileType: document.file_type || 'unknown',
            projectId: request.projectId,
            sessionId: request.sessionId,
            aiModel: request.aiModel,
            aiProvider: request.aiProvider,
            analysisDepth: request.analysisDepth,
            userId: request.userId,
          });

          if (analysisResult.success && analysisResult.analysisId) {
            analysisIds.push(analysisResult.analysisId);
            successCount++;
            console.log(`✅ 분석 완료: ${document.file_name}`);
          } else {
            failCount++;
            console.warn(`❌ 분석 실패: ${document.file_name}`, analysisResult.error);
          }

          // API 부하 방지를 위한 짧은 대기
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`문서 분석 오류: ${document.file_name}`, error);
          failCount++;
        }
      }

      // 최종 진행 상황
      if (onProgress) {
        onProgress({
          currentDocument: documents.length,
          totalDocuments: documents.length,
          progress: 100,
        });
      }

      console.log(`\n📊 분석 완료: 성공 ${successCount}개, 실패 ${failCount}개`);

      return {
        success: successCount > 0,
        analysisIds,
        totalDocuments: documents.length,
        successCount,
        failCount,
      };

    } catch (error) {
      console.error('문서 분석 프로세스 오류:', error);
      return {
        success: false,
        analysisIds: [],
        totalDocuments: 0,
        successCount: 0,
        failCount: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * 개별 문서 분석
   */
  private static async analyzeDocument(params: {
    documentId: string;
    documentName: string;
    documentContent: string;
    fileType: string;
    projectId: string;
    sessionId: string;
    aiModel: string;
    aiProvider: 'openai' | 'anthropic' | 'google';
    analysisDepth: 'quick' | 'standard' | 'deep';
    userId: string;
  }): Promise<{ success: boolean; analysisId?: string; error?: string }> {
    try {
      // 분석 깊이에 따른 프롬프트 생성
      const analysisPrompt = this.buildAnalysisPrompt(
        params.documentName,
        params.documentContent,
        params.fileType,
        params.analysisDepth
      );

      // AI API 호출
      const aiResponse = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: params.aiProvider,
          model: params.aiModel,
          messages: [
            {
              role: 'system',
              content: '당신은 전문적인 문서 분석가입니다. 제공된 문서를 분석하여 핵심 내용, 주요 개념, 기술 스택, 요구사항 등을 추출해주세요.',
            },
            {
              role: 'user',
              content: analysisPrompt,
            },
          ],
          temperature: 0.3, // 일관성 있는 분석을 위해 낮은 temperature
          maxTokens: this.getMaxTokensByDepth(params.analysisDepth),
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`AI API 호출 실패: ${aiResponse.status} - ${errorText}`);
      }

      const aiResult = await aiResponse.json();

      if (!aiResult.success || !aiResult.data?.content) {
        throw new Error(aiResult.error || 'AI 분석 결과가 없습니다');
      }

      const analysisContent = aiResult.data.content;

      // 분석 결과를 구조화된 형태로 파싱
      const structuredAnalysis = this.parseAnalysisResult(analysisContent);

      // 카테고리 자동 분류 (파일 타입 기반)
      const category = this.categorizeDocument(params.fileType);

      // document_analyses 테이블에 저장
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data: analysisData, error: insertError } = await supabase
        .from('document_analyses')
        .insert({
          session_id: params.sessionId,
          document_id: params.documentId,
          category,
          analysis_result: structuredAnalysis,
          confidence_score: this.calculateConfidenceScore(analysisContent),
          ai_model: params.aiModel,
          ai_provider: params.aiProvider,
          input_tokens: aiResult.data.usage?.promptTokens || 0,
          output_tokens: aiResult.data.usage?.completionTokens || 0,
          cost: this.calculateCost(
            params.aiProvider,
            params.aiModel,
            aiResult.data.usage?.promptTokens || 0,
            aiResult.data.usage?.completionTokens || 0
          ),
          status: 'completed',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('분석 결과 저장 실패:', insertError);
        throw new Error(`분석 결과 저장 실패: ${insertError.message}`);
      }

      return {
        success: true,
        analysisId: analysisData.id,
      };

    } catch (error) {
      console.error('문서 분석 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * 분석 깊이에 따른 프롬프트 생성
   */
  private static buildAnalysisPrompt(
    documentName: string,
    documentContent: string,
    fileType: string,
    analysisDepth: 'quick' | 'standard' | 'deep'
  ): string {
    const contentPreview = documentContent.slice(0, this.getContentLimitByDepth(analysisDepth));

    let prompt = `문서명: ${documentName}\n파일 타입: ${fileType}\n\n`;

    switch (analysisDepth) {
      case 'quick':
        prompt += `다음 문서의 핵심 내용을 간략히 요약해주세요 (3-5문장):\n\n${contentPreview}`;
        break;

      case 'standard':
        prompt += `다음 문서를 분석하여 아래 항목들을 추출해주세요:\n`;
        prompt += `1. 문서 개요 (2-3문장)\n`;
        prompt += `2. 핵심 내용 (5-7개 항목)\n`;
        prompt += `3. 언급된 기술 스택 (있는 경우)\n`;
        prompt += `4. 주요 요구사항 (있는 경우)\n\n`;
        prompt += `문서 내용:\n${contentPreview}`;
        break;

      case 'deep':
        prompt += `다음 문서에 대한 상세 분석을 수행해주세요:\n`;
        prompt += `1. 문서 개요 및 목적\n`;
        prompt += `2. 상세 내용 분석 (주요 섹션별)\n`;
        prompt += `3. 기술 스택 및 아키텍처\n`;
        prompt += `4. 요구사항 및 제약사항\n`;
        prompt += `5. 리스크 및 고려사항\n`;
        prompt += `6. 연관 문서 추천 (가능한 경우)\n\n`;
        prompt += `문서 내용:\n${contentPreview}`;
        break;
    }

    return prompt;
  }

  /**
   * AI 분석 결과를 구조화된 형태로 파싱
   */
  private static parseAnalysisResult(analysisContent: string): Record<string, any> {
    try {
      // JSON 형태로 파싱 시도
      if (analysisContent.trim().startsWith('{')) {
        return JSON.parse(analysisContent);
      }

      // 텍스트 형태의 분석 결과를 구조화
      const sections: Record<string, string> = {};
      const lines = analysisContent.split('\n');
      let currentSection = 'summary';
      let currentContent: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();

        // 섹션 헤더 감지 (1., 2., ##, - 등으로 시작)
        if (/^(#+|\d+\.|[-*])\s/.test(trimmed)) {
          if (currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim();
            currentContent = [];
          }

          // 새 섹션 시작
          currentSection = trimmed.replace(/^(#+|\d+\.|[-*])\s*/, '').toLowerCase().replace(/\s+/g, '_');
        }

        if (trimmed) {
          currentContent.push(trimmed);
        }
      }

      // 마지막 섹션 저장
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }

      return {
        raw_content: analysisContent,
        structured: sections,
        parsed_at: new Date().toISOString(),
      };

    } catch (error) {
      console.warn('분석 결과 파싱 실패, 원본 저장:', error);
      return {
        raw_content: analysisContent,
        parse_error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * 신뢰도 점수 계산 (0-1 범위)
   */
  private static calculateConfidenceScore(analysisContent: string): number {
    // 간단한 휴리스틱 기반 신뢰도 계산
    let score = 0.5; // 기본 점수

    // 내용 길이에 따른 가점
    if (analysisContent.length > 500) score += 0.1;
    if (analysisContent.length > 1000) score += 0.1;

    // 구조화된 내용 감지 (리스트, 섹션 등)
    if (analysisContent.includes('1.') || analysisContent.includes('-')) score += 0.1;
    if (analysisContent.includes('##') || analysisContent.includes('###')) score += 0.1;

    // 기술적 키워드 포함 여부
    const techKeywords = ['기술', '스택', '요구사항', '아키텍처', '구현', 'API', '데이터베이스'];
    const keywordCount = techKeywords.filter(keyword => analysisContent.includes(keyword)).length;
    score += Math.min(keywordCount * 0.05, 0.2);

    return Math.min(score, 1.0);
  }

  /**
   * 분석 깊이에 따른 최대 토큰 수
   */
  private static getMaxTokensByDepth(depth: 'quick' | 'standard' | 'deep'): number {
    switch (depth) {
      case 'quick': return 500;
      case 'standard': return 1500;
      case 'deep': return 3000;
      default: return 1500;
    }
  }

  /**
   * 분석 깊이에 따른 문서 내용 제한 (문자 수)
   */
  private static getContentLimitByDepth(depth: 'quick' | 'standard' | 'deep'): number {
    switch (depth) {
      case 'quick': return 2000;
      case 'standard': return 5000;
      case 'deep': return 10000;
      default: return 5000;
    }
  }

  /**
   * 파일 타입 기반 문서 카테고리 분류
   */
  private static categorizeDocument(fileType: string): string {
    const type = fileType.toLowerCase();

    if (type.includes('pdf') || type.includes('document')) return 'requirement';
    if (type.includes('xls') || type.includes('sheet') || type.includes('csv')) return 'data';
    if (type.includes('ppt') || type.includes('presentation')) return 'presentation';
    if (type.includes('image') || type.includes('png') || type.includes('jpg')) return 'diagram';
    if (type.includes('txt') || type.includes('text')) return 'note';

    return 'general';
  }

  /**
   * AI API 비용 계산
   */
  private static calculateCost(
    _provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    // 모델별 토큰당 비용 (USD per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 30, output: 60 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
      'gemini-pro': { input: 0.5, output: 1.5 },
    };

    const modelPricing = pricing[model] || { input: 1, output: 2 };

    const inputCost = (inputTokens / 1000000) * modelPricing.input;
    const outputCost = (outputTokens / 1000000) * modelPricing.output;

    return inputCost + outputCost;
  }
}