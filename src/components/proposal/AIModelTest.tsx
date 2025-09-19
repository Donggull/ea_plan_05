import { useState } from 'react'
import { Play, CheckCircle, AlertCircle, Settings, Loader2 } from 'lucide-react'
import { Card, Button } from '../LinearComponents'
import { AIProviderFactory, initializeDefaultModels } from '../../services/ai/providerFactory'
import { useAuth } from '@/components/providers/AuthProvider'

interface TestResult {
  modelId: string
  success: boolean
  response?: string
  error?: string
  responseTime?: number
  tokenUsage?: {
    input: number
    output: number
    cost: number
  }
}

export function AIModelTest() {
  const { user } = useAuth()
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  // AI 모델 초기화 및 테스트
  const runModelTests = async () => {
    if (!user?.id) return

    setTesting(true)
    setResults([])

    try {
      // AI 모델 초기화
      initializeDefaultModels()

      // 등록된 모델 목록 가져오기
      const availableModels = AIProviderFactory.getRegisteredModels()
      console.log('🤖 사용 가능한 AI 모델들:', availableModels.map(m => m.id))

      const testModels = selectedModels.length > 0
        ? selectedModels
        : availableModels.slice(0, 3).map(m => m.id) // 기본적으로 첫 3개 모델 테스트

      const testResults: TestResult[] = []

      // 각 모델별 테스트 실행
      for (const modelId of testModels) {
        try {
          console.log(`🧪 ${modelId} 모델 테스트 시작...`)

          const startTime = Date.now()
          const testResponse = await AIProviderFactory.generateCompletion(modelId, {
            messages: [
              {
                role: 'system',
                content: '당신은 AI 모델 연결 테스트를 수행하는 어시스턴트입니다.'
              },
              {
                role: 'user',
                content: '안녕하세요! 이것은 AI 모델 연결 테스트입니다. 간단한 응답을 부탁드립니다.'
              }
            ],
            max_tokens: 100,
            temperature: 0.7,
            user_id: user.id
          })

          const responseTime = Date.now() - startTime

          testResults.push({
            modelId,
            success: true,
            response: testResponse.content.substring(0, 200) + (testResponse.content.length > 200 ? '...' : ''),
            responseTime,
            tokenUsage: {
              input: testResponse.usage.input_tokens,
              output: testResponse.usage.output_tokens,
              cost: testResponse.cost
            }
          })

          console.log(`✅ ${modelId} 테스트 성공`)

        } catch (error) {
          console.error(`❌ ${modelId} 테스트 실패:`, error)

          testResults.push({
            modelId,
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류'
          })
        }

        // 테스트 간 간격
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      setResults(testResults)

    } catch (error) {
      console.error('AI 모델 테스트 중 오류:', error)
    } finally {
      setTesting(false)
    }
  }

  // 환경 변수 상태 확인
  const checkEnvironmentStatus = () => {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY
    const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    const googleKey = import.meta.env.VITE_GOOGLE_AI_API_KEY

    return {
      openai: openaiKey && openaiKey !== 'sk-your-openai-key-here',
      anthropic: anthropicKey && anthropicKey !== 'your-anthropic-key-here',
      google: googleKey && googleKey !== 'your-google-ai-key-here'
    }
  }

  const envStatus = checkEnvironmentStatus()
  const availableModels = AIProviderFactory.getRegisteredModels()

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">AI 모델 연동 테스트</h2>
          <p className="text-text-secondary mt-1">
            설정된 AI 모델들의 연결 상태를 테스트합니다
          </p>
        </div>
        <Button.Primary
          onClick={runModelTests}
          disabled={testing || !user}
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              테스트 중...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              테스트 실행
            </>
          )}
        </Button.Primary>
      </div>

      {/* 환경 변수 상태 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-text-primary mb-3">환경 변수 상태</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-3 rounded-lg border ${envStatus.openai ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <div className="flex items-center space-x-2">
              {envStatus.openai ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="font-medium">OpenAI</span>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {envStatus.openai ? 'API 키 설정됨' : 'API 키 누락'}
            </p>
          </div>

          <div className={`p-3 rounded-lg border ${envStatus.anthropic ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <div className="flex items-center space-x-2">
              {envStatus.anthropic ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="font-medium">Anthropic</span>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {envStatus.anthropic ? 'API 키 설정됨' : 'API 키 누락'}
            </p>
          </div>

          <div className={`p-3 rounded-lg border ${envStatus.google ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <div className="flex items-center space-x-2">
              {envStatus.google ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="font-medium">Google AI</span>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {envStatus.google ? 'API 키 설정됨' : 'API 키 누락'}
            </p>
          </div>
        </div>
      </div>

      {/* 사용 가능한 모델 목록 */}
      {availableModels.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-text-primary mb-3">등록된 AI 모델</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableModels.map(model => (
              <div key={model.id} className="p-3 border border-border-primary rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-text-primary">{model.name}</span>
                    <span className="text-sm text-text-secondary ml-2">({model.provider})</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedModels([...selectedModels, model.id])
                      } else {
                        setSelectedModels(selectedModels.filter(id => id !== model.id))
                      }
                    }}
                    className="rounded border-border-primary text-primary-500 focus:ring-primary-500"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">
                  최대 토큰: {model.max_tokens.toLocaleString()} |
                  입력: ${model.cost_per_input_token}/1K |
                  출력: ${model.cost_per_output_token}/1K
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 테스트 결과 */}
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-text-primary mb-3">테스트 결과</h3>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="font-medium text-text-primary">{result.modelId}</span>
                  </div>
                  {result.responseTime && (
                    <span className="text-sm text-text-secondary">
                      {result.responseTime}ms
                    </span>
                  )}
                </div>

                {result.success ? (
                  <div>
                    <div className="bg-bg-tertiary p-3 rounded mb-3">
                      <p className="text-sm text-text-primary">{result.response}</p>
                    </div>
                    {result.tokenUsage && (
                      <div className="flex items-center space-x-4 text-xs text-text-secondary">
                        <span>입력: {result.tokenUsage.input} 토큰</span>
                        <span>출력: {result.tokenUsage.output} 토큰</span>
                        <span>비용: ${result.tokenUsage.cost.toFixed(6)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-500/10 p-3 rounded">
                    <p className="text-sm text-red-500">{result.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 설정 안내 */}
      {!envStatus.openai && !envStatus.anthropic && !envStatus.google && (
        <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <div className="flex items-center space-x-2 text-orange-500 mb-2">
            <Settings className="w-4 h-4" />
            <span className="font-medium">API 키 설정 필요</span>
          </div>
          <p className="text-sm text-text-secondary">
            Vercel Dashboard → Settings → Environment Variables에서 다음 환경 변수를 설정해주세요:
          </p>
          <ul className="text-sm text-text-secondary mt-2 ml-4 list-disc">
            <li>VITE_OPENAI_API_KEY (OpenAI API 키)</li>
            <li>VITE_ANTHROPIC_API_KEY (Anthropic API 키)</li>
            <li>VITE_GOOGLE_AI_API_KEY (Google AI API 키)</li>
          </ul>
        </div>
      )}
    </Card>
  )
}