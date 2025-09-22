import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { modelSettingsService } from '../services/ai/modelSettingsService'
import { modelSyncService } from '../services/ai/modelSyncService'
import { getRecommendedModels } from '../services/ai/latestModelsData'

// AI 모델 타입 정의
export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'custom'
  model_id: string
  cost_per_input_token: number
  cost_per_output_token: number
  status: string
  capabilities: string[]
  max_tokens: number
  available: boolean
}

// 상태 타입 정의
interface AIModelState {
  selectedProviderId: string | null  // 1차 선택: 프로바이더
  selectedModelId: string | null     // 2차 선택: 세부 모델
  availableModels: AIModel[]
  loading: boolean
  error: string | null
  lastSyncTime: string | null
  syncInProgress: boolean
}

// 액션 타입 정의
type AIModelAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MODELS'; payload: AIModel[] }
  | { type: 'SELECT_PROVIDER'; payload: string }
  | { type: 'SELECT_MODEL'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SYNC_STATUS'; payload: { syncInProgress: boolean; lastSyncTime?: string } }

// 초기 상태
const initialState: AIModelState = {
  selectedProviderId: null,
  selectedModelId: null,
  availableModels: [],
  loading: false,
  error: null,
  lastSyncTime: null,
  syncInProgress: false
}

// 리듀서
function aiModelReducer(state: AIModelState, action: AIModelAction): AIModelState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'SET_MODELS':
      return { ...state, availableModels: action.payload, loading: false }
    case 'SELECT_PROVIDER':
      return {
        ...state,
        selectedProviderId: action.payload,
        selectedModelId: null // 프로바이더 변경 시 모델 선택 초기화
      }
    case 'SELECT_MODEL':
      return { ...state, selectedModelId: action.payload }
    case 'CLEAR_SELECTION':
      return { ...state, selectedProviderId: null, selectedModelId: null }
    case 'SET_SYNC_STATUS':
      return {
        ...state,
        syncInProgress: action.payload.syncInProgress,
        lastSyncTime: action.payload.lastSyncTime || state.lastSyncTime
      }
    default:
      return state
  }
}

// 컨텍스트 타입 정의
interface AIModelContextType {
  state: AIModelState
  selectProvider: (providerId: string) => void
  selectModel: (modelId: string) => void
  clearSelection: () => void
  refreshModels: () => Promise<void>
  syncModels: () => Promise<void>
  getSelectedModel: () => AIModel | null
  getProviderModels: (providerId: string) => AIModel[]
  getAvailableProviders: () => string[]
  getRecommendedModels: () => {
    fastest: AIModel | null
    cheapest: AIModel | null
    best_performance: AIModel | null
    balanced: AIModel | null
  }
  getModelStatistics: () => Promise<any>
  isSyncing: boolean
}

// 컨텍스트 생성
const AIModelContext = createContext<AIModelContextType | undefined>(undefined)

