// 분석 보고서 생성 서비스
// AI 분석 결과를 종합하여 다양한 형태의 보고서를 생성

import { supabase } from '../../lib/supabase'
import { AIProviderFactory } from '../ai/providerFactory'
import { Tables } from '../../types/supabase'

export interface AnalysisReportData {
  id: string
  projectId: string
  title: string
  reportType: 'comprehensive' | 'summary' | 'detailed' | 'executive'
  status: 'generating' | 'completed' | 'failed'
  content: {
    executiveSummary: string
    keyFindings: string[]
    riskAssessment: {
      overall: number
      risks: Array<{
        category: string
        description: string
        severity: 'low' | 'medium' | 'high'
        mitigation: string
      }>
    }
    recommendations: string[]
    technicalAnalysis: {
      architecture: string
      technologies: string[]
      scalability: string
      performance: string
      security: string
    }
    businessAnalysis: {
      viability: string
      marketOpportunity: string
      competitiveAdvantage: string
      roi: string
    }
    implementationPlan: {
      phases: Array<{
        name: string
        duration: string
        deliverables: string[]
        resources: string[]
      }>
      timeline: string
      milestones: string[]
    }
    appendices: {
      dataAnalysis: any
      documentSummaries: string[]
      technicalSpecifications: any
    }
  }
  metadata: {
    generatedAt: Date
    generatedBy: string
    analysisCount: number
    documentCount: number
    totalTokens: number
    totalCost: number
    aiModel: string
    aiProvider: string
    processingTime: number
  }
  createdAt: string
  updatedAt: string
}

export interface ReportGenerationOptions {
  reportType: 'comprehensive' | 'summary' | 'detailed' | 'executive'
  includeCharts: boolean
  includeAppendices: boolean
  format: 'html' | 'markdown' | 'pdf' | 'json'
  language: 'ko' | 'en'
  customSections?: string[]
  aiModel?: string
  aiProvider?: string
}

export interface ReportTemplate {
  id: string
  name: string
  description: string
  reportType: string
  sections: Array<{
    id: string
    title: string
    description: string
    required: boolean
    order: number
    aiPrompt: string
  }>
}

export class AnalysisReportService {
  private static instance: AnalysisReportService

  static getInstance(): AnalysisReportService {
    if (!AnalysisReportService.instance) {
      AnalysisReportService.instance = new AnalysisReportService()
    }
    return AnalysisReportService.instance
  }

  /**
   * 포괄적인 분석 보고서 생성
   */
  async generateComprehensiveReport(
    projectId: string,
    options: ReportGenerationOptions = {
      reportType: 'comprehensive',
      includeCharts: true,
      includeAppendices: true,
      format: 'html',
      language: 'ko'
    }
  ): Promise<AnalysisReportData> {
    try {
      const startTime = Date.now()

      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 프로젝트 정보 조회
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (!project) {
        throw new Error('Project not found')
      }

      // 모든 AI 분석 결과 조회
      const { data: analyses } = await supabase
        .from('ai_analysis')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (!analyses || analyses.length === 0) {
        throw new Error('No completed analyses found for this project')
      }

      // 문서 정보 조회
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)

      // AI를 사용한 종합 분석 생성
      const reportContent = await this.generateReportContent(
        project,
        analyses,
        documents || [],
        options
      )

      // 보고서 데이터 생성
      const reportData: AnalysisReportData = {
        id: `report_${projectId}_${Date.now()}`,
        projectId,
        title: `${project.name} - 포괄적 분석 보고서`,
        reportType: options.reportType,
        status: 'completed',
        content: reportContent,
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'ai-system',
          analysisCount: analyses.length,
          documentCount: documents?.length || 0,
          totalTokens: this.calculateTotalTokens(analyses),
          totalCost: this.calculateTotalCost(analyses),
          aiModel: options.aiModel || 'gpt-4o',
          aiProvider: options.aiProvider || 'openai',
          processingTime: Date.now() - startTime
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // 보고서를 데이터베이스에 저장
      await this.saveReport(reportData)

      return reportData

    } catch (error) {
      console.error('Comprehensive report generation failed:', error)
      throw error
    }
  }

