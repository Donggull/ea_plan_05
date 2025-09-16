import { supabase } from '@/lib/supabase'

// AI 모델 정보 타입
export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'custom'
  model_id: string
  status: 'active' | 'inactive' | 'maintenance'
  api_endpoint?: string
  max_tokens: number
  cost_per_input_token: number
  cost_per_output_token: number
  capabilities: string[]
  characteristics: {
    speed: 'fast' | 'medium' | 'slow'
    cost: 'low' | 'medium' | 'high'
    performance: 'basic' | 'good' | 'excellent'
  }
  rate_limits: {
    requests_per_minute: number
    tokens_per_minute: number
  }
  created_by?: string
  created_at?: string
  updated_at?: string
  metadata?: Record<string, any>
}

// 사용자 AI 설정 타입
export interface UserAISettings {
  id?: string
  user_id: string
  preferred_model_id?: string
  project_model_mappings: Record<string, string> // projectId -> modelId
  task_model_mappings: Record<string, string>    // taskType -> modelId
  fallback_models: string[]                      // modelId 배열 (우선순위 순)
  settings: {
    temperature: number
    max_tokens?: number
    top_p: number
    enable_fallback: boolean
    cost_alert_threshold: number
    enable_cost_alerts: boolean
  }
  created_at?: string
  updated_at?: string
}

// 프로젝트 AI 설정 타입
export interface ProjectAISettings {
  id?: string
  project_id: string
  default_model_id?: string
  workflow_model_mappings: Record<string, string> // workflowStep -> modelId
  analysis_model_mappings: Record<string, string> // analysisType -> modelId
  fallback_models: string[]
  settings: {
    temperature: number
    max_tokens?: number
    top_p: number
    enable_fallback: boolean
    cost_budget?: number
    enable_cost_tracking: boolean
  }
  created_at?: string
  updated_at?: string
}

// AI 모델 성능 통계 타입
export interface AIModelPerformance {
  id?: string
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

class ModelSettingsService {
  // ============== AI 모델 관리 ==============

  async getAllModels(): Promise<AIModel[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .order('provider', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching AI models:', error)
      throw new Error('AI 모델 목록을 가져오는데 실패했습니다.')
    }

    return (data || []) as AIModel[]
  }

  async getActiveModels(): Promise<AIModel[]> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .eq('status', 'active')
      .order('provider', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching active AI models:', error)
      throw new Error('활성 AI 모델 목록을 가져오는데 실패했습니다.')
    }

    return (data || []) as AIModel[]
  }

  async getModelById(modelId: string): Promise<AIModel | null> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .eq('id', modelId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('Error fetching AI model:', error)
      throw new Error('AI 모델 정보를 가져오는데 실패했습니다.')
    }

