// 프로젝트 라이프사이클 네비게이터
// 단계별 진행 상황 및 전환 UI

import React, { useState, useEffect } from 'react'
import {
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Play,
  Pause,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import {
  ProjectLifecycleService,
  ProjectLifecycleData,
  ProjectPhase,
} from '../../services/lifecycle/ProjectLifecycleService'
import { Card } from '../LinearComponents'

interface ProjectLifecycleNavigatorProps {
  projectId: string
  currentUserId: string
  onPhaseSelect?: (phase: ProjectPhase) => void
  className?: string
}

export const ProjectLifecycleNavigator: React.FC<ProjectLifecycleNavigatorProps> = ({
  projectId,
  currentUserId,
  onPhaseSelect,
  className = ''
}) => {
  const [lifecycle, setLifecycle] = useState<ProjectLifecycleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState<Set<ProjectPhase>>(new Set())

  const lifecycleService = ProjectLifecycleService.getInstance()

  useEffect(() => {
    loadLifecycleData()
  }, [projectId])

  const loadLifecycleData = async () => {
    try {
      setLoading(true)
      const data = await lifecycleService.getLifecycleData(projectId)
      setLifecycle(data)
    } catch (error) {
      console.error('Failed to load lifecycle data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePhaseTransition = async () => {
    if (!lifecycle) return

    try {
      setTransitioning(true)
      const updatedLifecycle = await lifecycleService.transitionToNextPhase(
        projectId,
        currentUserId
      )
      setLifecycle(updatedLifecycle)
    } catch (error) {
      console.error('Failed to transition phase:', error)
      alert(error instanceof Error ? error.message : '단계 전환에 실패했습니다.')
    } finally {
      setTransitioning(false)
    }
  }

  const togglePhaseExpansion = (phase: ProjectPhase) => {
    const newExpanded = new Set(expandedPhases)
    if (newExpanded.has(phase)) {
      newExpanded.delete(phase)
    } else {
      newExpanded.add(phase)
    }
    setExpandedPhases(newExpanded)
  }

  const getPhaseStatusIcon = (phase: ProjectPhase, phaseData: any) => {
    if (lifecycle?.currentPhase === phase && phaseData.status === 'in_progress') {
      return <Clock className="w-5 h-5 text-blue-500" />
    }

    switch (phaseData.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Play className="w-5 h-5 text-blue-500" />
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-500" />
      case 'cancelled':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getPhaseStatusColor = (phase: ProjectPhase, phaseData: any) => {
    if (lifecycle?.currentPhase === phase) {
      return 'border-blue-500 bg-blue-500/10'
    }

    switch (phaseData.status) {
      case 'completed':
        return 'border-green-500 bg-green-500/10'
      case 'in_progress':
        return 'border-blue-500 bg-blue-500/10'
      case 'paused':
        return 'border-yellow-500 bg-yellow-500/10'
      case 'cancelled':
        return 'border-red-500 bg-red-500/10'
      default:
        return 'border-border-primary bg-bg-secondary'
    }
  }

  const getPhaseTitle = (phase: ProjectPhase) => {
    const titles = {
      planning: '계획 수립',
      proposal: '제안 작성',
      construction: '시스템 구축',
      operation: '운영 및 배포',
      maintenance: '유지보수',
      completed: '프로젝트 완료'
    }
    return titles[phase] || phase
  }

  const getNextPhase = (currentPhase: ProjectPhase): ProjectPhase | null => {
    const phaseOrder: ProjectPhase[] = [
      'planning',
      'proposal',
      'construction',
      'operation',
      'maintenance',
      'completed'
    ]

    const currentIndex = phaseOrder.indexOf(currentPhase)
    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      return null
    }

    return phaseOrder[currentIndex + 1]
  }

  const canTransition = (lifecycle: ProjectLifecycleData): boolean => {
    const currentPhaseData = lifecycle.phases[lifecycle.currentPhase]
    return (
      currentPhaseData.progress >= 100 &&
      currentPhaseData.status === 'in_progress' &&
      getNextPhase(lifecycle.currentPhase) !== null
    )
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-text-secondary">라이프사이클 데이터를 불러오는 중...</div>
        </div>
      </Card>
    )
  }

  if (!lifecycle) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="text-text-secondary mb-4">라이프사이클 데이터가 없습니다.</div>
          <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
            라이프사이클 초기화
          </button>
        </div>
      </Card>
    )
  }

  const phases: ProjectPhase[] = ['planning', 'proposal', 'construction', 'operation', 'maintenance']
  const nextPhase = getNextPhase(lifecycle.currentPhase)

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">프로젝트 라이프사이클</h3>
          <p className="text-sm text-text-secondary mt-1">
            현재 단계: {getPhaseTitle(lifecycle.currentPhase)}
          </p>
        </div>

        {canTransition(lifecycle) && nextPhase && (
          <button
            onClick={handlePhaseTransition}
            disabled={transitioning}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {transitioning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>전환 중...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>{getPhaseTitle(nextPhase)}로 전환</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {phases.map((phase, index) => {
          const phaseData = lifecycle?.phases?.[phase]
          if (!phaseData) return null
          const isExpanded = expandedPhases.has(phase)
          const isCurrent = lifecycle.currentPhase === phase

          return (
            <div key={phase} className="space-y-2">
              {/* 단계 헤더 */}
              <div
                className={`border rounded-lg p-4 cursor-pointer transition-all ${getPhaseStatusColor(phase, phaseData)} ${
                  isCurrent ? 'ring-2 ring-primary-500/50' : ''
                }`}
                onClick={() => {
                  togglePhaseExpansion(phase)
                  onPhaseSelect?.(phase)
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getPhaseStatusIcon(phase, phaseData)}
                    <div>
                      <div className="font-medium text-text-primary">
                        {index + 1}. {getPhaseTitle(phase)}
                      </div>
                      <div className="text-sm text-text-secondary">
                        진행률: {phaseData.progress}% | 상태: {phaseData.status}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* 진행률 바 */}
                    <div className="w-20 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all duration-300"
                        style={{ width: `${phaseData.progress}%` }}
                      />
                    </div>

                    {/* 확장/축소 아이콘 */}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                </div>
              </div>

              {/* 단계 상세 정보 */}
              {isExpanded && (
                <div className="ml-8 space-y-4 p-4 bg-bg-secondary rounded-lg">
                  {/* 산출물 */}
                  {phaseData.deliverables.length > 0 && (
                    <div>
                      <h4 className="font-medium text-text-primary mb-2">산출물</h4>
                      <div className="space-y-1">
                        {phaseData.deliverables.map((deliverable: any) => (
                          <div key={deliverable.id} className="flex items-center space-x-2 text-sm">
                            {deliverable.status === 'completed' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-text-secondary">{deliverable.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 작업 */}
                  {phaseData.tasks.length > 0 && (
                    <div>
                      <h4 className="font-medium text-text-primary mb-2">주요 작업</h4>
                      <div className="space-y-1">
                        {phaseData.tasks.slice(0, 3).map((task: any) => (
                          <div key={task.id} className="flex items-center space-x-2 text-sm">
                            {task.status === 'completed' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : task.status === 'in_progress' ? (
                              <Clock className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-text-secondary">{task.name}</span>
                          </div>
                        ))}
                        {phaseData.tasks.length > 3 && (
                          <div className="text-xs text-text-muted">
                            +{phaseData.tasks.length - 3}개 더
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 위험 요소 */}
                  {phaseData.risks.length > 0 && (
                    <div>
                      <h4 className="font-medium text-text-primary mb-2">위험 요소</h4>
                      <div className="space-y-1">
                        {phaseData.risks.filter((r: any) => r.status !== 'resolved').slice(0, 2).map((risk: any) => (
                          <div key={risk.id} className="flex items-center space-x-2 text-sm">
                            <AlertTriangle
                              className={`w-4 h-4 ${
                                risk.severity === 'critical' ? 'text-red-500' :
                                risk.severity === 'high' ? 'text-orange-500' :
                                'text-yellow-500'
                              }`}
                            />
                            <span className="text-text-secondary">{risk.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 일정 정보 */}
                  <div className="flex items-center justify-between text-sm text-text-secondary">
                    <div>
                      {phaseData.startDate && (
                        <span>시작: {new Date(phaseData.startDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div>
                      예상 기간: {phaseData.estimatedDuration}일
                    </div>
                  </div>
                </div>
              )}

              {/* 화살표 (마지막 단계 제외) */}
              {index < phases.length - 1 && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="w-4 h-4 text-text-muted" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 전체 진행률 */}
      <div className="mt-6 pt-6 border-t border-border-primary">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">전체 진행률</span>
          <span className="text-sm text-text-secondary">
            {Math.round(
              Object.values(lifecycle.phases).reduce((sum, phase) => sum + phase.progress, 0) /
              Object.values(lifecycle.phases).length
            )}%
          </span>
        </div>
        <div className="w-full h-3 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
            style={{
              width: `${Math.round(
                Object.values(lifecycle.phases).reduce((sum, phase) => sum + phase.progress, 0) /
                Object.values(lifecycle.phases).length
              )}%`
            }}
          />
        </div>
      </div>
    </Card>
  )
}