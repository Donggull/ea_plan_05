import { useEffect, useState } from 'react'
import { Link2, CheckCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, Badge, ProgressBar } from '../LinearComponents'
import { StepIntegrationService } from '../../services/proposal/stepIntegrationService'
import { WorkflowStep } from '../../types/project'

interface StepIntegrationIndicatorProps {
  projectId: string
  currentStep: WorkflowStep
  className?: string
}

interface StepConnectionInfo {
  step: WorkflowStep
  title: string
  status: 'completed' | 'available' | 'unavailable'
  confidence?: number
  lastUpdated?: string
}

const STEP_TITLES: Record<WorkflowStep, string> = {
  document_analysis: '문서 분석',
  market_research: '시장 조사',
  personas: '페르소나 분석',
  proposal: '제안서 작성',
  budget: '비용 산정'
}

export function StepIntegrationIndicator({ projectId, currentStep, className = '' }: StepIntegrationIndicatorProps) {
  const [integrationStrength, setIntegrationStrength] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stepConnections, setStepConnections] = useState<StepConnectionInfo[]>([])

  const loadIntegrationData = async () => {
    try {
      setLoading(true)
      const context = await StepIntegrationService.getIntegratedContext(projectId)
      const strength = StepIntegrationService.calculateIntegrationStrength(context)

      setIntegrationStrength(strength)

      // 단계별 연결 상태 정보 생성
      const allSteps: WorkflowStep[] = ['document_analysis', 'market_research', 'personas', 'proposal', 'budget']
      const currentIndex = allSteps.indexOf(currentStep)

      const connections: StepConnectionInfo[] = allSteps.map((step, index) => {
        const stepData = context[step]
        let status: 'completed' | 'available' | 'unavailable'

        if (stepData) {
          status = 'completed'
        } else if (index < currentIndex) {
          status = 'available'
        } else {
          status = 'unavailable'
        }

        return {
          step,
          title: STEP_TITLES[step],
          status,
          confidence: stepData?.confidence,
          lastUpdated: stepData?.metadata?.['created_at']
        }
      })

      setStepConnections(connections)
    } catch (error) {
      console.error('Failed to load integration data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntegrationData()
  }, [projectId, currentStep])

  const getStatusIcon = (status: StepConnectionInfo['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'available':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'unavailable':
        return <AlertTriangle className="w-4 h-4 text-text-muted" />
    }
  }


  const getIntegrationStrengthColor = () => {
    if (integrationStrength >= 80) return 'text-green-500'
    if (integrationStrength >= 60) return 'text-blue-500'
    if (integrationStrength >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getAvailableConnections = () => {
    return stepConnections.filter(conn => conn.status === 'completed' && conn.step !== currentStep)
  }

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Link2 className="w-5 h-5 text-text-muted animate-pulse" />
          <span className="text-text-secondary">연계 정보 로딩 중...</span>
        </div>
      </Card>
    )
  }

  const availableConnections = getAvailableConnections()

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link2 className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-text-primary">단계 간 연계</h3>
          </div>
          <Badge variant="primary">
            <span className={getIntegrationStrengthColor()}>
              {Math.round(integrationStrength)}%
            </span>
          </Badge>
        </div>

        {/* 전체 연계 강도 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">연계 강도</span>
            <span className={`font-medium ${getIntegrationStrengthColor()}`}>
              {Math.round(integrationStrength)}%
            </span>
          </div>
          <ProgressBar
            value={integrationStrength}
            max={100}
            color={
              integrationStrength >= 80 ? '#10B981' :
              integrationStrength >= 60 ? '#3B82F6' :
              integrationStrength >= 40 ? '#F59E0B' : '#EF4444'
            }
          />
        </div>

        {/* 사용 가능한 연결 정보 */}
        {availableConnections.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-3">활용 가능한 이전 분석</h4>
            <div className="space-y-2">
              {availableConnections.map((connection, index) => (
                <div key={connection.step} className="flex items-center space-x-3 p-2 bg-bg-tertiary rounded-lg">
                  <div className="flex items-center space-x-2 flex-1">
                    {getStatusIcon(connection.status)}
                    <span className="text-sm text-text-primary">{connection.title}</span>
                  </div>

                  {connection.confidence && (
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-text-muted">신뢰도:</span>
                      <span className="text-xs font-medium text-text-primary">
                        {Math.round(connection.confidence * 100)}%
                      </span>
                    </div>
                  )}

                  {index < availableConnections.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-text-muted" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 연계 효과 설명 */}
        {integrationStrength > 0 && (
          <div className="text-xs text-text-secondary bg-bg-tertiary p-3 rounded-lg">
            <div className="space-y-1">
              {integrationStrength >= 80 && (
                <p>💪 <strong>매우 강한 연계:</strong> 이전 단계들의 분석 결과가 충분히 활용되어 더욱 정교한 분석이 가능합니다.</p>
              )}
              {integrationStrength >= 60 && integrationStrength < 80 && (
                <p>🔗 <strong>강한 연계:</strong> 이전 분석 결과들이 잘 연결되어 일관성 있는 분석을 제공합니다.</p>
              )}
              {integrationStrength >= 40 && integrationStrength < 60 && (
                <p>⚡ <strong>부분 연계:</strong> 일부 이전 분석 결과를 활용하여 분석 품질을 향상시킵니다.</p>
              )}
              {integrationStrength < 40 && integrationStrength > 0 && (
                <p>🔧 <strong>약한 연계:</strong> 제한적인 이전 정보를 활용합니다. 더 나은 결과를 위해 이전 단계들을 완료해보세요.</p>
              )}
            </div>
          </div>
        )}

        {/* 연계 없음 메시지 */}
        {integrationStrength === 0 && (
          <div className="text-xs text-text-muted bg-bg-tertiary p-3 rounded-lg">
            <p>ℹ️ <strong>독립 분석 모드:</strong> 이전 단계 결과 없이 진행됩니다. 순차적으로 진행하면 더 정교한 분석이 가능합니다.</p>
          </div>
        )}
      </div>
    </Card>
  )
}