import { useState } from 'react'
import {
  Brain,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Zap,
  Settings
} from 'lucide-react'
import { useSelectedAIModel } from '../../contexts/AIModelContext'
// 기존 AI 모델 사용
import type { AIModel } from '../../contexts/AIModelContext'

interface AIModelSelectorProps {
  variant?: 'compact' | 'detailed' | 'dropdown'
  showProviderInfo?: boolean
  showTestButton?: boolean
  onTestClick?: () => void
  className?: string
}

export function AIModelSelector({
  variant = 'compact',
  showProviderInfo = true,
  showTestButton = false,
  onTestClick,
  className = ''
}: AIModelSelectorProps) {
  const { selectedModel } = useSelectedAIModel()
  const availableModels: AIModel[] = [] // 임시로 빈 배열
  const selectModel = (_id: string) => console.log('Select model:', _id)
  const testModel = async (_id: string) => ({ success: true, response: 'Test successful', error: null })
  const [isOpen, setIsOpen] = useState(false)
  const [testing, setTesting] = useState(false)

  // 모델 상태에 따른 색상
  const getStatusColor = (model: AIModel) => {
    switch (model.status) {
      case 'active': return 'text-green-500'
      case 'maintenance': return 'text-yellow-500'
      case 'deprecated': return 'text-red-500'
      default: return 'text-text-muted'
    }
  }

  // 모델 상태 아이콘
  const getStatusIcon = (model: AIModel) => {
    switch (model.status) {
      case 'active': return <CheckCircle className="w-3 h-3" />
      case 'maintenance': return <AlertCircle className="w-3 h-3" />
      case 'deprecated': return <AlertCircle className="w-3 h-3" />
      default: return <Brain className="w-3 h-3" />
    }
  }

  // AI 모델 테스트
  const handleTestModel = async () => {
    if (!selectedModel || testing) return

    try {
      setTesting(true)
      const result = await testModel(selectedModel.id)

      if (result.success) {
        console.log('AI 모델 테스트 성공:', result.response)
      } else {
        console.error('AI 모델 테스트 실패:', result.error)
      }
    } catch (error) {
      console.error('AI 모델 테스트 중 오류:', error)
    } finally {
      setTesting(false)
    }
  }

  // 컴팩트 버전
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg ${className}`}>
        <Brain className="w-4 h-4 text-primary-500" />
        <div className="flex items-center space-x-2">
          <span className="text-text-secondary text-sm">AI:</span>
          <span className="text-text-primary text-sm font-medium">
            {selectedModel?.name || '모델 없음'}
          </span>
          {selectedModel && showProviderInfo && (
            <span className="text-text-muted text-xs">
              ({selectedModel.provider})
            </span>
          )}
          {selectedModel && (
            <div className={getStatusColor(selectedModel)}>
              {getStatusIcon(selectedModel)}
            </div>
          )}
        </div>
        {showTestButton && selectedModel && (
          <button
            onClick={onTestClick || handleTestModel}
            disabled={testing}
            className="ml-2 p-1 text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
            title="AI 모델 테스트"
          >
            <Zap className={`w-3 h-3 ${testing ? 'animate-pulse' : ''}`} />
          </button>
        )}
      </div>
    )
  }

  // 드롭다운 버전
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Brain className="w-4 h-4 text-primary-500" />
            <div>
              <span className="text-text-primary font-medium">
                {selectedModel?.name || 'AI 모델 선택'}
              </span>
              {selectedModel && (
                <div className="text-text-muted text-sm">
                  {selectedModel.provider} • {(selectedModel as any).context_window?.toLocaleString() || '알 수 없음'} 토큰
                </div>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-2 bg-bg-secondary border border-border-primary rounded-lg shadow-lg">
            <div className="p-2">
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    selectModel(model.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-bg-tertiary transition-colors ${
                    selectedModel?.id === model.id ? 'bg-primary-500/10 border border-primary-500/30' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={getStatusColor(model)}>
                      {getStatusIcon(model)}
                    </div>
                    <div className="text-left">
                      <div className="text-text-primary font-medium">{model.name}</div>
                      <div className="text-text-muted text-sm">
                        {model.provider} • {(model as any).context_window?.toLocaleString() || '알 수 없음'} 토큰
                      </div>
                    </div>
                  </div>
                  {selectedModel?.id === model.id && (
                    <CheckCircle className="w-4 h-4 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 상세 버전
  return (
    <div className={`bg-bg-secondary border border-border-primary rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-text-primary">AI 모델</h3>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>변경</span>
        </button>
      </div>

      {selectedModel ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-text-primary font-medium">{selectedModel.name}</div>
              <div className="text-text-secondary text-sm">{(selectedModel as any).description || '모델 설명이 없습니다'}</div>
            </div>
            <div className={getStatusColor(selectedModel)}>
              {getStatusIcon(selectedModel)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">제공업체</span>
              <div className="text-text-primary font-medium">{selectedModel.provider}</div>
            </div>
            <div>
              <span className="text-text-muted">컨텍스트 윈도우</span>
              <div className="text-text-primary font-medium">
                {(selectedModel as any).context_window?.toLocaleString() || '알 수 없음'} 토큰
              </div>
            </div>
          </div>

          {(selectedModel as any).pricing && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted">입력 비용</span>
                <div className="text-text-primary font-medium">
                  ${(selectedModel as any).pricing.input_cost_per_1k_tokens}/1K 토큰
                </div>
              </div>
              <div>
                <span className="text-text-muted">출력 비용</span>
                <div className="text-text-primary font-medium">
                  ${(selectedModel as any).pricing.output_cost_per_1k_tokens}/1K 토큰
                </div>
              </div>
            </div>
          )}

          {showTestButton && (
            <button
              onClick={onTestClick || handleTestModel}
              disabled={testing}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>테스트 중...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>모델 테스트</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-text-secondary">선택된 AI 모델이 없습니다</p>
          <button
            onClick={() => setIsOpen(true)}
            className="mt-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            모델 선택
          </button>
        </div>
      )}

      {/* 모델 선택 모달 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-primary border border-border-primary rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-border-primary">
              <h3 className="text-lg font-semibold text-text-primary">AI 모델 선택</h3>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      selectModel(model.id)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-bg-tertiary transition-colors ${
                      selectedModel?.id === model.id ? 'bg-primary-500/10 border border-primary-500/30' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={getStatusColor(model)}>
                        {getStatusIcon(model)}
                      </div>
                      <div className="text-left">
                        <div className="text-text-primary font-medium">{model.name}</div>
                        <div className="text-text-muted text-sm">
                          {model.provider} • {(model as any).context_window?.toLocaleString() || '알 수 없음'} 토큰
                        </div>
                      </div>
                    </div>
                    {selectedModel?.id === model.id && (
                      <CheckCircle className="w-4 h-4 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-border-primary">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}