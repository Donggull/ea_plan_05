// import { modelSettingsService } from './modelSettingsService' // 현재 사용하지 않음
import { supabase } from '@/lib/supabase'

// 성능 메트릭 타입
interface PerformanceMetrics {
  model_id: string
  date: string
  hour?: number
  total_requests: number
  successful_requests: number
  failed_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost: number
  avg_response_time: number
  avg_queue_time: number
  error_rate: number
  created_at?: string
}

// 실시간 성능 데이터
interface RealTimePerformance {
  model_id: string
  model_name: string
  provider: string
  current_requests_per_minute: number
  avg_response_time_last_hour: number
  error_rate_last_hour: number
  success_rate_last_hour: number
  total_tokens_last_hour: number
  total_cost_last_hour: number
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  last_updated: string
}

// 성능 추세 분석
interface PerformanceTrend {
  model_id: string
  period: 'hour' | 'day' | 'week' | 'month'
  metrics: {
    avg_response_time: {
      current: number
      previous: number
      trend: 'improving' | 'stable' | 'degrading'
      change_percentage: number
    }
    error_rate: {
      current: number
      previous: number
      trend: 'improving' | 'stable' | 'degrading'
      change_percentage: number
    }
    throughput: {
      current: number
      previous: number
      trend: 'improving' | 'stable' | 'degrading'
      change_percentage: number
    }
    cost_efficiency: {
      current: number
      previous: number
      trend: 'improving' | 'stable' | 'degrading'
      change_percentage: number
    }
  }
}

// 성능 알림 설정 (향후 확장을 위해 주석 처리)
// interface PerformanceAlert {
//   id?: string
//   model_id: string
//   alert_type: 'response_time' | 'error_rate' | 'availability' | 'cost_spike'
//   threshold: number
//   comparison: 'greater_than' | 'less_than' | 'percentage_change'
//   enabled: boolean
//   notification_channels: ('email' | 'slack' | 'webhook')[]
//   created_by?: string
//   created_at?: string
// }

// 성능 보고서
interface PerformanceReport {
  period: {
    start: string
    end: string
    type: 'daily' | 'weekly' | 'monthly'
  }
  summary: {
    total_requests: number
    total_tokens: number
    total_cost: number
    avg_response_time: number
    overall_error_rate: number
    uptime_percentage: number
  }
  models: Array<{
    model_id: string
    model_name: string
    provider: string
    requests: number
    tokens: number
    cost: number
    avg_response_time: number
    error_rate: number
    uptime: number
    performance_score: number
    rank: number
  }>
  recommendations: string[]
}

// 이상 탐지 결과
interface AnomalyDetection {
  model_id: string
  timestamp: string
  anomaly_type: 'response_time_spike' | 'error_rate_spike' | 'unusual_traffic' | 'cost_anomaly'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metrics: {
    current_value: number
    expected_value: number
    deviation_percentage: number
  }
  suggested_actions: string[]
}

class PerformanceMonitoringService {
  private readonly PERFORMANCE_THRESHOLDS = {
    response_time: {
      excellent: 1000,  // ms
      good: 3000,
      warning: 5000,
      critical: 10000
    },
    error_rate: {
      excellent: 0.5,   // %
      good: 2.0,
      warning: 5.0,
      critical: 10.0
    },
    availability: {
      excellent: 99.9,  // %
      good: 99.0,
      warning: 95.0,
      critical: 90.0
    }
  }

  // ============== 성능 데이터 수집 ==============

  /**
   * 모델 성능 메트릭을 기록합니다
   */
  async recordPerformanceMetrics(metrics: Omit<PerformanceMetrics, 'created_at'>): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase client not initialized')
      const { error } = await supabase
        .from('ai_model_performance')
        .upsert([metrics], {
          onConflict: 'model_id,date,hour',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('Error recording performance metrics:', error)
        throw new Error('성능 메트릭 기록에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error in recordPerformanceMetrics:', error)
      throw error
    }
  }

