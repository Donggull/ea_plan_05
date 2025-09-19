import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText,
  RefreshCw,
  Brain,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  Users,
  DollarSign,
  Target,
  Lightbulb,
  FileSearch,
  Filter,
  ArrowRight,
  Zap,
  Eye,
  Upload,
  ExternalLink
} from 'lucide-react'
import { useDocumentAnalysis, useDocumentAnalysisStats } from '../../../hooks/useDocumentAnalysis'
import { WorkflowStep } from '../../../types/documentAnalysis'
import { useAuth } from '../../../contexts/AuthContext'
import { PageContainer, PageHeader, PageContent, Card } from '../../../components/LinearComponents'
import { DocumentAnalysisDetailModal } from '../../../components/analysis/DocumentAnalysisDetailModal'
import { supabase } from '../../../lib/supabase'

interface Document {
  id: string
  file_name: string
  storage_path: string
  file_size: number
  mime_type: string
  file_type?: string | null
  project_id?: string
  uploaded_by?: string | null
  created_at: string | null
  updated_at: string | null
  metadata?: any
  is_processed?: boolean | null
  version?: number | null
  parent_id?: string | null
}

interface DocumentAnalysisPageProps {}

export function DocumentAnalysisPage({}: DocumentAnalysisPageProps) {
  const { id: projectId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [selectedView, setSelectedView] = useState<'overview' | 'documents' | 'workflow' | 'insights'>('overview')

  const {
    analysisResult,
    isAnalyzing,
    isLoading,
    error,
    progress,
    hasDocuments,
    analyzeDocuments,
    refreshStatus
  } = useDocumentAnalysis(projectId)

  const stats = useDocumentAnalysisStats()

  // 문서 목록 조회
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadDocuments()
    }
  }, [projectId])

  const loadDocuments = async () => {
    if (!projectId) return

    setLoadingDocuments(true)
    try {
      if (!supabase) {
        console.error('Supabase client not initialized')
        return
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('문서 목록 조회 실패:', error)
        return
      }

      setDocuments(data || [])
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoadingDocuments(false)
    }
  }

  const handleAnalyzeAll = async () => {
    if (!projectId || !user) return

    await analyzeDocuments({
      forceReanalysis: false,
      targetSteps: ['market_research', 'personas', 'proposal', 'budget']
    })
  }

  const handleDocumentClick = async (docId: string) => {
    const document = documents.find(doc => doc.id === docId)
    if (document) {
      setSelectedDocument(document)
      setIsDetailModalOpen(true)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getWorkflowIcon = (step: WorkflowStep) => {
    switch (step) {
      case 'market_research': return BarChart3
      case 'personas': return Users
      case 'proposal': return FileText
      case 'budget': return DollarSign
      default: return Target
    }
  }

  const getWorkflowLabel = (step: WorkflowStep) => {
    switch (step) {
      case 'market_research': return '시장조사'
      case 'personas': return '페르소나'
      case 'proposal': return '제안서'
      case 'budget': return '견적'
      default: return step
    }
  }

  const getReadinessColor = (readiness: number) => {
    if (readiness >= 0.8) return 'text-accent-green'
    if (readiness >= 0.6) return 'text-accent-orange'
    if (readiness >= 0.4) return 'text-accent-yellow'
    return 'text-accent-red'
  }

  const getReadinessBgColor = (readiness: number) => {
    if (readiness >= 0.8) return 'bg-accent-green/10 border-accent-green/20'
    if (readiness >= 0.6) return 'bg-accent-orange/10 border-accent-orange/20'
    if (readiness >= 0.4) return 'bg-accent-yellow/10 border-accent-yellow/20'
    return 'bg-accent-red/10 border-accent-red/20'
  }

  return (
    <PageContainer>
      <PageHeader
        title="문서 분석"
        subtitle="AI 기반 문서 분석 및 워크플로우 인사이트"
        description="프로젝트 문서를 AI로 분석하여 워크플로우별 인사이트를 추출합니다"
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshStatus}
              disabled={isLoading}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
              title="새로고침"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {hasDocuments && (
              <button
                onClick={handleAnalyzeAll}
                disabled={isAnalyzing}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>분석 중...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>전체 분석 시작</span>
                  </>
                )}
              </button>
            )}
          </div>
        }
      />

      <PageContent>

      {/* 오류 표시 */}
      {error && (
        <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0" />
            <span className="text-small text-accent-red">{error}</span>
          </div>
        </div>
      )}

      {/* 진행 상태 */}
      {isAnalyzing && progress && (
        <div className="p-4 bg-accent-orange/10 border border-accent-orange/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <RefreshCw className="w-5 h-5 text-accent-orange animate-spin" />
            <span className="text-small font-medium text-accent-orange">문서 분석 진행 중...</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-small">
              <span className="text-text-secondary">{progress.currentStep}</span>
              <span className="text-text-primary font-medium">
                {progress.currentDocument}/{progress.totalDocuments} 문서
              </span>
            </div>
            <div className="w-full bg-bg-secondary rounded-full h-2">
              <div
                className="bg-accent-orange h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 통계 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="text-mini text-text-secondary">전체 문서</p>
              <p className="text-large font-semibold text-text-primary">{stats.totalDocuments}</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent-green/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <p className="text-mini text-text-secondary">분석 완료</p>
              <p className="text-large font-semibold text-text-primary">{stats.analyzedDocuments}</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent-blue/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <p className="text-mini text-text-secondary">전체 준비도</p>
              <p className="text-large font-semibold text-accent-blue">
                {Math.round(stats.workflowReadiness.overall * 100)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent-purple/10 rounded-lg">
              <Lightbulb className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <p className="text-mini text-text-secondary">인사이트</p>
              <p className="text-large font-semibold text-text-primary">{stats.totalInsights}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-b border-border-secondary">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: '개요', icon: TrendingUp },
            { id: 'documents', label: '문서별 분석', icon: FileSearch },
            { id: 'workflow', label: '워크플로우 준비도', icon: Target },
            { id: 'insights', label: '통합 인사이트', icon: Zap }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedView(tab.id as any)}
                className={`flex items-center space-x-2 px-1 py-3 border-b-2 font-medium text-small transition-colors ${
                  selectedView === tab.id
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="space-y-6">
        {selectedView === 'overview' && (
          <div className="space-y-6">
            {/* 워크플로우 준비도 미리보기 */}
            <Card>
              <h3 className="text-text-primary font-medium mb-4 flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>워크플로우 준비도</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(stats.workflowReadiness.byStep).map(([step, readiness]) => {
                  const Icon = getWorkflowIcon(step as WorkflowStep)
                  const readinessNum = typeof readiness === 'number' ? readiness : 0

                  return (
                    <div
                      key={step}
                      className={`p-4 border rounded-lg ${getReadinessBgColor(readinessNum)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-text-muted" />
                          <span className="text-small font-medium text-text-primary">
                            {getWorkflowLabel(step as WorkflowStep)}
                          </span>
                        </div>
                        <span className={`text-small font-semibold ${getReadinessColor(readinessNum)}`}>
                          {Math.round(readinessNum * 100)}%
                        </span>
                      </div>

                      <div className="w-full bg-bg-tertiary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            readinessNum >= 0.8 ? 'bg-accent-green' :
                            readinessNum >= 0.6 ? 'bg-accent-orange' :
                            readinessNum >= 0.4 ? 'bg-accent-yellow' : 'bg-accent-red'
                          }`}
                          style={{ width: `${readinessNum * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* 최근 분석 활동 */}
            <Card>
              <h3 className="text-text-primary font-medium mb-4 flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>최근 분석 활동</span>
              </h3>

              {stats.lastAnalysis ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-accent-green" />
                      <div>
                        <p className="text-small font-medium text-text-primary">문서 분석 완료</p>
                        <p className="text-mini text-text-secondary">
                          {new Date(stats.lastAnalysis).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-primary-500 text-small font-medium">
                      완료됨
                    </span>
                  </div>

                  {stats.analysisCost && (
                    <div className="text-mini text-text-muted">
                      분석 비용: ${stats.analysisCost.totalCost.toFixed(4)} ({stats.analysisCost.tokenUsage.toLocaleString()} 토큰)
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">아직 분석된 문서가 없습니다</p>
                  {hasDocuments && (
                    <button
                      onClick={handleAnalyzeAll}
                      className="mt-3 text-primary-500 hover:text-primary-600 text-small font-medium"
                    >
                      분석 시작하기
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {selectedView === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-medium">문서별 분석 결과</h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/documents')}
                  className="flex items-center space-x-1 text-primary-500 hover:text-primary-600 text-small transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>문서 관리</span>
                </button>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-text-muted" />
                  <select className="bg-bg-secondary border border-border-primary rounded-lg px-3 py-1 text-small">
                    <option>모든 문서</option>
                    <option>분석 완료</option>
                    <option>분석 대기</option>
                  </select>
                </div>
              </div>
            </div>

            {loadingDocuments ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-text-muted mx-auto mb-2 animate-spin" />
                <p className="text-text-secondary">문서 목록을 불러오는 중...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary mb-2">업로드된 문서가 없습니다</p>
                <p className="text-mini text-text-muted mb-4">프로젝트에 문서를 업로드한 후 분석을 시작해보세요</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => navigate('/documents')}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>문서 업로드</span>
                  </button>
                  <button
                    onClick={() => navigate("/projects/" + projectId)}
                    className="flex items-center space-x-2 px-4 py-2 border border-border-primary text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>프로젝트로 돌아가기</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-bg-secondary border border-border-primary rounded-lg p-4 hover:bg-bg-tertiary transition-colors cursor-pointer"
                    onClick={() => handleDocumentClick(doc.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-primary-500" />
                        <div>
                          <p className="text-small font-medium text-text-primary">{doc.file_name}</p>
                          <p className="text-mini text-text-secondary">
                            {doc.file_type || doc.mime_type} • {formatFileSize(doc.file_size)}
                          </p>
                          <p className="text-mini text-text-muted">
                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {doc.is_processed ? (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4 text-accent-green" />
                            <span className="text-mini text-accent-green">분석 완료</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-text-muted" />
                            <span className="text-mini text-text-muted">분석 대기</span>
                          </div>
                        )}
                        <Eye className="w-4 h-4 text-text-muted" />
                        <ArrowRight className="w-4 h-4 text-text-muted" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedView === 'workflow' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(stats.workflowReadiness.byStep).map(([step, readiness]) => {
                const Icon = getWorkflowIcon(step as WorkflowStep)
                const readinessNum = typeof readiness === 'number' ? readiness : 0

                return (
                  <Card key={step}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-primary-500/10 rounded-lg">
                        <Icon className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <h4 className="text-text-primary font-medium">
                          {getWorkflowLabel(step as WorkflowStep)}
                        </h4>
                        <p className="text-mini text-text-secondary">
                          준비도: <span className={getReadinessColor(readinessNum)}>
                            {Math.round(readinessNum * 100)}%
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="w-full bg-bg-tertiary rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            readinessNum >= 0.8 ? 'bg-accent-green' :
                            readinessNum >= 0.6 ? 'bg-accent-orange' :
                            readinessNum >= 0.4 ? 'bg-accent-yellow' : 'bg-accent-red'
                          }`}
                          style={{ width: `${readinessNum * 100}%` }}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-mini">
                          <span className="text-text-secondary">관련 문서</span>
                          <span className="text-text-primary font-medium">
                            {Math.round(readinessNum * stats.totalDocuments)}개
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-mini">
                          <span className="text-text-secondary">데이터 완성도</span>
                          <span className="text-text-primary font-medium">
                            {Math.round(readinessNum * 100)}%
                          </span>
                        </div>
                      </div>

                      {readinessNum < 0.8 && (
                        <div className="mt-3 p-3 bg-accent-orange/10 border border-accent-orange/20 rounded-lg">
                          <p className="text-mini text-accent-orange">
                            💡 더 정확한 분석을 위해 관련 문서를 추가하거나 질문에 더 자세히 답변해보세요
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {selectedView === 'insights' && (
          <div className="space-y-6">
            {analysisResult ? (
              <div className="space-y-6">
                {/* 전체 요약 */}
                <Card>
                  <h3 className="text-text-primary font-medium mb-3 flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>전체 분석 요약</span>
                  </h3>
                  <p className="text-small text-text-secondary leading-relaxed">
                    {analysisResult.overallSummary}
                  </p>
                </Card>

                {/* 다음 단계 */}
                <Card>
                  <h3 className="text-text-primary font-medium mb-3 flex items-center space-x-2">
                    <ArrowRight className="w-5 h-5" />
                    <span>권장 다음 단계</span>
                  </h3>
                  <div className="space-y-2">
                    {analysisResult.nextSteps.map((step, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-primary-500 font-medium mt-0.5">{index + 1}.</span>
                        <span className="text-small text-text-secondary">{step}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 비용 정보 */}
                {analysisResult.costSummary && (
                  <Card>
                    <h3 className="text-text-primary font-medium mb-3 flex items-center space-x-2">
                      <DollarSign className="w-5 h-5" />
                      <span>분석 비용</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-mini text-text-secondary">총 비용</p>
                        <p className="text-large font-semibold text-text-primary">
                          ${analysisResult.costSummary.totalCost.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-mini text-text-secondary">토큰 사용량</p>
                        <p className="text-large font-semibold text-text-primary">
                          {analysisResult.costSummary.tokenUsage.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-mini text-text-secondary">모델</p>
                        <p className="text-large font-semibold text-text-primary">
                          {analysisResult.costSummary.modelUsed}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Lightbulb className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary mb-2">아직 통합 인사이트가 없습니다</p>
                <p className="text-mini text-text-muted">문서 분석을 완료한 후 인사이트를 확인할 수 있습니다</p>
              </div>
            )}
          </div>
        )}
        </div>
      </PageContent>

      {/* 문서 상세 분석 모달 */}
      {selectedDocument && (
        <DocumentAnalysisDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedDocument(null)
          }}
          document={selectedDocument}
          analysisResult={null}
          isAnalyzing={isAnalyzing}
        />
      )}
    </PageContainer>
  )
}