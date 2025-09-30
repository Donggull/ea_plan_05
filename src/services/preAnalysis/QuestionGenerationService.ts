import { supabase } from '@/lib/supabase';

/**
 * 질문 생성 서비스
 * 분석된 문서들을 바탕으로 AI가 맞춤형 질문을 생성
 */

export interface QuestionGenerationRequest {
  projectId: string;
  sessionId: string;
  analysisIds: string[];
  aiModel: string;
  aiProvider: 'openai' | 'anthropic' | 'google';
  questionCount?: number; // 생성할 질문 수 (기본: 5-10개)
  userId: string;
}

export interface GeneratedQuestion {
  question: string;
  category: string;
  importance: 'high' | 'medium' | 'low';
  context?: string;
}

export interface QuestionGenerationResult {
  success: boolean;
  questions: GeneratedQuestion[];
  totalGenerated: number;
  error?: string;
}

export class QuestionGenerationService {
  /**
   * 문서 분석 결과를 바탕으로 질문 생성
   */
  static async generateQuestions(
    request: QuestionGenerationRequest
  ): Promise<QuestionGenerationResult> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      console.log('❓ 질문 생성 시작:', request.projectId);

      // 1. 분석 결과 조회
      const { data: analyses, error: analysisError } = await supabase
        .from('document_analyses')
        .select('id, document_id, analysis_result, confidence_score')
        .in('id', request.analysisIds)
        .eq('status', 'completed');

      if (analysisError) {
        console.error('분석 결과 조회 실패:', analysisError);
        throw new Error(`분석 결과 조회 실패: ${analysisError.message}`);
      }

      if (!analyses || analyses.length === 0) {
        return {
          success: false,
          questions: [],
          totalGenerated: 0,
          error: '분석 결과가 없습니다',
        };
      }

      console.log(`📊 ${analyses.length}개 분석 결과 발견`);

      // 2. 분석 결과를 요약하여 컨텍스트 생성
      const analysisContext = this.buildAnalysisContext(analyses);

      // 3. AI를 통한 질문 생성
      const questionPrompt = this.buildQuestionPrompt(
        analysisContext,
        request.questionCount || 10
      );

      console.log('🤖 AI 질문 생성 요청 중...');

