import { supabase } from '../../lib/supabase'
import { aiServiceManager } from '../ai/AIServiceManager'
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

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      progress.currentPhase = i + 1
      progress.phases[i].status = 'in_progress'

      try {
        console.log(`📄 Phase ${i + 1}/${sections.length}: "${section.title}" 생성 중...`)

        // AI로 슬라이드 내용 생성
        const slideContent = await this.generateSlideContent({
          section,
          templateType: template.template_type,
          templateStyle: template.description || '',
          aiModel
        })

        generatedSlides.push(slideContent)
        progress.phases[i].status = 'completed'
        progress.phases[i].generatedContent = slideContent.content

        console.log(`✅ Phase ${i + 1} 완료`)

      } catch (error) {
        console.error(`❌ Phase ${i + 1} 실패:`, error)
        progress.phases[i].status = 'error'
        progress.phases[i].error = error instanceof Error ? error.message : String(error)
        throw error // 하나라도 실패하면 전체 실패
      }
    }

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
    aiModel: string
  }): Promise<SlideContent> {
    const { section, templateType, templateStyle, aiModel } = params

    // 템플릿 타입별 프롬프트 생성
    const prompt = this.createSlideGenerationPrompt({
      sectionTitle: section.title,
      sectionContent: section.content,
      templateType,
      templateStyle
    })

    // AI 모델에 요청
    const result = await aiServiceManager.generateCompletion(prompt, {
      model: aiModel,
      maxTokens: 2000,
      temperature: 0.7
    })

    const generatedContent = result.content

    // 생성된 내용 파싱
    const parsed = this.parseGeneratedSlideContent(generatedContent)

    return {
      sectionId: section.id,
      title: parsed.title || section.title,
      content: parsed.content,
      order: section.order,
      visualElements: parsed.visualElements
    }
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

## 출력 형식 (JSON)
\`\`\`json
{
  "title": "재작성된 슬라이드 제목 (간결하게)",
  "content": "HTML 형식의 슬라이드 내용",
  "visualElements": ["차트/이미지 제안 (선택사항)"]
}
\`\`\`

**중요**: 반드시 위 JSON 형식으로만 응답해주세요.`
  }

  /**
   * AI 응답 파싱
   */
  private static parseGeneratedSlideContent(response: string): {
    title: string
    content: string
    visualElements?: string[]
  } {
    try {
      // JSON 블록 추출
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/{[\s\S]*}/)

      if (!jsonMatch) {
        throw new Error('JSON 형식을 찾을 수 없습니다')
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const parsed = JSON.parse(jsonStr)

      return {
        title: parsed.title || '',
        content: parsed.content || '',
        visualElements: parsed.visualElements
      }
    } catch (error) {
      console.error('AI 응답 파싱 실패:', error)
      // Fallback: 원본 텍스트 그대로 사용
      return {
        title: '',
        content: `<p>${response}</p>`,
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