// 프로바이더 컴포넌트
export function AIModelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiModelReducer, initialState)
  const [isSyncing, setIsSyncing] = useState(false)

  // AI 모델 로딩 함수
  const loadModels = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const models = await modelSettingsService.getActiveModels()

      const formattedModels: AIModel[] = models.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider as 'openai' | 'anthropic' | 'google' | 'custom',
        model_id: model.model_id,
        cost_per_input_token: model.cost_per_input_token,
        cost_per_output_token: model.cost_per_output_token,
        status: model.status || 'active',
        capabilities: model.capabilities || [],
        max_tokens: model.max_tokens,
        available: model.status === 'active'
      }))

      dispatch({ type: 'SET_MODELS', payload: formattedModels })

      // 기본 프로바이더 및 모델 선택 (추천 모델 우선)
      if (formattedModels.length > 0 && !state.selectedProviderId) {
        const recommended = getRecommendedModels()
        const balancedModel = formattedModels.find(m => m.model_id === recommended.balanced.model_id) || formattedModels[0]
        dispatch({ type: 'SELECT_PROVIDER', payload: balancedModel.provider })
        dispatch({ type: 'SELECT_MODEL', payload: balancedModel.id })
      }

      // 마지막 동기화 시간 업데이트
      const lastSync = modelSyncService.getLastSyncTime()
      if (lastSync) {
        dispatch({ type: 'SET_SYNC_STATUS', payload: { syncInProgress: false, lastSyncTime: lastSync } })
      }
    } catch (error) {
      console.error('Failed to load AI models:', error)
      dispatch({ type: 'SET_ERROR', payload: 'AI 모델을 불러오는데 실패했습니다.' })
    }
  }

  // AI 모델 동기화 함수
  const syncModels = async () => {
    try {
      setIsSyncing(true)
      dispatch({ type: 'SET_SYNC_STATUS', payload: { syncInProgress: true } })
      dispatch({ type: 'SET_ERROR', payload: null })

      console.log('🔄 AI 모델 동기화 시작...')
      const result = await modelSyncService.syncAllModels()

      if (result.success) {
        console.log('✅ AI 모델 동기화 완료:', result.summary)
        // 동기화 후 모델 목록 새로고침
        await loadModels()
      } else {
        console.error('❌ AI 모델 동기화 실패:', result.details.errors)
        dispatch({ type: 'SET_ERROR', payload: `동기화 실패: ${result.summary.errors}개 오류 발생` })
      }

      dispatch({ type: 'SET_SYNC_STATUS', payload: {
        syncInProgress: false,
        lastSyncTime: new Date().toISOString()
      } })
    } catch (error) {
      console.error('AI 모델 동기화 중 오류:', error)
      dispatch({ type: 'SET_ERROR', payload: 'AI 모델 동기화에 실패했습니다.' })
      dispatch({ type: 'SET_SYNC_STATUS', payload: { syncInProgress: false } })
    } finally {
      setIsSyncing(false)
    }
  }

  // 컴포넌트 마운트 시 모델 로딩
  useEffect(() => {
    loadModels()
  }, [])

  // 컨텍스트 값
  const contextValue: AIModelContextType = {
    state,
    selectProvider: (providerId: string) => {
      dispatch({ type: 'SELECT_PROVIDER', payload: providerId })
    },
    selectModel: (modelId: string) => {
      dispatch({ type: 'SELECT_MODEL', payload: modelId })
    },
    clearSelection: () => {
      dispatch({ type: 'CLEAR_SELECTION' })
    },
    refreshModels: loadModels,
    syncModels: syncModels,
    getSelectedModel: () => {
      return state.availableModels.find(model => model.id === state.selectedModelId) || null
    },
    getProviderModels: (providerId: string) => {
      return state.availableModels.filter(model => model.provider === providerId)
    },
    getAvailableProviders: () => {
      const providers = [...new Set(state.availableModels.map(model => model.provider))]
      return providers
    },
    getRecommendedModels: () => {
      const recommended = getRecommendedModels()
      return {
        fastest: state.availableModels.find(m => m.model_id === recommended.fastest.model_id) || null,
        cheapest: state.availableModels.find(m => m.model_id === recommended.cheapest.model_id) || null,
        best_performance: state.availableModels.find(m => m.model_id === recommended.best_performance.model_id) || null,
        balanced: state.availableModels.find(m => m.model_id === recommended.balanced.model_id) || null
      }
    },
    getModelStatistics: async () => {
      return await modelSyncService.getModelStatistics()
    },
    isSyncing: isSyncing
  }

  return (
    <AIModelContext.Provider value={contextValue}>
      {children}
    </AIModelContext.Provider>
  )
}

// 커스텀 훅
export function useAIModel() {
  const context = useContext(AIModelContext)
  if (context === undefined) {
    throw new Error('useAIModel must be used within an AIModelProvider')
  }
  return context
}

// 선택된 모델만 가져오는 훅
export function useSelectedAIModel() {
  const { state, getSelectedModel } = useAIModel()
  return {
    selectedModel: getSelectedModel(),
    isLoading: state.loading,
    error: state.error
  }
}

// 사용 가능한 모델 목록만 가져오는 훅
export function useAvailableAIModels() {
  const { state } = useAIModel()
  return {
    models: state.availableModels.filter(model => model.available),
    allModels: state.availableModels,
    isLoading: state.loading,
    error: state.error
  }
}