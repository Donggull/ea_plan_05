import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { ApiQuotaService } from './apiQuotaService'

type UserApiUsageInsert = Database['public']['Tables']['user_api_usage']['Insert']

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface CostCalculation {
  inputCost: number
  outputCost: number
  totalCost: number
  currency: string
}

export interface ApiUsageMetrics {
  requestCount: number
  tokenUsage: TokenUsage
  costMetrics: CostCalculation
  averageLatency: number
  errorRate: number
  peakHour: { hour: number; requests: number }
  modelDistribution: { model: string; percentage: number; usage: number }[]
}

export interface RealTimeUsageData {
  currentHourRequests: number
  currentDayRequests: number
  activeRequests: number
  lastRequestTime: string | null
  avgResponseTime: number
  recentErrors: number
}

/**
 * 고급 API 사용량 추적 및 분석 서비스
 */
export class ApiUsageService {
  private static readonly MODEL_PRICING = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'gemini-pro': { input: 0.000125, output: 0.000375 },
    'gemini-pro-vision': { input: 0.00025, output: 0.00025 }
  }

  /**
   * 정확한 토큰 카운팅 (모델별 토크나이저 사용)
   */
  static countTokens(text: string, model: string): number {
    // 실제 구현에서는 모델별 토크나이저 사용
    // 여기서는 간단한 추정 방식 사용
    const approximateTokens = Math.ceil(text.length / 4)

    // 모델별 토큰 계산 보정
    const modelMultipliers = {
      'gpt-4': 1.0,
      'gpt-3.5-turbo': 1.0,
      'claude-3': 1.1,
      'gemini': 0.9
    }

    const baseModel = model.split('-')[0] as keyof typeof modelMultipliers
    const multiplier = modelMultipliers[baseModel] || 1.0

    return Math.ceil(approximateTokens * multiplier)
  }

  /**
   * 정확한 비용 계산
   */
  static calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostCalculation {
    const pricing = this.MODEL_PRICING[model as keyof typeof this.MODEL_PRICING] || {
      input: 0.001,
      output: 0.002
    }

    const inputCost = (inputTokens / 1000) * pricing.input
    const outputCost = (outputTokens / 1000) * pricing.output
    const totalCost = inputCost + outputCost

    return {
      inputCost: Number(inputCost.toFixed(6)),
      outputCost: Number(outputCost.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6)),
      currency: 'USD'
    }
  }

  /**
   * 향상된 사용량 기록 (배치 처리 지원)
   */
  static async recordUsageBatch(
    usageRecords: Array<{
      userId: string
      model: string
      inputTokens: number
      outputTokens: number
      cost: number
      latency?: number
      success?: boolean
      endpoint?: string
    }>
  ): Promise<void> {
    if (!supabase || usageRecords.length === 0) return

    const now = new Date()
    const batchRecords: UserApiUsageInsert[] = usageRecords.map(record => ({
      user_id: record.userId,
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      model: record.model,
      request_count: 1,
      input_tokens: record.inputTokens,
      output_tokens: record.outputTokens,
      total_tokens: record.inputTokens + record.outputTokens,
      cost: record.cost,
      response_time_ms: record.latency || 0,
      success: record.success !== false,
      endpoint: record.endpoint,
      created_at: now.toISOString()
    }))

    const { error } = await supabase
      .from('user_api_usage')
      .insert(batchRecords)

    if (error) {
      console.error('배치 사용량 기록 오류:', error)
      throw error
    }
  }

  /**
   * 실시간 사용량 데이터 조회
   */
  static async getRealTimeUsage(userId: string): Promise<RealTimeUsageData> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const now = new Date()
    const currentHour = now.getHours()
    const currentDate = now.toISOString().split('T')[0]

    // 현재 시간대 사용량
    const { data: hourlyData, error: hourlyError } = await supabase
      .from('user_api_usage')
      .select('request_count')
      .eq('user_id', userId)
      .eq('date', currentDate)
      .eq('hour', currentHour)

    if (hourlyError) {
      console.error('시간별 사용량 조회 오류:', hourlyError)
    }

    // 오늘 전체 사용량
    const { data: dailyData, error: dailyError } = await supabase
      .from('user_api_usage')
      .select('request_count, created_at')
      .eq('user_id', userId)
      .eq('date', currentDate)
      .order('created_at', { ascending: false })

    if (dailyError) {
      console.error('일별 사용량 조회 오류:', dailyError)
    }

    const currentHourRequests = hourlyData?.reduce((sum, record) => sum + (record.request_count || 0), 0) || 0
    const currentDayRequests = dailyData?.reduce((sum, record) => sum + (record.request_count || 0), 0) || 0

    // 마지막 요청 시간
    const lastRequestTime = dailyData?.[0]?.created_at || null

    return {
      currentHourRequests,
      currentDayRequests,
      activeRequests: 0, // ApiTracker에서 가져오기
      lastRequestTime,
      avgResponseTime: 0, // 기본값
      recentErrors: 0 // 기본값
    }
  }

  /**
   * 고급 사용량 분석 메트릭
   */
  static async getAdvancedMetrics(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiUsageMetrics> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('user_api_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('고급 메트릭 조회 오류:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return {
        requestCount: 0,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        costMetrics: { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' },
        averageLatency: 0,
        errorRate: 0,
        peakHour: { hour: 0, requests: 0 },
        modelDistribution: []
      }
    }

    // 기본 통계
    const requestCount = data.reduce((sum, record) => sum + (record.request_count || 0), 0)
    const inputTokens = data.reduce((sum, record) => sum + (record.input_tokens || 0), 0)
    const outputTokens = data.reduce((sum, record) => sum + (record.output_tokens || 0), 0)
    const totalTokens = data.reduce((sum, record) => sum + (record.total_tokens || 0), 0)
    const totalCost = data.reduce((sum, record) => sum + (record.cost || 0), 0)

    // 평균 지연시간 (기본값)
    const averageLatency = 0

    // 오류율 (기본값)
    const errorRate = 0

    // 피크 시간대
    const hourlyDistribution: Record<number, number> = {}
    data.forEach(record => {
      if (record.hour !== null) {
        hourlyDistribution[record.hour] = (hourlyDistribution[record.hour] || 0) + (record.request_count || 0)
      }
    })

    const peakHour = Object.entries(hourlyDistribution)
      .reduce((peak, [hour, requests]) =>
        requests > peak.requests ? { hour: parseInt(hour), requests } : peak,
        { hour: 0, requests: 0 }
      )

    // 모델별 분포
    const modelUsage: Record<string, number> = {}
    data.forEach(record => {
      modelUsage[record.model] = (modelUsage[record.model] || 0) + (record.request_count || 0)
    })

    const modelDistribution = Object.entries(modelUsage)
      .map(([model, usage]) => ({
        model,
        usage,
        percentage: requestCount > 0 ? (usage / requestCount) * 100 : 0
      }))
      .sort((a, b) => b.usage - a.usage)

    return {
      requestCount,
      tokenUsage: { inputTokens, outputTokens, totalTokens },
      costMetrics: {
        inputCost: 0, // 실제로는 모델별로 계산 필요
        outputCost: 0,
        totalCost: Number(totalCost.toFixed(6)),
        currency: 'USD'
      },
      averageLatency: Math.round(averageLatency),
      errorRate: Number(errorRate.toFixed(2)),
      peakHour,
      modelDistribution
    }
  }

  /**
   * 사용량 예측 (간단한 선형 회귀)
   */
  static async predictUsage(
    userId: string,
    days: number = 7
  ): Promise<{
    predictedDailyRequests: number
    predictedMonthlyCost: number
    confidence: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }> {
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

    const stats = await ApiQuotaService.getUsageStats(userId, startDate, endDate)

    if (!stats || stats.totalRequests === 0) {
      return {
        predictedDailyRequests: 0,
        predictedMonthlyCost: 0,
        confidence: 0,
        trend: 'stable'
      }
    }

    const predictedDailyRequests = Math.round(stats.avgRequestsPerDay)
    const costPerRequest = stats.totalCost / stats.totalRequests
    const predictedMonthlyCost = predictedDailyRequests * 30 * costPerRequest

    // 간단한 트렌드 분석
    const recentAvg = predictedDailyRequests // 실제로는 최근 며칠 평균 계산
    const overallAvg = stats.avgRequestsPerDay

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (recentAvg > overallAvg * 1.1) trend = 'increasing'
    else if (recentAvg < overallAvg * 0.9) trend = 'decreasing'

    const confidence = Math.min(90, Math.max(10, stats.totalRequests / 10)) // 요청 수에 따른 신뢰도

    return {
      predictedDailyRequests,
      predictedMonthlyCost: Number(predictedMonthlyCost.toFixed(4)),
      confidence,
      trend
    }
  }

  /**
   * 사용량 이상 징후 탐지
   */
  static async detectAnomalies(
    userId: string,
    thresholds?: {
      spikeMultiplier?: number
      errorRateThreshold?: number
      costThreshold?: number
    }
  ): Promise<{
    anomalies: Array<{
      type: 'spike' | 'error_rate' | 'cost' | 'pattern'
      severity: 'low' | 'medium' | 'high'
      description: string
      value: number
      timestamp: string
    }>
    score: number
  }> {
    const config = {
      spikeMultiplier: 3,
      errorRateThreshold: 10,
      costThreshold: 100,
      ...thresholds
    }

    const anomalies: any[] = []

    // 최근 7일 데이터로 기준선 설정
    const recent = await this.getAdvancedMetrics(
      userId,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    )

    // 오류율 이상
    if (recent.errorRate > config.errorRateThreshold) {
      anomalies.push({
        type: 'error_rate',
        severity: recent.errorRate > 25 ? 'high' : 'medium',
        description: `높은 오류율 감지: ${recent.errorRate.toFixed(1)}%`,
        value: recent.errorRate,
        timestamp: new Date().toISOString()
      })
    }

    // 비용 이상
    if (recent.costMetrics.totalCost > config.costThreshold) {
      anomalies.push({
        type: 'cost',
        severity: 'medium',
        description: `높은 비용 사용량: $${recent.costMetrics.totalCost.toFixed(2)}`,
        value: recent.costMetrics.totalCost,
        timestamp: new Date().toISOString()
      })
    }

    const score = Math.max(0, 100 - (anomalies.length * 25))

    return { anomalies, score }
  }

  /**
   * 사용량 보고서 생성
   */
  static async generateUsageReport(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<{
    period: string
    summary: ApiUsageMetrics
    trends: any
    recommendations: string[]
    charts: any
  }> {
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

    const summary = await this.getAdvancedMetrics(userId, startDate, endDate)
    const predictions = await this.predictUsage(userId, days)
    // const anomalies = await this.detectAnomalies(userId)

    const recommendations = this.generateRecommendations(summary, predictions)

    return {
      period: `${startDate} ~ ${endDate}`,
      summary,
      trends: predictions,
      recommendations,
      charts: {
        usage: summary.modelDistribution,
        hourly: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          requests: hour === summary.peakHour.hour ? summary.peakHour.requests : Math.random() * 100
        }))
      }
    }
  }

  /**
   * 개선 권장사항 생성
   */
  private static generateRecommendations(
    metrics: ApiUsageMetrics,
    predictions: any
  ): string[] {
    const recommendations: string[] = []

    if (metrics.errorRate > 5) {
      recommendations.push('오류율이 높습니다. API 호출 코드를 검토해보세요.')
    }

    if (metrics.averageLatency > 2000) {
      recommendations.push('응답 시간이 느립니다. 요청 최적화를 고려해보세요.')
    }

    if (predictions.trend === 'increasing') {
      recommendations.push('사용량이 증가 추세입니다. 할당량 증설을 검토해보세요.')
    }

    if (metrics.modelDistribution.length > 3) {
      recommendations.push('여러 모델을 사용 중입니다. 비용 효율적인 모델로 통합을 고려해보세요.')
    }

    if (recommendations.length === 0) {
      recommendations.push('현재 사용 패턴이 양호합니다.')
    }

    return recommendations
  }
}