  /**
   * AI를 사용하여 보고서 내용 생성
   */
  private async generateReportContent(
    project: Tables<'projects'>,
    analyses: Tables<'ai_analysis'>[],
    documents: Tables<'documents'>[],
    options: ReportGenerationOptions
  ): Promise<AnalysisReportData['content']> {
    const model = options.aiModel || 'gpt-4o'

    // 분석 결과 요약
    const analysisData = analyses.map(analysis => ({
      type: analysis.analysis_type,
      result: analysis.response,
      structured: analysis.structured_data,
      createdAt: analysis.created_at
    }))

    // 문서 요약
    const documentSummaries = documents.map(doc => `${doc.file_name} (${doc.file_type})`)

    // 경영진 요약 생성
    const executiveSummary = await this.generateExecutiveSummary(
      project,
      analysisData,
      model
    )

    // 주요 발견사항 생성
    const keyFindings = await this.generateKeyFindings(
      analysisData,
      model
    )

    // 위험 평가 생성
    const riskAssessment = await this.generateRiskAssessment(
      project,
      analysisData,
      model
    )

    // 권장사항 생성
    const recommendations = await this.generateRecommendations(
      project,
      analysisData,
      model
    )

    // 기술 분석 생성
    const technicalAnalysis = await this.generateTechnicalAnalysis(
      project,
      analysisData,
      model
    )

    // 비즈니스 분석 생성
    const businessAnalysis = await this.generateBusinessAnalysis(
      project,
      analysisData,
      model
    )

    // 구현 계획 생성
    const implementationPlan = await this.generateImplementationPlan(
      project,
      analysisData,
      model
    )

    return {
      executiveSummary,
      keyFindings,
      riskAssessment,
      recommendations,
      technicalAnalysis,
      businessAnalysis,
      implementationPlan,
      appendices: {
        dataAnalysis: analysisData,
        documentSummaries,
        technicalSpecifications: {}
      }
    }
  }