  /**
   * 실시간 성능 메트릭을 업데이트합니다
   */
  async updateRealTimeMetrics(
    modelId: string,
    responseTime: number,
    success: boolean,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): Promise<void> {
    const now = new Date()
    const hour = now.getHours()
    const date = now.toISOString().split('T')[0]

    try {
      // 현재 시간대 메트릭 가져오기
      if (!supabase) throw new Error('Supabase client not initialized')
      const { data: existing } = await supabase
        .from('ai_model_performance')
        .select('*')
        .eq('model_id', modelId)
        .eq('date', date)
        .eq('hour', hour)
        .single()

      const metrics: Omit<PerformanceMetrics, 'created_at'> = {
        model_id: modelId,
        date,
        hour,
        total_requests: (existing?.total_requests || 0) + 1,
        successful_requests: (existing?.successful_requests || 0) + (success ? 1 : 0),
        failed_requests: (existing?.failed_requests || 0) + (success ? 0 : 1),
        total_input_tokens: (existing?.total_input_tokens || 0) + inputTokens,
        total_output_tokens: (existing?.total_output_tokens || 0) + outputTokens,
        total_cost: (existing?.total_cost || 0) + cost,
        avg_response_time: this.calculateMovingAverage(
          existing?.avg_response_time || 0,
          responseTime,
          existing?.total_requests || 0
        ),
        avg_queue_time: existing?.avg_queue_time || 0,
        error_rate: this.calculateErrorRate(
          (existing?.failed_requests || 0) + (success ? 0 : 1),
          (existing?.total_requests || 0) + 1
        )
      }

      await this.recordPerformanceMetrics(metrics)

      // 이상 탐지 실행
      await this.detectAnomalies(modelId, metrics)

    } catch (error) {
      console.error('Error updating real-time metrics:', error)
    }
  }

  // ============== 실시간 성능 모니터링 ==============

  /**
   * 실시간 성능 데이터를 가져옵니다
   */
  async getRealTimePerformance(): Promise<RealTimePerformance[]> {
    try {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      if (!supabase) throw new Error('Supabase client not initialized')
      const { data: performanceData, error } = await supabase
        .from('ai_model_performance')
        .select(`
          *,
          ai_models!inner(name, provider, status)
        `)
        .gte('created_at', oneHourAgo.toISOString())

      if (error) throw error

      // 모델별로 데이터 집계
      const modelMetrics = new Map<string, any>()

      performanceData?.forEach(record => {
        const modelId = record.model_id
        if (!modelMetrics.has(modelId)) {
          modelMetrics.set(modelId, {
            model_id: modelId,
            model_name: record.ai_models.name,
            provider: record.ai_models.provider,
            status: record.ai_models.status,
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            total_response_time: 0,
            total_tokens: 0,
            total_cost: 0,
            last_updated: record.created_at
          })
        }

        const metrics = modelMetrics.get(modelId)
        metrics.total_requests += record.total_requests || 0
        metrics.successful_requests += record.successful_requests || 0
        metrics.failed_requests += record.failed_requests || 0
        metrics.total_response_time += (record.avg_response_time || 0) * (record.total_requests || 0)
        metrics.total_tokens += (record.total_input_tokens || 0) + (record.total_output_tokens || 0)
        metrics.total_cost += record.total_cost || 0
        if (record.created_at && record.created_at > metrics.last_updated) {
          metrics.last_updated = record.created_at
        }
      })

      // 실시간 성능 객체로 변환
      return Array.from(modelMetrics.values()).map(metrics => {
        const avgResponseTime = metrics.total_requests > 0
          ? metrics.total_response_time / metrics.total_requests
          : 0

        const errorRate = metrics.total_requests > 0
          ? (metrics.failed_requests / metrics.total_requests) * 100
          : 0

        const successRate = 100 - errorRate

        return {
          model_id: metrics.model_id,
          model_name: metrics.model_name,
          provider: metrics.provider,
          current_requests_per_minute: metrics.total_requests,
          avg_response_time_last_hour: avgResponseTime,
          error_rate_last_hour: errorRate,
          success_rate_last_hour: successRate,
          total_tokens_last_hour: metrics.total_tokens,
          total_cost_last_hour: metrics.total_cost,
          status: this.determineHealthStatus(avgResponseTime, errorRate, metrics.status),
          last_updated: metrics.last_updated
        }
      })

    } catch (error) {
      console.error('Error getting real-time performance:', error)
      return []
    }
  }