    return data as AIModel
  }

  async getModelsByProvider(provider: AIModel['provider']): Promise<AIModel[]> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .eq('provider', provider)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching models by provider:', error)
      throw new Error('제공업체별 모델 목록을 가져오는데 실패했습니다.')
    }

    return (data || []) as AIModel[]
  }

  async createModel(model: Omit<AIModel, 'id' | 'created_at' | 'updated_at'>): Promise<AIModel> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('ai_models')
      .insert([model])
      .select()
      .single()

    if (error) {
      console.error('Error creating AI model:', error)
      throw new Error('AI 모델 생성에 실패했습니다.')
    }

    return data as AIModel
  }

  async updateModel(modelId: string, updates: Partial<AIModel>): Promise<AIModel> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('ai_models')
      .update(updates)
      .eq('id', modelId)
      .select()
      .single()

    if (error) {
      console.error('Error updating AI model:', error)
      throw new Error('AI 모델 업데이트에 실패했습니다.')
    }

    return data as AIModel
  }

  async deleteModel(modelId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase
      .from('ai_models')
      .delete()
      .eq('id', modelId)

    if (error) {
      console.error('Error deleting AI model:', error)
      throw new Error('AI 모델 삭제에 실패했습니다.')
    }
  }

  // ============== 사용자 AI 설정 관리 ==============

  async getUserSettings(userId: string): Promise<UserAISettings | null> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('Error fetching user AI settings:', error)
      throw new Error('사용자 AI 설정을 가져오는데 실패했습니다.')
    }

    return data as UserAISettings
  }

  async createOrUpdateUserSettings(userId: string, settings: Partial<UserAISettings>): Promise<UserAISettings> {
    const settingsData = {
      user_id: userId,
      ...settings
    }

    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('user_ai_settings')
      .upsert([settingsData], { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      console.error('Error upserting user AI settings:', error)
      throw new Error('사용자 AI 설정 저장에 실패했습니다.')
    }

    return data as UserAISettings
  }

  async updateUserPreferredModel(userId: string, modelId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase
      .from('user_ai_settings')
      .upsert([{
        user_id: userId,
        preferred_model_id: modelId
      }], { onConflict: 'user_id' })

    if (error) {
      console.error('Error updating user preferred model:', error)
      throw new Error('선호 모델 설정에 실패했습니다.')
    }
  }

  async updateUserProjectModelMapping(userId: string, projectId: string, modelId: string): Promise<void> {
    // 기존 설정 가져오기
    const current = await this.getUserSettings(userId)
    const projectMappings = current?.project_model_mappings || {}

    // 새 매핑 추가
    projectMappings[projectId] = modelId

    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase
      .from('user_ai_settings')
      .upsert([{
        user_id: userId,
        project_model_mappings: projectMappings
      }], { onConflict: 'user_id' })

    if (error) {
      console.error('Error updating user project model mapping:', error)
      throw new Error('프로젝트별 모델 설정에 실패했습니다.')
    }
  }

  async updateUserTaskModelMapping(userId: string, taskType: string, modelId: string): Promise<void> {
    // 기존 설정 가져오기
    const current = await this.getUserSettings(userId)
    const taskMappings = current?.task_model_mappings || {}

    // 새 매핑 추가
    taskMappings[taskType] = modelId

    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase
      .from('user_ai_settings')
      .upsert([{
        user_id: userId,
        task_model_mappings: taskMappings
      }], { onConflict: 'user_id' })

    if (error) {
      console.error('Error updating user task model mapping:', error)
      throw new Error('작업별 모델 설정에 실패했습니다.')
    }
  }

  async updateUserFallbackModels(userId: string, modelIds: string[]): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase
      .from('user_ai_settings')
      .upsert([{
        user_id: userId,
        fallback_models: modelIds
      }], { onConflict: 'user_id' })

    if (error) {
      console.error('Error updating user fallback models:', error)
      throw new Error('폴백 모델 설정에 실패했습니다.')
    }
  }

  // ============== 프로젝트 AI 설정 관리 ==============

  async getProjectSettings(projectId: string): Promise<ProjectAISettings | null> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('project_ai_settings')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('Error fetching project AI settings:', error)
      throw new Error('프로젝트 AI 설정을 가져오는데 실패했습니다.')
    }

    return data as ProjectAISettings
  }

  async createOrUpdateProjectSettings(projectId: string, settings: Partial<ProjectAISettings>): Promise<ProjectAISettings> {
    const settingsData = {
      project_id: projectId,
      ...settings
    }

    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('project_ai_settings')
      .upsert([settingsData], { onConflict: 'project_id' })
      .select()
      .single()

    if (error) {
      console.error('Error upserting project AI settings:', error)
      throw new Error('프로젝트 AI 설정 저장에 실패했습니다.')
    }

    return data as ProjectAISettings
  }

  async updateProjectDefaultModel(projectId: string, modelId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase
      .from('project_ai_settings')
      .upsert([{
        project_id: projectId,
        default_model_id: modelId
      }], { onConflict: 'project_id' })

    if (error) {
      console.error('Error updating project default model:', error)
      throw new Error('프로젝트 기본 모델 설정에 실패했습니다.')
    }
  }

  async updateProjectWorkflowModelMapping(projectId: string, workflowStep: string, modelId: string): Promise<void> {
    // 기존 설정 가져오기
    const current = await this.getProjectSettings(projectId)
    const workflowMappings = current?.workflow_model_mappings || {}

    // 새 매핑 추가
    workflowMappings[workflowStep] = modelId

    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase
      .from('project_ai_settings')
      .upsert([{
        project_id: projectId,
        workflow_model_mappings: workflowMappings
      }], { onConflict: 'project_id' })

    if (error) {
      console.error('Error updating project workflow model mapping:', error)
      throw new Error('워크플로우별 모델 설정에 실패했습니다.')
    }
  }

  async updateProjectAnalysisModelMapping(projectId: string, analysisType: string, modelId: string): Promise<void> {
    // 기존 설정 가져오기
    const current = await this.getProjectSettings(projectId)
    const analysisMappings = current?.analysis_model_mappings || {}

    // 새 매핑 추가
    analysisMappings[analysisType] = modelId

    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase
      .from('project_ai_settings')
      .upsert([{
        project_id: projectId,
        analysis_model_mappings: analysisMappings
      }], { onConflict: 'project_id' })

    if (error) {
      console.error('Error updating project analysis model mapping:', error)
      throw new Error('분석별 모델 설정에 실패했습니다.')
    }
  }

  // ============== 모델 추천 로직 ==============

  async getRecommendedModel(
    userId: string,
    context: {
      projectId?: string
      taskType?: string
      workflowStep?: string
      analysisType?: string
    }
  ): Promise<string | null> {
    try {
      // 1. 프로젝트별 설정 확인
      if (context.projectId) {
        const projectSettings = await this.getProjectSettings(context.projectId)

        // 워크플로우별 모델 확인
        if (context.workflowStep && projectSettings?.workflow_model_mappings[context.workflowStep]) {
          return projectSettings.workflow_model_mappings[context.workflowStep]
        }

        // 분석별 모델 확인
        if (context.analysisType && projectSettings?.analysis_model_mappings[context.analysisType]) {
          return projectSettings.analysis_model_mappings[context.analysisType]
        }

        // 프로젝트 기본 모델 확인
        if (projectSettings?.default_model_id) {
          return projectSettings.default_model_id
        }
      }

      // 2. 사용자별 설정 확인
      const userSettings = await this.getUserSettings(userId)

      // 프로젝트별 모델 매핑 확인
      if (context.projectId && userSettings?.project_model_mappings[context.projectId]) {
        return userSettings.project_model_mappings[context.projectId]
      }

      // 작업별 모델 매핑 확인
      if (context.taskType && userSettings?.task_model_mappings[context.taskType]) {
        return userSettings.task_model_mappings[context.taskType]
      }

      // 사용자 선호 모델 확인
      if (userSettings?.preferred_model_id) {
        return userSettings.preferred_model_id
      }

      // 3. 기본 추천 모델 (GPT-4o)
      const models = await this.getActiveModels()
      const defaultModel = models.find(m => m.model_id === 'gpt-4o')
      return defaultModel?.id || null

    } catch (error) {
      console.error('Error getting recommended model:', error)
      return null
    }
  }

  // ============== 모델 성능 통계 ==============

  async recordModelPerformance(performance: Omit<AIModelPerformance, 'id' | 'created_at'>): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase
      .from('ai_model_performance')
      .upsert([performance], {
        onConflict: 'model_id,date,hour',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('Error recording model performance:', error)
      throw new Error('모델 성능 기록에 실패했습니다.')
    }
  }

  async getModelPerformance(
    modelId: string,
    dateRange: { start: string; end: string }
  ): Promise<AIModelPerformance[]> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('ai_model_performance')
      .select('*')
      .eq('model_id', modelId)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)
      .order('date', { ascending: true })
      .order('hour', { ascending: true })

    if (error) {
      console.error('Error fetching model performance:', error)
      throw new Error('모델 성능 데이터를 가져오는데 실패했습니다.')
    }

    return (data || []) as AIModelPerformance[]
  }

  async getAllModelsPerformance(dateRange: { start: string; end: string }): Promise<AIModelPerformance[]> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('ai_model_performance')
      .select(`
        *,
        ai_models!inner(name, provider, model_id)
      `)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching all models performance:', error)
      throw new Error('전체 모델 성능 데이터를 가져오는데 실패했습니다.')
    }

    return (data || []) as AIModelPerformance[]
  }

  // ============== 유틸리티 메서드 ==============

  async getModelCostEstimate(modelId: string, inputTokens: number, outputTokens: number): Promise<number> {
    const model = await this.getModelById(modelId)
    if (!model) return 0

    return (inputTokens * model.cost_per_input_token) + (outputTokens * model.cost_per_output_token)
  }

  async validateModelAvailability(modelId: string): Promise<boolean> {
    const model = await this.getModelById(modelId)
    return model?.status === 'active'
  }

  async getModelsByCapability(capability: string): Promise<AIModel[]> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .contains('capabilities', [capability])
      .eq('status', 'active')
      .order('cost_per_input_token', { ascending: true })

    if (error) {
      console.error('Error fetching models by capability:', error)
      throw new Error('기능별 모델 목록을 가져오는데 실패했습니다.')
    }

    return (data || []) as AIModel[]
  }
}

export const modelSettingsService = new ModelSettingsService()