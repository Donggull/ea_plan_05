import React, { createContext, useContext, useReducer, useEffect, useState } from 'react'
import { modelSettingsService } from '../services/ai/modelSettingsService'
import { modelSyncService } from '../services/ai/modelSyncService'
import { getRecommendedModels, allLatestModels, type LatestModelInfo } from '../services/ai/latestModelsData'
// AIServiceManager 클라이언트사이드 제거 - 서버사이드 API 사용

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
  metadata?: Record<string, any>
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

// localStorage 키
const STORAGE_KEYS = {
  PROVIDER: 'ai_selected_provider',
  MODEL: 'ai_selected_model'
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
      // localStorage에 프로바이더 저장
      localStorage.setItem(STORAGE_KEYS.PROVIDER, action.payload)
      localStorage.removeItem(STORAGE_KEYS.MODEL) // 프로바이더 변경 시 모델 초기화
      return {
        ...state,
        selectedProviderId: action.payload,
        selectedModelId: null // 프로바이더 변경 시 모델 선택 초기화
      }
    case 'SELECT_MODEL':
      // localStorage에 모델 저장
      localStorage.setItem(STORAGE_KEYS.MODEL, action.payload)
      return { ...state, selectedModelId: action.payload }
    case 'CLEAR_SELECTION':
      // localStorage에서 제거
      localStorage.removeItem(STORAGE_KEYS.PROVIDER)
      localStorage.removeItem(STORAGE_KEYS.MODEL)
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
  selectProvider: (providerId: string) => Promise<void>
  selectModel: (modelId: string) => Promise<void>
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

  // 최신 모델 데이터를 AIModel 형식으로 변환
  const convertLatestModelToAIModel = (latestModel: LatestModelInfo): AIModel => ({
    id: latestModel.id,
    name: latestModel.name,
    provider: latestModel.provider,
    model_id: latestModel.model_id,
    cost_per_input_token: latestModel.cost_per_input_token,
    cost_per_output_token: latestModel.cost_per_output_token,
    status: latestModel.status,
    capabilities: latestModel.capabilities,
    max_tokens: latestModel.max_tokens,
    available: latestModel.status === 'active',
    metadata: latestModel.metadata
  })

  // 초기 모델 선택 함수 (localStorage 우선, 없으면 기본 모델)
  const setInitialModel = async (models: AIModel[]) => {
    try {
      // 1. localStorage에서 저장된 선택 확인
      const savedProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER)
      const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL)

      console.log('🔍 저장된 모델 확인:', { savedProvider, savedModel })

      // 2. 저장된 모델이 있고 유효하면 복원
      if (savedProvider && savedModel) {
        const savedModelData = models.find(m => m.id === savedModel && m.provider === savedProvider)

        if (savedModelData && savedModelData.available) {
          console.log('✅ 저장된 모델 복원:', savedModelData.name, '(' + savedModelData.model_id + ')')
          dispatch({ type: 'SELECT_PROVIDER', payload: savedModelData.provider })
          dispatch({ type: 'SELECT_MODEL', payload: savedModelData.id })
          return
        } else {
          console.warn('⚠️ 저장된 모델을 찾을 수 없거나 사용 불가능합니다. 기본 모델을 선택합니다.')
          // 유효하지 않은 저장값 제거
          localStorage.removeItem(STORAGE_KEYS.PROVIDER)
          localStorage.removeItem(STORAGE_KEYS.MODEL)
        }
      }

      // 3. 저장된 모델이 없거나 유효하지 않으면 기본 모델 선택
      // 1순위: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
      let defaultModel = models.find(m => m.model_id === 'claude-sonnet-4-5-20250929')

      // 2순위: Claude 3 Sonnet (claude-3-5-sonnet-20241022)
      if (!defaultModel) {
        defaultModel = models.find(m => m.model_id === 'claude-3-5-sonnet-20241022')
      }

      // 3순위: 첫 번째 Anthropic 모델
      if (!defaultModel) {
        defaultModel = models.find(m => m.provider === 'anthropic' && m.available)
      }

      // 4순위: 사용 가능한 첫 번째 모델
      if (!defaultModel) {
        defaultModel = models.find(m => m.available)
      }

      if (defaultModel) {
        console.log('🎯 기본 모델 선택:', defaultModel.name, '(' + defaultModel.model_id + ')')
        dispatch({ type: 'SELECT_PROVIDER', payload: defaultModel.provider })
        dispatch({ type: 'SELECT_MODEL', payload: defaultModel.id })

        // 서버사이드 API를 통한 AI 모델 선택 완료
        console.log('✅ AI 모델 선택 완료 (서버사이드 API 사용):', defaultModel.name)
      } else {
        console.warn('⚠️ 사용 가능한 기본 모델을 찾을 수 없습니다.')
      }
    } catch (error) {
      console.error('초기 모델 선택 중 오류:', error)
    }
  }

  // AI 모델 로딩 함수 (최신 모델 데이터 우선 적용)
  const loadModels = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      console.log('🔄 AI 모델 로딩 시작...')

      // 1. 최신 모델 데이터를 우선 로드
      const latestModelsConverted: AIModel[] = allLatestModels.map(convertLatestModelToAIModel)
      console.log('📊 최신 모델 로드 완료:', latestModelsConverted.length, '개')

      // 2. 기존 로컬 모델도 로드 (백그라운드) - AI매니저 모델은 서버사이드로 이동
      try {
        const localModels = await modelSettingsService.getActiveModels().catch(() => [])

        // 로컬 모델 포맷팅
        const formattedLocalModels: AIModel[] = localModels.map(model => ({
          id: model.id,
          name: model.name,
          provider: model.provider as 'openai' | 'anthropic' | 'google' | 'custom',
          model_id: model.model_id,
          cost_per_input_token: model.cost_per_input_token,
          cost_per_output_token: model.cost_per_output_token,
          status: model.status || 'active',
          capabilities: model.capabilities || [],
          max_tokens: model.max_tokens,
          available: model.status === 'active',
          metadata: model.metadata
        }))

        // 3. 모든 모델 병합 (최신 모델 우선, 중복 제거)
        const allModels = [...latestModelsConverted]

        // 로컬 모델 추가 (중복되지 않는 것만)
        formattedLocalModels.forEach(localModel => {
          const exists = allModels.find(model => model.model_id === localModel.model_id)
          if (!exists) {
            allModels.push(localModel)
          }
        })

        console.log('✅ 전체 모델 로드 완료:', allModels.length, '개')
        dispatch({ type: 'SET_MODELS', payload: allModels })

        // 4. 초기 모델 선택 (localStorage 복원 우선, 없으면 기본 모델)
        await setInitialModel(allModels)
      } catch (error) {
        console.warn('⚠️ 로컬 모델 로드 실패, 최신 모델만 사용:', error)
        // 로컬 모델 로드에 실패해도 최신 모델은 표시
        dispatch({ type: 'SET_MODELS', payload: latestModelsConverted })

        // 초기 모델 선택 (localStorage 복원 우선, 없으면 기본 모델)
        await setInitialModel(latestModelsConverted)
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

  // setupAIServiceManager 함수 제거됨 - 서버사이드 API 사용으로 불필요

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
    selectProvider: async (providerId: string) => {
      dispatch({ type: 'SELECT_PROVIDER', payload: providerId })

      // 서버사이드 API를 통한 프로바이더 선택 완료
      const selectedModel = state.availableModels.find(m => m.provider === providerId)
      if (selectedModel) {
        console.log('✅ 프로바이더 선택 완료 (서버사이드 API 사용):', selectedModel.provider)
      }
    },
    selectModel: async (modelId: string) => {
      dispatch({ type: 'SELECT_MODEL', payload: modelId })

      // 서버사이드 API를 통한 모델 선택 완료
      const selectedModel = state.availableModels.find(m => m.id === modelId)
      if (selectedModel) {
        console.log('✅ 모델 선택 완료 (서버사이드 API 사용):', selectedModel.name)
      }
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