      const aiResponse = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: request.aiProvider,
          model: request.aiModel,
          messages: [
            {
              role: 'system',
              content: `당신은 프로젝트 기획 전문가입니다.
문서 분석 결과를 바탕으로 프로젝트의 성공을 위해 반드시 답변해야 할 핵심 질문들을 생성해주세요.
질문은 구체적이고 실행 가능한 답변을 이끌어낼 수 있어야 합니다.`,
            },
            {
              role: 'user',
              content: questionPrompt,
            },
          ],
          temperature: 0.7, // 창의적인 질문 생성을 위해 적절한 temperature
          maxTokens: 2000,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`AI API 호출 실패: ${aiResponse.status} - ${errorText}`);
      }

      const aiResult = await aiResponse.json();

      if (!aiResult.success || !aiResult.data?.content) {
        throw new Error(aiResult.error || 'AI 질문 생성 결과가 없습니다');
      }

      // 4. 생성된 질문 파싱
      const questions = this.parseGeneratedQuestions(aiResult.data.content);

      console.log(`✅ ${questions.length}개 질문 생성 완료`);

      // 5. 세션 메타데이터에 질문 저장
      const { error: updateError } = await supabase
        .from('pre_analysis_sessions')
        .update({
          metadata: {
            questions: questions as any,
            questions_generated_at: new Date().toISOString(),
            total_questions: questions.length,
          },
          questions_progress: 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.sessionId);

      if (updateError) {
        console.warn('세션 메타데이터 업데이트 실패:', updateError);
        // 질문 생성은 성공했으므로 계속 진행
      }

      return {
        success: true,
        questions,
        totalGenerated: questions.length,
      };

    } catch (error) {
      console.error('질문 생성 오류:', error);
      return {
        success: false,
        questions: [],
        totalGenerated: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * 분석 결과를 컨텍스트로 변환
   */
  private static buildAnalysisContext(analyses: any[]): string {
    let context = '=== 문서 분석 결과 요약 ===\n\n';

    analyses.forEach((analysis, index) => {
      const result = analysis.analysis_result;

      context += `[문서 ${index + 1}] (신뢰도: ${(analysis.confidence_score * 100).toFixed(0)}%)\n`;

      if (result.raw_content) {
        // 원본 내용이 있는 경우 처음 500자만 사용
        context += result.raw_content.slice(0, 500) + '...\n\n';
      } else if (result.structured) {
        // 구조화된 내용이 있는 경우
        Object.entries(result.structured).forEach(([key, value]) => {
          if (typeof value === 'string' && value.length > 0) {
            context += `${key}: ${value.slice(0, 300)}...\n`;
          }
        });
        context += '\n';
      }
    });

    return context;
  }

  /**
   * 질문 생성 프롬프트 작성
   */
  private static buildQuestionPrompt(analysisContext: string, questionCount: number): string {
    return `다음은 프로젝트 문서들에 대한 분석 결과입니다:

${analysisContext}

위 분석 결과를 바탕으로, 프로젝트 성공을 위해 반드시 확인해야 할 ${questionCount}개의 질문을 생성해주세요.

질문은 다음 형식으로 작성해주세요:

[카테고리] 질문내용 (중요도: high/medium/low)
컨텍스트: 이 질문이 필요한 이유

예시:
[기술스택] 백엔드 API는 어떤 프레임워크로 개발할 예정인가요? (중요도: high)
컨텍스트: 문서에서 API 개발이 언급되었으나 구체적인 기술 스택이 명시되지 않았습니다.

카테고리는 다음 중 하나를 사용하세요:
- 기술스택: 기술 선택 및 아키텍처 관련
- 요구사항: 기능 및 비기능 요구사항 관련
- 일정: 프로젝트 일정 및 마일스톤 관련
- 리소스: 인력, 예산 등 리소스 관련
- 리스크: 잠재적 위험 요소 관련
- 운영: 배포, 모니터링 등 운영 관련

질문들을 생성해주세요:`;
  }

  /**
   * AI가 생성한 질문 파싱
   */
  private static parseGeneratedQuestions(content: string): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];
    const lines = content.split('\n');

    let currentQuestion: Partial<GeneratedQuestion> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) continue;

      // 질문 패턴: [카테고리] 질문내용 (중요도: level)
      const questionMatch = trimmed.match(/^\[([^\]]+)\]\s*(.+?)\s*\(중요도:\s*(high|medium|low)\)/i);

      if (questionMatch) {
        // 이전 질문 저장
        if (currentQuestion.question) {
          questions.push(currentQuestion as GeneratedQuestion);
        }

        // 새 질문 시작
        currentQuestion = {
          category: questionMatch[1].trim(),
          question: questionMatch[2].trim(),
          importance: questionMatch[3].toLowerCase() as 'high' | 'medium' | 'low',
          context: '',
        };
      }
      // 컨텍스트 패턴: 컨텍스트: 내용
      else if (trimmed.startsWith('컨텍스트:')) {
        const contextText = trimmed.replace('컨텍스트:', '').trim();
        if (currentQuestion.question) {
          currentQuestion.context = contextText;
        }
      }
      // 컨텍스트 계속 (이전 줄의 연속)
      else if (currentQuestion.question && currentQuestion.context !== undefined) {
        currentQuestion.context += ' ' + trimmed;
      }
    }

    // 마지막 질문 저장
    if (currentQuestion.question) {
      questions.push(currentQuestion as GeneratedQuestion);
    }

    // 파싱 실패 시 대체 로직
    if (questions.length === 0) {
      console.warn('질문 파싱 실패, 대체 파싱 시도');
      return this.fallbackParseQuestions(content);
    }

    return questions;
  }

  /**
   * 대체 질문 파싱 로직 (형식이 맞지 않을 경우)
   */
  private static fallbackParseQuestions(content: string): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // 번호나 기호로 시작하는 줄을 질문으로 간주
      if (/^[\d\-\*]/.test(line.trim())) {
        const cleaned = line.replace(/^[\d\-\*\.\)]+\s*/, '').trim();

        if (cleaned.length > 10) { // 최소 길이 확인
          questions.push({
            question: cleaned,
            category: '일반',
            importance: 'medium',
            context: '문서 분석 결과를 바탕으로 생성된 질문입니다.',
          });
        }
      }
    }

    // 그래도 파싱 실패 시 기본 질문 생성
    if (questions.length === 0) {
      questions.push({
        question: '프로젝트의 핵심 목표와 성공 지표는 무엇인가요?',
        category: '요구사항',
        importance: 'high',
        context: '프로젝트 목표가 명확하지 않아 생성된 기본 질문입니다.',
      });
    }

    return questions;
  }
}