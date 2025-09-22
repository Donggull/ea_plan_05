// 워크플로우 통합 서비스
// 제안-구축-운영 단계별 데이터 통합 및 전달

import { supabase } from '../../lib/supabase'
import { ProjectPhase } from '../lifecycle/ProjectLifecycleService'

export interface BaselineData {
  projectId: string
  source: 'proposal' | 'analysis' | 'construction' | 'operation'
  version: string
  data: {
    // 제안 단계 데이터
    proposal?: {
      marketResearch: any
      targetAudience: any
      competitiveAnalysis: any
      businessModel: any
      budget: any
      timeline: any
      riskAssessment: any
    }
    // 분석 데이터
    analysis?: {
      technicalRequirements: any
      architectureRecommendations: any
      resourceEstimates: any
      implementationPlan: any
      qualityMetrics: any
    }
    // 구축 데이터
    construction?: {
      systemArchitecture: any
      technicalSpecs: any
      implementation: any
      testing: any
      deployment: any
      documentation: any
    }
    // 운영 데이터
    operation?: {
      systemMetrics: any
      userFeedback: any
      performanceData: any
      maintenanceLog: any
      incidentReports: any
    }
  }
  metadata: {
    createdAt: string
    createdBy: string
    updatedAt: string
    tags: string[]
    confidenceScore: number
  }
}

export interface WorkflowHandoff {
  id: string
  fromPhase: ProjectPhase
  toPhase: ProjectPhase
  projectId: string
  transferData: {
    deliverables: HandoffDeliverable[]
    knowledge: KnowledgeTransfer[]
    recommendations: string[]
    constraints: string[]
    assumptions: string[]
  }
  approvals: HandoffApproval[]
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  createdAt: string
  completedAt: string | null
}

export interface HandoffDeliverable {
  id: string
  name: string
  type: 'document' | 'data' | 'system' | 'process'
  location: string
  checksum: string
  verified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
}

export interface KnowledgeTransfer {
  id: string
  category: 'technical' | 'business' | 'process' | 'risk'
  title: string
  description: string
  importance: 'low' | 'medium' | 'high' | 'critical'
  actionRequired: boolean
  assignedTo: string | null
}

export interface HandoffApproval {
  id: string
  role: 'project_manager' | 'technical_lead' | 'business_owner' | 'client'
  approver: string
  status: 'pending' | 'approved' | 'rejected'
  comments: string | null
  decidedAt: string | null
}

export interface IntegrationMapping {
  sourcePhase: ProjectPhase
  targetPhase: ProjectPhase
  dataMapping: {
    sourceField: string
    targetField: string
    transformation?: string
    validation?: string
  }[]
  validationRules: ValidationRule[]
}

export interface ValidationRule {
  field: string
  type: 'required' | 'format' | 'range' | 'custom'
  rule: string
  message: string
}

export class WorkflowIntegrationService {
  private static instance: WorkflowIntegrationService

  constructor() {
    // Removed unused lifecycleService
  }

  static getInstance(): WorkflowIntegrationService {
    if (!WorkflowIntegrationService.instance) {
      WorkflowIntegrationService.instance = new WorkflowIntegrationService()
    }
    return WorkflowIntegrationService.instance
  }