  /**
   * 경영진 요약 생성
   */
  private async generateExecutiveSummary(
    project: Tables<'projects'>,
    analysisData: any[],
    model: string
  ): Promise<string> {
    const prompt = `
프로젝트 "${project.name}"에 대한 경영진 요약을 작성해주세요.

프로젝트 정보:
- 이름: ${project.name}
- 설명: ${project.description || '설명 없음'}
- 상태: ${project.status}
- 프로젝트 유형: ${(project.project_types || []).join(', ')}

AI 분석 결과:
${analysisData.map(data => `- ${data.type}: ${data.result}`).join('\n')}

다음 요소들을 포함한 간결하고 핵심적인 경영진 요약을 작성해주세요:
1. 프로젝트 개요 및 목적
2. 주요 기회와 도전 과제
3. 핵심 위험 요소
4. 예상 투자 대비 효과
5. 권장 의사결정

한국어로 3-4 문단 분량으로 작성해주세요.
`

    try {
      const response = await AIProviderFactory.generateCompletion(model, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      })

      return response.content
    } catch (error) {
      console.error('Executive summary generation failed:', error)
      return '경영진 요약을 생성할 수 없습니다.'
    }
  }

  /**
   * 주요 발견사항 생성
   */
  private async generateKeyFindings(
    analysisData: any[],
    model: string
  ): Promise<string[]> {
    const prompt = `
다음 AI 분석 결과들을 바탕으로 주요 발견사항들을 추출해주세요:

${analysisData.map(data => `분석 유형: ${data.type}\n결과: ${data.result}\n`).join('\n')}

JSON 배열 형태로 5-8개의 핵심 발견사항을 반환해주세요:
["발견사항 1", "발견사항 2", ...]

각 발견사항은:
- 구체적이고 실행 가능한 인사이트여야 함
- 비즈니스 가치나 기술적 중요성이 있어야 함
- 간결하고 명확하게 표현되어야 함
`

    try {
      const response = await AIProviderFactory.generateCompletion(model, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.5
      })

      const findings = JSON.parse(response.content)
      return Array.isArray(findings) ? findings : []
    } catch (error) {
      console.error('Key findings generation failed:', error)
      return ['주요 발견사항을 생성할 수 없습니다.']
    }
  }

  /**
   * 위험 평가 생성
   */
  private async generateRiskAssessment(
    project: Tables<'projects'>,
    analysisData: any[],
    model: string
  ): Promise<AnalysisReportData['content']['riskAssessment']> {
    const prompt = `
프로젝트 "${project.name}"에 대한 위험 평가를 수행해주세요.

프로젝트 정보:
${JSON.stringify(project, null, 2)}

분석 결과:
${analysisData.map(data => `${data.type}: ${data.result}`).join('\n')}

다음 JSON 형태로 위험 평가 결과를 반환해주세요:
{
  "overall": 1-100 사이의 전체 위험도 점수,
  "risks": [
    {
      "category": "기술적|비즈니스|운영|법적|재정 중 하나",
      "description": "위험 요소 설명",
      "severity": "low|medium|high 중 하나",
      "mitigation": "완화 방안"
    }
  ]
}

위험 카테고리별로 최소 1개, 최대 3개의 위험을 식별해주세요.
`

    try {
      const response = await AIProviderFactory.generateCompletion(model, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.6
      })

      const assessment = JSON.parse(response.content)
      return assessment
    } catch (error) {
      console.error('Risk assessment generation failed:', error)
      return {
        overall: 50,
        risks: [{
          category: '기술적',
          description: '위험 평가를 생성할 수 없습니다.',
          severity: 'medium' as const,
          mitigation: '수동 검토가 필요합니다.'
        }]
      }
    }
  }

  /**
   * 권장사항 생성
   */
  private async generateRecommendations(
    project: Tables<'projects'>,
    analysisData: any[],
    model: string
  ): Promise<string[]> {
    const prompt = `
프로젝트 "${project.name}"에 대한 구체적이고 실행 가능한 권장사항을 제시해주세요.

분석 결과:
${analysisData.map(data => `${data.type}: ${data.result}`).join('\n')}

JSON 배열 형태로 5-10개의 권장사항을 반환해주세요:
["권장사항 1", "권장사항 2", ...]

각 권장사항은:
- 구체적이고 실행 가능해야 함
- 우선순위가 높은 것부터 나열
- 비즈니스 가치와 기술적 타당성을 고려
- 명확한 행동 지침이 포함되어야 함
`

    try {
      const response = await AIProviderFactory.generateCompletion(model, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.6
      })

      const recommendations = JSON.parse(response.content)
      return Array.isArray(recommendations) ? recommendations : []
    } catch (error) {
      console.error('Recommendations generation failed:', error)
      return ['권장사항을 생성할 수 없습니다.']
    }
  }

  /**
   * 기술 분석 생성
   */
  private async generateTechnicalAnalysis(
    project: Tables<'projects'>,
    analysisData: any[],
    model: string
  ): Promise<AnalysisReportData['content']['technicalAnalysis']> {
    const prompt = `
프로젝트 "${project.name}"에 대한 기술 분석을 수행해주세요.

분석 결과:
${analysisData.map(data => `${data.type}: ${data.result}`).join('\n')}

다음 JSON 형태로 기술 분석 결과를 반환해주세요:
{
  "architecture": "아키텍처 분석 및 권장사항",
  "technologies": ["사용된", "기술", "목록"],
  "scalability": "확장성 분석",
  "performance": "성능 분석 및 최적화 방안",
  "security": "보안 고려사항 및 권장사항"
}
`

    try {
      const response = await AIProviderFactory.generateCompletion(model, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.6
      })

      const analysis = JSON.parse(response.content)
      return analysis
    } catch (error) {
      console.error('Technical analysis generation failed:', error)
      return {
        architecture: '기술 아키텍처 분석을 생성할 수 없습니다.',
        technologies: [],
        scalability: '확장성 분석을 생성할 수 없습니다.',
        performance: '성능 분석을 생성할 수 없습니다.',
        security: '보안 분석을 생성할 수 없습니다.'
      }
    }
  }

  /**
   * 비즈니스 분석 생성
   */
  private async generateBusinessAnalysis(
    project: Tables<'projects'>,
    analysisData: any[],
    model: string
  ): Promise<AnalysisReportData['content']['businessAnalysis']> {
    const prompt = `
프로젝트 "${project.name}"에 대한 비즈니스 분석을 수행해주세요.

프로젝트 정보:
${JSON.stringify(project, null, 2)}

분석 결과:
${analysisData.map(data => `${data.type}: ${data.result}`).join('\n')}

다음 JSON 형태로 비즈니스 분석 결과를 반환해주세요:
{
  "viability": "사업 타당성 분석",
  "marketOpportunity": "시장 기회 분석",
  "competitiveAdvantage": "경쟁 우위 요소",
  "roi": "투자 대비 효과 예측"
}
`

    try {
      const response = await AIProviderFactory.generateCompletion(model, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.6
      })

      const analysis = JSON.parse(response.content)
      return analysis
    } catch (error) {
      console.error('Business analysis generation failed:', error)
      return {
        viability: '사업 타당성 분석을 생성할 수 없습니다.',
        marketOpportunity: '시장 기회 분석을 생성할 수 없습니다.',
        competitiveAdvantage: '경쟁 우위 분석을 생성할 수 없습니다.',
        roi: 'ROI 분석을 생성할 수 없습니다.'
      }
    }
  }

  /**
   * 구현 계획 생성
   */
  private async generateImplementationPlan(
    project: Tables<'projects'>,
    analysisData: any[],
    model: string
  ): Promise<AnalysisReportData['content']['implementationPlan']> {
    const prompt = `
프로젝트 "${project.name}"에 대한 구현 계획을 수립해주세요.

분석 결과:
${analysisData.map(data => `${data.type}: ${data.result}`).join('\n')}

다음 JSON 형태로 구현 계획을 반환해주세요:
{
  "phases": [
    {
      "name": "단계명",
      "duration": "기간",
      "deliverables": ["산출물1", "산출물2"],
      "resources": ["필요 리소스1", "필요 리소스2"]
    }
  ],
  "timeline": "전체 프로젝트 일정 설명",
  "milestones": ["주요 마일스톤1", "주요 마일스톤2"]
}

3-5개의 논리적인 구현 단계로 나누어 계획을 세워주세요.
`

    try {
      const response = await AIProviderFactory.generateCompletion(model, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.6
      })

      const plan = JSON.parse(response.content)
      return plan
    } catch (error) {
      console.error('Implementation plan generation failed:', error)
      return {
        phases: [{
          name: '계획 수립',
          duration: '미정',
          deliverables: ['구현 계획을 생성할 수 없습니다.'],
          resources: ['수동 계획 수립 필요']
        }],
        timeline: '구현 일정을 생성할 수 없습니다.',
        milestones: ['수동 계획 검토 필요']
      }
    }
  }

  /**
   * 보고서를 데이터베이스에 저장
   */
  private async saveReport(reportData: AnalysisReportData): Promise<void> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { error } = await supabase
        .from('analysis_reports')
        .insert({
          id: reportData.id,
          project_id: reportData.projectId,
          session_id: null,
          summary: reportData.content.executiveSummary,
          executive_summary: reportData.content.executiveSummary,
          key_insights: reportData.content.keyFindings,
          risk_assessment: reportData.content.riskAssessment,
          recommendations: reportData.content.recommendations,
          baseline_data: reportData.content.appendices,
          visualization_data: {},
          ai_model: reportData.metadata.aiModel,
          ai_provider: reportData.metadata.aiProvider,
          input_tokens: reportData.metadata.totalTokens,
          output_tokens: 0,
          total_cost: reportData.metadata.totalCost,
          total_processing_time: 0,
          generated_by: reportData.metadata.generatedBy
        })

      if (error) {
        console.error('Failed to save report:', error)
        throw error
      }
    } catch (error) {
      console.error('Report save failed:', error)
      // 저장 실패해도 보고서는 반환
    }
  }

  /**
   * 총 토큰 수 계산
   */
  private calculateTotalTokens(analyses: Tables<'ai_analysis'>[]): number {
    return analyses.reduce((total, analysis) => {
      return total + (analysis.input_tokens || 0) + (analysis.output_tokens || 0)
    }, 0)
  }

  /**
   * 총 비용 계산
   */
  private calculateTotalCost(analyses: Tables<'ai_analysis'>[]): number {
    return analyses.reduce((total, analysis) => {
      return total + (analysis.total_cost || 0)
    }, 0)
  }

  /**
   * 보고서 목록 조회
   */
  async getReports(projectId: string): Promise<AnalysisReportData[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data?.map(report => this.transformDatabaseReport(report)) || []
    } catch (error) {
      console.error('Failed to get reports:', error)
      return []
    }
  }

  /**
   * 데이터베이스 보고서를 서비스 형태로 변환
   */
  private transformDatabaseReport(dbReport: any): AnalysisReportData {
    return {
      id: dbReport.id,
      projectId: dbReport.project_id,
      title: `분석 보고서 - ${new Date(dbReport.created_at).toLocaleDateString()}`,
      reportType: 'comprehensive',
      status: 'completed',
      content: {
        executiveSummary: dbReport.executive_summary || dbReport.summary || '',
        keyFindings: dbReport.key_insights || [],
        riskAssessment: dbReport.risk_assessment || { overall: 0, risks: [] },
        recommendations: dbReport.recommendations || [],
        technicalAnalysis: {
          architecture: '',
          technologies: [],
          scalability: '',
          performance: '',
          security: ''
        },
        businessAnalysis: {
          viability: '',
          marketOpportunity: '',
          competitiveAdvantage: '',
          roi: ''
        },
        implementationPlan: {
          phases: [],
          timeline: '',
          milestones: []
        },
        appendices: dbReport.baseline_data || {}
      },
      metadata: {
        generatedAt: new Date(dbReport.created_at),
        generatedBy: dbReport.generated_by || 'ai-system',
        analysisCount: 0,
        documentCount: 0,
        totalTokens: dbReport.input_tokens + dbReport.output_tokens,
        totalCost: dbReport.total_cost,
        aiModel: dbReport.ai_model,
        aiProvider: dbReport.ai_provider,
        processingTime: 0
      },
      createdAt: dbReport.created_at,
      updatedAt: dbReport.updated_at || dbReport.created_at
    }
  }

  /**
   * 보고서 내보내기
   */
  async exportReport(
    reportData: AnalysisReportData,
    format: 'html' | 'markdown' | 'json' = 'html'
  ): Promise<string> {
    switch (format) {
      case 'html':
        return this.exportToHTML(reportData)
      case 'markdown':
        return this.exportToMarkdown(reportData)
      case 'json':
        return JSON.stringify(reportData, null, 2)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * HTML 형태로 내보내기
   */
  private exportToHTML(report: AnalysisReportData): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 40px; }
        .risk { padding: 15px; margin: 10px 0; border-radius: 5px; }
        .risk.high { background-color: #ffebee; border-left: 5px solid #f44336; }
        .risk.medium { background-color: #fff3e0; border-left: 5px solid #ff9800; }
        .risk.low { background-color: #e8f5e8; border-left: 5px solid #4caf50; }
        .phase { background-color: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
        .meta { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <div class="meta">
            생성일: ${report.metadata.generatedAt.toLocaleDateString('ko-KR')} |
            AI 모델: ${report.metadata.aiModel} |
            분석 수: ${report.metadata.analysisCount}개
        </div>
    </div>

    <div class="section">
        <h2>경영진 요약</h2>
        <p>${report.content.executiveSummary}</p>
    </div>

    <div class="section">
        <h2>주요 발견사항</h2>
        <ul>
            ${report.content.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>위험 평가</h2>
        <p><strong>전체 위험도:</strong> ${report.content.riskAssessment.overall}/100</p>
        ${report.content.riskAssessment.risks.map(risk => `
            <div class="risk ${risk.severity}">
                <h4>${risk.category} - ${risk.severity.toUpperCase()}</h4>
                <p>${risk.description}</p>
                <p><strong>완화 방안:</strong> ${risk.mitigation}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>권장사항</h2>
        <ul>
            ${report.content.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>기술 분석</h2>
        <h3>아키텍처</h3>
        <p>${report.content.technicalAnalysis.architecture}</p>

        <h3>기술 스택</h3>
        <ul>
            ${report.content.technicalAnalysis.technologies.map(tech => `<li>${tech}</li>`).join('')}
        </ul>

        <h3>확장성</h3>
        <p>${report.content.technicalAnalysis.scalability}</p>

        <h3>성능</h3>
        <p>${report.content.technicalAnalysis.performance}</p>

        <h3>보안</h3>
        <p>${report.content.technicalAnalysis.security}</p>
    </div>

    <div class="section">
        <h2>비즈니스 분석</h2>
        <h3>사업 타당성</h3>
        <p>${report.content.businessAnalysis.viability}</p>

        <h3>시장 기회</h3>
        <p>${report.content.businessAnalysis.marketOpportunity}</p>

        <h3>경쟁 우위</h3>
        <p>${report.content.businessAnalysis.competitiveAdvantage}</p>

        <h3>투자 대비 효과</h3>
        <p>${report.content.businessAnalysis.roi}</p>
    </div>

    <div class="section">
        <h2>구현 계획</h2>
        <h3>전체 일정</h3>
        <p>${report.content.implementationPlan.timeline}</p>

        <h3>구현 단계</h3>
        ${report.content.implementationPlan.phases.map(phase => `
            <div class="phase">
                <h4>${phase.name} (${phase.duration})</h4>
                <p><strong>산출물:</strong> ${phase.deliverables.join(', ')}</p>
                <p><strong>필요 리소스:</strong> ${phase.resources.join(', ')}</p>
            </div>
        `).join('')}

        <h3>주요 마일스톤</h3>
        <ul>
            ${report.content.implementationPlan.milestones.map(milestone => `<li>${milestone}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`
  }

  /**
   * 마크다운 형태로 내보내기
   */
  private exportToMarkdown(report: AnalysisReportData): string {
    return `# ${report.title}

**생성일:** ${report.metadata.generatedAt.toLocaleDateString('ko-KR')}
**AI 모델:** ${report.metadata.aiModel}
**분석 수:** ${report.metadata.analysisCount}개

---

## 경영진 요약

${report.content.executiveSummary}

## 주요 발견사항

${report.content.keyFindings.map(finding => `- ${finding}`).join('\n')}

## 위험 평가

**전체 위험도:** ${report.content.riskAssessment.overall}/100

${report.content.riskAssessment.risks.map(risk => `
### ${risk.category} - ${risk.severity.toUpperCase()}

${risk.description}

**완화 방안:** ${risk.mitigation}
`).join('\n')}

## 권장사항

${report.content.recommendations.map(rec => `- ${rec}`).join('\n')}

## 기술 분석

### 아키텍처
${report.content.technicalAnalysis.architecture}

### 기술 스택
${report.content.technicalAnalysis.technologies.map(tech => `- ${tech}`).join('\n')}

### 확장성
${report.content.technicalAnalysis.scalability}

### 성능
${report.content.technicalAnalysis.performance}

### 보안
${report.content.technicalAnalysis.security}

## 비즈니스 분석

### 사업 타당성
${report.content.businessAnalysis.viability}

### 시장 기회
${report.content.businessAnalysis.marketOpportunity}

### 경쟁 우위
${report.content.businessAnalysis.competitiveAdvantage}

### 투자 대비 효과
${report.content.businessAnalysis.roi}

## 구현 계획

### 전체 일정
${report.content.implementationPlan.timeline}

### 구현 단계
${report.content.implementationPlan.phases.map(phase => `
#### ${phase.name} (${phase.duration})

**산출물:** ${phase.deliverables.join(', ')}
**필요 리소스:** ${phase.resources.join(', ')}
`).join('\n')}

### 주요 마일스톤
${report.content.implementationPlan.milestones.map(milestone => `- ${milestone}`).join('\n')}
`
  }

  /**
   * 프로젝트의 보고서 목록 조회
   */
  async getProjectReports(projectId: string): Promise<AnalysisReportData[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch project reports:', error)
        throw error
      }

      // 데이터베이스 형식을 AnalysisReportData 형식으로 변환
      return (data || [])
        .filter(report => report.project_id && report.created_at) // null 값 제외
        .map(report => ({
        id: report.id,
        projectId: report.project_id!,
        title: `분석 보고서 - ${new Date(report.created_at!).toLocaleDateString()}`,
        reportType: 'comprehensive' as const,
        status: 'completed' as const,
        content: {
          executiveSummary: report.executive_summary || '',
          keyFindings: Array.isArray(report.key_insights) ?
            report.key_insights.filter((item): item is string => typeof item === 'string') :
            typeof report.key_insights === 'string' ? [report.key_insights] : [],
          riskAssessment: typeof report.risk_assessment === 'object' && report.risk_assessment !== null ?
            report.risk_assessment as { overall: number; risks: Array<{ category: string; description: string; severity: 'low' | 'medium' | 'high'; mitigation: string }> } :
            { overall: 0, risks: [] },
          recommendations: Array.isArray(report.recommendations) ?
            report.recommendations.filter((item): item is string => typeof item === 'string') :
            typeof report.recommendations === 'string' ? [report.recommendations] : [],
          technicalAnalysis: {
            architecture: '',
            technologies: [],
            scalability: '',
            performance: '',
            security: ''
          },
          businessAnalysis: {
            viability: '',
            marketOpportunity: '',
            competitiveAdvantage: '',
            roi: ''
          },
          implementationPlan: {
            phases: [],
            timeline: '',
            milestones: []
          },
          appendices: {
            dataAnalysis: report.baseline_data || {},
            documentSummaries: [],
            technicalSpecifications: {}
          }
        },
        metadata: {
          generatedAt: new Date(report.created_at!),
          generatedBy: report.generated_by || 'ai-system',
          analysisCount: 0,
          documentCount: 0,
          aiModel: report.ai_model || '',
          aiProvider: report.ai_provider || '',
          totalTokens: report.input_tokens || 0,
          totalCost: report.total_cost || 0,
          processingTime: report.total_processing_time || 0
        },
        createdAt: report.created_at!,
        updatedAt: report.created_at!
      }))
    } catch (error) {
      console.error('Failed to get project reports:', error)
      return []
    }
  }
}

export const analysisReportService = AnalysisReportService.getInstance()