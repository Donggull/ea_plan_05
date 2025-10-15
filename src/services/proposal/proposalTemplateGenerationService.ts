import { supabase } from '../../lib/supabase'
import { ProposalDataManager } from './dataManager'
import { ProposalTemplateService } from './proposalTemplateService'

export interface TemplateGenerationPhase {
  phase: number
  totalPhases: number
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  sectionTitle: string
  generatedContent?: string
  error?: string
}

export interface TemplateGenerationProgress {
  projectId: string
  templateId: string
  phases: TemplateGenerationPhase[]
  currentPhase: number
  overallStatus: 'preparing' | 'generating' | 'completed' | 'error'
  startedAt: string
  completedAt?: string
}

export interface SlideContent {
  sectionId: string
  title: string
  content: string
  order: number
  visualElements?: string[] // 시각적 요소 제안 (차트, 이미지 등)
}

export interface GenerateTemplateProposalParams {
  projectId: string
  templateId: string
  originalProposal: any // 1차 제안서 데이터
  userId: string
  aiProvider: string
  aiModel: string
}

export class ProposalTemplateGenerationService {
  /**
   * 템플릿 기반 제안서 생성 시작
   * 1차 제안서 내용을 선택된 템플릿 스타일에 맞게 AI로 재생성
   */
  static async generateTemplateProposal(
    params: GenerateTemplateProposalParams
  ): Promise<TemplateGenerationProgress> {
    const { projectId, templateId, originalProposal, userId, aiProvider, aiModel } = params

    console.log('🎨 템플릿 기반 제안서 생성 시작:', {
      projectId,
      templateId,
      sectionsCount: originalProposal.sections?.length || 0
    })

    // 1. 템플릿 정보 조회
    const template = await ProposalTemplateService.getTemplateById(templateId)
    console.log('📋 템플릿 정보:', template.name, template.template_type)

    // 2. Phase 초기화 (각 섹션마다 1개 Phase)
    const sections = originalProposal.sections || []
    const phases: TemplateGenerationPhase[] = sections.map((section: any, index: number) => ({
      phase: index + 1,
      totalPhases: sections.length,
      status: 'pending' as const,
      sectionTitle: section.title
    }))

    const progress: TemplateGenerationProgress = {
      projectId,
      templateId,
      phases,
      currentPhase: 0,
      overallStatus: 'preparing',
      startedAt: new Date().toISOString()
    }

    // 3. 각 섹션별로 순차적으로 생성
    progress.overallStatus = 'generating'
    const generatedSlides: SlideContent[] = []
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      progress.currentPhase = i + 1
      progress.phases[i].status = 'in_progress'

      try {
        console.log(`\n📄 Phase ${i + 1}/${sections.length}: "${section.title}" 생성 중...`)

        // AI로 슬라이드 내용 생성
        const slideContent = await this.generateSlideContent({
          section,
          templateType: template.template_type,
          templateStyle: template.description || '',
          aiProvider,
          aiModel
        })

        generatedSlides.push(slideContent)
        progress.phases[i].status = 'completed'
        progress.phases[i].generatedContent = slideContent.content
        successCount++

        console.log(`✅ Phase ${i + 1}/${sections.length} 완료 (성공: ${successCount}, 실패: ${errorCount})`)

      } catch (error) {
        console.error(`❌ Phase ${i + 1} 실패:`, error)
        progress.phases[i].status = 'error'
        progress.phases[i].error = error instanceof Error ? error.message : String(error)
        errorCount++

        // 오류 발생 시에도 fallback 슬라이드 추가 (프로세스 계속 진행)
        const fallbackSlide: SlideContent = {
          sectionId: section.id,
          title: section.title,
          content: `<div class="generation-error"><p>⚠️ 이 섹션은 AI 생성 중 오류가 발생했습니다.</p><p>원본 내용을 그대로 표시합니다.</p><hr/>${section.content}</div>`,
          order: section.order,
          visualElements: []
        }
        generatedSlides.push(fallbackSlide)

        console.warn(`⚠️ Phase ${i + 1} fallback 사용 (성공: ${successCount}, 실패: ${errorCount})`)
      }
    }

    console.log(`\n📊 생성 완료: 전체 ${sections.length}개 중 성공 ${successCount}개, 실패 ${errorCount}개`)

    // 4. 생성된 슬라이드들을 ai_analysis 테이블에 저장
    progress.overallStatus = 'completed'
    progress.completedAt = new Date().toISOString()

    await this.saveGeneratedProposal({
      projectId,
      templateId,
      originalProposal,
      generatedSlides,
      userId,
      aiProvider,
      aiModel
    })

