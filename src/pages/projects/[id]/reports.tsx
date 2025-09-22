import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Shield,
  Zap,
  Download,
  Loader2,
  Plus
} from 'lucide-react'
import { useProject } from '../../../contexts/ProjectContext'
import { ProjectService } from '../../../services/projectService'
import { analysisReportService } from '../../../services/reports/analysisReportService'
import { AnalysisReportViewer } from '../../../components/reports/AnalysisReportViewer'
import { PageContainer, PageHeader, PageContent, Card } from '../../../components/LinearComponents'
import type { AnalysisReportData } from '../../../services/reports/analysisReportService'

export function ProjectReportsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state: projectState, selectProject } = useProject()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<AnalysisReportData[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<AnalysisReportData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showViewer, setShowViewer] = useState(false)

  // 프로젝트 상세 정보 로딩
  useEffect(() => {
    const loadProject = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        // 현재 프로젝트가 이미 선택된 경우
        if (projectState.currentProject?.id === id) {
          setProject(projectState.currentProject)
          setLoading(false)
          return
        }

        // 프로젝트 상세 정보 로딩
        const projectData = await ProjectService.getProject(id)
        if (projectData) {
          setProject(projectData)
          selectProject(projectData)
        } else {
          setError('프로젝트를 찾을 수 없습니다.')
        }
      } catch (err) {
        console.error('Failed to load project:', err)
        setError('프로젝트를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [id, projectState.currentProject?.id, selectProject])

  // 보고서 목록 로딩
  useEffect(() => {
    const loadReports = async () => {
      if (!id) return

      try {
        setReportsLoading(true)
        const reportData = await analysisReportService.getProjectReports(id)
        setReports(reportData)
      } catch (err) {
        console.error('Failed to load reports:', err)
      } finally {
        setReportsLoading(false)
      }
    }

    if (id) {
      loadReports()
    }
  }, [id])

  // 새 보고서 생성
  const handleGenerateReport = async () => {
    if (!id || !project) return

    try {
      setIsGenerating(true)
      const newReport = await analysisReportService.generateComprehensiveReport(
        id,
        '프로젝트 종합 분석 보고서',
        'comprehensive'
      )

      // 보고서 목록 새로고침
      const updatedReports = await analysisReportService.getProjectReports(id)
      setReports(updatedReports)

      // 새로 생성된 보고서 선택
      setSelectedReport(newReport)
      setShowViewer(true)
    } catch (err) {
      console.error('Failed to generate report:', err)
      alert('보고서 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  // 보고서 선택
  const handleSelectReport = (report: AnalysisReportData) => {
    setSelectedReport(report)
    setShowViewer(true)
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">프로젝트를 불러오는 중...</div>
        </div>
      </PageContainer>
    )
  }

  if (error || !project) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-accent-red mb-4">{error || '프로젝트를 찾을 수 없습니다.'}</div>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              프로젝트 목록으로 돌아가기
            </button>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (showViewer && selectedReport) {
    return (
      <AnalysisReportViewer
        projectId={id!}
        onBack={() => {
          setShowViewer(false)
          setSelectedReport(null)
        }}
      />
    )
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'summary':
        return <AlertTriangle className="w-5 h-5 text-accent-red" />
      case 'detailed':
        return <DollarSign className="w-5 h-5 text-accent-green" />
      case 'executive':
        return <Zap className="w-5 h-5 text-accent-blue" />
      case 'comprehensive':
        return <BarChart3 className="w-5 h-5 text-accent-indigo" />
      default:
        return <FileText className="w-5 h-5 text-text-muted" />
    }
  }

  const getReportTypeName = (type: string) => {
    switch (type) {
      case 'summary':
        return '요약 보고서'
      case 'detailed':
        return '상세 보고서'
      case 'executive':
        return '경영진 보고서'
      case 'comprehensive':
        return '종합 분석'
      default:
        return '일반 보고서'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <PageContainer>
      <PageHeader
        title="분석 보고서"
        subtitle={project.name}
        description="프로젝트의 종합적인 분석 보고서를 확인하고 관리합니다."
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/projects/${id}`)}
              className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>프로젝트로 돌아가기</span>
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{isGenerating ? '생성 중...' : '새 보고서 생성'}</span>
            </button>
          </div>
        }
      />

      <PageContent>
        {/* 보고서 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-text-primary">
                  {reportsLoading ? '...' : reports.length}
                </div>
                <div className="text-text-secondary text-sm">총 보고서</div>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-text-primary">
                  {reports.filter(r => r.status === 'completed').length}
                </div>
                <div className="text-text-secondary text-sm">완료된 보고서</div>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-text-primary">
                  {reports.filter(r => r.reportType === 'summary').length}
                </div>
                <div className="text-text-secondary text-sm">요약 보고서</div>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-text-primary">
                  {reports.filter(r => r.reportType === 'comprehensive').length}
                </div>
                <div className="text-text-secondary text-sm">종합 분석 보고서</div>
              </div>
            </div>
          </Card>
        </div>

        {/* 보고서 목록 */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary-500" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">분석 보고서 목록</h2>
            </div>
            <div className="text-sm text-text-secondary">
              총 {reports.length}개의 보고서
            </div>
          </div>

          {reportsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
              <span className="ml-2 text-text-muted">보고서를 불러오는 중...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                아직 생성된 보고서가 없습니다
              </h3>
              <p className="text-text-secondary mb-6">
                새 보고서를 생성하여 프로젝트를 분석해보세요.
              </p>
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{isGenerating ? '생성 중...' : '첫 번째 보고서 생성'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleSelectReport(report)}
                  className="flex items-center justify-between p-4 border border-border-primary rounded-lg hover:bg-bg-tertiary transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-bg-tertiary rounded-lg group-hover:bg-bg-secondary transition-colors">
                      {getReportTypeIcon(report.reportType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-medium text-text-primary group-hover:text-primary-500 transition-colors">
                        {report.title}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-text-secondary">
                          {getReportTypeName(report.reportType)}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {formatDate(report.createdAt)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          report.status === 'completed'
                            ? 'bg-green-500/10 text-green-500'
                            : report.status === 'generating'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {report.status === 'completed' ? '완료' :
                           report.status === 'generating' ? '생성 중' : '실패'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // 다운로드 기능 구현
                      }}
                      className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageContent>
    </PageContainer>
  )
}