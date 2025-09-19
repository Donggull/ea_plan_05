import { WorkflowStep } from './aiQuestionGenerator'
import { ProposalDataManager } from './dataManager'
import { AnalysisResult } from './proposalAnalysisService'

export interface ReportSection {
  id: string
  title: string
  content: string
  type: 'text' | 'list' | 'table' | 'chart'
  order: number
  metadata?: any
}

export interface GeneratedReport {
  id: string
  title: string
  description: string
  sections: ReportSection[]
  metadata: {
    projectId: string
    workflowStep: WorkflowStep
    generatedAt: string
    format: 'markdown' | 'html' | 'pdf' | 'json'
    version: string
  }
  rawData: {
    analysisResult: AnalysisResult
    projectInfo: any
    responses: any[]
  }
}

export interface ReportTemplate {
  id: string
  name: string
  description: string
  workflowStep: WorkflowStep
  sections: Array<{
    id: string
    title: string
    template: string
    type: 'text' | 'list' | 'table' | 'chart'
    required: boolean
    order: number
  }>
}

export class ReportGenerator {
  private static templates: Map<WorkflowStep, ReportTemplate[]> = new Map()

  /**
   * 기본 템플릿 초기화
   */
  static initializeDefaultTemplates(): void {
    // 시장 조사 보고서 템플릿
    const marketResearchTemplate: ReportTemplate = {
      id: 'market_research_standard',
      name: '표준 시장 조사 보고서',
      description: '시장 분석 결과를 체계적으로 정리한 보고서',
      workflowStep: 'market_research',
      sections: [
        {
          id: 'executive_summary',
          title: '요약',
          template: '{{summary}}',
          type: 'text',
          required: true,
          order: 1
        },
        {
          id: 'market_size',
          title: '시장 규모',
          template: '예상 시장 규모: {{marketSize}}\n성장률: {{growthRate}}',
          type: 'text',
          required: true,
          order: 2
        },
        {
          id: 'key_findings',
          title: '주요 발견사항',
          template: '{{#each keyFindings}}• {{this}}\n{{/each}}',
          type: 'list',
          required: true,
          order: 3
        },
        {
          id: 'competitive_analysis',
          title: '경쟁 분석',
          template: '**경쟁 우위 요소:**\n{{competitiveAdvantage}}\n\n**진입 장벽:**\n{{#each entryBarriers}}• {{this}}\n{{/each}}',
          type: 'text',
          required: true,
          order: 4
        },
        {
          id: 'opportunities_threats',
          title: '기회와 위협',
          template: '**기회 요인:**\n{{#each opportunities}}• {{this}}\n{{/each}}\n\n**위협 요인:**\n{{#each threats}}• {{this}}\n{{/each}}',
          type: 'text',
          required: true,
          order: 5
        },
        {
          id: 'recommendations',
          title: '권장사항',
          template: '{{#each recommendations}}• {{this}}\n{{/each}}',
          type: 'list',
          required: true,
          order: 6
        },
        {
          id: 'next_steps',
          title: '다음 단계',
          template: '{{#each nextSteps}}• {{this}}\n{{/each}}',
          type: 'list',
          required: true,
          order: 7
        }
      ]
    }

    // 페르소나 분석 보고서 템플릿
    const personasTemplate: ReportTemplate = {
      id: 'personas_standard',
      name: '표준 페르소나 분석 보고서',
      description: '고객 페르소나 분석 결과 보고서',
      workflowStep: 'personas',
      sections: [
        {
          id: 'executive_summary',
          title: '요약',
          template: '{{summary}}',
          type: 'text',
          required: true,
          order: 1
        },
        {
          id: 'primary_persona',
          title: '주요 페르소나',
          template: `**{{primaryPersona.name}}**

**인구통계학적 특성:**
- 연령: {{primaryPersona.demographics.age}}
- 성별: {{primaryPersona.demographics.gender}}
- 직업: {{primaryPersona.demographics.occupation}}
- 소득 수준: {{primaryPersona.demographics.income}}
- 교육 수준: {{primaryPersona.demographics.education}}

**라이프스타일:**
- 특성: {{primaryPersona.psychographics.lifestyle}}
- 기술 친화도: {{primaryPersona.psychographics.techSavvy}}/5
- 가치관: {{#each primaryPersona.psychographics.values}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

**행동 패턴:**
- 구매 패턴: {{primaryPersona.behaviors.purchasePattern}}
- 선호 채널: {{#each primaryPersona.behaviors.preferredChannels}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

**니즈와 페인 포인트:**
- 주요 니즈: {{#each primaryPersona.needsAndPains.primaryNeeds}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- 페인 포인트: {{#each primaryPersona.needsAndPains.painPoints}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}`,
          type: 'text',
          required: true,
          order: 2
        },
        {
          id: 'key_insights',
          title: '핵심 인사이트',
          template: '{{#each keyFindings}}• {{this}}\n{{/each}}',
          type: 'list',
          required: true,
          order: 3
        },
        {
          id: 'recommendations',
          title: '페르소나 기반 권장사항',
          template: '{{#each recommendations}}• {{this}}\n{{/each}}',
          type: 'list',
          required: true,
          order: 4
        },
        {
          id: 'next_steps',
          title: '페르소나 활용 방안',
          template: '{{#each nextSteps}}• {{this}}\n{{/each}}',
          type: 'list',
          required: true,
          order: 5
        }
      ]
    }

    // 제안서 보고서 템플릿
    const proposalTemplate: ReportTemplate = {
      id: 'proposal_standard',
      name: '표준 제안서',
      description: '프로젝트 제안서 문서',
      workflowStep: 'proposal',
      sections: [
        {
          id: 'executive_summary',
          title: '경영진 요약',
          template: '{{executiveSummary}}',
          type: 'text',
          required: true,
          order: 1
        },
        {
          id: 'problem_statement',
          title: '문제 정의',
          template: '{{problemStatement}}',
          type: 'text',
          required: true,
          order: 2
        },
        {
          id: 'proposed_solution',
          title: '제안 솔루션',
          template: `**솔루션 개요:**
{{proposedSolution.overview}}

**접근 방법:**
{{proposedSolution.approach}}

**핵심 기능:**
{{#each proposedSolution.keyFeatures}}• {{this}}
{{/each}}

**차별화 요소:**
{{#each proposedSolution.differentiators}}• {{this}}
{{/each}}`,
          type: 'text',
          required: true,
          order: 3
        },
        {
          id: 'implementation_plan',
          title: '구현 계획',
          template: `**구현 일정:**
{{implementation.timeline}}

**단계별 계획:**
{{#each implementation.phases}}• {{this}}
{{/each}}

**필요 자원:**
{{#each implementation.resources}}• {{this}}
{{/each}}

**주요 마일스톤:**
{{#each implementation.milestones}}• {{this}}
{{/each}}`,
          type: 'text',
          required: true,
          order: 4
        },
        {
          id: 'expected_outcomes',
          title: '기대 효과',
          template: `**비즈니스 가치:**
{{expectedOutcomes.businessValue}}

**핵심 성과 지표:**
{{#each expectedOutcomes.kpis}}• {{this}}
{{/each}}

**투자 대비 효과:**
{{expectedOutcomes.roi}}

**효과 실현 시기:**
{{expectedOutcomes.timeline}}`,
          type: 'text',
          required: true,
          order: 5
        },
        {
          id: 'risk_management',
          title: '위험 관리',
          template: `**식별된 위험:**
{{#each riskMitigation.identifiedRisks}}• {{this}}
{{/each}}

**완화 전략:**
{{#each riskMitigation.mitigationStrategies}}• {{this}}
{{/each}}

**비상 계획:**
{{#each riskMitigation.contingencyPlans}}• {{this}}
{{/each}}`,
          type: 'text',
          required: true,
          order: 6
        }
      ]
    }

    // 비용 산정 보고서 템플릿
    const budgetTemplate: ReportTemplate = {
      id: 'budget_standard',
      name: '표준 비용 산정서',
      description: '프로젝트 비용 산정 보고서',
      workflowStep: 'budget',
      sections: [
        {
          id: 'executive_summary',
          title: '비용 요약',
          template: '{{summary}}',
          type: 'text',
          required: true,
          order: 1
        },
        {
          id: 'total_cost_breakdown',
          title: '총 비용 분석',
          template: `**총 예상 비용: {{totalCost.amount:currency}} {{totalCost.currency}}**

**비용 구성:**
- 개발 비용: {{totalCost.breakdown.development:currency}} {{totalCost.currency}}
- 인프라 비용: {{totalCost.breakdown.infrastructure:currency}} {{totalCost.currency}}
- 라이선스 비용: {{totalCost.breakdown.licensing:currency}} {{totalCost.currency}}
- 유지보수 비용: {{totalCost.breakdown.maintenance:currency}} {{totalCost.currency}}
- 관리 비용: {{totalCost.breakdown.management:currency}} {{totalCost.currency}}
- 예비 비용: {{totalCost.breakdown.contingency:currency}} {{totalCost.currency}}`,
          type: 'text',
          required: true,
          order: 2
        },
        {
          id: 'resource_costs',
          title: '리소스별 비용',
          template: `**인력 비용:**
{{#each resourceCosts.humanResources}}• {{role}}: {{count}}명 × {{duration}} × {{ratePerDay:currency}}/일 = {{totalCost:currency}} {{totalCost.currency}}
{{/each}}

**기술 비용:**
{{#each resourceCosts.technology}}• {{item}}: {{cost:currency}} {{totalCost.currency}}{{#if recurring}} (반복){{/if}}
{{/each}}`,
          type: 'table',
          required: true,
          order: 3
        },
        {
          id: 'timeline_costs',
          title: '단계별 비용',
          template: `{{#each timeline.phases}}**{{phase}}** ({{duration}})
비용: {{cost:currency}} {{totalCost.currency}}
설명: {{description}}

{{/each}}`,
          type: 'text',
          required: true,
          order: 4
        },
        {
          id: 'cost_optimization',
          title: '비용 최적화 방안',
          template: `**비용 절약 기회:**
{{#each costOptimization.opportunities}}• {{this}}
{{/each}}

**대안 솔루션:**
{{#each costOptimization.alternatives}}• {{this}}
{{/each}}

**비용 위험 요소:**
{{#each costOptimization.riskFactors}}• {{this}}
{{/each}}`,
          type: 'text',
          required: true,
          order: 5
        },
        {
          id: 'recommendations',
          title: '비용 관련 권장사항',
          template: '{{#each recommendations}}• {{this}}\n{{/each}}',
          type: 'list',
          required: true,
          order: 6
        }
      ]
    }

    // 템플릿 등록
    this.templates.set('market_research', [marketResearchTemplate])
    this.templates.set('personas', [personasTemplate])
    this.templates.set('proposal', [proposalTemplate])
    this.templates.set('budget', [budgetTemplate])
  }

