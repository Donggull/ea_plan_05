import { useEffect, useState } from 'react'
import { ApiQuotaService, type ApiQuotaInfo } from '@/services/apiQuotaService'
import { useAuth } from '@/components/providers/AuthProvider'
import { cn } from '@/utils/cn'
import { AlertTriangle, TrendingUp, Zap } from 'lucide-react'

interface ApiUsageProgressProps {
  userId?: string
  showDetails?: boolean
  className?: string
}

export function ApiUsageProgress({
  userId,
  showDetails = false,
  className
}: ApiUsageProgressProps) {
  const { user } = useAuth()
  const [quotaInfo, setQuotaInfo] = useState<ApiQuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const targetUserId = userId || user?.id

  useEffect(() => {
    if (!targetUserId) return

    const fetchQuotaInfo = async () => {
      try {
        setLoading(true)
        const info = await ApiQuotaService.getUserQuotaInfo(targetUserId)
        setQuotaInfo(info)
        setError(null)
      } catch (err) {
        console.error('Error fetching quota info:', err)
        setError('할당량 정보를 불러올 수 없습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchQuotaInfo()
  }, [targetUserId])

  if (loading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-4 bg-bg-tertiary rounded mb-2"></div>
        <div className="h-2 bg-bg-tertiary rounded"></div>
      </div>
    )
  }

  if (error || !quotaInfo) {
    return (
      <div className={cn('text-sm text-text-secondary', className)}>
        {error || 'API 사용량 정보 없음'}
      </div>
    )
  }

  const getDailyUsagePercentage = () => {
    if (quotaInfo.isUnlimited) return 0
    return (quotaInfo.dailyUsed / quotaInfo.dailyQuota) * 100
  }

  const getMonthlyUsagePercentage = () => {
    if (quotaInfo.isUnlimited) return 0
    return (quotaInfo.monthlyUsed / quotaInfo.monthlyQuota) * 100
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getBackgroundColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-50'
    if (percentage >= 75) return 'bg-yellow-50'
    return 'bg-green-50'
  }

  const dailyPercentage = getDailyUsagePercentage()
  const monthlyPercentage = getMonthlyUsagePercentage()

  if (!showDetails) {
    // 간단한 프로그레스바만 표시
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">일일 사용량</span>
          {quotaInfo.isUnlimited ? (
            <span className="text-text-primary font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" />
              무제한
            </span>
          ) : (
            <span className="text-text-primary font-medium">
              {quotaInfo.dailyUsed.toLocaleString()} / {quotaInfo.dailyQuota.toLocaleString()}
            </span>
          )}
        </div>
        {!quotaInfo.isUnlimited && (
          <div className="w-full bg-bg-tertiary rounded-full h-2">
            <div
              className={cn('h-2 rounded-full transition-all duration-300', getProgressColor(dailyPercentage))}
              style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  // 상세 정보 표시
  return (
    <div className={cn('space-y-4', className)}>
      {quotaInfo.isUnlimited && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <Zap className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">무제한 사용 계정</span>
        </div>
      )}

      {/* 일일 사용량 */}
      <div className={cn('p-4 rounded-lg border', getBackgroundColor(dailyPercentage))}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-text-secondary" />
            <span className="font-medium text-text-primary">일일 사용량</span>
          </div>
          {dailyPercentage >= 90 && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </div>

        {!quotaInfo.isUnlimited && (
          <>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">
                사용: {quotaInfo.dailyUsed.toLocaleString()}
              </span>
              <span className="text-text-secondary">
                할당량: {quotaInfo.dailyQuota.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2 mb-2">
              <div
                className={cn('h-2 rounded-full transition-all duration-300', getProgressColor(dailyPercentage))}
                style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-tertiary">
                {dailyPercentage.toFixed(1)}% 사용됨
              </span>
              <span className="text-text-tertiary">
                잔여: {quotaInfo.dailyRemaining.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 월간 사용량 */}
      <div className={cn('p-4 rounded-lg border', getBackgroundColor(monthlyPercentage))}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-text-secondary" />
            <span className="font-medium text-text-primary">월간 사용량</span>
          </div>
          {monthlyPercentage >= 90 && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </div>

        {!quotaInfo.isUnlimited && (
          <>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">
                사용: {quotaInfo.monthlyUsed.toLocaleString()}
              </span>
              <span className="text-text-secondary">
                할당량: {quotaInfo.monthlyQuota.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2 mb-2">
              <div
                className={cn('h-2 rounded-full transition-all duration-300', getProgressColor(monthlyPercentage))}
                style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-tertiary">
                {monthlyPercentage.toFixed(1)}% 사용됨
              </span>
              <span className="text-text-tertiary">
                잔여: {quotaInfo.monthlyRemaining.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 추가 할당량 정보 */}
      {quotaInfo.additionalQuota > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              추가 할당량: {quotaInfo.additionalQuota.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            관리자로부터 부여받은 추가 API 할당량입니다.
          </p>
        </div>
      )}

      {/* 경고 메시지 */}
      {!quotaInfo.isUnlimited && (dailyPercentage >= 90 || monthlyPercentage >= 90) && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              할당량 부족 경고
            </span>
          </div>
          <p className="text-xs text-red-600 mt-1">
            API 할당량이 부족합니다. 추가 할당량이 필요한 경우 관리자에게 문의하세요.
          </p>
        </div>
      )}
    </div>
  )
}