  // ============== 성능 추세 분석 ==============

  /**
   * 성능 추세를 분석합니다
   */
  async analyzePerformanceTrend(
    modelId: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<PerformanceTrend | null> {
    try {
      const { currentPeriod, previousPeriod } = this.getPeriodRanges(period)

      // 현재 기간 데이터
      const currentData = await this.getAggregatedMetrics(modelId, currentPeriod.start, currentPeriod.end)

      // 이전 기간 데이터
      const previousData = await this.getAggregatedMetrics(modelId, previousPeriod.start, previousPeriod.end)

      if (!currentData || !previousData) return null

      return {
        model_id: modelId,
        period,
        metrics: {
          avg_response_time: this.calculateTrendMetric(
            currentData.avg_response_time,
            previousData.avg_response_time,
            'lower_is_better'
          ),
          error_rate: this.calculateTrendMetric(
            currentData.error_rate,
            previousData.error_rate,
            'lower_is_better'
          ),
          throughput: this.calculateTrendMetric(
            currentData.total_requests,
            previousData.total_requests,
            'higher_is_better'
          ),
          cost_efficiency: this.calculateTrendMetric(
            currentData.cost_per_token,
            previousData.cost_per_token,
            'lower_is_better'
          )
        }
      }

    } catch (error) {
      console.error('Error analyzing performance trend:', error)
      return null
    }
  }

  // ============== 이상 탐지 ==============

  /**
   * 성능 이상을 탐지합니다
   */
  async detectAnomalies(modelId: string, currentMetrics: PerformanceMetrics): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    try {
      // 최근 7일 평균 계산
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const historicalData = await this.getAggregatedMetrics(
        modelId,
        weekAgo.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      )

      if (!historicalData) return anomalies

      // 응답 시간 이상 탐지
      if (this.isAnomalous(currentMetrics.avg_response_time, historicalData.avg_response_time, 2.0)) {
        anomalies.push({
          model_id: modelId,
          timestamp: new Date().toISOString(),
          anomaly_type: 'response_time_spike',
          severity: this.determineSeverity(
            currentMetrics.avg_response_time,
            historicalData.avg_response_time,
            2.0
          ),
          description: `응답 시간이 평균보다 ${((currentMetrics.avg_response_time / historicalData.avg_response_time - 1) * 100).toFixed(1)}% 증가했습니다`,
          metrics: {
            current_value: currentMetrics.avg_response_time,
            expected_value: historicalData.avg_response_time,
            deviation_percentage: ((currentMetrics.avg_response_time / historicalData.avg_response_time - 1) * 100)
          },
          suggested_actions: [
            'API 서버 상태 확인',
            '네트워크 지연 시간 모니터링',
            '요청 크기 및 복잡도 검토'
          ]
        })
      }

      // 에러율 이상 탐지
      if (this.isAnomalous(currentMetrics.error_rate, historicalData.error_rate, 1.5)) {
        anomalies.push({
          model_id: modelId,
          timestamp: new Date().toISOString(),
          anomaly_type: 'error_rate_spike',
          severity: this.determineSeverity(
            currentMetrics.error_rate,
            historicalData.error_rate,
            1.5
          ),
          description: `에러율이 평균보다 ${((currentMetrics.error_rate / historicalData.error_rate - 1) * 100).toFixed(1)}% 증가했습니다`,
          metrics: {
            current_value: currentMetrics.error_rate,
            expected_value: historicalData.error_rate,
            deviation_percentage: ((currentMetrics.error_rate / historicalData.error_rate - 1) * 100)
          },
          suggested_actions: [
            'API 키 및 권한 확인',
            '요청 형식 및 파라미터 검증',
            '서비스 상태 페이지 확인'
          ]
        })
      }

      return anomalies

    } catch (error) {
      console.error('Error detecting anomalies:', error)
      return []
    }
  }

