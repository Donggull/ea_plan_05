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
  selectedProviderId: string | null  // 1차 선택: 프로바이더
  selectedModelId: string | null     // 2차 선택: 세부 모델
  availableModels: AIModel[]
  loading: boolean
  error: string | null
}

// 액션 타입 정의
type AIModelAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MODELS'; payload: AIModel[] }
  | { type: 'SELECT_PROVIDER'; payload: string }
  | { type: 'SELECT_MODEL'; payload: string }
  | { type: 'CLEAR_SELECTION' }

// 로컬 스토리지 키
const STORAGE_KEYS = {
  SELECTED_PROVIDER: 'eluo-ai-selected-provider',
  SELECTED_MODEL: 'eluo-ai-selected-model'
}

// 로컬 스토리지에서 저장된 선택 항목 읽기
function loadPersistedSelection(): { providerId: string | null; modelId: string | null } {
  try {
    return {
      providerId: localStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER),
      modelId: localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL)
    }
  } catch (error) {
    console.warn('Failed to load persisted AI model selection:', error)
    return { providerId: null, modelId: null }
  }
}

// 로컬 스토리지에 선택 항목 저장
function persistSelection(providerId: string | null, modelId: string | null): void {
  try {
    if (providerId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_PROVIDER, providerId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_PROVIDER)
    }

    if (modelId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, modelId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_MODEL)
    }
  } catch (error) {
    console.warn('Failed to persist AI model selection:', error)
  }
}

// 초기 상태 (저장된 선택 항목 복원)
const persistedSelection = loadPersistedSelection()
const initialState: AIModelState = {
  selectedProviderId: persistedSelection.providerId,
  selectedModelId: persistedSelection.modelId,
  availableModels: [],
  loading: false,
  error: null
}

// 리듀서
function aiModelReducer(state: AIModelState, action: AIModelAction): AIModelState {
  let newState: AIModelState

  switch (action.type) {
    case 'SET_LOADING':
      newState = { ...state, loading: action.payload }
      break
    case 'SET_ERROR':
      newState = { ...state, error: action.payload, loading: false }
      break
    case 'SET_MODELS':
      newState = { ...state, availableModels: action.payload, loading: false }
      break
    case 'SELECT_PROVIDER':
      newState = {
        ...state,
        selectedProviderId: action.payload,
        selectedModelId: null // 프로바이더 변경 시 모델 선택 초기화
      }
      // 프로바이더 선택 시 로컬 스토리지에 저장
      persistSelection(action.payload, null)
      break
    case 'SELECT_MODEL':
      newState = { ...state, selectedModelId: action.payload }
      // 모델 선택 시 로컬 스토리지에 저장
      persistSelection(state.selectedProviderId, action.payload)
      break
    case 'CLEAR_SELECTION':
      newState = { ...state, selectedProviderId: null, selectedModelId: null }
      // 선택 초기화 시 로컬 스토리지에서 제거
      persistSelection(null, null)
      break
    default:
      newState = state
  }

  return newState
}

// 컨텍스트 타입 정의
interface AIModelContextType {
  state: AIModelState
  selectProvider: (providerId: string) => void
  selectModel: (modelId: string) => void
  clearSelection: () => void
  refreshModels: () => Promise<void>
  getSelectedModel: () => AIModel | null
  getProviderModels: (providerId: string) => AIModel[]
  getAvailableProviders: () => string[]
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

      // 저장된 선택 항목 복원 및 유효성 검증
      const { providerId: savedProviderId, modelId: savedModelId } = loadPersistedSelection()

      let validProviderId = state.selectedProviderId
      let validModelId = state.selectedModelId

      // 저장된 프로바이더가 유효한지 확인
      if (savedProviderId) {
        const providerExists = formattedModels.some(model => model.provider === savedProviderId)
        if (providerExists) {
          validProviderId = savedProviderId
        }
      }

      // 저장된 모델이 유효한지 확인
      if (savedModelId) {
        const modelExists = formattedModels.some(model =>
          model.id === savedModelId && model.available &&
          (!validProviderId || model.provider === validProviderId)
        )
        if (modelExists) {
          validModelId = savedModelId
          // 모델의 프로바이더로 프로바이더도 설정
          const model = formattedModels.find(m => m.id === savedModelId)
          if (model) {
            validProviderId = model.provider
          }
        }
      }

      // 유효한 선택이 없으면 기본값 설정
      if (!validProviderId || !validModelId) {
        if (formattedModels.length > 0) {
          const availableModels = formattedModels.filter(m => m.available)
          if (availableModels.length > 0) {
            const firstModel = availableModels[0]
            validProviderId = firstModel.provider
            validModelId = firstModel.id
          }
        }
      }

      // 선택 항목 적용
      if (validProviderId && validProviderId !== state.selectedProviderId) {
        dispatch({ type: 'SELECT_PROVIDER', payload: validProviderId })
      }
      if (validModelId && validModelId !== state.selectedModelId) {
        dispatch({ type: 'SELECT_MODEL', payload: validModelId })
      }

      console.log('🎯 AI 모델 선택 복원:', {
        savedProvider: savedProviderId,
        savedModel: savedModelId,
        validProvider: validProviderId,
        validModel: validModelId,
        availableModels: formattedModels.length
      })
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
    getSelectedModel: () => {
      return state.availableModels.find(model => model.id === state.selectedModelId) || null
    },
    getProviderModels: (providerId: string) => {
      return state.availableModels.filter(model => model.provider === providerId)
    },
    getAvailableProviders: () => {
      const providers = [...new Set(state.availableModels.map(model => model.provider))]
      return providers
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