// 프로젝트 라이프사이클 관리 서비스
// 제안 → 구축 → 운영 단계별 통합 관리

import { supabase } from '../../lib/supabase'

export type ProjectPhase = 'planning' | 'proposal' | 'construction' | 'operation' | 'maintenance' | 'completed'
export type ProjectStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled'

export interface ProjectLifecycleData {
  id: string
  projectId: string
  currentPhase: ProjectPhase
  status: ProjectStatus
  phases: {
    planning: PhaseData
    proposal: PhaseData
    construction: PhaseData
    operation: PhaseData
    maintenance: PhaseData
    completed: PhaseData
  }
  timeline: {
    startDate: string | null
    estimatedEndDate: string | null
    actualEndDate: string | null
  }
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string
  }
}

export interface PhaseData {
  status: ProjectStatus
  progress: number // 0-100
  startDate: string | null
  endDate: string | null
  estimatedDuration: number // days
  actualDuration: number | null
  deliverables: Deliverable[]
  tasks: PhaseTask[]
  dependencies: string[]
  resources: Resource[]
  risks: Risk[]
  notes: string
}

export interface Deliverable {
  id: string
  name: string
  description: string
  type: 'document' | 'prototype' | 'system' | 'report' | 'deployment'
  status: 'pending' | 'in_progress' | 'review' | 'completed'
  dueDate: string | null
  assignedTo: string | null
}

export interface PhaseTask {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignedTo: string | null
  estimatedHours: number
  actualHours: number | null
  dependencies: string[]
  tags: string[]
}

export interface Resource {
  id: string
  type: 'human' | 'equipment' | 'software' | 'budget'
  name: string
  description: string
  allocation: number // percentage or amount
  cost: number
  available: boolean
}

export interface Risk {
  id: string
  title: string
  description: string
  category: 'technical' | 'business' | 'operational' | 'external'
  severity: 'low' | 'medium' | 'high' | 'critical'
  probability: number // 0-100
  impact: number // 0-100
  mitigation: string
  status: 'identified' | 'mitigating' | 'resolved' | 'accepted'
  assignedTo: string | null
}

export interface PhaseTransitionData {
  fromPhase: ProjectPhase
  toPhase: ProjectPhase
  requirements: string[]
  checklist: ChecklistItem[]
  approvals: Approval[]
  artifacts: string[]
}

export interface ChecklistItem {
  id: string
  title: string
  description: string
  required: boolean
  completed: boolean
  completedBy: string | null
  completedAt: string | null
}

export interface Approval {
  id: string
  type: 'manager' | 'client' | 'technical' | 'budget'
  approver: string
  status: 'pending' | 'approved' | 'rejected'
  comments: string | null
  requestedAt: string
  decidedAt: string | null
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  projectType: string
  phases: ProjectPhase[]
  defaultTimeline: Record<ProjectPhase, number> // days
  requiredDeliverables: Record<ProjectPhase, string[]>
  transitionRules: Record<ProjectPhase, PhaseTransitionData>
}

export class ProjectLifecycleService {
  private static instance: ProjectLifecycleService

  static getInstance(): ProjectLifecycleService {
    if (!ProjectLifecycleService.instance) {
      ProjectLifecycleService.instance = new ProjectLifecycleService()
    }
    return ProjectLifecycleService.instance
  }

  /**
   * 프로젝트 라이프사이클 초기화
   */
  async initializeLifecycle(
    projectId: string,
    template: WorkflowTemplate,
    _userId: string
  ): Promise<ProjectLifecycleData> {
    try {
      const lifecycle: ProjectLifecycleData = {
        id: `lifecycle_${projectId}_${Date.now()}`,
        projectId,
        currentPhase: 'planning',
        status: 'not_started',
        phases: this.initializePhases(template),
        timeline: {
          startDate: null,
          estimatedEndDate: null,
          actualEndDate: null
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: _userId
        }
      }

      // 데이터베이스에 저장
      await this.saveLifecycleData(lifecycle)

      return lifecycle
    } catch (error) {
      console.error('Failed to initialize lifecycle:', error)
      throw error
    }
  }

