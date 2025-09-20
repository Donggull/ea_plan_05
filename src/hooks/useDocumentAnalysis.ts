import { useState, useEffect, useCallback } from 'react'
import { DocumentAnalysisService } from '../services/analysis/documentAnalysisService'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useAIModel } from '../contexts/AIModelContext'
import {
  DocumentAnalysisState,
  WorkflowStep
} from '../types/documentAnalysis'

export function useDocumentAnalysis(projectId?: string) {
  const { user } = useAuth()
  const { state: projectState } = useProject()
  const { getSelectedModel } = useAIModel()
  const currentProjectId = projectId || projectState.currentProject?.id

  const [state, setState] = useState<DocumentAnalysisState>({
    analysisResult: null,
    projectStatus: null,
    isAnalyzing: false,
    isLoading: false,
    error: null,
    progress: null
  })

  /**
   * 프로젝트 분석 상태 조회
   */
  const refreshStatus = useCallback(async () => {
    if (!currentProjectId) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const status = await DocumentAnalysisService.getProjectAnalysisStatus(currentProjectId)
      setState(prev => ({ ...prev, projectStatus: status, isLoading: false }))
    } catch (error) {
      console.error('Failed to refresh document analysis status:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '상태 조회에 실패했습니다.',
        isLoading: false
      }))
    }
  }, [currentProjectId])

  /**
   * 문서 분석 실행
   */
  const analyzeDocuments = useCallback(async (options: {
    modelId?: string
    targetSteps?: WorkflowStep[]
    forceReanalysis?: boolean
    documentIds?: string[]
  } = {}) => {
    if (!currentProjectId || !user) {
      setState(prev => ({ ...prev, error: '프로젝트 또는 사용자 정보가 없습니다.' }))
      return
    }

    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null,
      progress: {
        currentStep: '분석 시작',
        currentDocument: 0,
        totalDocuments: prev.projectStatus?.totalDocuments || 0,
        percentage: 0
      }
    }))

    try {
      // 현재 선택된 AI 모델 가져오기
      const selectedModel = getSelectedModel()
      if (!selectedModel) {
        throw new Error('AI 모델이 선택되지 않았습니다. Left 사이드바에서 모델을 선택해주세요.')
      }

      console.log('🎯 문서 분석에 사용할 모델:', selectedModel.name, `(${selectedModel.id})`)

      // 실제 분석 실행 (선택된 모델만 사용)
      const result = await DocumentAnalysisService.analyzeProjectDocuments(
        currentProjectId,
        user.id,
        {
          ...options,
          modelId: selectedModel.id, // 선택된 모델ID만 전달
          onProgress: (progress) => {
            setState(prev => ({
              ...prev,
              progress
            }))
          }
        }
      )

      setState(prev => ({
        ...prev,
        analysisResult: result,
        isAnalyzing: false,
        progress: {
          currentStep: '완료',
          currentDocument: result.documentInsights.length,
          totalDocuments: result.documentInsights.length,
          percentage: 100
        }
      }))

      // 상태 새로고침
      await refreshStatus()

      // 성공 후 진행률 정보 제거
      setTimeout(() => {
        setState(prev => ({ ...prev, progress: null }))
      }, 2000)

    } catch (error) {
      console.error('Document analysis failed:', error)
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : '문서 분석에 실패했습니다.',
        progress: null
      }))
    }
  }, [currentProjectId, user, refreshStatus])

  /**
   * 분석 결과 삭제
   */
  const clearAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      analysisResult: null,
      error: null,
      progress: null
    }))
  }, [])

  /**
   * 워크플로우 단계별 준비도 확인
   */
  const getWorkflowReadiness = useCallback((step: WorkflowStep): number => {
    return state.projectStatus?.workflowReadiness[step] || 0
  }, [state.projectStatus])

  /**
   * 다음 권장 액션 가져오기
   */
  const getNextActions = useCallback((): string[] => {
    if (!state.analysisResult) return []
    return state.analysisResult.nextSteps || []
  }, [state.analysisResult])

  // 프로젝트 변경 시 상태 새로고침
  useEffect(() => {
    if (currentProjectId) {
      refreshStatus()
    } else {
      setState({
        analysisResult: null,
        projectStatus: null,
        isAnalyzing: false,
        isLoading: false,
        error: null,
        progress: null
      })
    }
  }, [currentProjectId, refreshStatus])

  return {
    // 상태
    ...state,

    // 액션
    analyzeDocuments,
    refreshStatus,
    clearAnalysis,
    getWorkflowReadiness,
    getNextActions,

    // 계산된 값들
    hasDocuments: state.projectStatus?.hasDocuments || false,
    analysisProgress: state.projectStatus?.totalDocuments && state.projectStatus.totalDocuments > 0
      ? (state.projectStatus.documentsAnalyzed / state.projectStatus.totalDocuments) * 100
      : 0,
    isAnalysisComplete: state.projectStatus?.documentsAnalyzed === state.projectStatus?.totalDocuments,
    overallWorkflowReadiness: state.projectStatus?.workflowReadiness
      ? Object.values(state.projectStatus.workflowReadiness).reduce((a, b) => a + b, 0) / 4
      : 0
  }
}

