import { useEffect, useState, useMemo } from 'react'
import { ApiQuotaService, type ApiQuotaInfo } from '@/services/apiQuotaService'
import { ApiUsageService, type RealTimeUsageData, type ApiUsageMetrics } from '@/services/apiUsageService'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'
import {
  AlertTriangle,
  TrendingUp,
  Zap,
  Activity,
  DollarSign,
  Clock,
  BarChart3,
  RefreshCw
} from 'lucide-react'

interface ApiUsageWidgetProps {
  userId?: string
  variant?: 'compact' | 'detailed' | 'dashboard'
  showRealTime?: boolean
  showPredictions?: boolean
  showAnomalies?: boolean
  refreshInterval?: number
  className?: string
}

export function ApiUsageWidget({
  userId,
  variant = 'detailed',
  showRealTime = true,
  showPredictions = false,
  showAnomalies = false,
  refreshInterval = 30000, // 30초
  className
}: ApiUsageWidgetProps) {
  const { user } = useAuth()
  const [quotaInfo, setQuotaInfo] = useState<ApiQuotaInfo | null>(null)
  const [realTimeData, setRealTimeData] = useState<RealTimeUsageData | null>(null)
  const [metrics, setMetrics] = useState<ApiUsageMetrics | null>(null)
  const [predictions, setPredictions] = useState<any>(null)
  const [anomalies, setAnomalies] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const targetUserId = userId || user?.id

  // 데이터 로딩 함수
  const loadData = async () => {
    if (!targetUserId) return

    try {
      setLoading(true)

      // 기본 할당량 정보
      const quota = await ApiQuotaService.getUserQuotaInfo(targetUserId)
      setQuotaInfo(quota)

      // 실시간 데이터
      if (showRealTime) {
        const realTime = await ApiUsageService.getRealTimeUsage(targetUserId)
        setRealTimeData(realTime)
      }

      // 상세 메트릭 (최근 7일)
      if (variant === 'detailed' || variant === 'dashboard') {
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const metricsData = await ApiUsageService.getAdvancedMetrics(targetUserId, startDate, endDate)
        setMetrics(metricsData)
      }

      // 예측 데이터
      if (showPredictions) {
        const predictionData = await ApiUsageService.predictUsage(targetUserId, 7)
        setPredictions(predictionData)
      }

      // 이상 징후 탐지
      if (showAnomalies) {
        const anomalyData = await ApiUsageService.detectAnomalies(targetUserId)
        setAnomalies(anomalyData)
      }

      setError(null)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('API 사용량 위젯 데이터 로딩 오류:', err)
      setError('데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  // 초기 로딩 및 주기적 업데이트
  useEffect(() => {
    loadData()

    if (refreshInterval > 0) {
      const interval = setInterval(loadData, refreshInterval)
      return () => clearInterval(interval)
    }
    // No cleanup needed when refreshInterval is 0
    return undefined
  }, [targetUserId, refreshInterval])

  // 진행률 계산
  const progressData = useMemo(() => {
    if (!quotaInfo) return null

    const getDailyProgress = () => {
      if (quotaInfo.isUnlimited) return { percentage: 0, color: 'green', status: 'unlimited' }
      const percentage = (quotaInfo.dailyUsed / quotaInfo.dailyQuota) * 100
      let color = 'green'
      let status = 'normal'

      if (percentage >= 95) {
        color = 'red'
        status = 'critical'
      } else if (percentage >= 80) {
        color = 'yellow'
        status = 'warning'
      }

      return { percentage: Math.min(percentage, 100), color, status }
    }

    const getMonthlyProgress = () => {
      if (quotaInfo.isUnlimited) return { percentage: 0, color: 'green', status: 'unlimited' }
      const percentage = (quotaInfo.monthlyUsed / quotaInfo.monthlyQuota) * 100
      let color = 'green'
      let status = 'normal'

      if (percentage >= 95) {
        color = 'red'
        status = 'critical'
      } else if (percentage >= 80) {
        color = 'yellow'
        status = 'warning'
      }

      return { percentage: Math.min(percentage, 100), color, status }
    }

    return {
      daily: getDailyProgress(),
      monthly: getMonthlyProgress()
    }
  }, [quotaInfo])

  // 로딩 상태
  if (loading && !quotaInfo) {
    return (
      <div className={cn('animate-pulse space-y-4', className)}>
        <div className="h-6 bg-bg-tertiary rounded"></div>
        <div className="h-20 bg-bg-tertiary rounded"></div>
        {variant !== 'compact' && (
          <>
            <div className="h-16 bg-bg-tertiary rounded"></div>
            <div className="h-12 bg-bg-tertiary rounded"></div>
          </>
        )}
      </div>
    )
  }

  // 오류 상태
  if (error || !quotaInfo) {
    return (
      <div className={cn('text-center p-4 border border-red-200 rounded-lg bg-red-50', className)}>
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-700">{error || 'API 사용량 정보를 불러올 수 없습니다'}</p>
        <button
          onClick={loadData}
          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
        >
          다시 시도
        </button>
      </div>
    )
  }

  // 컴팩트 뷰
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-3', className)}>
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">API 사용량</h3>
          <button
            onClick={loadData}
            className="p-1 hover:bg-bg-secondary rounded"
            disabled={loading}
          >
            <RefreshCw className={cn('w-3 h-3 text-text-secondary', loading && 'animate-spin')} />
          </button>
        </div>

        {/* 일일 사용량 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">오늘</span>
            {quotaInfo.isUnlimited ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <Zap className="w-3 h-3" />
                무제한
              </span>
            ) : (
              <span className="text-text-primary font-medium">
                {quotaInfo.dailyUsed.toLocaleString()} / {quotaInfo.dailyQuota.toLocaleString()}
              </span>
            )}
          </div>

          {!quotaInfo.isUnlimited && progressData && (
            <div className="w-full bg-bg-tertiary rounded-full h-1.5">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  progressData.daily.color === 'red' && 'bg-red-500',
                  progressData.daily.color === 'yellow' && 'bg-yellow-500',
                  progressData.daily.color === 'green' && 'bg-green-500'
                )}
                style={{ width: `${progressData.daily.percentage}%` }}
              />
            </div>
          )}
        </div>

        {/* 실시간 정보 */}
        {showRealTime && realTimeData && (
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>현재 시간</span>
            <span>{realTimeData.currentHourRequests}회</span>
          </div>
        )}
      </div>
    )
  }

  // 상세 뷰
  return (
    <div className={cn('space-y-6', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-text-secondary" />
          <h3 className="text-lg font-semibold text-text-primary">API 사용량 모니터링</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">
            {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={loadData}
            className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4 text-text-secondary', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* 실시간 상태 */}
      {showRealTime && realTimeData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-text-secondary">현재 시간</span>
            </div>
            <span className="text-lg font-bold text-text-primary">
              {realTimeData.currentHourRequests}
            </span>
          </div>

          <div className="p-3 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-text-secondary">오늘</span>
            </div>
            <span className="text-lg font-bold text-text-primary">
              {realTimeData.currentDayRequests}
            </span>
          </div>

          <div className="p-3 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-text-secondary">응답시간</span>
            </div>
            <span className="text-lg font-bold text-text-primary">
              {realTimeData.avgResponseTime}ms
            </span>
          </div>

          <div className="p-3 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={cn(
                'w-4 h-4',
                realTimeData.recentErrors > 0 ? 'text-red-500' : 'text-gray-400'
              )} />
              <span className="text-xs font-medium text-text-secondary">오류</span>
            </div>
            <span className="text-lg font-bold text-text-primary">
              {realTimeData.recentErrors}
            </span>
          </div>
        </div>
      )}

      {/* 할당량 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 일일 할당량 */}
        <div className={cn(
          'p-4 rounded-lg border-2 transition-all duration-300',
          progressData?.daily.status === 'critical' && 'border-red-200 bg-red-50',
          progressData?.daily.status === 'warning' && 'border-yellow-200 bg-yellow-50',
          progressData?.daily.status === 'normal' && 'border-green-200 bg-green-50',
          quotaInfo.isUnlimited && 'border-blue-200 bg-blue-50'
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-text-secondary" />
              <span className="font-medium text-text-primary">일일 사용량</span>
            </div>
            {progressData?.daily.status === 'critical' && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>

          {quotaInfo.isUnlimited ? (
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-bold text-blue-800">무제한</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">
                  사용: {quotaInfo.dailyUsed.toLocaleString()}
                </span>
                <span className="text-text-secondary">
                  할당량: {quotaInfo.dailyQuota.toLocaleString()}
                </span>
              </div>

              <div className="w-full bg-white/60 rounded-full h-3 mb-2">
                <div
                  className={cn(
                    'h-3 rounded-full transition-all duration-500',
                    progressData?.daily.color === 'red' && 'bg-red-500',
                    progressData?.daily.color === 'yellow' && 'bg-yellow-500',
                    progressData?.daily.color === 'green' && 'bg-green-500'
                  )}
                  style={{ width: `${progressData?.daily.percentage || 0}%` }}
                />
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-text-tertiary">
                  {progressData?.daily.percentage.toFixed(1)}% 사용
                </span>
                <span className="text-text-tertiary">
                  잔여: {quotaInfo.dailyRemaining.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 월간 할당량 */}
        <div className={cn(
          'p-4 rounded-lg border-2 transition-all duration-300',
          progressData?.monthly.status === 'critical' && 'border-red-200 bg-red-50',
          progressData?.monthly.status === 'warning' && 'border-yellow-200 bg-yellow-50',
          progressData?.monthly.status === 'normal' && 'border-green-200 bg-green-50',
          quotaInfo.isUnlimited && 'border-blue-200 bg-blue-50'
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-text-secondary" />
              <span className="font-medium text-text-primary">월간 사용량</span>
            </div>
            {progressData?.monthly.status === 'critical' && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>

          {quotaInfo.isUnlimited ? (
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-bold text-blue-800">무제한</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">
                  사용: {quotaInfo.monthlyUsed.toLocaleString()}
                </span>
                <span className="text-text-secondary">
                  할당량: {quotaInfo.monthlyQuota.toLocaleString()}
                </span>
              </div>

              <div className="w-full bg-white/60 rounded-full h-3 mb-2">
                <div
                  className={cn(
                    'h-3 rounded-full transition-all duration-500',
                    progressData?.monthly.color === 'red' && 'bg-red-500',
                    progressData?.monthly.color === 'yellow' && 'bg-yellow-500',
                    progressData?.monthly.color === 'green' && 'bg-green-500'
                  )}
                  style={{ width: `${progressData?.monthly.percentage || 0}%` }}
                />
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-text-tertiary">
                  {progressData?.monthly.percentage.toFixed(1)}% 사용
                </span>
                <span className="text-text-tertiary">
                  잔여: {quotaInfo.monthlyRemaining.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 메트릭 정보 */}
      {metrics && variant === 'detailed' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-text-secondary">총 비용</span>
            </div>
            <span className="text-xl font-bold text-text-primary">
              ${metrics.costMetrics.totalCost.toFixed(4)}
            </span>
            <p className="text-xs text-text-tertiary mt-1">최근 7일</p>
          </div>

          <div className="p-4 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-text-secondary">평균 응답시간</span>
            </div>
            <span className="text-xl font-bold text-text-primary">
              {metrics.averageLatency}ms
            </span>
            <p className="text-xs text-text-tertiary mt-1">최근 7일</p>
          </div>

          <div className="p-4 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={cn(
                'w-4 h-4',
                metrics.errorRate > 5 ? 'text-red-500' : 'text-green-500'
              )} />
              <span className="text-sm font-medium text-text-secondary">오류율</span>
            </div>
            <span className="text-xl font-bold text-text-primary">
              {metrics.errorRate.toFixed(1)}%
            </span>
            <p className="text-xs text-text-tertiary mt-1">최근 7일</p>
          </div>
        </div>
      )}

      {/* 예측 정보 */}
      {showPredictions && predictions && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">사용량 예측</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600">일일 예상:</span>
              <span className="ml-2 font-semibold">{predictions.predictedDailyRequests}회</span>
            </div>
            <div>
              <span className="text-blue-600">월간 예상 비용:</span>
              <span className="ml-2 font-semibold">${predictions.predictedMonthlyCost}</span>
            </div>
            <div>
              <span className="text-blue-600">트렌드:</span>
              <span className={cn(
                'ml-2 font-semibold',
                predictions.trend === 'increasing' && 'text-red-600',
                predictions.trend === 'decreasing' && 'text-green-600',
                predictions.trend === 'stable' && 'text-blue-600'
              )}>
                {predictions.trend === 'increasing' && '증가'}
                {predictions.trend === 'decreasing' && '감소'}
                {predictions.trend === 'stable' && '안정'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 이상 징후 알림 */}
      {showAnomalies && anomalies && anomalies.anomalies.length > 0 && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-medium text-red-800">이상 징후 감지</span>
          </div>
          <div className="space-y-2">
            {anomalies.anomalies.map((anomaly: any, index: number) => (
              <div key={index} className="text-sm text-red-700">
                <span className={cn(
                  'inline-block w-2 h-2 rounded-full mr-2',
                  anomaly.severity === 'high' && 'bg-red-500',
                  anomaly.severity === 'medium' && 'bg-yellow-500',
                  anomaly.severity === 'low' && 'bg-blue-500'
                )} />
                {anomaly.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 추가 할당량 정보 */}
      {quotaInfo.additionalQuota > 0 && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-purple-800">추가 할당량</span>
          </div>
          <p className="text-sm text-purple-700">
            관리자로부터 부여받은 추가 API 할당량: {quotaInfo.additionalQuota.toLocaleString()}회
          </p>
        </div>
      )}

      {/* 경고 메시지 */}
      {!quotaInfo.isUnlimited && progressData && (
        (progressData.daily.status === 'critical' || progressData.monthly.status === 'critical') && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-800">할당량 부족 경고</span>
            </div>
            <p className="text-sm text-red-700 mb-3">
              API 할당량이 거의 소진되었습니다. 서비스 중단을 방지하기 위해 즉시 조치가 필요합니다.
            </p>
            <div className="space-y-1 text-xs text-red-600">
              <p>• 불필요한 API 호출을 줄여주세요</p>
              <p>• 캐싱을 활용하여 중복 요청을 방지하세요</p>
              <p>• 관리자에게 추가 할당량을 요청하세요</p>
            </div>
          </div>
        )
      )}
    </div>
  )
}