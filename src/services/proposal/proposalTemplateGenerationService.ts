/**
 * 템플릿 제안서 생성 서비스 (완전 재설계)
 *
 * AI 재생성 제거 → 1차 제안서 내용을 템플릿에 직접 매핑
 *
 * 장점:
 * - 파싱 오류 완전 제거 (AI 호출 없음)
 * - 1차 제안서 내용 100% 보존
 * - 즉시 생성 (네트워크 지연 없음)
 * - 비용 절감 (AI API 호출 없음)
 */

import { supabase } from '../../lib/supabase'
import { ProposalDataManager } from './dataManager'
import { ProposalTemplateService } from './proposalTemplateService'
import { textToSimpleHtml } from '../../utils/textToHtml'

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
  onProgress?: (progress: TemplateGenerationProgress) => void // 진행 상황 콜백
}

export class ProposalTemplateGenerationService {
  /**
   * 템플릿 기반 제안서 생성
   *
   * 🔥 핵심 변경: AI 재생성 제거 → 1차 제안서 내용을 그대로 템플릿에 매핑
   */
  static async generateTemplateProposal(
    params: GenerateTemplateProposalParams
  ): Promise<TemplateGenerationProgress> {
    const { projectId, templateId, originalProposal, userId, aiProvider, aiModel, onProgress } = params

    console.log('🎨 템플릿 기반 제안서 생성 시작 (AI 재생성 없음 - 직접 매핑):', {
      projectId,
      templateId,
      sectionsCount: originalProposal.sections?.length || 0,
      timestamp: new Date().toISOString()
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

    // 3. 각 섹션별로 직접 매핑 (AI 호출 없음)
    progress.overallStatus = 'generating'
    const generatedSlides: SlideContent[] = []

    // 초기 진행 상황 전달
    if (onProgress) {
      onProgress({ ...progress })
    }

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      progress.currentPhase = i + 1
      progress.phases[i].status = 'in_progress'

      // 진행 상황 업데이트 (Phase 시작)
      if (onProgress) {
        onProgress({ ...progress })
      }

      try {
        console.log(`\n📄 Phase ${i + 1}/${sections.length}: "${section.title}" 매핑 중...`)

        // 🔥 핵심 변경: AI 호출 대신 직접 매핑
        const slideContent = this.mapSectionToSlide(section, template.template_type)

        generatedSlides.push(slideContent)
        progress.phases[i].status = 'completed'
        progress.phases[i].generatedContent = slideContent.content

        console.log(`✅ Phase ${i + 1}/${sections.length} 완료`)

        // 진행 상황 업데이트 (Phase 완료)
        if (onProgress) {
          onProgress({ ...progress })
        }

      } catch (error) {
        console.error(`❌ Phase ${i + 1} 실패:`, error)
        progress.phases[i].status = 'error'
        progress.phases[i].error = error instanceof Error ? error.message : String(error)

        // 오류 발생 시에도 원본 내용 사용 (프로세스 계속 진행)
        const fallbackSlide: SlideContent = {
          sectionId: section.id,
          title: section.title,
          content: section.content, // 원본 그대로
          order: section.order,
          visualElements: []
        }
        generatedSlides.push(fallbackSlide)

        console.warn(`⚠️ Phase ${i + 1} fallback 사용 (원본 내용 유지)`)

        // 진행 상황 업데이트 (오류 포함)
        if (onProgress) {
          onProgress({ ...progress })
        }
      }
    }

    console.log(`\n📊 생성 완료: 전체 ${sections.length}개 섹션 매핑 완료`)

    // 4. 생성된 슬라이드들을 proposal_workflow_analysis 테이블에 저장
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

    console.log('✅ 템플릿 기반 제안서 생성 완료! (AI 재생성 없이 즉시 완료)')
    return progress
  }

  /**
   * 1차 제안서 section을 템플릿 slide로 직접 매핑
   *
   * 🔥 핵심 로직: AI 호출 없이 텍스트를 HTML로 변환하여 매핑
   */
  private static mapSectionToSlide(
    section: any,
    _templateType: string // 현재 미사용이지만 향후 템플릿별 커스터마이징 가능
  ): SlideContent {
    console.log(`  🔄 섹션 매핑: "${section.title}"`)

    // 1. 원본 content가 이미 HTML인지 확인
    const isHtml = /<[a-z][\s\S]*>/i.test(section.content)

    // 2. HTML로 변환 (순수 텍스트인 경우)
    const htmlContent = isHtml
      ? section.content
      : textToSimpleHtml(section.content)

    console.log(`  ✅ HTML 변환 완료: ${htmlContent.length}자`)

    // 3. 시각적 요소 추출 (키워드 기반)
    const visualElements = this.suggestVisualElements(section.title, section.content)

    return {
      sectionId: section.id,
      title: section.title,
      content: htmlContent,
      order: section.order,
      visualElements
    }
  }

  /**
   * 섹션 내용을 기반으로 시각적 요소 제안
   *
   * 키워드를 분석하여 적절한 차트나 다이어그램을 제안합니다.
   */
  private static suggestVisualElements(title: string, content: string): string[] {
    const text = `${title} ${content}`.toLowerCase()
    const suggestions: string[] = []

    // 키워드 기반 시각적 요소 매핑
    const keywordMapping: Record<string, string> = {
      '일정': '간트 차트',
      '프로젝트 일정': '타임라인',
      '마일스톤': '타임라인',
      '비용': '막대 그래프',
      '예산': '원형 차트',
      '기술 스택': '아키텍처 다이어그램',
      '아키텍처': '시스템 다이어그램',
      '시스템': '플로우 차트',
      '프로세스': '플로우 차트',
      '팀': '조직도',
      '조직': '조직도',
      '구조': '다이어그램',
      '비교': '비교표',
      '경쟁': '비교표',
      'roi': '투자수익 그래프',
      '증가': '꺾은선 그래프',
      '감소': '꺾은선 그래프',
      '변화': '꺾은선 그래프',
      '트렌드': '꺾은선 그래프',
      '시장': '시장 분석 차트',
      '점유율': '원형 차트'
    }

    for (const [keyword, visual] of Object.entries(keywordMapping)) {
      if (text.includes(keyword) && !suggestions.includes(visual)) {
        suggestions.push(visual)
      }
    }

    // 기본 제안 (아무것도 매칭되지 않은 경우)
    if (suggestions.length === 0) {
      suggestions.push('인포그래픽')
    }

    console.log(`  💡 시각적 요소 제안: ${suggestions.join(', ')}`)

    return suggestions
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
      generatedAt: new Date().toISOString(),
      generationMethod: 'direct_mapping' // AI 재생성 없음을 명시
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
      analysis_prompt: `템플릿 ID: ${templateId} (직접 매핑 - AI 재생성 없음)`,
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
        originalProposalSections: originalProposal.sections?.length || 0,
        generationMethod: 'direct_mapping',
        aiCost: 0 // AI 호출 없으므로 비용 0
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
