// 분석 보고서 뷰어 컴포넌트
// 종합적인 분석 보고서를 표시하고 관리

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Share2,
  Printer,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Clock,
  Database,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Target,
  Lightbulb,
  Settings
} from 'lucide-react'
import { AnalysisReportData, analysisReportService } from '../../services/reports/analysisReportService'
import {
  RiskDistributionChart,
  TechAnalysisRadar,
  MetricCard
} from '../charts/ReportCharts'

interface AnalysisReportViewerProps {
  projectId: string
  reportId?: string
  onReportSelect?: (reportId: string) => void
  onBack?: () => void
  className?: string
}

export const AnalysisReportViewer: React.FC<AnalysisReportViewerProps> = ({
  projectId,
  reportId,
  onReportSelect,
  onBack,
  className = ''
}) => {
  const [reports, setReports] = useState<AnalysisReportData[]>([])
  const [currentReport, setCurrentReport] = useState<AnalysisReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('summary')
  const [showSidebar, setShowSidebar] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [isGenerating, setIsGenerating] = useState(false)

  const tabs = [
    { id: 'summary', label: '요약', icon: FileText },
    { id: 'findings', label: '주요 발견사항', icon: Lightbulb },
    { id: 'risks', label: '위험 분석', icon: AlertTriangle },
    { id: 'recommendations', label: '권장사항', icon: CheckCircle },
    { id: 'technical', label: '기술 분석', icon: Settings },
    { id: 'business', label: '비즈니스 분석', icon: TrendingUp },
    { id: 'implementation', label: '구현 계획', icon: Target },
    { id: 'charts', label: '시각화', icon: TrendingUp }
  ]

  useEffect(() => {
    loadReports()
  }, [projectId])

  useEffect(() => {
    if (reportId && reports.length > 0) {
      const report = reports.find(r => r.id === reportId)
      if (report) {
        setCurrentReport(report)
      }
    } else if (reports.length > 0 && !currentReport) {
      setCurrentReport(reports[0])
    }
  }, [reportId, reports])

  const loadReports = async () => {
    try {
      setIsLoading(true)
      const reportList = await analysisReportService.getReports(projectId)
      setReports(reportList)
    } catch (error) {
      console.error('Failed to load reports:', error)
      setError('보고서를 불러오는 데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const generateNewReport = async () => {
    try {
      setIsGenerating(true)
      const newReport = await analysisReportService.generateComprehensiveReport(projectId)
      setReports(prev => [newReport, ...prev])
      setCurrentReport(newReport)
    } catch (error) {
      console.error('Failed to generate report:', error)
      setError('보고서 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const exportReport = async (format: 'html' | 'markdown' | 'json') => {
    if (!currentReport) return

    try {
      const content = await analysisReportService.exportReport(currentReport, format)
      const blob = new Blob([content], {
        type: format === 'html' ? 'text/html' : format === 'json' ? 'application/json' : 'text/markdown'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analysis-report-${currentReport.id}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const shareReport = () => {
    if (navigator.share && currentReport) {
      navigator.share({
        title: currentReport.title,
        text: currentReport.content.executiveSummary,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('링크가 클립보드에 복사되었습니다.')
    }
  }

  const printReport = () => {
    window.print()
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || report.reportType === filterType
    return matchesSearch && matchesFilter
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">보고서를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">오류 발생</h3>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={loadReports}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className={`flex h-full bg-bg-primary ${className}`}>
      {/* 사이드바 */}
      {showSidebar && (
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* 헤더 */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <h2 className="text-lg font-semibold text-white">분석 보고서</h2>
              </div>
              <button
                onClick={generateNewReport}
                disabled={isGenerating}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm rounded-lg transition-colors"
              >
                {isGenerating ? '생성 중...' : '새 보고서'}
              </button>
            </div>

            {/* 검색 및 필터 */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="보고서 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">모든 보고서</option>
                <option value="comprehensive">종합 보고서</option>
                <option value="summary">요약 보고서</option>
                <option value="detailed">상세 보고서</option>
                <option value="executive">경영진 보고서</option>
              </select>
            </div>
          </div>

          {/* 보고서 목록 */}
          <div className="flex-1 overflow-y-auto">
            {filteredReports.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                보고서가 없습니다.
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => {
                      setCurrentReport(report)
                      onReportSelect?.(report.id)
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentReport?.id === report.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{report.title}</h3>
                        <div className="flex items-center gap-2 text-xs opacity-75 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{report.metadata.generatedAt.toLocaleDateString()}</span>
                          <Database className="w-3 h-3 ml-2" />
                          <span>{report.metadata.analysisCount}개 분석</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs opacity-75">
                        <span className="px-2 py-1 bg-black/20 rounded">
                          {report.reportType}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col">
        {currentReport ? (
          <>
            {/* 헤더 */}
            <div className="bg-gray-800 border-b border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <div>
                    <h1 className="text-xl font-semibold text-white">{currentReport.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {currentReport.metadata.generatedAt.toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Brain className="w-4 h-4" />
                        {currentReport.metadata.aiModel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {currentReport.metadata.analysisCount}개 분석
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={shareReport}
                    className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    공유
                  </button>

                  <button
                    onClick={printReport}
                    className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    인쇄
                  </button>

                  <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      <Download className="w-4 h-4" />
                      내보내기
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => exportReport('html')}
                        className="block w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded-t-lg"
                      >
                        HTML
                      </button>
                      <button
                        onClick={() => exportReport('markdown')}
                        className="block w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700"
                      >
                        Markdown
                      </button>
                      <button
                        onClick={() => exportReport('json')}
                        className="block w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded-b-lg"
                      >
                        JSON
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className="bg-gray-800 border-b border-gray-700 px-4">
              <nav className="flex space-x-8 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                        ${activeTab === tab.id
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto p-6">
              <ReportContent report={currentReport} activeTab={activeTab} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">보고서를 선택해주세요</h3>
              <p className="text-gray-400 mb-4">
                사이드바에서 보고서를 선택하거나 새 보고서를 생성하세요.
              </p>
              <button
                onClick={generateNewReport}
                disabled={isGenerating}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
              >
                {isGenerating ? '생성 중...' : '새 보고서 생성'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 보고서 콘텐츠 컴포넌트
interface ReportContentProps {
  report: AnalysisReportData
  activeTab: string
}

const ReportContent: React.FC<ReportContentProps> = ({ report, activeTab }) => {
  const renderSummaryTab = () => (
    <div className="space-y-6">
      {/* 메트릭 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="전체 위험도"
          value={report.content.riskAssessment.overall}
          unit="/100"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <MetricCard
          title="분석 비용"
          value={`$${report.metadata.totalCost.toFixed(3)}`}
          icon={<Database className="w-5 h-5" />}
        />
        <MetricCard
          title="토큰 사용량"
          value={`${(report.metadata.totalTokens / 1000).toFixed(1)}K`}
          icon={<Brain className="w-5 h-5" />}
        />
        <MetricCard
          title="분석 수"
          value={report.metadata.analysisCount}
          unit="개"
          icon={<Target className="w-5 h-5" />}
        />
      </div>

      {/* 경영진 요약 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">경영진 요약</h3>
        <p className="text-gray-300 leading-relaxed">{report.content.executiveSummary}</p>
      </div>
    </div>
  )

  const renderFindingsTab = () => (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">주요 발견사항</h3>
      <div className="space-y-3">
        {report.content.keyFindings.map((finding, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-sm font-medium">{index + 1}</span>
            </div>
            <p className="text-gray-300">{finding}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderRisksTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskDistributionChart
          data={{
            high: report.content.riskAssessment.risks.filter(r => r.severity === 'high').length,
            medium: report.content.riskAssessment.risks.filter(r => r.severity === 'medium').length,
            low: report.content.riskAssessment.risks.filter(r => r.severity === 'low').length
          }}
        />
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">전체 위험도</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {report.content.riskAssessment.overall}/100
            </div>
            <div className="text-gray-400">
              {report.content.riskAssessment.overall >= 70 ? '높음' :
               report.content.riskAssessment.overall >= 40 ? '보통' : '낮음'}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {report.content.riskAssessment.risks.map((risk, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              risk.severity === 'high'
                ? 'bg-red-900/20 border-red-800 text-red-300'
                : risk.severity === 'medium'
                ? 'bg-yellow-900/20 border-yellow-800 text-yellow-300'
                : 'bg-green-900/20 border-green-800 text-green-300'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium">{risk.category}</h4>
              <span className="text-xs px-2 py-1 rounded bg-current bg-opacity-20">
                {risk.severity === 'high' ? '높음' : risk.severity === 'medium' ? '보통' : '낮음'}
              </span>
            </div>
            <p className="text-sm opacity-90 mb-3">{risk.description}</p>
            <div className="text-sm">
              <span className="opacity-70">완화 방안:</span> {risk.mitigation}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderRecommendationsTab = () => (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">권장사항</h3>
      <div className="space-y-3">
        {report.content.recommendations.map((recommendation, index) => (
          <div key={index} className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-gray-300">{recommendation}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderTechnicalTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">아키텍처</h3>
          <p className="text-gray-300">{report.content.technicalAnalysis.architecture}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">기술 스택</h3>
          <div className="flex flex-wrap gap-2">
            {report.content.technicalAnalysis.technologies.map((tech, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm border border-blue-700"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">확장성</h3>
          <p className="text-gray-300">{report.content.technicalAnalysis.scalability}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">성능</h3>
          <p className="text-gray-300">{report.content.technicalAnalysis.performance}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">보안</h3>
          <p className="text-gray-300">{report.content.technicalAnalysis.security}</p>
        </div>
      </div>
    </div>
  )

  const renderBusinessTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">사업 타당성</h3>
        <p className="text-gray-300">{report.content.businessAnalysis.viability}</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">시장 기회</h3>
        <p className="text-gray-300">{report.content.businessAnalysis.marketOpportunity}</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">경쟁 우위</h3>
        <p className="text-gray-300">{report.content.businessAnalysis.competitiveAdvantage}</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">투자 대비 효과</h3>
        <p className="text-gray-300">{report.content.businessAnalysis.roi}</p>
      </div>
    </div>
  )

  const renderImplementationTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">전체 일정</h3>
        <p className="text-gray-300">{report.content.implementationPlan.timeline}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">구현 단계</h3>
          {report.content.implementationPlan.phases.map((phase, index) => (
            <div key={index} className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">{phase.name}</h4>
              <p className="text-sm text-gray-400 mb-3">기간: {phase.duration}</p>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-400">산출물:</span>
                  <ul className="text-sm text-gray-300 ml-4">
                    {phase.deliverables.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-sm text-gray-400">필요 리소스:</span>
                  <ul className="text-sm text-gray-300 ml-4">
                    {phase.resources.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">주요 마일스톤</h3>
          <div className="space-y-2">
            {report.content.implementationPlan.milestones.map((milestone, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <span className="text-gray-300">{milestone}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderChartsTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RiskDistributionChart
        data={{
          high: report.content.riskAssessment.risks.filter(r => r.severity === 'high').length,
          medium: report.content.riskAssessment.risks.filter(r => r.severity === 'medium').length,
          low: report.content.riskAssessment.risks.filter(r => r.severity === 'low').length
        }}
      />
      <TechAnalysisRadar
        data={{
          scalability: 75,
          performance: 80,
          security: 70,
          maintainability: 85,
          usability: 78
        }}
      />
    </div>
  )

  switch (activeTab) {
    case 'summary': return renderSummaryTab()
    case 'findings': return renderFindingsTab()
    case 'risks': return renderRisksTab()
    case 'recommendations': return renderRecommendationsTab()
    case 'technical': return renderTechnicalTab()
    case 'business': return renderBusinessTab()
    case 'implementation': return renderImplementationTab()
    case 'charts': return renderChartsTab()
    default: return renderSummaryTab()
  }
}

export default AnalysisReportViewer