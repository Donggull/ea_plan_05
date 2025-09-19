import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain,
  FileText,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Eye,
  Upload
} from 'lucide-react'
import { Card, Badge, ProgressBar } from '../LinearComponents'
import { useDocumentAnalysis } from '../../hooks/useDocumentAnalysis'
import { useAuth } from '../../contexts/AuthContext'

interface DocumentAnalysisCardProps {
  projectId: string
  variant?: 'compact' | 'detailed'
  className?: string
}

interface WorkflowInsight {
  step: string
  readiness: number
  confidence: number
  keyFindings: string[]
}

export function DocumentAnalysisCard({
  projectId,
  variant = 'compact',
  className = ''
}: DocumentAnalysisCardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [documentCount, setDocumentCount] = useState(0)
  const [loadingDocs, setLoadingDocs] = useState(true)

  const {
    analysisResult,
    isAnalyzing,
    isLoading,
    error,
    hasDocuments,
    analyzeDocuments,
    refreshStatus
  } = useDocumentAnalysis(projectId)

  // const stats = useDocumentAnalysisStats() // 현재 사용하지 않음

  // 문서 수 조회
  useEffect(() => {
    const loadDocumentCount = async () => {
      try {
        setLoadingDocs(true)
        const { supabase } = await import('../../lib/supabase')
        if (!supabase) {
          console.error('Supabase client not available')
          return
        }
        const { count, error } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)

        if (error) {
          console.error('Failed to load document count:', error)
          return
        }

        setDocumentCount(count || 0)
      } catch (error) {
        console.error('Failed to load document count:', error)
      } finally {
        setLoadingDocs(false)
      }
    }

    if (projectId) {
      loadDocumentCount()
    }
  }, [projectId])

  // 워크플로우별 준비도 계산
  const getWorkflowReadiness = (): WorkflowInsight[] => {
    if (!analysisResult || !(analysisResult as any).workflow_insights) {
      return [
        { step: 'market_research', readiness: 0, confidence: 0, keyFindings: [] },
        { step: 'personas', readiness: 0, confidence: 0, keyFindings: [] },
        { step: 'proposal', readiness: 0, confidence: 0, keyFindings: [] },
        { step: 'budget', readiness: 0, confidence: 0, keyFindings: [] }
      ]
    }

    return Object.entries((analysisResult as any).workflow_insights).map(([step, insight]: [string, any]) => ({
      step,
      readiness: insight.readiness || 0,
      confidence: insight.confidence || 0,
      keyFindings: insight.key_findings || []
    }))
  }

  // 워크플로우 아이콘
  const getWorkflowIcon = (step: string) => {
    switch (step) {
      case 'market_research': return BarChart3
      case 'personas': return Users
      case 'proposal': return FileText
      case 'budget': return DollarSign
      default: return Brain
    }
  }

  // 워크플로우 라벨
  const getWorkflowLabel = (step: string) => {
    switch (step) {
      case 'market_research': return '시장조사'
      case 'personas': return '페르소나'
      case 'proposal': return '제안서'
      case 'budget': return '견적'
      default: return step
    }
  }

  // 준비도 색상
  const getReadinessColor = (readiness: number) => {
    if (readiness >= 0.8) return 'text-green-500'
    if (readiness >= 0.6) return 'text-orange-500'
    if (readiness >= 0.4) return 'text-yellow-500'
    return 'text-red-500'
  }

  // 전체 분석 실행
  const handleAnalyzeAll = async () => {
    if (!projectId || !user || !hasDocuments) return
    await analyzeDocuments({
      forceReanalysis: false,
      targetSteps: ['market_research', 'personas', 'proposal', 'budget']
    })
  }

  const workflowInsights = getWorkflowReadiness()
  const overallReadiness = workflowInsights.reduce((sum, insight) => sum + insight.readiness, 0) / workflowInsights.length

  // 컴팩트 버전
  if (variant === 'compact') {
    return (
      <Card className={`hover:shadow-lg transition-all duration-200 ${className}`} hoverable>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">문서 분석</h3>
              <p className="text-text-secondary text-sm">AI 기반 워크플로우 인사이트</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {analysisResult ? (
              <Badge variant="success">
                <CheckCircle className="w-3 h-3 mr-1" />
                분석 완료
              </Badge>
            ) : hasDocuments ? (
              <Badge variant="warning">
                <Clock className="w-3 h-3 mr-1" />
                분석 대기
              </Badge>
            ) : (
              <Badge variant="primary">
                <AlertCircle className="w-3 h-3 mr-1" />
                문서 없음
              </Badge>
            )}
          </div>
        </div>

        {/* 문서 현황 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-text-muted text-sm">업로드된 문서</span>
            <div className="text-text-primary font-semibold">
              {loadingDocs ? '...' : `${documentCount}개`}
            </div>
          </div>
          <div>
            <span className="text-text-muted text-sm">분석 준비도</span>
            <div className={`font-semibold ${getReadinessColor(overallReadiness)}`}>
              {Math.round(overallReadiness * 100)}%
            </div>
          </div>
        </div>

        {/* 워크플로우 준비도 (간단 버전) */}
        {analysisResult && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">워크플로우 준비도</span>
              <span className="text-text-primary">{Math.round(overallReadiness * 100)}%</span>
            </div>
            <ProgressBar
              value={overallReadiness * 100}
              max={100}
              color="#F59E0B"
            />
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="flex items-center space-x-2">
          {!hasDocuments ? (
            <button
              onClick={() => navigate(`/projects/${projectId}/documents`)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex-1"
            >
              <Upload className="w-4 h-4" />
              <span>문서 업로드</span>
            </button>
          ) : !analysisResult ? (
            <button
              onClick={handleAnalyzeAll}
              disabled={isAnalyzing}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex-1"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>분석 중...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>AI 분석 시작</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => navigate(`/projects/${projectId}/document-analysis`)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex-1"
            >
              <Eye className="w-4 h-4" />
              <span>결과 보기</span>
            </button>
          )}

          <button
            onClick={() => navigate(`/projects/${projectId}/document-analysis`)}
            className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Card>
    )
  }

  // 상세 버전
  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${className}`} hoverable>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-orange-500/10 rounded-lg">
            <BarChart3 className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-text-primary">문서 분석</h3>
            <p className="text-text-secondary">AI 기반 워크플로우 인사이트 및 준비도 분석</p>
          </div>
        </div>

        <button
          onClick={refreshStatus}
          disabled={isLoading}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
          title="새로고침"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-500">{error}</span>
          </div>
        </div>
      )}

      {/* 문서 현황 */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-text-primary">
            {loadingDocs ? '...' : documentCount}
          </div>
          <div className="text-text-secondary text-sm">업로드된 문서</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${getReadinessColor(overallReadiness)}`}>
            {Math.round(overallReadiness * 100)}%
          </div>
          <div className="text-text-secondary text-sm">전체 준비도</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-text-primary">
            {analysisResult ? workflowInsights.filter(w => w.readiness >= 0.8).length : 0}
          </div>
          <div className="text-text-secondary text-sm">준비된 워크플로우</div>
        </div>
      </div>

      {/* 워크플로우별 준비도 */}
      {analysisResult ? (
        <div className="space-y-4 mb-6">
          <h4 className="text-lg font-semibold text-text-primary">워크플로우별 준비도</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflowInsights.map((insight) => {
              const Icon = getWorkflowIcon(insight.step)
              return (
                <div
                  key={insight.step}
                  className="p-4 border border-border-primary rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-text-muted" />
                      <span className="font-medium text-text-primary">
                        {getWorkflowLabel(insight.step)}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${getReadinessColor(insight.readiness)}`}>
                      {Math.round(insight.readiness * 100)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={insight.readiness * 100}
                    max={100}
                    color={
                      insight.readiness >= 0.8 ? '#10B981' :
                      insight.readiness >= 0.6 ? '#F59E0B' :
                      insight.readiness >= 0.4 ? '#EAB308' : '#EF4444'
                    }
                  />
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 mb-6">
          <Brain className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-text-primary mb-2">
            {hasDocuments ? 'AI 분석을 시작하세요' : '문서를 업로드하세요'}
          </h4>
          <p className="text-text-secondary">
            {hasDocuments
              ? '업로드된 문서를 AI로 분석하여 워크플로우별 인사이트를 얻을 수 있습니다.'
              : '먼저 프로젝트 문서를 업로드한 후 AI 분석을 진행할 수 있습니다.'
            }
          </p>
        </div>
      )}

      {/* 액션 버튼들 */}
      <div className="flex items-center space-x-3">
        {!hasDocuments ? (
          <button
            onClick={() => navigate(`/projects/${projectId}/documents`)}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>문서 업로드</span>
          </button>
        ) : !analysisResult ? (
          <button
            onClick={handleAnalyzeAll}
            disabled={isAnalyzing}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI 분석 중...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>AI 분석 시작</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => navigate(`/projects/${projectId}/document-analysis`)}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>분석 결과 보기</span>
          </button>
        )}

        <button
          onClick={() => navigate(`/projects/${projectId}/document-analysis`)}
          className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <span>상세 페이지</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </Card>
  )
}