  /**
   * 보고서 생성
   */
  static async generateReport(
    projectId: string,
    workflowStep: WorkflowStep,
    templateId?: string,
    format: 'markdown' | 'html' | 'pdf' | 'json' = 'markdown'
  ): Promise<GeneratedReport> {
    try {
      // 분석 결과 조회
      const analysisData = await ProposalDataManager.getAnalysis(projectId, workflowStep, 'integrated_analysis')
      if (analysisData.length === 0) {
        throw new Error(`No analysis data found for project ${projectId}, step ${workflowStep}`)
      }

      const analysisResult: AnalysisResult = JSON.parse(analysisData[0].analysis_result)

      // 프로젝트 정보 조회
      const projectInfo = await ProposalDataManager.getProjectInfo(projectId)

      // 질문-답변 데이터 조회
      const responses = await ProposalDataManager.getResponses(projectId, workflowStep)

      // 템플릿 선택
      const template = this.getTemplate(workflowStep, templateId)
      if (!template) {
        throw new Error(`Template not found for step ${workflowStep}`)
      }

      // 보고서 생성
      const sections = await this.generateSections(template, analysisResult, projectInfo, responses)

      const report: GeneratedReport = {
        id: `report_${projectId}_${workflowStep}_${Date.now()}`,
        title: template.name,
        description: template.description,
        sections,
        metadata: {
          projectId,
          workflowStep,
          generatedAt: new Date().toISOString(),
          format,
          version: '1.0'
        },
        rawData: {
          analysisResult,
          projectInfo,
          responses
        }
      }

      return report

    } catch (error) {
      console.error('Report generation failed:', error)
      throw error
    }
  }

