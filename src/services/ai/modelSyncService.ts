// AI 모델 동기화 서비스
// 외부 API와 로컬 데이터베이스 간의 모델 정보 동기화를 담당합니다.

import { supabase } from '@/lib/supabase'
import { modelSettingsService, type AIModel } from './modelSettingsService'
import { allLatestModels, type LatestModelInfo } from './latestModelsData'

export interface SyncResult {
  success: boolean
  summary: {
    total_models: number
    new_models: number
    updated_models: number
    deactivated_models: number
    errors: number
  }
  details: {
    new_models: string[]
    updated_models: string[]
    deactivated_models: string[]
    errors: Array<{ model_id: string; error: string }>
  }
}

export interface ModelUpdateInfo {
  model_id: string
  field: string
  old_value: any
  new_value: any
}

class ModelSyncService {
  private static instance: ModelSyncService
  private lastSyncTime: string | null = null
  private syncInProgress = false

  static getInstance(): ModelSyncService {
    if (!ModelSyncService.instance) {
      ModelSyncService.instance = new ModelSyncService()
    }
    return ModelSyncService.instance
  }

  /**
   * 외부 API에서 최신 모델 정보를 가져와서 로컬 DB와 동기화합니다.
   */
  async syncAllModels(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('이미 동기화가 진행 중입니다.')
    }

    this.syncInProgress = true
    const result: SyncResult = {
      success: false,
      summary: {
        total_models: allLatestModels.length,
        new_models: 0,
        updated_models: 0,
        deactivated_models: 0,
        errors: 0
      },
      details: {
        new_models: [],
        updated_models: [],
        deactivated_models: [],
        errors: []
      }
    }

