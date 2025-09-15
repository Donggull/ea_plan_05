import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ApiUsageService, type ApiUsageMetrics } from '@/services/apiUsageService'
import { ApiUsageWidget } from '@/components/widgets/ApiUsageWidget'
import { cn } from '@/utils/cn'
import {
  Activity,
  BarChart3,
  TrendingUp,
  Download,
  RefreshCw,
  Clock,
  DollarSign,
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react'

interface UsageDashboardProps {
  className?: string
}

export default function UsageDashboard({ className }: UsageDashboardProps) {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<ApiUsageMetrics | null>(null)
  const [report, setReport] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // 데이터 로딩
  const loadDashboardData = async () => {
    if (!user?.id) return

    try {
      setRefreshing(true)

      // 기간 설정
      const days = selectedPeriod === 'daily' ? 1 : selectedPeriod === 'weekly' ? 7 : 30
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // 메트릭 데이터 로딩
      const metricsData = await ApiUsageService.getAdvancedMetrics(user.id, startDate, endDate)
      setMetrics(metricsData)

      // 사용량 보고서 생성
      const reportData = await ApiUsageService.generateUsageReport(user.id, selectedPeriod)
      setReport(reportData)

      setError(null)
    } catch (err) {
      console.error('대시보드 데이터 로딩 오류:', err)
      setError('데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 보고서 다운로드
  const downloadReport = async () => {
    if (!report || !user?.id) return

    try {
      const reportContent = {
        사용자: user.email,
        기간: report.period,
        생성일시: new Date().toISOString(),
        요약: {
          총_요청수: report.summary.requestCount,
          총_토큰수: report.summary.tokenUsage.totalTokens,
          총_비용: `$${report.summary.costMetrics.totalCost}`,
          평균_응답시간: `${report.summary.averageLatency}ms`,
          오류율: `${report.summary.errorRate}%`
        },
        모델별_사용량: report.summary.modelDistribution,
        권장사항: report.recommendations
      }

      const blob = new Blob([JSON.stringify(reportContent, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `api-usage-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('보고서 다운로드 오류:', err)
    }
  }

  // 초기 로딩
  useEffect(() => {
    loadDashboardData()
  }, [user?.id, selectedPeriod])

  if (loading && !metrics) {
    return (
      <div className={cn('p-6 space-y-6', className)}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-bg-tertiary rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-bg-tertiary rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('p-6', className)}>
        <div className="text-center p-8 border border-red-200 rounded-lg bg-red-50">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">데이터 로딩 실패</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">API 사용량 대시보드</h1>
          <p className="text-text-secondary mt-1">
            API 사용 현황과 비용을 실시간으로 모니터링하세요
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 기간 선택 */}
          <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-lg">
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                  selectedPeriod === period
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {period === 'daily' && '일간'}
                {period === 'weekly' && '주간'}
                {period === 'monthly' && '월간'}
              </button>
            ))}
          </div>

          {/* 액션 버튼 */}
          <button
            onClick={downloadReport}
            disabled={!report}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">보고서</span>
          </button>

          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">새로고침</span>
          </button>
        </div>
      </div>

      {/* 메인 위젯 */}
      <ApiUsageWidget
        variant="dashboard"
        showRealTime={true}
        showPredictions={true}
        showAnomalies={true}
        refreshInterval={60000} // 1분
        className="bg-white border border-border-primary rounded-xl p-6"
      />

      {/* 통계 카드 */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 총 요청 수 */}
          <div className="p-4 bg-white rounded-lg border border-border-primary">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-text-secondary">총 요청</span>
              </div>
              <span className="text-xs text-text-tertiary">{selectedPeriod}</span>
            </div>
            <div className="text-2xl font-bold text-text-primary mb-1">
              {metrics.requestCount.toLocaleString()}
            </div>
            <div className="text-xs text-text-secondary">
              평균 {metrics.requestCount > 0 ? Math.round(metrics.requestCount / (selectedPeriod === 'daily' ? 1 : selectedPeriod === 'weekly' ? 7 : 30)) : 0}회/일
            </div>
          </div>

          {/* 총 토큰 */}
          <div className="p-4 bg-white rounded-lg border border-border-primary">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="font-medium text-text-secondary">총 토큰</span>
              </div>
              <span className="text-xs text-text-tertiary">{selectedPeriod}</span>
            </div>
            <div className="text-2xl font-bold text-text-primary mb-1">
              {metrics.tokenUsage.totalTokens.toLocaleString()}
            </div>
            <div className="text-xs text-text-secondary">
              입력: {metrics.tokenUsage.inputTokens.toLocaleString()} |
              출력: {metrics.tokenUsage.outputTokens.toLocaleString()}
            </div>
          </div>

          {/* 총 비용 */}
          <div className="p-4 bg-white rounded-lg border border-border-primary">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span className="font-medium text-text-secondary">총 비용</span>
              </div>
              <span className="text-xs text-text-tertiary">{selectedPeriod}</span>
            </div>
            <div className="text-2xl font-bold text-text-primary mb-1">
              ${metrics.costMetrics.totalCost.toFixed(4)}
            </div>
            <div className="text-xs text-text-secondary">
              평균 ${metrics.requestCount > 0 ? (metrics.costMetrics.totalCost / metrics.requestCount).toFixed(6) : '0'}/요청
            </div>
          </div>

          {/* 평균 응답시간 */}
          <div className="p-4 bg-white rounded-lg border border-border-primary">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                <span className="font-medium text-text-secondary">응답시간</span>
              </div>
              <span className="text-xs text-text-tertiary">{selectedPeriod}</span>
            </div>
            <div className="text-2xl font-bold text-text-primary mb-1">
              {metrics.averageLatency}ms
            </div>
            <div className={cn(
              'text-xs',
              metrics.averageLatency < 1000 ? 'text-green-600' :
              metrics.averageLatency < 2000 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {metrics.averageLatency < 1000 ? '빠름' :
               metrics.averageLatency < 2000 ? '보통' : '느림'}
            </div>
          </div>
        </div>
      )}

      {/* 상세 분석 */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 모델별 사용량 */}
          <div className="bg-white rounded-lg border border-border-primary p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-text-secondary" />
              <h3 className="text-lg font-semibold text-text-primary">모델별 사용량</h3>
            </div>

            {metrics.modelDistribution.length > 0 ? (
              <div className="space-y-3">
                {metrics.modelDistribution.slice(0, 5).map((model, index) => (
                  <div key={model.model} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        index === 0 && 'bg-blue-500',
                        index === 1 && 'bg-green-500',
                        index === 2 && 'bg-yellow-500',
                        index === 3 && 'bg-purple-500',
                        index === 4 && 'bg-red-500'
                      )} />
                      <span className="text-sm font-medium text-text-primary">
                        {model.model}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-text-primary">
                        {model.usage.toLocaleString()}회
                      </div>
                      <div className="text-xs text-text-secondary">
                        {model.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>사용 데이터가 없습니다</p>
              </div>
            )}
          </div>

          {/* 시간대별 분포 */}
          <div className="bg-white rounded-lg border border-border-primary p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-text-secondary" />
              <h3 className="text-lg font-semibold text-text-primary">시간대별 사용량</h3>
            </div>

            {report?.charts?.hourly ? (
              <div className="space-y-2">
                {report.charts.hourly
                  .filter((hour: any) => hour.requests > 0)
                  .sort((a: any, b: any) => b.requests - a.requests)
                  .slice(0, 6)
                  .map((hour: any) => (
                    <div key={hour.hour} className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">
                        {hour.hour}:00 - {hour.hour + 1}:00
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{
                              width: `${(hour.requests / Math.max(...report.charts.hourly.map((h: any) => h.requests))) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-text-primary w-12 text-right">
                          {hour.requests}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>시간대별 데이터가 없습니다</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 권장사항 */}
      {report?.recommendations && report.recommendations.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">개선 권장사항</h3>
          </div>
          <div className="space-y-2">
            {report.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-blue-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 피크 시간 정보 */}
      {metrics?.peakHour && metrics.peakHour.requests > 0 && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-yellow-600" />
            <span className="font-medium text-yellow-800">피크 시간대</span>
          </div>
          <p className="text-sm text-yellow-700">
            가장 많이 사용한 시간: <strong>{metrics.peakHour.hour}:00 - {metrics.peakHour.hour + 1}:00</strong>
            ({metrics.peakHour.requests.toLocaleString()}회)
          </p>
        </div>
      )}
    </div>
  )
}