  // ============== 성능 보고서 생성 ==============

  /**
   * 성능 보고서를 생성합니다
   */
  async generatePerformanceReport(
    startDate: string,
    endDate: string,
    type: 'daily' | 'weekly' | 'monthly'
  ): Promise<PerformanceReport> {
    try {
      if (!supabase) throw new Error('Supabase client not initialized')
      const { data: performanceData, error } = await supabase
        .from('ai_model_performance')
        .select(`
          *,
          ai_models!inner(name, provider)
        `)
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      // 전체 요약 계산
      const summary = this.calculateSummaryMetrics(performanceData || [])

      // 모델별 성능 데이터 계산
      const modelMetrics = this.calculateModelMetrics(performanceData || [])

      // 성능 점수 및 순위 계산
      const rankedModels = this.rankModelsByPerformance(modelMetrics)

      // 권장사항 생성
      const recommendations = this.generateRecommendations(rankedModels, summary)

      return {
        period: {
          start: startDate,
          end: endDate,
          type
        },
        summary,
        models: rankedModels,
        recommendations
      }

    } catch (error) {
      console.error('Error generating performance report:', error)
      throw new Error('성능 보고서 생성에 실패했습니다.')
    }
  }

  // ============== 유틸리티 메서드 ==============

  private calculateMovingAverage(currentAvg: number, newValue: number, count: number): number {
    if (count === 0) return newValue
    return ((currentAvg * count) + newValue) / (count + 1)
  }

  private calculateErrorRate(failedRequests: number, totalRequests: number): number {
    if (totalRequests === 0) return 0
    return (failedRequests / totalRequests) * 100
  }

  private determineHealthStatus(
    responseTime: number,
    errorRate: number,
    modelStatus: string
  ): 'healthy' | 'warning' | 'critical' | 'offline' {
    if (modelStatus !== 'active') return 'offline'

    if (
      responseTime > this.PERFORMANCE_THRESHOLDS.response_time.critical ||
      errorRate > this.PERFORMANCE_THRESHOLDS.error_rate.critical
    ) {
      return 'critical'
    }

    if (
      responseTime > this.PERFORMANCE_THRESHOLDS.response_time.warning ||
      errorRate > this.PERFORMANCE_THRESHOLDS.error_rate.warning
    ) {
      return 'warning'
    }

    return 'healthy'
  }

