// AI 모델 헬스 체크 및 상태 관리 훅

import { useState, useEffect, useCallback } from 'react'
import { modelSettingsService, type AIModel } from '../services/ai/modelSettingsService'
import { modelSyncService } from '../services/ai/modelSyncService'
import { useAIModel } from '../contexts/AIModelContext'

export interface ModelHealthStatus {
  model_id: string
  name: string
  provider: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  last_check: string
  response_time: number | null
  error_rate: number | null
  availability: number | null
  issues: string[]
}

export interface HealthCheckResult {
  overall_status: 'healthy' | 'degraded' | 'critical'
  total_models: number
  healthy_models: number
  degraded_models: number
  down_models: number
  models: ModelHealthStatus[]
  last_check: string
}

export function useAIModelHealth() {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null)
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true)

  const { state: aiModelState } = useAIModel()

  // 개별 모델 헬스 체크
  const checkModelHealth = useCallback(async (model: AIModel): Promise<ModelHealthStatus> => {
    const startTime = Date.now()
    let status: ModelHealthStatus['status'] = 'unknown'
    let responseTime: number | null = null
    let errorRate: number | null = null
    let availability: number | null = null
    const issues: string[] = []

    try {
      // 1. 모델 기본 상태 확인
      if (model.status !== 'active') {
        status = 'down'
        issues.push(`Model status is ${model.status}`)
      } else {
        // 2. API 엔드포인트 가용성 확인 (실제 구현에서는 ping 테스트)
        // 여기서는 시뮬레이션으로 처리
        responseTime = Date.now() - startTime

        if (responseTime > 5000) {
          status = 'degraded'
          issues.push('High response time detected')
        } else if (responseTime > 2000) {
          status = 'degraded'
          issues.push('Moderate response time')
        } else {
          status = 'healthy'
        }

        // 3. 에러율 시뮬레이션 (실제로는 최근 24시간 에러율 계산)
        errorRate = Math.random() * 5 // 0-5% 에러율
        if (errorRate > 3) {
          status = 'degraded'
          issues.push(`High error rate: ${errorRate.toFixed(1)}%`)
        }

        // 4. 가용성 계산 (실제로는 최근 24시간 업타임)
        availability = 95 + Math.random() * 5 // 95-100% 가용성
        if (availability < 98) {
          status = 'degraded'
          issues.push(`Low availability: ${availability.toFixed(1)}%`)
        }
      }
    } catch (error) {
      status = 'down'
      issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      model_id: model.model_id,
      name: model.name,
      provider: model.provider,
      status,
      last_check: new Date().toISOString(),
      response_time: responseTime,
      error_rate: errorRate,
      availability,
      issues
    }
  }, [])

  // 전체 모델 헬스 체크
  const performHealthCheck = useCallback(async (): Promise<HealthCheckResult> => {
    setIsChecking(true)

    try {
      const activeModels = aiModelState.availableModels.filter(m => m.available)

      if (activeModels.length === 0) {
        return {
          overall_status: 'critical',
          total_models: 0,
          healthy_models: 0,
          degraded_models: 0,
          down_models: 0,
          models: [],
          last_check: new Date().toISOString()
        }
      }

      // 병렬로 모든 모델 헬스 체크
      const healthChecks = await Promise.all(
        activeModels.map(model => checkModelHealth(model))
      )

      const healthyCount = healthChecks.filter(h => h.status === 'healthy').length
      const degradedCount = healthChecks.filter(h => h.status === 'degraded').length
      const downCount = healthChecks.filter(h => h.status === 'down').length

      let overallStatus: HealthCheckResult['overall_status'] = 'healthy'
      if (downCount > 0 || healthyCount === 0) {
        overallStatus = 'critical'
      } else if (degradedCount > 0 || healthyCount / activeModels.length < 0.8) {
        overallStatus = 'degraded'
      }

      const result: HealthCheckResult = {
        overall_status: overallStatus,
        total_models: activeModels.length,
        healthy_models: healthyCount,
        degraded_models: degradedCount,
        down_models: downCount,
        models: healthChecks,
        last_check: new Date().toISOString()
      }

      setHealthStatus(result)
      setLastCheckTime(result.last_check)

      console.log('🏥 AI 모델 헬스 체크 완료:', {
        전체_상태: overallStatus,
        정상_모델: healthyCount,
        성능저하_모델: degradedCount,
        다운_모델: downCount
      })

      return result
    } catch (error) {
      console.error('헬스 체크 중 오류:', error)
      throw error
    } finally {
      setIsChecking(false)
    }
  }, [aiModelState.availableModels, checkModelHealth])

  // 특정 모델의 상태 확인
  const getModelStatus = useCallback((modelId: string): ModelHealthStatus | null => {
    return healthStatus?.models.find(m => m.model_id === modelId) || null
  }, [healthStatus])

  // 문제가 있는 모델들 가져오기
  const getProblematicModels = useCallback((): ModelHealthStatus[] => {
    return healthStatus?.models.filter(m => m.status !== 'healthy') || []
  }, [healthStatus])

  // 권장 모델 가져오기 (헬스 상태 기반)
  const getHealthyRecommendedModels = useCallback((): ModelHealthStatus[] => {
    if (!healthStatus) return []

    const healthyModels = healthStatus.models.filter(m => m.status === 'healthy')

    // 성능 기준으로 정렬 (응답시간, 가용성)
    return healthyModels.sort((a, b) => {
      const aScore = (a.response_time || 0) + (100 - (a.availability || 0)) * 100
      const bScore = (b.response_time || 0) + (100 - (b.availability || 0)) * 100
      return aScore - bScore
    }).slice(0, 3)
  }, [healthStatus])

  // 자동 헬스 체크 효과
  useEffect(() => {
    if (!autoCheckEnabled || aiModelState.availableModels.length === 0) return

    // 초기 헬스 체크
    performHealthCheck()

    // 5분마다 자동 헬스 체크
    const interval = setInterval(performHealthCheck, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [autoCheckEnabled, aiModelState.availableModels.length, performHealthCheck])

  // 모델 복구 시도
  const attemptModelRecovery = useCallback(async (modelId: string): Promise<boolean> => {
    try {
      const model = aiModelState.availableModels.find(m => m.model_id === modelId)
      if (!model) return false

      console.log(`🔧 모델 복구 시도: ${model.name}`)

      // 1. 모델 상태 검증
      const isValid = await modelSyncService.validateModelStatus(model.id)
      if (!isValid) {
        console.log(`❌ 모델 검증 실패: ${model.name}`)
        return false
      }

      // 2. 헬스 체크 재실행
      const health = await checkModelHealth(model)

      // 3. 상태 업데이트
      if (health.status === 'healthy') {
        console.log(`✅ 모델 복구 성공: ${model.name}`)
        await performHealthCheck() // 전체 상태 새로고침
        return true
      } else {
        console.log(`🔄 모델 여전히 문제 있음: ${model.name} - ${health.issues.join(', ')}`)
        return false
      }
    } catch (error) {
      console.error(`모델 복구 실패 (${modelId}):`, error)
      return false
    }
  }, [aiModelState.availableModels, checkModelHealth, performHealthCheck])

  return {
    // 상태
    healthStatus,
    isChecking,
    lastCheckTime,
    autoCheckEnabled,

    // 액션
    performHealthCheck,
    setAutoCheckEnabled,
    attemptModelRecovery,

    // 유틸리티
    getModelStatus,
    getProblematicModels,
    getHealthyRecommendedModels,

    // 헬퍼
    isHealthy: healthStatus?.overall_status === 'healthy',
    isDegraded: healthStatus?.overall_status === 'degraded',
    isCritical: healthStatus?.overall_status === 'critical',
    healthyCount: healthStatus?.healthy_models || 0,
    totalCount: healthStatus?.total_models || 0
  }
}