  /**
   * 단계별 초기 데이터 생성
   */
  private initializePhases(template: WorkflowTemplate): ProjectLifecycleData['phases'] {
    const phases = {} as ProjectLifecycleData['phases']
    const allPhases: ProjectPhase[] = ['planning', 'proposal', 'construction', 'operation', 'maintenance', 'completed']

    for (const phase of allPhases) {
      phases[phase] = {
        status: 'not_started',
        progress: 0,
        startDate: null,
        endDate: null,
        estimatedDuration: template.defaultTimeline[phase] || 30,
        actualDuration: null,
        deliverables: this.createPhaseDeliverables(phase, template),
        tasks: [],
        dependencies: [],
        resources: [],
        risks: [],
        notes: ''
      }
    }

    return phases
  }

  /**
   * 단계별 필수 산출물 생성
   */
  private createPhaseDeliverables(phase: ProjectPhase, template: WorkflowTemplate): Deliverable[] {
    const deliverableNames = template.requiredDeliverables[phase] || []

    return deliverableNames.map((name, index) => ({
      id: `deliverable_${phase}_${index}_${Date.now()}`,
      name,
      description: `${phase} 단계의 ${name} 산출물`,
      type: this.getDeliverableType(name),
      status: 'pending',
      dueDate: null,
      assignedTo: null
    }))
  }

  /**
   * 산출물 타입 결정
   */
  private getDeliverableType(name: string): Deliverable['type'] {
    if (name.includes('문서') || name.includes('계획서') || name.includes('명세서')) {
      return 'document'
    }
    if (name.includes('프로토타입') || name.includes('모형')) {
      return 'prototype'
    }
    if (name.includes('시스템') || name.includes('소프트웨어')) {
      return 'system'
    }
    if (name.includes('보고서') || name.includes('분석서')) {
      return 'report'
    }
    if (name.includes('배포') || name.includes('설치')) {
      return 'deployment'
    }
    return 'document'
  }

  /**
   * 현재 라이프사이클 데이터 조회
   */
  async getLifecycleData(projectId: string): Promise<ProjectLifecycleData | null> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await (supabase as any)
        .from('project_lifecycle')
        .select('*')
        .eq('project_id', projectId)
        .limit(1)

      if (error) {
        console.error('Failed to fetch lifecycle data:', error)
        return null
      }

      // 데이터가 없으면 null 반환
      if (!data || data.length === 0) {
        return null
      }

      const lifecycleData = data[0]

