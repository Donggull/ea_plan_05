import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { modelSettingsService } from '../services/ai/modelSettingsService'

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
  selectedModelId: string | null
  availableModels: AIModel[]
  loading: boolean
  error: string | null
}

// 액션 타입 정의
type AIModelAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MODELS'; payload: AIModel[] }
  | { type: 'SELECT_MODEL'; payload: string }
  | { type: 'CLEAR_SELECTION' }

// 초기 상태
const initialState: AIModelState = {
  selectedModelId: null,
  availableModels: [],
  loading: false,
  error: null
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
    case 'SELECT_MODEL':
      return { ...state, selectedModelId: action.payload }
    case 'CLEAR_SELECTION':
      return { ...state, selectedModelId: null }
    default:
      return state
  }
}

// 컨텍스트 타입 정의
interface AIModelContextType {
  state: AIModelState
  selectModel: (modelId: string) => void
  clearSelection: () => void
  refreshModels: () => Promise<void>
  getSelectedModel: () => AIModel | null
}

// 컨텍스트 생성
const AIModelContext = createContext<AIModelContextType | undefined>(undefined)

// 프로바이더 컴포넌트
export function AIModelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiModelReducer, initialState)

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

      // 기본 모델 선택 (첫 번째 사용 가능한 모델)
      if (formattedModels.length > 0 && !state.selectedModelId) {
        dispatch({ type: 'SELECT_MODEL', payload: formattedModels[0].id })
      }
    } catch (error) {
      console.error('Failed to load AI models:', error)
      dispatch({ type: 'SET_ERROR', payload: 'AI 모델을 불러오는데 실패했습니다.' })
    }
  }

  // 컴포넌트 마운트 시 모델 로딩
  useEffect(() => {
    loadModels()
  }, [])

  // 컨텍스트 값
  const contextValue: AIModelContextType = {
    state,
    selectModel: (modelId: string) => {
      dispatch({ type: 'SELECT_MODEL', payload: modelId })
    },
    clearSelection: () => {
      dispatch({ type: 'CLEAR_SELECTION' })
    },
    refreshModels: loadModels,
    getSelectedModel: () => {
      return state.availableModels.find(model => model.id === state.selectedModelId) || null
    }
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