  /**
   * 종합 보고서 생성
   */
  static async generateComprehensiveReport(
    projectId: string,
    includedSteps: WorkflowStep[] = ['market_research', 'personas', 'proposal', 'budget'],
    format: 'markdown' | 'html' | 'pdf' | 'json' = 'markdown'
  ): Promise<GeneratedReport> {
    try {
      const allSections: ReportSection[] = []
      let order = 1

      // 프로젝트 정보
      const projectInfo = await ProposalDataManager.getProjectInfo(projectId)

      // 개요 섹션 추가
      allSections.push({
        id: 'project_overview',
        title: '프로젝트 개요',
        content: `**프로젝트명:** ${projectInfo.name}\n\n**설명:** ${projectInfo.description || '설명 없음'}\n\n**프로젝트 유형:** ${(projectInfo.project_types || []).join(', ')}\n\n**생성일:** ${new Date().toLocaleDateString('ko-KR')}`,
        type: 'text',
        order: order++
      })

      // 각 단계별 보고서 생성 및 통합
      for (const step of includedSteps) {
        try {
          const stepReport = await this.generateReport(projectId, step, undefined, format)

          // 단계별 제목 추가
          allSections.push({
            id: `${step}_title`,
            title: this.getStepTitle(step),
            content: `# ${this.getStepTitle(step)}`,
            type: 'text',
            order: order++
          })

          // 해당 단계의 모든 섹션 추가
          stepReport.sections.forEach(section => {
            allSections.push({
              ...section,
              id: `${step}_${section.id}`,
              order: order++
            })
          })

        } catch (error) {
          console.warn(`Failed to generate report for step ${step}:`, error)
          // 실패한 단계는 건너뛰고 계속 진행
          allSections.push({
            id: `${step}_error`,
            title: `${this.getStepTitle(step)} (오류)`,
            content: `이 단계의 보고서를 생성할 수 없습니다: ${error}`,
            type: 'text',
            order: order++
          })
        }
      }

      // 결론 섹션 추가
      allSections.push({
        id: 'conclusion',
        title: '결론',
        content: `이 보고서는 ${projectInfo.name} 프로젝트의 ${includedSteps.length}개 단계 분석 결과를 종합한 것입니다.\n\n각 단계의 상세한 분석을 통해 프로젝트의 전체적인 방향성과 실행 계획을 수립할 수 있습니다.`,
        type: 'text',
        order: order++
      })

      const comprehensiveReport: GeneratedReport = {
        id: `comprehensive_report_${projectId}_${Date.now()}`,
        title: `${projectInfo.name} - 종합 분석 보고서`,
        description: `${includedSteps.length}개 단계의 AI 분석 결과를 종합한 보고서`,
        sections: allSections,
        metadata: {
          projectId,
          workflowStep: 'proposal', // 종합 보고서는 제안 단계로 분류
          generatedAt: new Date().toISOString(),
          format,
          version: '1.0'
        },
        rawData: {
          analysisResult: {} as AnalysisResult, // 종합 보고서는 개별 분석 결과 없음
          projectInfo,
          responses: []
        }
      }

      return comprehensiveReport

    } catch (error) {
      console.error('Comprehensive report generation failed:', error)
      throw error
    }
  }

