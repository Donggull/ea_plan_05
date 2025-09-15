import { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Cpu,
  AlertTriangle
} from 'lucide-react'

interface CostData {
  current: {
    today: number
    thisMonth: number
    tokens: number
    requests: number
  }
  previous: {
    yesterday: number
    lastMonth: number
  }
  breakdown: {
    anthropic: number
    openai: number
    google: number
    storage: number
    compute: number
  }
  limits: {
    daily: number
    monthly: number
  }
}

interface CostMonitorProps {
  isCollapsed?: boolean
  className?: string
}

export function CostMonitor({ isCollapsed = false, className = '' }: CostMonitorProps) {
  const [costData] = useState<CostData>({
    current: {
      today: 12.45,
      thisMonth: 342.78,
      tokens: 1200000,
      requests: 2847
    },
    previous: {
      yesterday: 8.92,
      lastMonth: 289.34
    },
    breakdown: {
      anthropic: 187.23,
      openai: 89.45,
      google: 34.12,
      storage: 18.56,
      compute: 13.42
    },
    limits: {
      daily: 50.0,
      monthly: 1000.0
    }
  })

  const [isExpanded, setIsExpanded] = useState(!isCollapsed)

  useEffect(() => {
    setIsExpanded(!isCollapsed)
  }, [isCollapsed])

  // 증감률 계산
  const dailyChange = ((costData.current.today - costData.previous.yesterday) / costData.previous.yesterday * 100)
  const monthlyChange = ((costData.current.thisMonth - costData.previous.lastMonth) / costData.previous.lastMonth * 100)

  // 사용률 계산
  const dailyUsagePercent = (costData.current.today / costData.limits.daily) * 100
  const monthlyUsagePercent = (costData.current.thisMonth / costData.limits.monthly) * 100

  // 위험 수준 계산
  const getDangerLevel = (percent: number) => {
    if (percent >= 90) return 'high'
    if (percent >= 70) return 'medium'
    return 'low'
  }

  const dailyDanger = getDangerLevel(dailyUsagePercent)
  const monthlyDanger = getDangerLevel(monthlyUsagePercent)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3 text-accent-red" />
    if (change < 0) return <TrendingDown className="w-3 h-3 text-accent-green" />
    return <Activity className="w-3 h-3 text-text-muted" />
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-accent-red'
    if (change < 0) return 'text-accent-green'
    return 'text-text-muted'
  }

  const getUsageBarColor = (danger: string) => {
    switch (danger) {
      case 'high': return 'bg-accent-red'
      case 'medium': return 'bg-accent-orange'
      default: return 'bg-accent-green'
    }
  }

  if (isCollapsed) {
    return (
      <div className={`${className}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors relative"
          title="Cost Monitoring"
        >
          <DollarSign className="w-5 h-5 mx-auto" />
          {(dailyDanger === 'high' || monthlyDanger === 'high') && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-red rounded-full"></div>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-accent-green" />
          <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
            Cost Monitor
          </h3>
        </div>
        <Activity className="w-4 h-4 text-accent-green" />
      </div>

      {/* 주요 지표 */}
      <div className="space-y-3">
        {/* 오늘 사용량 */}
        <div className="p-3 bg-bg-tertiary rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-small">Today</span>
            <div className="flex items-center space-x-1">
              {getTrendIcon(dailyChange)}
              <span className={`text-mini font-medium ${getTrendColor(dailyChange)}`}>
                {dailyChange > 0 ? '+' : ''}{dailyChange.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-primary text-regular font-semibold">
              {formatCurrency(costData.current.today)}
            </span>
            <span className="text-text-tertiary text-mini">
              / {formatCurrency(costData.limits.daily)}
            </span>
          </div>
          {/* 사용률 바 */}
          <div className="w-full bg-bg-primary rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${getUsageBarColor(dailyDanger)}`}
              style={{ width: `${Math.min(dailyUsagePercent, 100)}%` }}
            />
          </div>
          {dailyDanger === 'high' && (
            <div className="flex items-center space-x-1 mt-1">
              <AlertTriangle className="w-3 h-3 text-accent-red" />
              <span className="text-accent-red text-mini">Daily limit warning</span>
            </div>
          )}
        </div>

        {/* 이번 달 사용량 */}
        <div className="p-3 bg-bg-tertiary rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-small">This Month</span>
            <div className="flex items-center space-x-1">
              {getTrendIcon(monthlyChange)}
              <span className={`text-mini font-medium ${getTrendColor(monthlyChange)}`}>
                {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-primary text-regular font-semibold">
              {formatCurrency(costData.current.thisMonth)}
            </span>
            <span className="text-text-tertiary text-mini">
              / {formatCurrency(costData.limits.monthly)}
            </span>
          </div>
          {/* 사용률 바 */}
          <div className="w-full bg-bg-primary rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${getUsageBarColor(monthlyDanger)}`}
              style={{ width: `${Math.min(monthlyUsagePercent, 100)}%` }}
            />
          </div>
          {monthlyDanger === 'high' && (
            <div className="flex items-center space-x-1 mt-1">
              <AlertTriangle className="w-3 h-3 text-accent-red" />
              <span className="text-accent-red text-mini">Monthly limit warning</span>
            </div>
          )}
        </div>
      </div>

      {/* 세부 지표 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-3 h-3 text-text-muted" />
            <span className="text-text-secondary text-small">Tokens</span>
          </div>
          <span className="text-text-primary text-small font-medium">
            {formatNumber(costData.current.tokens)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-3 h-3 text-text-muted" />
            <span className="text-text-secondary text-small">Requests</span>
          </div>
          <span className="text-text-primary text-small font-medium">
            {formatNumber(costData.current.requests)}
          </span>
        </div>
      </div>

      {/* 서비스별 분석 (확장 가능) */}
      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-border-secondary">
          <h4 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
            Breakdown
          </h4>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-mini">Anthropic</span>
              <span className="text-text-primary text-mini font-medium">
                {formatCurrency(costData.breakdown.anthropic)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-mini">OpenAI</span>
              <span className="text-text-primary text-mini font-medium">
                {formatCurrency(costData.breakdown.openai)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-mini">Google</span>
              <span className="text-text-primary text-mini font-medium">
                {formatCurrency(costData.breakdown.google)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-mini">Storage</span>
              <span className="text-text-primary text-mini font-medium">
                {formatCurrency(costData.breakdown.storage)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}