/**
 * 특정 워크플로우 단계의 문서 분석 정보를 가져오는 훅
 */
export function useWorkflowDocumentInsights(step: WorkflowStep) {
  const { analysisResult } = useDocumentAnalysis()

  const stepInsights = analysisResult?.documentInsights?.filter(
    insight => insight.relevantWorkflowSteps.includes(step)
  ) || []

  const stepReadiness = analysisResult?.workflowRecommendations[step]

  return {
    insights: stepInsights,
    readiness: stepReadiness?.readiness || 0,
    suggestedQuestions: stepReadiness?.suggestedQuestions || [],
    dataGaps: stepReadiness?.dataGaps || [],
    confidence: stepReadiness?.confidence || 0,
    hasRelevantDocuments: stepInsights.length > 0,
    documentCount: stepInsights.length
  }
}

/**
 * 문서 분석 통계를 위한 훅
 */
export function useDocumentAnalysisStats() {
  const { projectStatus, analysisResult } = useDocumentAnalysis()

  const stats = {
    // 기본 통계
    totalDocuments: projectStatus?.totalDocuments || 0,
    analyzedDocuments: projectStatus?.documentsAnalyzed || 0,
    pendingDocuments: (projectStatus?.totalDocuments || 0) - (projectStatus?.documentsAnalyzed || 0),

    // 진행률
    analysisProgress: projectStatus?.totalDocuments && projectStatus.totalDocuments > 0
      ? (projectStatus.documentsAnalyzed / projectStatus.totalDocuments) * 100
      : 0,

    // 워크플로우 준비도
    workflowReadiness: {
      overall: projectStatus?.workflowReadiness
        ? Object.values(projectStatus.workflowReadiness).reduce((a, b) => a + b, 0) / 4
        : 0,
      byStep: projectStatus?.workflowReadiness || {}
    },

    // 분석 결과 통계
    totalInsights: analysisResult?.documentInsights?.reduce(
      (total, doc) => total + doc.keyInsights.length, 0
    ) || 0,

    totalRecommendations: analysisResult?.documentInsights?.reduce(
      (total, doc) => total + doc.recommendations.length, 0
    ) || 0,

    // 비용 정보
    analysisCost: analysisResult?.costSummary || null,

    // 최근 분석 시간
    lastAnalysis: projectStatus?.lastAnalysis,

    // 상태 요약
    isComplete: projectStatus?.documentsAnalyzed === projectStatus?.totalDocuments,
    needsUpdate: false // TODO: 문서가 업데이트되었는지 확인하는 로직 추가
  }

  return stats
}