  /**
   * 템플릿 조회
   */
  private static getTemplate(workflowStep: WorkflowStep, templateId?: string): ReportTemplate | null {
    const stepTemplates = this.templates.get(workflowStep)
    if (!stepTemplates || stepTemplates.length === 0) {
      return null
    }

    if (templateId) {
      return stepTemplates.find(t => t.id === templateId) || stepTemplates[0]
    }

    return stepTemplates[0] // 기본 템플릿 반환
  }

  /**
   * 섹션 생성
   */
  private static async generateSections(
    template: ReportTemplate,
    analysisResult: AnalysisResult,
    projectInfo: any,
    responses: any[]
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = []

    for (const sectionTemplate of template.sections) {
      try {
        const content = this.applyTemplate(
          sectionTemplate.template,
          analysisResult,
          projectInfo,
          responses
        )

        sections.push({
          id: sectionTemplate.id,
          title: sectionTemplate.title,
          content,
          type: sectionTemplate.type,
          order: sectionTemplate.order,
          metadata: {
            templateId: template.id,
            required: sectionTemplate.required
          }
        })
      } catch (error) {
        console.warn(`Failed to generate section ${sectionTemplate.id}:`, error)
        // 오류가 발생한 섹션은 오류 메시지로 대체
        sections.push({
          id: sectionTemplate.id,
          title: sectionTemplate.title,
          content: `섹션 생성 오류: ${error}`,
          type: 'text',
          order: sectionTemplate.order
        })
      }
    }

    return sections.sort((a, b) => a.order - b.order)
  }

