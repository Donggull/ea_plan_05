// 문서 분석 관련 타입 정의

export type WorkflowStep = 'market_research' | 'personas' | 'proposal' | 'budget' | 'document_analysis'

export interface DocumentAnalysisContext {
  projectId: string
  projectInfo: {
    name: string
    description: string
    project_types: string[]
    client_info: any
  }
  documents: Array<{
    id: string
    file_name: string
    content: string
    file_type: string
    metadata: any
  }>
  targetWorkflowSteps: WorkflowStep[]
}

export interface DocumentAnalysisResult {
  documentId: string
  fileName: string
  summary: string
  keyInsights: string[]
  relevantWorkflowSteps: WorkflowStep[]
  extractedData: {
    businessRequirements?: string[]
    technicalSpecs?: string[]
    marketInsights?: string[]
    budgetInfo?: {
      estimatedCost?: string
      currency?: string
      breakdown?: string[]
    }
    timeline?: string
    stakeholders?: string[]
  }
  recommendations: string[]
  confidence: number
  processingTime: number
  costSummary?: {
    cost: number
    tokens: number
    model: string
  }
}

export interface IntegratedAnalysisResult {
  projectId: string
  overallSummary: string
  documentInsights: DocumentAnalysisResult[]
  workflowRecommendations: Record<WorkflowStep, {
    readiness: number
    suggestedQuestions: string[]
    dataGaps: string[]
    confidence: number
  }>
  nextSteps: string[]
  totalProcessingTime: number
  costSummary: {
    totalCost: number
    tokenUsage: number
    modelUsed: string
  }
}

export interface EnhancedAnalysisResult {
  summary: string
  keyFindings: string[]
  recommendations: string[]
  structuredData: any
  nextSteps: string[]
  confidence: number
  warnings: string[]
  documentInsights: {
    relevantDocuments: string[]
    extractedData: any
    documentConfidence: number
  }
  integrationScore: number
  dataCompleteness: {
    documentData: number
    userResponses: number
    combined: number
  }
  enhancedRecommendations: string[]
}

export interface ProjectAnalysisStatus {
  hasDocuments: boolean
  documentsAnalyzed: number
  totalDocuments: number
  lastAnalysis: string | null
  workflowReadiness: Record<WorkflowStep, number>
}

export interface DocumentAnalysisState {
  analysisResult: IntegratedAnalysisResult | null
  projectStatus: ProjectAnalysisStatus | null
  isAnalyzing: boolean
  isLoading: boolean
  error: string | null
  progress: {
    currentStep: string
    currentDocument: number
    totalDocuments: number
    percentage: number
  } | null
}

export interface DocumentAnalysisActions {
  analyzeDocuments: (options?: {
    modelId?: string
    targetSteps?: WorkflowStep[]
    forceReanalysis?: boolean
  }) => Promise<void>
  refreshStatus: () => Promise<void>
  clearAnalysis: () => void
  getWorkflowReadiness: (step: WorkflowStep) => number
  getNextActions: () => string[]
}

export interface DocumentAnalysisStats {
  totalDocuments: number
  analyzedDocuments: number
  pendingDocuments: number
  analysisProgress: number
  workflowReadiness: {
    overall: number
    byStep: Record<WorkflowStep, number>
  }
  totalInsights: number
  totalRecommendations: number
  analysisCost: {
    totalCost: number
    tokenUsage: number
    modelUsed: string
  } | null
  lastAnalysis: string | null
  isComplete: boolean
  needsUpdate: boolean
}

export interface WorkflowDocumentInsights {
  insights: DocumentAnalysisResult[]
  readiness: number
  suggestedQuestions: string[]
  dataGaps: string[]
  confidence: number
  hasRelevantDocuments: boolean
  documentCount: number
}

export interface IntegratedAnalysisStatus {
  documentAnalysisCompleted: boolean
  completedSteps: WorkflowStep[]
  integrationScores: Record<WorkflowStep, number>
  overallReadiness: number
  recommendedNextStep: WorkflowStep | null
}