      return this.transformDatabaseToLifecycle(lifecycleData)
    } catch (error) {
      console.error('Failed to get lifecycle data:', error)
      return null
    }
  }

  /**
   * 다음 단계로 전환
   */
  async transitionToNextPhase(
    projectId: string,
    _userId: string,
    _approvals: Approval[] = []
  ): Promise<ProjectLifecycleData> {
    try {
      const lifecycle = await this.getLifecycleData(projectId)
      if (!lifecycle) {
        throw new Error('Lifecycle data not found')
      }

      const currentPhase = lifecycle.currentPhase
      const nextPhase = this.getNextPhase(currentPhase)

      if (!nextPhase) {
        throw new Error('No next phase available')
      }

      // 전환 조건 검증
      await this.validatePhaseTransition(lifecycle, currentPhase, nextPhase)

      // 현재 단계 완료 처리
      lifecycle.phases[currentPhase].status = 'completed'
      lifecycle.phases[currentPhase].endDate = new Date().toISOString()
      lifecycle.phases[currentPhase].progress = 100

      if (lifecycle.phases[currentPhase].startDate) {
        const start = new Date(lifecycle.phases[currentPhase].startDate!)
        const end = new Date()
        lifecycle.phases[currentPhase].actualDuration = Math.ceil(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      // 다음 단계 시작
      lifecycle.currentPhase = nextPhase
      lifecycle.phases[nextPhase].status = 'in_progress'
      lifecycle.phases[nextPhase].startDate = new Date().toISOString()
      lifecycle.phases[nextPhase].progress = 0

      lifecycle.metadata.updatedAt = new Date().toISOString()

      // 데이터베이스 업데이트
      await this.saveLifecycleData(lifecycle)

      // 알림 발송
      await this.notifyPhaseTransition(projectId, currentPhase, nextPhase, _userId)

      return lifecycle
    } catch (error) {
      console.error('Failed to transition phase:', error)
      throw error
    }
  }

  /**
   * 다음 단계 결정
   */
  private getNextPhase(currentPhase: ProjectPhase): ProjectPhase | null {
    const phaseOrder: ProjectPhase[] = [
      'planning',
      'proposal',
      'construction',
      'operation',
      'maintenance',
      'completed'
    ]

    const currentIndex = phaseOrder.indexOf(currentPhase)
    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      return null
    }

    return phaseOrder[currentIndex + 1]
  }

  /**
   * 단계 전환 조건 검증
   */
  private async validatePhaseTransition(
    lifecycle: ProjectLifecycleData,
    fromPhase: ProjectPhase,
    _toPhase: ProjectPhase
  ): Promise<void> {
    const phase = lifecycle.phases[fromPhase]

    // 필수 산출물 완료 확인
    const incompleteDeliverables = phase.deliverables.filter(d => d.status !== 'completed')
    if (incompleteDeliverables.length > 0) {
      throw new Error(`미완료 산출물: ${incompleteDeliverables.map(d => d.name).join(', ')}`)
    }

    // 진행률 확인
    if (phase.progress < 100) {
      throw new Error('단계 진행률이 100%가 아닙니다')
    }

    // 위험 요소 확인
    const unresolvedRisks = phase.risks.filter(r =>
      r.severity === 'critical' && r.status !== 'resolved' && r.status !== 'accepted'
    )
    if (unresolvedRisks.length > 0) {
      throw new Error(`해결되지 않은 중요 위험 요소가 있습니다: ${unresolvedRisks.length}개`)
    }
  }

  /**
   * 단계 진행률 업데이트
   */
  async updatePhaseProgress(
    projectId: string,
    phase: ProjectPhase,
    progress: number,
    _userId: string
  ): Promise<void> {
    try {
      const lifecycle = await this.getLifecycleData(projectId)
      if (!lifecycle) {
        throw new Error('Lifecycle data not found')
      }

      lifecycle.phases[phase].progress = Math.max(0, Math.min(100, progress))
      lifecycle.metadata.updatedAt = new Date().toISOString()

      await this.saveLifecycleData(lifecycle)
    } catch (error) {
      console.error('Failed to update phase progress:', error)
      throw error
    }
  }

  /**
   * 작업 추가
   */
  async addTask(
    projectId: string,
    phase: ProjectPhase,
    task: Omit<PhaseTask, 'id'>,
    _userId: string
  ): Promise<PhaseTask> {
    try {
      const lifecycle = await this.getLifecycleData(projectId)
      if (!lifecycle) {
        throw new Error('Lifecycle data not found')
      }

      const newTask: PhaseTask = {
        ...task,
        id: `task_${phase}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      lifecycle.phases[phase].tasks.push(newTask)
      lifecycle.metadata.updatedAt = new Date().toISOString()

      await this.saveLifecycleData(lifecycle)

      return newTask
    } catch (error) {
      console.error('Failed to add task:', error)
      throw error
    }
  }

  /**
   * 작업 상태 업데이트
   */
  async updateTaskStatus(
    projectId: string,
    phase: ProjectPhase,
    taskId: string,
    status: PhaseTask['status'],
    actualHours?: number
  ): Promise<void> {
    try {
      const lifecycle = await this.getLifecycleData(projectId)
      if (!lifecycle) {
        throw new Error('Lifecycle data not found')
      }

      const task = lifecycle.phases[phase].tasks.find(t => t.id === taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      task.status = status
      if (actualHours !== undefined) {
        task.actualHours = actualHours
      }

      // 단계 진행률 자동 계산
      const tasks = lifecycle.phases[phase].tasks
      const completedTasks = tasks.filter(t => t.status === 'completed').length
      const progressFromTasks = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0

      lifecycle.phases[phase].progress = Math.max(
        lifecycle.phases[phase].progress,
        progressFromTasks
      )

      lifecycle.metadata.updatedAt = new Date().toISOString()

      await this.saveLifecycleData(lifecycle)
    } catch (error) {
      console.error('Failed to update task status:', error)
      throw error
    }
  }

  /**
   * 위험 요소 추가
   */
  async addRisk(
    projectId: string,
    phase: ProjectPhase,
    risk: Omit<Risk, 'id'>,
    _userId: string
  ): Promise<Risk> {
    try {
      const lifecycle = await this.getLifecycleData(projectId)
      if (!lifecycle) {
        throw new Error('Lifecycle data not found')
      }

      const newRisk: Risk = {
        ...risk,
        id: `risk_${phase}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      lifecycle.phases[phase].risks.push(newRisk)
      lifecycle.metadata.updatedAt = new Date().toISOString()

      await this.saveLifecycleData(lifecycle)

      return newRisk
    } catch (error) {
      console.error('Failed to add risk:', error)
      throw error
    }
  }

  /**
   * 프로젝트 라이프사이클 통계
   */
  async getLifecycleStats(projectId: string): Promise<{
    totalProgress: number
    currentPhaseProgress: number
    estimatedCompletionDate: string | null
    delayDays: number
    completedPhases: number
    totalPhases: number
    activeRisks: number
    completedDeliverables: number
    totalDeliverables: number
  }> {
    try {
      const lifecycle = await this.getLifecycleData(projectId)
      if (!lifecycle) {
        throw new Error('Lifecycle data not found')
      }

      const phases = Object.values(lifecycle.phases)
      const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0) / phases.length
      const currentPhaseProgress = lifecycle.phases[lifecycle.currentPhase].progress
      const completedPhases = phases.filter(phase => phase.status === 'completed').length
      const totalPhases = phases.length

      const allRisks = phases.flatMap(phase => phase.risks)
      const activeRisks = allRisks.filter(risk =>
        risk.status !== 'resolved' && risk.status !== 'accepted'
      ).length

      const allDeliverables = phases.flatMap(phase => phase.deliverables)
      const completedDeliverables = allDeliverables.filter(d => d.status === 'completed').length
      const totalDeliverables = allDeliverables.length

      // 예상 완료일 계산
      const estimatedCompletionDate = this.calculateEstimatedCompletion(lifecycle)

      // 지연 일수 계산
      const delayDays = this.calculateDelayDays(lifecycle)

      return {
        totalProgress,
        currentPhaseProgress,
        estimatedCompletionDate,
        delayDays,
        completedPhases,
        totalPhases,
        activeRisks,
        completedDeliverables,
        totalDeliverables
      }
    } catch (error) {
      console.error('Failed to get lifecycle stats:', error)
      throw error
    }
  }

  /**
   * 예상 완료일 계산
   */
  private calculateEstimatedCompletion(lifecycle: ProjectLifecycleData): string | null {
    const currentPhase = lifecycle.phases[lifecycle.currentPhase]
    if (!currentPhase.startDate) {
      return null
    }

    // 현재 단계 남은 일수 계산
    const currentProgress = currentPhase.progress
    const estimatedDuration = currentPhase.estimatedDuration
    const remainingDaysCurrentPhase = ((100 - currentProgress) / 100) * estimatedDuration

    // 향후 단계들의 예상 일수 합계
    const futurePhases = this.getFuturePhases(lifecycle.currentPhase)
    const remainingDaysFuturePhases = futurePhases.reduce((sum, phase) => {
      return sum + lifecycle.phases[phase].estimatedDuration
    }, 0)

    const totalRemainingDays = remainingDaysCurrentPhase + remainingDaysFuturePhases
    const estimatedEndDate = new Date()
    estimatedEndDate.setDate(estimatedEndDate.getDate() + totalRemainingDays)

    return estimatedEndDate.toISOString()
  }

  /**
   * 지연 일수 계산
   */
  private calculateDelayDays(lifecycle: ProjectLifecycleData): number {
    if (!lifecycle.timeline.estimatedEndDate) {
      return 0
    }

    const estimatedEnd = new Date(lifecycle.timeline.estimatedEndDate)
    const currentEstimatedEnd = this.calculateEstimatedCompletion(lifecycle)

    if (!currentEstimatedEnd) {
      return 0
    }

    const currentEnd = new Date(currentEstimatedEnd)
    const diffMs = currentEnd.getTime() - estimatedEnd.getTime()
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }

  /**
   * 향후 단계 목록
   */
  private getFuturePhases(currentPhase: ProjectPhase): ProjectPhase[] {
    const phaseOrder: ProjectPhase[] = [
      'planning',
      'proposal',
      'construction',
      'operation',
      'maintenance',
      'completed'
    ]

    const currentIndex = phaseOrder.indexOf(currentPhase)
    return phaseOrder.slice(currentIndex + 1)
  }

  /**
   * 단계 전환 알림
   */
  private async notifyPhaseTransition(
    projectId: string,
    fromPhase: ProjectPhase,
    _toPhase: ProjectPhase,
    _userId: string
  ): Promise<void> {
    // 실제 구현에서는 이메일, 슬랙 등으로 알림 발송
    console.log(`Phase transition: ${fromPhase} → ${_toPhase} for project ${projectId} by ${_userId}`)
  }

  /**
   * 데이터베이스에 라이프사이클 데이터 저장
   */
  private async saveLifecycleData(lifecycle: ProjectLifecycleData): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { error } = await (supabase as any)
      .from('project_lifecycle')
      .upsert({
        id: lifecycle.id,
        project_id: lifecycle.projectId,
        current_phase: lifecycle.currentPhase,
        status: lifecycle.status,
        phases_data: lifecycle.phases,
        timeline_data: lifecycle.timeline,
        metadata: lifecycle.metadata,
        updated_at: lifecycle.metadata.updatedAt
      })

    if (error) {
      console.error('Failed to save lifecycle data:', error)
      throw error
    }
  }

  /**
   * 데이터베이스 데이터를 라이프사이클 객체로 변환
   */
  private transformDatabaseToLifecycle(data: any): ProjectLifecycleData {
    return {
      id: data.id,
      projectId: data.project_id,
      currentPhase: data.current_phase,
      status: data.status,
      phases: data.phases_data,
      timeline: data.timeline_data,
      metadata: data.metadata
    }
  }
}