  private getPeriodRanges(period: 'hour' | 'day' | 'week' | 'month') {
    const now = new Date()
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date

    switch (period) {
      case 'hour':
        currentEnd = now
        currentStart = new Date(now.getTime() - 60 * 60 * 1000)
        previousEnd = currentStart
        previousStart = new Date(currentStart.getTime() - 60 * 60 * 1000)
        break
      case 'day':
        currentEnd = now
        currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        previousEnd = currentStart
        previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        currentEnd = now
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        previousEnd = currentStart
        previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        currentEnd = now
        currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        previousEnd = currentStart
        previousStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    return {
      currentPeriod: {
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      },
      previousPeriod: {
        start: previousStart.toISOString().split('T')[0],
        end: previousEnd.toISOString().split('T')[0]
      }
    }
  }

  private async getAggregatedMetrics(modelId: string, startDate: string, endDate: string) {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('ai_model_performance')
      .select('*')
      .eq('model_id', modelId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error || !data || data.length === 0) return null

    const totals = data.reduce((acc, record) => ({
      total_requests: acc.total_requests + (record.total_requests || 0),
      successful_requests: acc.successful_requests + (record.successful_requests || 0),
      failed_requests: acc.failed_requests + (record.failed_requests || 0),
      total_response_time: acc.total_response_time + ((record.avg_response_time || 0) * (record.total_requests || 0)),
      total_tokens: acc.total_tokens + (record.total_input_tokens || 0) + (record.total_output_tokens || 0),
      total_cost: acc.total_cost + (record.total_cost || 0)
    }), {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      total_response_time: 0,
      total_tokens: 0,
      total_cost: 0
    })

    return {
      avg_response_time: totals.total_requests > 0 ? totals.total_response_time / totals.total_requests : 0,
      error_rate: totals.total_requests > 0 ? (totals.failed_requests / totals.total_requests) * 100 : 0,
      total_requests: totals.total_requests,
      cost_per_token: totals.total_tokens > 0 ? totals.total_cost / totals.total_tokens : 0
    }
  }

  private calculateTrendMetric(current: number, previous: number, direction: 'higher_is_better' | 'lower_is_better') {
    if (previous === 0) {
      return {
        current,
        previous,
        trend: 'stable' as const,
        change_percentage: 0
      }
    }

    const changePercentage = ((current - previous) / previous) * 100
    let trend: 'improving' | 'stable' | 'degrading'

    if (Math.abs(changePercentage) < 5) {
      trend = 'stable'
    } else if (direction === 'higher_is_better') {
      trend = changePercentage > 0 ? 'improving' : 'degrading'
    } else {
      trend = changePercentage < 0 ? 'improving' : 'degrading'
    }

    return {
      current,
      previous,
      trend,
      change_percentage: changePercentage
    }
  }

  private isAnomalous(current: number, historical: number, threshold: number): boolean {
    if (historical === 0) return false
    return current > historical * threshold
  }

  private determineSeverity(
    current: number,
    expected: number,
    threshold: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = current / expected
    if (ratio > threshold * 3) return 'critical'
    if (ratio > threshold * 2) return 'high'
    if (ratio > threshold * 1.5) return 'medium'
    return 'low'
  }

  private calculateSummaryMetrics(data: any[]) {
    if (data.length === 0) {
      return {
        total_requests: 0,
        total_tokens: 0,
        total_cost: 0,
        avg_response_time: 0,
        overall_error_rate: 0,
        uptime_percentage: 0
      }
    }

    const totals = data.reduce((acc, record) => ({
      total_requests: acc.total_requests + (record.total_requests || 0),
      successful_requests: acc.successful_requests + (record.successful_requests || 0),
      failed_requests: acc.failed_requests + (record.failed_requests || 0),
      total_response_time: acc.total_response_time + ((record.avg_response_time || 0) * (record.total_requests || 0)),
      total_tokens: acc.total_tokens + (record.total_input_tokens || 0) + (record.total_output_tokens || 0),
      total_cost: acc.total_cost + (record.total_cost || 0)
    }), {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      total_response_time: 0,
      total_tokens: 0,
      total_cost: 0
    })

    return {
      total_requests: totals.total_requests,
      total_tokens: totals.total_tokens,
      total_cost: totals.total_cost,
      avg_response_time: totals.total_requests > 0 ? totals.total_response_time / totals.total_requests : 0,
      overall_error_rate: totals.total_requests > 0 ? (totals.failed_requests / totals.total_requests) * 100 : 0,
      uptime_percentage: totals.total_requests > 0 ? (totals.successful_requests / totals.total_requests) * 100 : 0
    }
  }

  private calculateModelMetrics(data: any[]) {
    const modelGroups = new Map()

    data.forEach(record => {
      const key = record.model_id
      if (!modelGroups.has(key)) {
        modelGroups.set(key, {
          model_id: record.model_id,
          model_name: record.ai_models.name,
          provider: record.ai_models.provider,
          records: []
        })
      }
      modelGroups.get(key).records.push(record)
    })

    return Array.from(modelGroups.values()).map(group => {
      const summary = this.calculateSummaryMetrics(group.records)
      const performanceScore = this.calculatePerformanceScore(
        summary.avg_response_time,
        summary.overall_error_rate,
        summary.uptime_percentage
      )

      return {
        model_id: group.model_id,
        model_name: group.model_name,
        provider: group.provider,
        requests: summary.total_requests,
        tokens: summary.total_tokens,
        cost: summary.total_cost,
        avg_response_time: summary.avg_response_time,
        error_rate: summary.overall_error_rate,
        uptime: summary.uptime_percentage,
        performance_score: performanceScore,
        rank: 0 // 나중에 설정
      }
    })
  }

  private calculatePerformanceScore(responseTime: number, errorRate: number, uptime: number): number {
    // 100점 만점으로 성능 점수 계산
    let score = 100

    // 응답 시간 점수 (40점)
    if (responseTime <= this.PERFORMANCE_THRESHOLDS.response_time.excellent) {
      score -= 0
    } else if (responseTime <= this.PERFORMANCE_THRESHOLDS.response_time.good) {
      score -= 10
    } else if (responseTime <= this.PERFORMANCE_THRESHOLDS.response_time.warning) {
      score -= 25
    } else {
      score -= 40
    }

    // 에러율 점수 (30점)
    if (errorRate <= this.PERFORMANCE_THRESHOLDS.error_rate.excellent) {
      score -= 0
    } else if (errorRate <= this.PERFORMANCE_THRESHOLDS.error_rate.good) {
      score -= 5
    } else if (errorRate <= this.PERFORMANCE_THRESHOLDS.error_rate.warning) {
      score -= 15
    } else {
      score -= 30
    }

    // 가용성 점수 (30점)
    if (uptime >= this.PERFORMANCE_THRESHOLDS.availability.excellent) {
      score -= 0
    } else if (uptime >= this.PERFORMANCE_THRESHOLDS.availability.good) {
      score -= 5
    } else if (uptime >= this.PERFORMANCE_THRESHOLDS.availability.warning) {
      score -= 15
    } else {
      score -= 30
    }

    return Math.max(0, score)
  }

  private rankModelsByPerformance(models: any[]) {
    return models
      .sort((a, b) => b.performance_score - a.performance_score)
      .map((model, index) => ({
        ...model,
        rank: index + 1
      }))
  }

  private generateRecommendations(models: any[], summary: any): string[] {
    const recommendations: string[] = []

    // 전체 성능 기반 권장사항
    if (summary.avg_response_time > this.PERFORMANCE_THRESHOLDS.response_time.warning) {
      recommendations.push('전체적으로 응답 시간이 높습니다. 더 빠른 모델로 전환을 고려해보세요.')
    }

    if (summary.overall_error_rate > this.PERFORMANCE_THRESHOLDS.error_rate.warning) {
      recommendations.push('에러율이 높습니다. API 키와 요청 형식을 확인해보세요.')
    }

    // 모델별 권장사항
    const topPerformer = models[0]
    const worstPerformer = models[models.length - 1]

    if (topPerformer && worstPerformer && models.length > 1) {
      if (worstPerformer.performance_score < 70) {
        recommendations.push(`${worstPerformer.model_name} 모델의 성능이 낮습니다. ${topPerformer.model_name} 모델 사용을 권장합니다.`)
      }
    }

    // 비용 효율성 권장사항
    const costEfficient = models.sort((a, b) => (a.cost / a.tokens) - (b.cost / b.tokens))[0]
    if (costEfficient) {
      recommendations.push(`비용 효율성을 위해 ${costEfficient.model_name} 모델 사용을 고려해보세요.`)
    }

    return recommendations
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService()