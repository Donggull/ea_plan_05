import { modelSettingsService } from './modelSettingsService'

// GenAI Prices API 스타일의 타입 정의 (사용하지 않지만 향후 확장을 위해 주석 처리)
// interface Usage {
//   input_tokens: number
//   output_tokens: number
// }

// interface PriceResult {
//   total_price: number
//   input_price: number
//   output_price: number
//   model: {
//     name: string
//     id: string
//   }
//   provider: {
//     name: string
//     id: string
//   }
// }

// 토큰 사용량 추정을 위한 인터페이스
interface TokenEstimate {
  input_tokens: number
  output_tokens: number
  total_tokens: number
}

// 비용 분석 결과
interface CostAnalysis {
  total_cost: number
  input_cost: number
  output_cost: number
  cost_per_token: number
  estimated_monthly_cost?: number
  cost_breakdown: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
    input_cost: number
    output_cost: number
  }
  model_info: {
    name: string
    provider: string
    model_id: string
  }
}

// 비용 비교 결과
interface CostComparison {
  model_id: string
  model_name: string
  provider: string
  total_cost: number
  input_cost: number
  output_cost: number
  cost_per_token: number
  savings_vs_most_expensive: number
  savings_percentage: number
  rank: number
}

// 비용 예측 옵션
interface CostForecastOptions {
  daily_requests?: number
  monthly_requests?: number
  avg_input_tokens?: number
  avg_output_tokens?: number
  growth_rate?: number // 월간 성장률 (예: 0.1 = 10%)
}

// 가격 정보 타입
interface PricingInfo {
  input: number
  output: number
}

// 최신 가격 정보 (GenAI Prices API 기반)
const LATEST_PRICING_DATA = {
  openai: {
    'gpt-4o': {
      input: 0.000005,   // $5.00 / 1M tokens
      output: 0.000015   // $15.00 / 1M tokens
    },
    'gpt-4o-mini': {
      input: 0.00000015, // $0.15 / 1M tokens
      output: 0.0000006  // $0.60 / 1M tokens
    },
    'gpt-4-turbo': {
      input: 0.00001,    // $10.00 / 1M tokens
      output: 0.00003    // $30.00 / 1M tokens
    },
    'gpt-4': {
      input: 0.00003,    // $30.00 / 1M tokens
      output: 0.00006    // $60.00 / 1M tokens
    },
    'gpt-3.5-turbo': {
      input: 0.0000005,  // $0.50 / 1M tokens
      output: 0.0000015  // $1.50 / 1M tokens
    },
    'o1-preview': {
      input: 0.000015,   // $15.00 / 1M tokens
      output: 0.00006    // $60.00 / 1M tokens
    },
    'o1-mini': {
      input: 0.000003,   // $3.00 / 1M tokens
      output: 0.000012   // $12.00 / 1M tokens
    }
  },
  anthropic: {
    'claude-3-opus-20240229': {
      input: 0.000015,   // $15.00 / 1M tokens
      output: 0.000075   // $75.00 / 1M tokens
    },
    'claude-3-sonnet-20240229': {
      input: 0.000003,   // $3.00 / 1M tokens
      output: 0.000015   // $15.00 / 1M tokens
    },
    'claude-3-haiku-20240307': {
      input: 0.00000025, // $0.25 / 1M tokens
      output: 0.00000125 // $1.25 / 1M tokens
    },
    'claude-3-5-sonnet-20241022': {
      input: 0.000003,   // $3.00 / 1M tokens
      output: 0.000015   // $15.00 / 1M tokens
    },
    'claude-3-5-haiku-20241022': {
      input: 0.000001,   // $1.00 / 1M tokens
      output: 0.000005   // $5.00 / 1M tokens
    }
  },
  google: {
    'gemini-1.5-pro': {
      input: 0.000003,   // $3.50 / 1M tokens (up to 128K)
      output: 0.000015   // $10.50 / 1M tokens
    },
    'gemini-1.5-flash': {
      input: 0.00000035, // $0.35 / 1M tokens (up to 128K)
      output: 0.00000105 // $1.05 / 1M tokens
    },
    'gemini-pro': {
      input: 0.0000005,  // $0.50 / 1M tokens
      output: 0.0000015  // $1.50 / 1M tokens
    },
    'gemini-ultra': {
      input: 0.000008,   // $8.00 / 1M tokens
      output: 0.000024   // $24.00 / 1M tokens
    }
  }
}

class CostCalculationService {
  // ============== 기본 비용 계산 ==============

  /**
   * 토큰 사용량을 기반으로 비용을 계산합니다
   */
  async calculateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<CostAnalysis | null> {
    try {
      // 1. 데이터베이스에서 모델 정보 가져오기
      const model = await modelSettingsService.getModelById(modelId)
      if (!model) {
        console.warn(`Model not found: ${modelId}`)
        return null
      }

      // 2. 최신 가격 정보 확인 (GenAI Prices 기반)
      const latestPricing = this.getLatestPricing(model.provider, model.model_id)

      // 3. 최신 가격이 있으면 사용, 없으면 DB 가격 사용
      const inputRate = latestPricing?.input || model.cost_per_input_token
      const outputRate = latestPricing?.output || model.cost_per_output_token

      // 4. 비용 계산
      const inputCost = inputTokens * inputRate
      const outputCost = outputTokens * outputRate
      const totalCost = inputCost + outputCost
      const totalTokens = inputTokens + outputTokens
      const costPerToken = totalTokens > 0 ? totalCost / totalTokens : 0

      return {
        total_cost: totalCost,
        input_cost: inputCost,
        output_cost: outputCost,
        cost_per_token: costPerToken,
        cost_breakdown: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          input_cost: inputCost,
          output_cost: outputCost
        },
        model_info: {
          name: model.name,
          provider: model.provider,
          model_id: model.model_id
        }
      }
    } catch (error) {
      console.error('Error calculating cost:', error)
      return null
    }
  }

  /**
   * 여러 모델의 비용을 비교합니다
   */
  async compareCosts(
    modelIds: string[],
    inputTokens: number,
    outputTokens: number
  ): Promise<CostComparison[]> {
    const results: CostComparison[] = []

    for (const modelId of modelIds) {
      const analysis = await this.calculateCost(modelId, inputTokens, outputTokens)
      if (analysis) {
        results.push({
          model_id: modelId,
          model_name: analysis.model_info.name,
          provider: analysis.model_info.provider,
          total_cost: analysis.total_cost,
          input_cost: analysis.input_cost,
          output_cost: analysis.output_cost,
          cost_per_token: analysis.cost_per_token,
          savings_vs_most_expensive: 0, // 나중에 계산
          savings_percentage: 0, // 나중에 계산
          rank: 0 // 나중에 계산
        })
      }
    }

    // 비용 순으로 정렬
    results.sort((a, b) => a.total_cost - b.total_cost)

    // 순위와 절약액 계산
    const mostExpensive = results[results.length - 1]?.total_cost || 0

    results.forEach((result, index) => {
      result.rank = index + 1
      result.savings_vs_most_expensive = mostExpensive - result.total_cost
      result.savings_percentage = mostExpensive > 0
        ? ((mostExpensive - result.total_cost) / mostExpensive) * 100
        : 0
    })

    return results
  }

  // ============== 토큰 추정 ==============

  /**
   * 텍스트에서 토큰 수를 추정합니다
   */
  estimateTokens(text: string): number {
    // 간단한 추정 공식 (실제로는 모델별 토크나이저 사용 권장)
    // 평균적으로 영어는 4자당 1토큰, 한국어는 2-3자당 1토큰
    const englishChars = (text.match(/[a-zA-Z0-9\s]/g) || []).length
    const koreanChars = (text.match(/[ㄱ-ㅎ가-힣]/g) || []).length
    const otherChars = text.length - englishChars - koreanChars

    const englishTokens = Math.ceil(englishChars / 4)
    const koreanTokens = Math.ceil(koreanChars / 2.5)
    const otherTokens = Math.ceil(otherChars / 3)

    return englishTokens + koreanTokens + otherTokens
  }

  /**
   * 요청과 응답 텍스트에서 토큰 사용량을 추정합니다
   */
  estimateUsage(inputText: string, outputText: string): TokenEstimate {
    const inputTokens = this.estimateTokens(inputText)
    const outputTokens = this.estimateTokens(outputText)

    return {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens
    }
  }

  // ============== 비용 예측 ==============

  /**
   * 향후 사용량과 비용을 예측합니다
   */
  async forecastCosts(
    modelId: string,
    options: CostForecastOptions
  ): Promise<{
    daily: number
    monthly: number
    quarterly: number
    yearly: number
    growth_adjusted: {
      monthly: number
      quarterly: number
      yearly: number
    }
  } | null> {
    const model = await modelSettingsService.getModelById(modelId)
    if (!model) return null

    const latestPricing = this.getLatestPricing(model.provider, model.model_id)
    const inputRate = latestPricing?.input || model.cost_per_input_token
    const outputRate = latestPricing?.output || model.cost_per_output_token

    // 기본값 설정
    const dailyRequests = options.daily_requests ||
                         (options.monthly_requests ? options.monthly_requests / 30 : 100)
    const avgInputTokens = options.avg_input_tokens || 1000
    const avgOutputTokens = options.avg_output_tokens || 500
    const growthRate = options.growth_rate || 0

    // 일일 비용 계산
    const dailyCost = dailyRequests *
                      (avgInputTokens * inputRate + avgOutputTokens * outputRate)

    // 월간, 분기, 연간 비용
    const monthlyCost = dailyCost * 30
    const quarterlyCost = monthlyCost * 3
    const yearlyCost = monthlyCost * 12

    // 성장률을 고려한 비용 (복리 계산)
    const monthlyGrowthRate = 1 + growthRate
    const quarterlyGrowthRate = Math.pow(monthlyGrowthRate, 3)
    const yearlyGrowthRate = Math.pow(monthlyGrowthRate, 12)

    return {
      daily: dailyCost,
      monthly: monthlyCost,
      quarterly: quarterlyCost,
      yearly: yearlyCost,
      growth_adjusted: {
        monthly: monthlyCost * monthlyGrowthRate,
        quarterly: quarterlyCost * quarterlyGrowthRate,
        yearly: yearlyCost * yearlyGrowthRate
      }
    }
  }

  // ============== 비용 최적화 권장사항 ==============

  /**
   * 비용 최적화 권장사항을 제공합니다
   */
  async getCostOptimizationRecommendations(
    currentModelId: string,
    averageInputTokens: number,
    averageOutputTokens: number,
    monthlyRequests: number
  ): Promise<{
    current_cost: number
    recommendations: Array<{
      model_id: string
      model_name: string
      provider: string
      monthly_cost: number
      savings: number
      savings_percentage: number
      performance_trade_off: string
      recommendation: string
    }>
  }> {
    // 현재 모델 비용 계산
    const currentCost = await this.calculateCost(currentModelId, averageInputTokens, averageOutputTokens)
    if (!currentCost) {
      throw new Error('Current model cost calculation failed')
    }

    const monthlyCurrentCost = currentCost.total_cost * monthlyRequests

    // 모든 활성 모델과 비교
    const activeModels = await modelSettingsService.getActiveModels()
    const recommendations: any[] = []

    for (const model of activeModels) {
      if (model.id === currentModelId) continue

      const modelCost = await this.calculateCost(model.id, averageInputTokens, averageOutputTokens)
      if (!modelCost) continue

      const monthlyModelCost = modelCost.total_cost * monthlyRequests
      const savings = monthlyCurrentCost - monthlyModelCost

      if (savings > 0) {
        recommendations.push({
          model_id: model.id,
          model_name: model.name,
          provider: model.provider,
          monthly_cost: monthlyModelCost,
          savings: savings,
          savings_percentage: (savings / monthlyCurrentCost) * 100,
          performance_trade_off: this.getPerformanceTradeOff(currentModelId, model.id),
          recommendation: this.getRecommendationText(savings, monthlyCurrentCost)
        })
      }
    }

    // 절약액 순으로 정렬
    recommendations.sort((a, b) => b.savings - a.savings)

    return {
      current_cost: monthlyCurrentCost,
      recommendations: recommendations.slice(0, 5) // 상위 5개만 반환
    }
  }

  // ============== 실시간 비용 추적 ==============

  /**
   * 실시간 비용 사용량을 업데이트합니다
   */
  async updateRealTimeCost(
    userId: string,
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const cost = await this.calculateCost(modelId, inputTokens, outputTokens)
    if (!cost) return

    // API 사용량 서비스를 통해 기록
    const { ApiUsageService } = await import('../apiUsageService')
    await ApiUsageService.recordUsageBatch([{
      userId,
      model: modelId,
      inputTokens,
      outputTokens,
      cost: cost.total_cost
    }])
  }

  // ============== 비용 알림 ==============

  /**
   * 비용 임계값 초과를 확인합니다
   */
  async checkCostThresholds(
    userId: string,
    additionalCost: number
  ): Promise<{
    threshold_exceeded: boolean
    current_cost: number
    threshold: number
    remaining_budget: number
    alert_level: 'none' | 'warning' | 'critical'
  }> {
    // 사용자 설정에서 임계값 가져오기
    const userSettings = await modelSettingsService.getUserSettings(userId)
    const threshold = userSettings?.settings?.cost_alert_threshold || 100 // 기본 $100

    // 현재 월간 사용량 가져오기 (간단한 구현)
    const currentCost = 0 // TODO: 실제 월간 비용 계산 로직 추가
    const projectedCost = currentCost + additionalCost

    const remaining = threshold - projectedCost
    const usagePercentage = (projectedCost / threshold) * 100

    let alertLevel: 'none' | 'warning' | 'critical' = 'none'
    if (usagePercentage >= 90) alertLevel = 'critical'
    else if (usagePercentage >= 70) alertLevel = 'warning'

    return {
      threshold_exceeded: projectedCost > threshold,
      current_cost: currentCost,
      threshold: threshold,
      remaining_budget: remaining,
      alert_level: alertLevel
    }
  }

  // ============== 유틸리티 메서드 ==============

  /**
   * 최신 가격 정보를 가져옵니다 (GenAI Prices 기반)
   */
  private getLatestPricing(provider: string, modelId: string): PricingInfo | null {
    const providerData = LATEST_PRICING_DATA[provider as keyof typeof LATEST_PRICING_DATA]
    if (!providerData) return null

    return providerData[modelId as keyof typeof providerData] || null
  }

  /**
   * 성능 트레이드오프 설명을 생성합니다
   */
  private getPerformanceTradeOff(_currentModelId: string, recommendedModelId: string): string {
    // 간단한 로직 - 실제로는 더 정교한 분석 필요
    if (recommendedModelId.includes('3.5') || recommendedModelId.includes('mini')) {
      return '속도는 유사하지만 복잡한 추론 능력이 다소 낮을 수 있습니다'
    }
    if (recommendedModelId.includes('flash') || recommendedModelId.includes('haiku')) {
      return '응답 속도가 빠르지만 복잡한 작업에서 정확도가 낮을 수 있습니다'
    }
    return '유사한 성능을 제공하면서 비용 효율적입니다'
  }

  /**
   * 권장사항 텍스트를 생성합니다
   */
  private getRecommendationText(savings: number, totalCost: number): string {
    const savingsPercentage = (savings / totalCost) * 100

    if (savingsPercentage > 50) {
      return '매우 높은 비용 절약 효과가 예상됩니다. 즉시 전환을 고려해보세요.'
    } else if (savingsPercentage > 25) {
      return '상당한 비용 절약이 가능합니다. 성능 테스트 후 전환을 권장합니다.'
    } else if (savingsPercentage > 10) {
      return '적당한 비용 절약이 가능합니다. 사용 패턴을 분석 후 결정하세요.'
    } else {
      return '소폭의 비용 절약이 가능합니다. 다른 요소도 함께 고려하세요.'
    }
  }

  /**
   * 비용을 사용자 친화적 형식으로 포맷합니다
   */
  formatCost(cost: number): string {
    if (cost === 0) return '$0.00'
    if (cost < 0.01) return `$${cost.toFixed(6)}`
    if (cost < 1) return `$${cost.toFixed(4)}`
    return `$${cost.toFixed(2)}`
  }

  /**
   * 토큰당 비용을 1K 토큰 기준으로 포맷합니다
   */
  formatCostPer1K(costPerToken: number): string {
    const costPer1K = costPerToken * 1000
    return this.formatCost(costPer1K) + '/1K tokens'
  }
}

export const costCalculationService = new CostCalculationService()