    try {
      console.log('🔄 AI 모델 동기화 시작...')

      // 1. 현재 DB의 모든 모델 가져오기
      const existingModels = await modelSettingsService.getAllModels()
      const existingModelMap = new Map(existingModels.map(m => [m.model_id, m]))

      // 2. 최신 모델 정보와 비교하여 업데이트
      for (const latestModel of allLatestModels) {
        try {
          const existingModel = existingModelMap.get(latestModel.model_id)

          if (!existingModel) {
            // 새로운 모델 추가
            await this.createNewModel(latestModel)
            result.summary.new_models++
            result.details.new_models.push(latestModel.model_id)
            console.log(`✅ 새 모델 추가: ${latestModel.name}`)
          } else {
            // 기존 모델 업데이트 확인
            const updates = this.compareModels(existingModel, latestModel)
            if (updates.length > 0) {
              await this.updateExistingModel(existingModel.id, latestModel, updates)
              result.summary.updated_models++
              result.details.updated_models.push(latestModel.model_id)
              console.log(`🔄 모델 업데이트: ${latestModel.name} (${updates.length}개 필드)`)
            }
          }
        } catch (error) {
          console.error(`❌ 모델 동기화 실패: ${latestModel.model_id}`, error)
          result.summary.errors++
          result.details.errors.push({
            model_id: latestModel.model_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // 3. 더 이상 지원하지 않는 모델 비활성화
      const latestModelIds = new Set(allLatestModels.map(m => m.model_id))
      for (const existingModel of existingModels) {
        if (!latestModelIds.has(existingModel.model_id) && existingModel.status === 'active') {
          try {
            await modelSettingsService.updateModel(existingModel.id, { status: 'inactive' })
            result.summary.deactivated_models++
            result.details.deactivated_models.push(existingModel.model_id)
            console.log(`⏸️ 모델 비활성화: ${existingModel.name}`)
          } catch (error) {
            console.error(`❌ 모델 비활성화 실패: ${existingModel.model_id}`, error)
            result.summary.errors++
            result.details.errors.push({
              model_id: existingModel.model_id,
              error: error instanceof Error ? error.message : 'Deactivation failed'
            })
          }
        }
      }

      this.lastSyncTime = new Date().toISOString()
      result.success = result.summary.errors === 0

      console.log('🎉 AI 모델 동기화 완료:', {
        새로운_모델: result.summary.new_models,
        업데이트된_모델: result.summary.updated_models,
        비활성화된_모델: result.summary.deactivated_models,
        오류: result.summary.errors
      })

      // 동기화 로그 저장
      await this.saveSyncLog(result)

      return result

    } catch (error) {
      console.error('❌ AI 모델 동기화 중 치명적 오류:', error)
      result.success = false
      result.summary.errors++
      result.details.errors.push({
        model_id: 'SYSTEM',
        error: error instanceof Error ? error.message : 'Critical sync error'
      })
      return result
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * 특정 프로바이더의 모델만 동기화합니다.
   */
  async syncProviderModels(provider: 'openai' | 'anthropic' | 'google'): Promise<SyncResult> {
    const providerModels = allLatestModels.filter(m => m.provider === provider)

    // 임시로 전체 모델 목록을 프로바이더 모델로 교체
    const originalModels = [...allLatestModels]
    allLatestModels.splice(0, allLatestModels.length, ...providerModels)

    try {
      const result = await this.syncAllModels()
      return result
    } finally {
      // 원래 모델 목록 복원
      allLatestModels.splice(0, allLatestModels.length, ...originalModels)
    }
  }

  /**
   * 새로운 모델을 데이터베이스에 추가합니다.
   */
  private async createNewModel(latestModel: LatestModelInfo): Promise<void> {
    const newModel: Omit<AIModel, 'id' | 'created_at' | 'updated_at'> = {
      name: latestModel.name,
      provider: latestModel.provider,
      model_id: latestModel.model_id,
      status: latestModel.status,
      api_endpoint: latestModel.api_endpoint,
      max_tokens: latestModel.max_tokens,
      cost_per_input_token: latestModel.cost_per_input_token,
      cost_per_output_token: latestModel.cost_per_output_token,
      capabilities: latestModel.capabilities,
      characteristics: latestModel.characteristics,
      rate_limits: latestModel.rate_limits,
      created_by: 'system',
      metadata: {
        ...latestModel.metadata,
        sync_source: 'context7_mcp',
        last_synced: new Date().toISOString()
      }
    }

    await modelSettingsService.createModel(newModel)
  }

  /**
   * 기존 모델과 최신 모델 정보를 비교하여 변경사항을 반환합니다.
   */
  private compareModels(existing: AIModel, latest: LatestModelInfo): ModelUpdateInfo[] {
    const updates: ModelUpdateInfo[] = []

    // 비교할 필드 목록
    const fieldsToCompare = [
      'name',
      'status',
      'max_tokens',
      'cost_per_input_token',
      'cost_per_output_token',
      'capabilities',
      'characteristics',
      'rate_limits'
    ] as const

    for (const field of fieldsToCompare) {
      const existingValue = existing[field]
      const latestValue = latest[field]

      // 깊은 비교 (객체와 배열)
      if (JSON.stringify(existingValue) !== JSON.stringify(latestValue)) {
        updates.push({
          model_id: existing.model_id,
          field,
          old_value: existingValue,
          new_value: latestValue
        })
      }
    }

    return updates
  }

  /**
   * 기존 모델을 업데이트합니다.
   */
  private async updateExistingModel(
    modelId: string,
    latestModel: LatestModelInfo,
    updates: ModelUpdateInfo[]
  ): Promise<void> {
    const updateData: Partial<AIModel> = {}

    // 업데이트할 필드들을 updateData에 설정
    for (const update of updates) {
      (updateData as any)[update.field] = update.new_value
    }

    // 메타데이터 업데이트
    updateData.metadata = {
      ...updateData.metadata,
      ...latestModel.metadata,
      sync_source: 'context7_mcp',
      last_synced: new Date().toISOString(),
      update_history: updates.map(u => ({
        field: u.field,
        old_value: u.old_value,
        new_value: u.new_value,
        updated_at: new Date().toISOString()
      }))
    }

    await modelSettingsService.updateModel(modelId, updateData)
  }

  /**
   * 동기화 로그를 저장합니다.
   */
  private async saveSyncLog(result: SyncResult): Promise<void> {
    if (!supabase) return

    try {
      await supabase
        .from('ai_model_sync_logs')
        .insert([{
          sync_timestamp: new Date().toISOString(),
          success: result.success,
          total_models: result.summary.total_models,
          new_models: result.summary.new_models,
          updated_models: result.summary.updated_models,
          deactivated_models: result.summary.deactivated_models,
          errors: result.summary.errors,
          details: result.details,
          sync_source: 'context7_mcp'
        }])
    } catch (error) {
      console.error('동기화 로그 저장 실패:', error)
      // 로그 저장 실패는 전체 동기화를 실패로 처리하지 않음
    }
  }

  /**
   * 마지막 동기화 시간을 반환합니다.
   */
  getLastSyncTime(): string | null {
    return this.lastSyncTime
  }

  /**
   * 동기화 진행 상태를 반환합니다.
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress
  }

  /**
   * 특정 모델의 상태를 수동으로 확인하고 업데이트합니다.
   */
  async validateModelStatus(modelId: string): Promise<boolean> {
    try {
      const model = await modelSettingsService.getModelById(modelId)
      if (!model) return false

      const latestModel = allLatestModels.find(m => m.model_id === model.model_id)
      if (!latestModel) {
        // 최신 목록에 없는 모델은 비활성화
        await modelSettingsService.updateModel(model.id, { status: 'inactive' })
        return false
      }

      // 상태가 다르면 업데이트
      if (model.status !== latestModel.status) {
        await modelSettingsService.updateModel(model.id, { status: latestModel.status })
      }

      return latestModel.status === 'active'
    } catch (error) {
      console.error(`모델 상태 검증 실패 (${modelId}):`, error)
      return false
    }
  }

  /**
   * 현재 사용 가능한 모델 통계를 반환합니다.
   */
  async getModelStatistics(): Promise<{
    total: number
    active: number
    by_provider: Record<string, number>
    by_cost_tier: Record<string, number>
    by_performance: Record<string, number>
  }> {
    const models = await modelSettingsService.getAllModels()

    const stats = {
      total: models.length,
      active: models.filter(m => m.status === 'active').length,
      by_provider: {} as Record<string, number>,
      by_cost_tier: {} as Record<string, number>,
      by_performance: {} as Record<string, number>
    }

    // 프로바이더별 통계
    for (const model of models) {
      stats.by_provider[model.provider] = (stats.by_provider[model.provider] || 0) + 1
      stats.by_cost_tier[model.characteristics.cost] = (stats.by_cost_tier[model.characteristics.cost] || 0) + 1
      stats.by_performance[model.characteristics.performance] = (stats.by_performance[model.characteristics.performance] || 0) + 1
    }

    return stats
  }
}

export const modelSyncService = ModelSyncService.getInstance()