// 기본 워크플로우 템플릿들
export const DefaultWorkflowTemplates: Record<string, WorkflowTemplate> = {
  software_development: {
    id: 'software_development',
    name: '소프트웨어 개발 프로젝트',
    description: '일반적인 소프트웨어 개발 프로젝트 워크플로우',
    projectType: 'software',
    phases: ['planning', 'proposal', 'construction', 'operation', 'maintenance'],
    defaultTimeline: {
      planning: 14,
      proposal: 21,
      construction: 90,
      operation: 30,
      maintenance: 365,
      completed: 0
    },
    requiredDeliverables: {
      planning: ['프로젝트 계획서', '요구사항 정의서'],
      proposal: ['제안서', '예산 계획서', '일정 계획서'],
      construction: ['시스템 설계서', '소프트웨어', '테스트 결과서'],
      operation: ['배포 결과서', '운영 매뉴얼'],
      maintenance: ['유지보수 보고서'],
      completed: ['최종 결과 보고서']
    },
    transitionRules: {} as Record<ProjectPhase, PhaseTransitionData>
  },

  consulting: {
    id: 'consulting',
    name: '컨설팅 프로젝트',
    description: '비즈니스 컨설팅 및 분석 프로젝트',
    projectType: 'consulting',
    phases: ['planning', 'proposal', 'construction', 'operation'],
    defaultTimeline: {
      planning: 7,
      proposal: 14,
      construction: 60,
      operation: 14,
      maintenance: 0,
      completed: 0
    },
    requiredDeliverables: {
      planning: ['분석 계획서'],
      proposal: ['컨설팅 제안서', '분석 방법론'],
      construction: ['분석 보고서', '개선 방안'],
      operation: ['최종 보고서', '후속 지원 계획'],
      maintenance: [],
      completed: []
    },
    transitionRules: {} as Record<ProjectPhase, PhaseTransitionData>
  }
}