  /**
   * 제안 단계 데이터를 베이스라인으로 설정
   */
  async setProposalBaseline(
    projectId: string,
    proposalData: any,
    _userId: string
  ): Promise<BaselineData> {
    try {
      const baseline: BaselineData = {
        projectId,
        source: 'proposal',
        version: '1.0.0',
        data: {
          proposal: {
            marketResearch: proposalData.marketResearch,
            targetAudience: proposalData.targetAudience,
            competitiveAnalysis: proposalData.competitiveAnalysis,
            businessModel: proposalData.businessModel,
            budget: proposalData.budget,
            timeline: proposalData.timeline,
            riskAssessment: proposalData.riskAssessment
          }
        },
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: _userId,
          updatedAt: new Date().toISOString(),
          tags: ['proposal', 'baseline'],
          confidenceScore: this.calculateConfidenceScore(proposalData)
        }
      }

      await this.saveBaselineData(baseline)
      return baseline
    } catch (error) {
      console.error('Failed to set proposal baseline:', error)
      throw error
    }
  }

  /**
   * 분석 데이터를 베이스라인에 통합
   */
  async integrateAnalysisData(
    projectId: string,
    analysisData: any,
    _userId: string
  ): Promise<BaselineData> {
    try {
      const existingBaseline = await this.getBaselineData(projectId)
      if (!existingBaseline) {
        throw new Error('No baseline data found')
      }

      const updatedBaseline: BaselineData = {
        ...existingBaseline,
        data: {
          ...existingBaseline.data,
          analysis: {
            technicalRequirements: analysisData.technicalRequirements,
            architectureRecommendations: analysisData.architectureRecommendations,
            resourceEstimates: analysisData.resourceEstimates,
            implementationPlan: analysisData.implementationPlan,
            qualityMetrics: analysisData.qualityMetrics
          }
        },
        metadata: {
          ...existingBaseline.metadata,
          updatedAt: new Date().toISOString(),
          tags: [...existingBaseline.metadata.tags, 'analysis'],
          confidenceScore: this.calculateCombinedConfidence(
            existingBaseline.metadata.confidenceScore,
            this.calculateConfidenceScore(analysisData)
          )
        }
      }

      await this.saveBaselineData(updatedBaseline)
      return updatedBaseline
    } catch (error) {
      console.error('Failed to integrate analysis data:', error)
      throw error
    }
  }

  /**
   * 구축 단계로 데이터 핸드오프
   */
  async handoffToConstruction(
    projectId: string,
    _userId: string
  ): Promise<WorkflowHandoff> {
    try {
      const baseline = await this.getBaselineData(projectId)
      if (!baseline) {
        throw new Error('No baseline data found')
      }

      const handoff: WorkflowHandoff = {
        id: `handoff_${projectId}_${Date.now()}`,
        fromPhase: 'proposal',
        toPhase: 'construction',
        projectId,
        transferData: {
          deliverables: await this.prepareConstructionDeliverables(baseline),
          knowledge: this.extractConstructionKnowledge(baseline),
          recommendations: this.generateConstructionRecommendations(baseline),
          constraints: this.identifyConstructionConstraints(baseline),
          assumptions: this.listConstructionAssumptions(baseline)
        },
        approvals: [
          {
            id: `approval_pm_${Date.now()}`,
            role: 'project_manager',
            approver: _userId,
            status: 'pending',
            comments: null,
            decidedAt: null
          },
          {
            id: `approval_tech_${Date.now()}`,
            role: 'technical_lead',
            approver: '', // To be assigned
            status: 'pending',
            comments: null,
            decidedAt: null
          }
        ],
        status: 'pending',
        createdAt: new Date().toISOString(),
        completedAt: null
      }

      await this.saveHandoffData(handoff)
      return handoff
    } catch (error) {
      console.error('Failed to handoff to construction:', error)
      throw error
    }
  }

  /**
   * 운영 단계로 데이터 핸드오프
   */
  async handoffToOperation(
    projectId: string,
    constructionData: any,
    _userId: string
  ): Promise<WorkflowHandoff> {
    try {
      const baseline = await this.getBaselineData(projectId)
      if (!baseline) {
        throw new Error('No baseline data found')
      }

      // 구축 데이터를 베이스라인에 통합
      const updatedBaseline = await this.integrateConstructionData(
        projectId,
        constructionData,
        _userId
      )

      const handoff: WorkflowHandoff = {
        id: `handoff_${projectId}_${Date.now()}`,
        fromPhase: 'construction',
        toPhase: 'operation',
        projectId,
        transferData: {
          deliverables: await this.prepareOperationDeliverables(updatedBaseline),
          knowledge: this.extractOperationKnowledge(updatedBaseline),
          recommendations: this.generateOperationRecommendations(updatedBaseline),
          constraints: this.identifyOperationConstraints(updatedBaseline),
          assumptions: this.listOperationAssumptions(updatedBaseline)
        },
        approvals: [
          {
            id: `approval_pm_${Date.now()}`,
            role: 'project_manager',
            approver: _userId,
            status: 'pending',
            comments: null,
            decidedAt: null
          },
          {
            id: `approval_ops_${Date.now()}`,
            role: 'business_owner',
            approver: '', // To be assigned
            status: 'pending',
            comments: null,
            decidedAt: null
          }
        ],
        status: 'pending',
        createdAt: new Date().toISOString(),
        completedAt: null
      }

      await this.saveHandoffData(handoff)
      return handoff
    } catch (error) {
      console.error('Failed to handoff to operation:', error)
      throw error
    }
  }

  /**
   * 구축 데이터를 베이스라인에 통합
   */
  async integrateConstructionData(
    projectId: string,
    constructionData: any,
    _userId: string
  ): Promise<BaselineData> {
    try {
      const existingBaseline = await this.getBaselineData(projectId)
      if (!existingBaseline) {
        throw new Error('No baseline data found')
      }

      const updatedBaseline: BaselineData = {
        ...existingBaseline,
        data: {
          ...existingBaseline.data,
          construction: {
            systemArchitecture: constructionData.systemArchitecture,
            technicalSpecs: constructionData.technicalSpecs,
            implementation: constructionData.implementation,
            testing: constructionData.testing,
            deployment: constructionData.deployment,
            documentation: constructionData.documentation
          }
        },
        metadata: {
          ...existingBaseline.metadata,
          updatedAt: new Date().toISOString(),
          tags: [...existingBaseline.metadata.tags, 'construction'],
          confidenceScore: this.calculateCombinedConfidence(
            existingBaseline.metadata.confidenceScore,
            this.calculateConfidenceScore(constructionData)
          )
        }
      }

      await this.saveBaselineData(updatedBaseline)
      return updatedBaseline
    } catch (error) {
      console.error('Failed to integrate construction data:', error)
      throw error
    }
  }

  /**
   * 단계별 데이터 조회
   */
  async getPhaseData(projectId: string, phase: ProjectPhase): Promise<any> {
    try {
      const baseline = await this.getBaselineData(projectId)
      if (!baseline) {
        return null
      }

      switch (phase) {
        case 'proposal':
          return baseline.data.proposal
        case 'construction':
          return baseline.data.construction
        case 'operation':
          return baseline.data.operation
        default:
          return null
      }
    } catch (error) {
      console.error('Failed to get phase data:', error)
      return null
    }
  }

  /**
   * 데이터 검증
   */
  async validatePhaseData(
    _projectId: string,
    phase: ProjectPhase,
    data: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const mapping = this.getIntegrationMapping(phase)
      const errors: string[] = []

      for (const rule of mapping.validationRules) {
        const isValid = this.validateField(data, rule)
        if (!isValid) {
          errors.push(rule.message)
        }
      }

      return {
        valid: errors.length === 0,
        errors
      }
    } catch (error) {
      console.error('Failed to validate phase data:', error)
      return {
        valid: false,
        errors: ['Validation failed']
      }
    }
  }

  /**
   * 신뢰도 점수 계산
   */
  private calculateConfidenceScore(data: any): number {
    // 데이터 완성도 기반 신뢰도 계산
    const fields = Object.keys(data || {})
    const completedFields = fields.filter(field => {
      const value = data[field]
      return value !== null && value !== undefined && value !== ''
    })

    return fields.length > 0 ? (completedFields.length / fields.length) * 100 : 0
  }

  /**
   * 결합 신뢰도 계산
   */
  private calculateCombinedConfidence(score1: number, score2: number): number {
    // 가중 평균으로 결합 신뢰도 계산
    return (score1 + score2) / 2
  }

  /**
   * 구축 단계용 산출물 준비
   */
  private async prepareConstructionDeliverables(baseline: BaselineData): Promise<HandoffDeliverable[]> {
    const deliverables: HandoffDeliverable[] = []

    // 제안서 데이터
    if (baseline.data.proposal) {
      deliverables.push({
        id: `deliverable_proposal_${Date.now()}`,
        name: '제안서 데이터',
        type: 'data',
        location: `baseline/${baseline.projectId}/proposal.json`,
        checksum: this.generateChecksum(baseline.data.proposal),
        verified: false,
        verifiedBy: null,
        verifiedAt: null
      })
    }

    // 분석 데이터
    if (baseline.data.analysis) {
      deliverables.push({
        id: `deliverable_analysis_${Date.now()}`,
        name: '분석 결과 데이터',
        type: 'data',
        location: `baseline/${baseline.projectId}/analysis.json`,
        checksum: this.generateChecksum(baseline.data.analysis),
        verified: false,
        verifiedBy: null,
        verifiedAt: null
      })
    }

    return deliverables
  }

  /**
   * 운영 단계용 산출물 준비
   */
  private async prepareOperationDeliverables(baseline: BaselineData): Promise<HandoffDeliverable[]> {
    const deliverables: HandoffDeliverable[] = []

    // 구축 결과물
    if (baseline.data.construction) {
      deliverables.push({
        id: `deliverable_construction_${Date.now()}`,
        name: '구축 결과물',
        type: 'system',
        location: `baseline/${baseline.projectId}/construction.json`,
        checksum: this.generateChecksum(baseline.data.construction),
        verified: false,
        verifiedBy: null,
        verifiedAt: null
      })
    }

    return deliverables
  }

  /**
   * 구축 단계 지식 추출
   */
  private extractConstructionKnowledge(baseline: BaselineData): KnowledgeTransfer[] {
    const knowledge: KnowledgeTransfer[] = []

    // 제안서에서 기술적 요구사항 추출 (현재는 구현되지 않음)
    // TODO: 제안서 데이터 구조에서 기술적 요구사항 추출 로직 구현
    if (baseline.data.analysis?.technicalRequirements) {
      knowledge.push({
        id: `knowledge_tech_req_${Date.now()}`,
        category: 'technical',
        title: '기술적 요구사항',
        description: '제안 단계에서 정의된 기술적 요구사항을 구축 시 준수해야 합니다.',
        importance: 'critical',
        actionRequired: true,
        assignedTo: null
      })
    }

    // 예산 제약사항
    if (baseline.data.proposal?.budget) {
      knowledge.push({
        id: `knowledge_budget_${Date.now()}`,
        category: 'business',
        title: '예산 제약사항',
        description: '승인된 예산 범위 내에서 구축을 진행해야 합니다.',
        importance: 'high',
        actionRequired: true,
        assignedTo: null
      })
    }

    return knowledge
  }

  /**
   * 운영 단계 지식 추출
   */
  private extractOperationKnowledge(baseline: BaselineData): KnowledgeTransfer[] {
    const knowledge: KnowledgeTransfer[] = []

    // 시스템 아키텍처 정보
    if (baseline.data.construction?.systemArchitecture) {
      knowledge.push({
        id: `knowledge_arch_${Date.now()}`,
        category: 'technical',
        title: '시스템 아키텍처',
        description: '구축된 시스템의 아키텍처 이해가 운영에 필수적입니다.',
        importance: 'critical',
        actionRequired: true,
        assignedTo: null
      })
    }

    return knowledge
  }

  /**
   * 구축 단계 권장사항 생성
   */
  private generateConstructionRecommendations(baseline: BaselineData): string[] {
    const recommendations: string[] = []

    if (baseline.data.proposal?.riskAssessment) {
      recommendations.push('제안 단계에서 식별된 위험 요소를 구축 시 고려하세요.')
    }

    if (baseline.data.analysis?.qualityMetrics) {
      recommendations.push('분석 단계에서 정의된 품질 메트릭을 준수하세요.')
    }

    return recommendations
  }

  /**
   * 운영 단계 권장사항 생성
   */
  private generateOperationRecommendations(baseline: BaselineData): string[] {
    const recommendations: string[] = []

    if (baseline.data.construction?.testing) {
      recommendations.push('구축 단계의 테스트 결과를 운영 모니터링에 활용하세요.')
    }

    return recommendations
  }

  /**
   * 구축 제약사항 식별
   */
  private identifyConstructionConstraints(baseline: BaselineData): string[] {
    const constraints: string[] = []

    if (baseline.data.proposal?.timeline) {
      constraints.push('제안서에서 약속한 일정을 준수해야 합니다.')
    }

    if (baseline.data.proposal?.budget) {
      constraints.push('승인된 예산을 초과할 수 없습니다.')
    }

    return constraints
  }

  /**
   * 운영 제약사항 식별
   */
  private identifyOperationConstraints(baseline: BaselineData): string[] {
    const constraints: string[] = []

    if (baseline.data.construction?.deployment) {
      constraints.push('배포된 시스템 환경을 유지해야 합니다.')
    }

    return constraints
  }

  /**
   * 구축 가정사항 나열
   */
  private listConstructionAssumptions(_baseline: BaselineData): string[] {
    const assumptions: string[] = []

    assumptions.push('제안서의 기술적 가정사항이 유효합니다.')
    assumptions.push('필요한 리소스를 확보할 수 있습니다.')

    return assumptions
  }

  /**
   * 운영 가정사항 나열
   */
  private listOperationAssumptions(_baseline: BaselineData): string[] {
    const assumptions: string[] = []

    assumptions.push('구축된 시스템이 안정적으로 동작합니다.')
    assumptions.push('운영 담당자가 충분한 교육을 받았습니다.')

    return assumptions
  }

  /**
   * 통합 매핑 정보 조회
   */
  private getIntegrationMapping(phase: ProjectPhase): IntegrationMapping {
    // 실제 구현에서는 설정에서 로드
    return {
      sourcePhase: 'proposal',
      targetPhase: phase,
      dataMapping: [],
      validationRules: []
    }
  }

  /**
   * 필드 검증
   */
  private validateField(data: any, rule: ValidationRule): boolean {
    const value = data[rule.field]

    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== ''
      case 'format':
        return new RegExp(rule.rule).test(String(value))
      case 'range':
        const [min, max] = rule.rule.split(',').map(Number)
        return Number(value) >= min && Number(value) <= max
      default:
        return true
    }
  }

  /**
   * 체크섬 생성
   */
  private generateChecksum(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16)
  }

  /**
   * 베이스라인 데이터 저장
   */
  private async saveBaselineData(baseline: BaselineData): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { error } = await (supabase as any)
      .from('project_baseline')
      .upsert({
        project_id: baseline.projectId,
        source: baseline.source,
        version: baseline.version,
        data: baseline.data,
        metadata: baseline.metadata,
        updated_at: baseline.metadata.updatedAt
      })

    if (error) {
      console.error('Failed to save baseline data:', error)
      throw error
    }
  }

  /**
   * 베이스라인 데이터 조회
   */
  private async getBaselineData(projectId: string): Promise<BaselineData | null> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await (supabase as any)
        .from('project_baseline')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.error('Failed to get baseline data:', error)
        return null
      }

      return {
        projectId: data.project_id,
        source: data.source,
        version: data.version,
        data: data.data,
        metadata: data.metadata
      }
    } catch (error) {
      console.error('Failed to get baseline data:', error)
      return null
    }
  }

  /**
   * 핸드오프 데이터 저장
   */
  private async saveHandoffData(handoff: WorkflowHandoff): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { error } = await (supabase as any)
      .from('workflow_handoffs')
      .insert({
        id: handoff.id,
        from_phase: handoff.fromPhase,
        to_phase: handoff.toPhase,
        project_id: handoff.projectId,
        transfer_data: handoff.transferData,
        approvals: handoff.approvals,
        status: handoff.status,
        created_at: handoff.createdAt,
        completed_at: handoff.completedAt
      })

    if (error) {
      console.error('Failed to save handoff data:', error)
      throw error
    }
  }
}