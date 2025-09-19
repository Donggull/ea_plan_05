// 프로젝트 타입 및 단계 정의

export type ProjectType = 'proposal' | 'construction' | 'operation'

export type WorkflowStep = 'market_research' | 'personas' | 'proposal' | 'budget'

export interface ProjectTypeConfig {
  id: ProjectType
  name: string
  description: string
  icon: string
  availableSteps: WorkflowStep[]
  isEnabled: boolean
}

export interface ProjectStageSelection {
  selectedTypes: ProjectType[]
  selectedSteps: WorkflowStep[]
  enableConnectedMode: boolean
}

export interface ProjectProgress {
  totalSteps: number
  completedSteps: number
  currentStep?: WorkflowStep
  progressPercentage: number
  stepStatuses: Record<WorkflowStep, 'not_started' | 'in_progress' | 'completed'>
}

export const PROJECT_TYPE_CONFIGS: Record<ProjectType, ProjectTypeConfig> = {
  proposal: {
    id: 'proposal',
    name: '제안 진행',
    description: 'AI 기반 시장 조사, 페르소나 분석, 제안서 작성 및 예산 계획',
    icon: 'FileText',
    availableSteps: ['market_research', 'personas', 'proposal', 'budget'],
    isEnabled: true
  },
  construction: {
    id: 'construction',
    name: '구축 관리',
    description: '프로젝트 구축 단계 관리 및 개발 진행 상황 추적',
    icon: 'Building',
    availableSteps: [],
    isEnabled: false // 현재 단계에서는 비활성화
  },
  operation: {
    id: 'operation',
    name: '운영 관리',
    description: '운영 티켓 관리, 유지보수 및 모니터링',
    icon: 'Settings',
    availableSteps: [],
    isEnabled: false // 현재 단계에서는 비활성화
  }
}

export const WORKFLOW_STEP_CONFIGS: Record<WorkflowStep, {
  id: WorkflowStep
  name: string
  description: string
  icon: string
  order: number
  estimatedTime: string
}> = {
  market_research: {
    id: 'market_research',
    name: '시장 조사',
    description: '시장 규모, 경쟁사 분석, 성장률 등 시장 환경 분석',
    icon: 'TrendingUp',
    order: 1,
    estimatedTime: '1-2일'
  },
  personas: {
    id: 'personas',
    name: '페르소나 분석',
    description: '타겟 고객 분석 및 사용자 페르소나 정의',
    icon: 'Users',
    order: 2,
    estimatedTime: '1-2일'
  },
  proposal: {
    id: 'proposal',
    name: '제안서 작성',
    description: '종합 분석 기반 제안서 및 솔루션 문서 작성',
    icon: 'FileText',
    order: 3,
    estimatedTime: '2-3일'
  },
  budget: {
    id: 'budget',
    name: '예산 계획',
    description: '프로젝트 예산 산정 및 비용 계획 수립',
    icon: 'DollarSign',
    order: 4,
    estimatedTime: '1일'
  }
}