    console.log('✅ 템플릿 기반 제안서 생성 완료!')
    return progress
  }

  /**
   * AI를 사용하여 개별 슬라이드 내용 생성
   */
  private static async generateSlideContent(params: {
    section: any
    templateType: string
    templateStyle: string
    aiProvider: string
    aiModel: string
  }): Promise<SlideContent> {
    const { section, templateType, templateStyle, aiProvider, aiModel } = params

    console.log(`\n📝 슬라이드 생성 시작: "${section.title}"`)
    console.log(`   AI 모델: ${aiProvider}/${aiModel}`)
    console.log(`   템플릿: ${templateType}`)

    try {
      // 템플릿 타입별 프롬프트 생성
      const prompt = this.createSlideGenerationPrompt({
        sectionTitle: section.title,
        sectionContent: section.content,
        templateType,
        templateStyle
      })

      console.log(`   프롬프트 길이: ${prompt.length}자`)

      // 백엔드 API로 AI 요청
      const generatedContent = await this.callStreamingAPI(
        aiProvider,
        aiModel,
        prompt,
        2000
      )

      console.log(`   AI 응답 길이: ${generatedContent.length}자`)

      // 생성된 내용 파싱
      const parsed = this.parseGeneratedSlideContent(generatedContent)

      console.log(`   ✅ 파싱 완료: "${parsed.title}"`)

      return {
        sectionId: section.id,
        title: parsed.title || section.title,
        content: parsed.content,
        order: section.order,
        visualElements: parsed.visualElements
      }
    } catch (error) {
      console.error(`   ❌ 슬라이드 생성 실패: ${section.title}`)
      console.error(`   오류:`, error)

      // 오류 발생 시에도 기본 슬라이드 반환 (프로세스 중단 방지)
      return {
        sectionId: section.id,
        title: section.title,
        content: `<div class="error-fallback"><p>⚠️ AI 생성 중 오류가 발생했습니다.</p><p>원본 내용:</p>${section.content}</div>`,
        order: section.order,
        visualElements: []
      }
    }
  }

  /**
   * 백엔드 API를 통한 AI 스트리밍 호출
   */
  private static async callStreamingAPI(
    provider: string,
    model: string,
    prompt: string,
    maxTokens: number
  ): Promise<string> {
    const apiUrl = process.env['NODE_ENV'] === 'production'
      ? '/api/ai/completion-streaming'
      : 'http://localhost:3000/api/ai/completion-streaming'

    return new Promise((resolve, reject) => {
      let fullContent = ''

      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          prompt,
          maxTokens,
          temperature: 0.7,
          topP: 1
        })
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.status}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('스트림 리더를 생성할 수 없습니다')
          }

          const decoder = new TextDecoder()

          function readStream(): Promise<void> {
            return reader!.read().then(({ done, value }) => {
              if (done) {
                resolve(fullContent)
                return
              }

              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6))

                    if (data.type === 'content') {
                      fullContent += data.content
                    } else if (data.type === 'error') {
                      reject(new Error(data.error))
                      return
                    } else if (data.type === 'done') {
                      resolve(fullContent)
                      return
                    }
                  } catch (e) {
                    // JSON 파싱 오류는 무시 (불완전한 청크)
                  }
                }
              }

              return readStream()
            })
          }

          return readStream()
        })
        .catch(error => {
          console.error('AI API 호출 오류:', error)
          reject(error)
        })
    })
  }

  /**
   * 슬라이드 생성을 위한 AI 프롬프트 생성
   */
  private static createSlideGenerationPrompt(params: {
    sectionTitle: string
    sectionContent: string
    templateType: string
    templateStyle: string
  }): string {
    const { sectionTitle, sectionContent, templateType, templateStyle } = params

    // HTML 태그 제거
    const cleanContent = sectionContent.replace(/<[^>]*>/g, '')

    return `당신은 전문적인 비즈니스 프레젠테이션 제작자입니다.

다음 제안서 섹션 내용을 **${templateType} 스타일의 프레젠테이션 슬라이드**에 적합하게 재작성해주세요.

## 템플릿 스타일
${templateStyle}

## 원본 섹션
제목: ${sectionTitle}
내용:
${cleanContent}

## 요구사항
1. **간결하고 명확하게**: 프레젠테이션 슬라이드에 적합하도록 핵심 내용만 요약
2. **시각적 구조**: 불릿 포인트, 번호 목록, 단락 구분 등을 활용
3. **전문적인 톤**: 비즈니스 프레젠테이션에 적합한 공식적이고 설득력 있는 표현
4. **HTML 포맷**: <h3>, <p>, <ul>, <li>, <strong> 등의 HTML 태그 사용
5. **적절한 분량**: 한 슬라이드에 표시할 수 있는 분량 (200-400자 내외)

## 출력 형식
**절대 다른 설명 없이 아래 JSON 형식만 반환하세요.**

\`\`\`json
{
  "title": "재작성된 슬라이드 제목",
  "content": "<h3>제목</h3><p>내용...</p>",
  "visualElements": ["차트", "그래프"]
}
\`\`\`

## 출력 예시
\`\`\`json
{
  "title": "디지털 혁신 전략 개요",
  "content": "<h3>핵심 전략</h3><ul><li><strong>AI 기반 자동화:</strong> 업무 효율 30% 향상</li><li><strong>클라우드 전환:</strong> 인프라 비용 40% 절감</li><li><strong>데이터 분석:</strong> 실시간 의사결정 지원</li></ul><p>예상 ROI: 6개월 내 투자 회수</p>",
  "visualElements": ["막대 그래프", "프로세스 다이어그램"]
}
\`\`\`

**중요 규칙:**
- 다른 설명이나 주석 없이 오직 JSON만 반환
- JSON 외 어떤 텍스트도 포함하지 말 것
- 코드 블록(\`\`\`json)으로 감싸서 반환
- title, content 필드는 필수
- content는 반드시 HTML 형식`
  }

  /**
   * AI 응답 파싱 - 더 견고한 로직으로 개선
   */
  private static parseGeneratedSlideContent(response: string): {
    title: string
    content: string
    visualElements?: string[]
  } {
    try {
      console.log('🔍 원본 AI 응답 (처음 200자):', response.substring(0, 200))

      // 1단계: 응답 정제 - 불필요한 텍스트 및 마크다운 제거
      let cleanedResponse = response.trim()

      // JSON 코드 블록 추출 (```json ... ``` 또는 ``` ... ```)
      const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (codeBlockMatch) {
        cleanedResponse = codeBlockMatch[1].trim()
        console.log('📦 코드 블록 추출 완료')
      }

      // 2단계: JSON 객체만 추출
      // 첫 번째 { 부터 마지막 } 까지 추출
      const firstBrace = cleanedResponse.indexOf('{')
      const lastBrace = cleanedResponse.lastIndexOf('}')

      if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
        throw new Error('JSON 객체를 찾을 수 없습니다')
      }

      const jsonStr = cleanedResponse.substring(firstBrace, lastBrace + 1)
      console.log('🔍 추출된 JSON (처음 200자):', jsonStr.substring(0, 200))

      // 3단계: JSON 파싱
      const parsed = JSON.parse(jsonStr)

      // 4단계: 필수 필드 검증
      if (!parsed.title || !parsed.content) {
        throw new Error('title 또는 content 필드가 누락되었습니다')
      }

      console.log('✅ JSON 파싱 성공:', {
        title: parsed.title.substring(0, 50),
        contentLength: parsed.content.length
      })

      return {
        title: parsed.title,
        content: parsed.content,
        visualElements: parsed.visualElements || []
      }
    } catch (error) {
      console.error('❌ AI 응답 파싱 실패:', error)
      console.error('원본 응답 전체:', response)

      // Fallback: 원본 텍스트를 구조화하여 사용
      // 첫 번째 줄을 제목으로, 나머지를 내용으로
      const lines = response.split('\n').filter(line => line.trim())
      const fallbackTitle = lines[0]?.substring(0, 100) || '제목 없음'
      const fallbackContent = lines.slice(1).join('\n') || response

      console.warn('⚠️ Fallback 사용:', {
        title: fallbackTitle,
        contentLength: fallbackContent.length
      })

      return {
        title: fallbackTitle,
        content: `<div class="ai-generated-fallback"><p>${fallbackContent.replace(/\n/g, '</p><p>')}</p></div>`,
        visualElements: []
      }
    }
  }

  /**
   * 생성된 제안서를 proposal_workflow_analysis 테이블에 저장
   */
  private static async saveGeneratedProposal(params: {
    projectId: string
    templateId: string
    originalProposal: any
    generatedSlides: SlideContent[]
    userId: string
    aiProvider: string
    aiModel: string
  }): Promise<void> {
    const { projectId, templateId, originalProposal, generatedSlides, userId, aiProvider, aiModel } = params

    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // 생성된 슬라이드를 sections 형태로 변환
    const transformedSections = generatedSlides.map(slide => ({
      id: slide.sectionId,
      title: slide.title,
      content: slide.content,
      order: slide.order,
      visualElements: slide.visualElements
    }))

    const finalProposal = {
      ...originalProposal,
      sections: transformedSections,
      templateId,
      templateApplied: true,
      generatedAt: new Date().toISOString()
    }

    // proposal_workflow_analysis 테이블에 저장 (analysis_type: 'template_proposal')
    await ProposalDataManager.saveAnalysis({
      project_id: projectId,
      workflow_step: 'proposal',
      analysis_type: 'template_proposal',
      input_documents: [],
      input_responses: [],
      ai_provider: aiProvider,
      ai_model: aiModel,
      analysis_prompt: `템플릿 ID: ${templateId}`,
      analysis_result: JSON.stringify(finalProposal),
      structured_output: finalProposal,
      recommendations: [],
      next_questions: [],
      input_tokens: 0,
      output_tokens: 0,
      cost: 0,
      status: 'completed',
      created_by: userId,
      metadata: {
        templateId,
        sectionsCount: transformedSections.length,
        originalProposalSections: originalProposal.sections?.length || 0
      }
    })

    console.log('✅ 생성된 제안서 저장 완료 (analysis_type: template_proposal)')
  }

  /**
   * 생성된 템플릿 제안서 조회
   */
  static async getTemplateProposal(projectId: string): Promise<any | null> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const analyses = await ProposalDataManager.getAnalysis(
      projectId,
      'proposal',
      'template_proposal'
    )

    if (!analyses || analyses.length === 0) {
      return null
    }

    // 최신 템플릿 제안서 반환
    const latest = analyses[0]
    return typeof latest.analysis_result === 'string'
      ? JSON.parse(latest.analysis_result)
      : latest.analysis_result
  }
}