  /**
   * 템플릿 적용 (간단한 handlebars 스타일)
   */
  private static applyTemplate(
    template: string,
    analysisResult: AnalysisResult,
    projectInfo: any,
    responses: any[]
  ): string {
    let content = template

    // 분석 결과의 모든 필드를 사용 가능하게 만들기
    const data = {
      ...analysisResult,
      ...analysisResult.structuredData,
      projectInfo,
      responses
    }

    // 간단한 템플릿 변수 치환
    content = content.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      return this.getNestedValue(data, path.trim()) || match
    })

    // 간단한 each 구문 처리
    content = content.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, arrayPath, itemTemplate) => {
      const array = this.getNestedValue(data, arrayPath.trim())
      if (!Array.isArray(array)) return ''

      return array.map(item => {
        let itemContent = itemTemplate
        if (typeof item === 'string') {
          itemContent = itemContent.replace(/\{\{this\}\}/g, item)
        } else if (typeof item === 'object') {
          itemContent = itemContent.replace(/\{\{([^}]+)\}\}/g, (itemMatch: string, itemPath: string) => {
            return this.getNestedValue(item, itemPath.trim()) || itemMatch
          })
        }
        return itemContent
      }).join('')
    })

    return content
  }

  /**
   * 중첩된 객체에서 값 추출
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  /**
   * 단계별 제목 반환
   */
  private static getStepTitle(step: WorkflowStep): string {
    const titles = {
      document_analysis: '문서 종합 분석',
      market_research: '시장 조사 분석',
      personas: '페르소나 분석',
      proposal: '제안서',
      budget: '비용 산정'
    }
    return titles[step] || step
  }

  /**
   * 보고서를 다양한 형태로 내보내기
   */
  static async exportReport(
    report: GeneratedReport,
    format: 'markdown' | 'html' | 'json' = 'markdown'
  ): Promise<string> {
    switch (format) {
      case 'markdown':
        return this.exportToMarkdown(report)
      case 'html':
        return this.exportToHTML(report)
      case 'json':
        return JSON.stringify(report, null, 2)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * 마크다운 형태로 내보내기
   */
  private static exportToMarkdown(report: GeneratedReport): string {
    let markdown = `# ${report.title}\n\n`
    markdown += `${report.description}\n\n`
    markdown += `**생성일:** ${new Date(report.metadata.generatedAt).toLocaleString('ko-KR')}\n\n`
    markdown += `---\n\n`

    report.sections.forEach(section => {
      if (section.title && section.content) {
        markdown += `## ${section.title}\n\n`
        markdown += `${section.content}\n\n`
      }
    })

    return markdown
  }

  /**
   * HTML 형태로 내보내기
   */
  private static exportToHTML(report: GeneratedReport): string {
    let html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        .meta { color: #666; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        ul { padding-left: 20px; }
        li { margin-bottom: 5px; }
    </style>
</head>
<body>
    <h1>${report.title}</h1>
    <div class="meta">
        <p>${report.description}</p>
        <p><strong>생성일:</strong> ${new Date(report.metadata.generatedAt).toLocaleString('ko-KR')}</p>
    </div>
`

    report.sections.forEach(section => {
      if (section.title && section.content) {
        html += `    <div class="section">
        <h2>${section.title}</h2>
        <div>${this.markdownToHTML(section.content)}</div>
    </div>
`
      }
    })

    html += `</body>
</html>`

    return html
  }

  /**
   * 간단한 마크다운을 HTML로 변환
   */
  private static markdownToHTML(markdown: string): string {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/, '<p>$1</p>')
      .replace(/\n/g, '<br>')
  }

  /**
   * 사용 가능한 템플릿 목록 조회
   */
  static getAvailableTemplates(workflowStep?: WorkflowStep): ReportTemplate[] {
    if (workflowStep) {
      return this.templates.get(workflowStep) || []
    }

    const allTemplates: ReportTemplate[] = []
    this.templates.forEach(templates => {
      allTemplates.push(...templates)
    })
    return allTemplates
  }
}

// 기본 템플릿 초기화
ReportGenerator.initializeDefaultTemplates()