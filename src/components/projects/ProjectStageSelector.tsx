import { useState } from 'react'
import { Check, ChevronDown, FileText, Building, Settings, Info } from 'lucide-react'
import {
  ProjectType,
  WorkflowStep,
  ProjectStageSelection,
  PROJECT_TYPE_CONFIGS,
  WORKFLOW_STEP_CONFIGS
} from '../../types/project'
import { ProjectTypeService } from '../../services/projectTypeService'

interface ProjectStageSelectorProps {
  selection: ProjectStageSelection
  onChange: (selection: ProjectStageSelection) => void
  disabled?: boolean
  mode?: 'create' | 'edit'
  protectedSteps?: WorkflowStep[]
}

const ICON_MAP = {
  FileText,
  Building,
  Settings,
  TrendingUp: FileText, // Fallback
  Users: FileText, // Fallback
  DollarSign: FileText // Fallback
}

export function ProjectStageSelector({ selection, onChange, disabled = false, mode = 'create', protectedSteps = [] }: ProjectStageSelectorProps) {
  const [expandedType, setExpandedType] = useState<ProjectType | null>('proposal')

  const enabledTypes = ProjectTypeService.getEnabledProjectTypes()

  const handleTypeToggle = (type: ProjectType) => {
    const isSelected = selection.selectedTypes.includes(type)
    const newSelectedTypes = isSelected
      ? selection.selectedTypes.filter(t => t !== type)
      : [...selection.selectedTypes, type]

    // 타입이 제거되면 해당 타입의 단계들도 제거
    let newSelectedSteps = selection.selectedSteps
    if (isSelected) {
      const typeSteps = ProjectTypeService.getAvailableSteps(type)
      newSelectedSteps = selection.selectedSteps.filter(step => !typeSteps.includes(step))
    }

    onChange({
      ...selection,
      selectedTypes: newSelectedTypes,
      selectedSteps: newSelectedSteps
    })

    // 선택 해제 시 확장 상태도 닫기
    if (isSelected && expandedType === type) {
      setExpandedType(null)
    }
  }

  const handleStepToggle = (step: WorkflowStep) => {
    const isSelected = selection.selectedSteps.includes(step)
    const isProtected = protectedSteps.includes(step)

    // 보호된 단계는 제거할 수 없음
    if (isSelected && isProtected) {
      return
    }

    const newSelectedSteps = isSelected
      ? selection.selectedSteps.filter(s => s !== step)
      : [...selection.selectedSteps, step].sort((a, b) =>
          WORKFLOW_STEP_CONFIGS[a].order - WORKFLOW_STEP_CONFIGS[b].order
        )

    onChange({
      ...selection,
      selectedSteps: newSelectedSteps
    })
  }

  const handleConnectedModeToggle = () => {
    onChange({
      ...selection,
      enableConnectedMode: !selection.enableConnectedMode
    })
  }

  const getTypeIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName as keyof typeof ICON_MAP] || FileText
    return IconComponent
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {mode === 'edit' ? '프로젝트 단계 수정' : '프로젝트 단계 선택'}
        </h3>
        <p className="text-text-secondary text-sm">
          {mode === 'edit'
            ? '프로젝트의 워크플로우 단계를 수정할 수 있습니다. 변경사항은 즉시 적용됩니다.'
            : '프로젝트에서 진행할 단계를 선택하세요. 각 단계는 독립적으로 실행하거나 연결된 워크플로우로 진행할 수 있습니다.'
          }
        </p>
      </div>

      {/* 프로젝트 타입 선택 */}
      <div className="space-y-3">
        {enabledTypes.map(type => {
          const config = PROJECT_TYPE_CONFIGS[type]
          const isSelected = selection.selectedTypes.includes(type)
          const isExpanded = expandedType === type && isSelected
          const IconComponent = getTypeIcon(config.icon)

          return (
            <div key={type} className="border border-border-primary rounded-lg overflow-hidden">
              {/* 타입 헤더 */}
              <div
                className={`p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary-500/10 border-primary-500/20'
                    : 'bg-bg-secondary hover:bg-bg-tertiary'
                } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                onClick={() => !disabled && handleTypeToggle(type)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-primary-500/20' : 'bg-bg-tertiary'
                    }`}>
                      <IconComponent className={`w-5 h-5 ${
                        isSelected ? 'text-primary-500' : 'text-text-muted'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-text-primary">{config.name}</h4>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary-500" />
                        )}
                      </div>
                      <p className="text-text-secondary text-sm">{config.description}</p>
                    </div>
                  </div>

                  {isSelected && config.availableSteps.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedType(isExpanded ? null : type)
                      }}
                      className="p-1 rounded hover:bg-bg-tertiary transition-colors"
                      disabled={disabled}
                    >
                      <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`} />
                    </button>
                  )}
                </div>
              </div>

              {/* 단계 선택 (확장된 경우만) */}
              {isExpanded && config.availableSteps.length > 0 && (
                <div className="border-t border-border-secondary bg-bg-primary p-4">
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Info className="w-4 h-4 text-primary-500" />
                      <h5 className="font-medium text-text-primary">워크플로우 단계 선택</h5>
                    </div>
                    <p className="text-text-secondary text-sm">
                      진행할 단계를 선택하세요. 모든 단계 또는 원하는 단계만 선택할 수 있습니다.
                    </p>
                  </div>

                  {mode === 'edit' && protectedSteps.length > 0 && (
                    <div className="mb-4 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Info className="w-4 h-4 text-accent-blue mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-accent-blue text-sm font-medium">보호된 단계</p>
                          <p className="text-text-secondary text-xs mt-1">
                            {protectedSteps.map(step => WORKFLOW_STEP_CONFIGS[step].name).join(', ')} 단계는
                            이미 진행되어 제거할 수 없습니다. 다른 단계는 자유롭게 추가할 수 있습니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {config.availableSteps.map(step => {
                      const stepConfig = WORKFLOW_STEP_CONFIGS[step]
                      const isStepSelected = selection.selectedSteps.includes(step)
                      const isProtected = protectedSteps.includes(step)
                      const canClick = !disabled && !(isStepSelected && isProtected)

                      return (
                        <div
                          key={step}
                          className={`p-3 border rounded-lg transition-colors relative ${
                            isStepSelected
                              ? isProtected
                                ? 'border-accent-blue/50 bg-accent-blue/5'
                                : 'border-primary-500/50 bg-primary-500/5'
                              : 'border-border-secondary hover:border-border-primary hover:bg-bg-secondary'
                          } ${
                            canClick ? 'cursor-pointer' : 'cursor-not-allowed'
                          } ${disabled ? 'opacity-50' : ''}`}
                          onClick={() => canClick && handleStepToggle(step)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-text-primary">
                                  {stepConfig.order}. {stepConfig.name}
                                </span>
                                {isStepSelected && (
                                  <Check className={`w-4 h-4 ${
                                    isProtected ? 'text-accent-blue' : 'text-primary-500'
                                  }`} />
                                )}
                                {isProtected && (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-accent-blue rounded-full"></div>
                                    <span className="text-xs text-accent-blue font-medium">보호됨</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-text-secondary text-xs leading-relaxed">
                                {stepConfig.description}
                              </p>
                              <p className="text-text-muted text-xs mt-1">
                                예상 시간: {stepConfig.estimatedTime}
                              </p>
                              {isProtected && (
                                <p className="text-accent-blue text-xs mt-1 font-medium">
                                  이미 진행된 단계로 제거할 수 없습니다
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 연결 모드 설정 */}
      {selection.selectedSteps.length > 1 && (
        <div className="p-4 bg-bg-secondary border border-border-primary rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-text-primary mb-1">연결된 워크플로우</h4>
              <p className="text-text-secondary text-sm">
                선택한 단계들을 순차적으로 진행하며 이전 단계의 결과를 다음 단계에서 활용합니다.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selection.enableConnectedMode}
                onChange={handleConnectedModeToggle}
                disabled={disabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        </div>
      )}

      {/* 선택 요약 */}
      {(selection.selectedTypes.length > 0 || selection.selectedSteps.length > 0) && (
        <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-lg">
          <h4 className="font-medium text-text-primary mb-2">선택 요약</h4>
          <div className="space-y-2 text-sm">
            {selection.selectedTypes.length > 0 && (
              <div>
                <span className="text-text-secondary">프로젝트 타입: </span>
                <span className="text-text-primary">
                  {selection.selectedTypes.map(type => PROJECT_TYPE_CONFIGS[type].name).join(', ')}
                </span>
              </div>
            )}
            {selection.selectedSteps.length > 0 && (
              <div>
                <span className="text-text-secondary">선택된 단계: </span>
                <span className="text-text-primary">
                  {selection.selectedSteps.map(step => WORKFLOW_STEP_CONFIGS[step].name).join(' → ')}
                </span>
              </div>
            )}
            {selection.selectedSteps.length > 1 && (
              <div>
                <span className="text-text-secondary">실행 모드: </span>
                <span className="text-text-primary">
                  {selection.enableConnectedMode ? '연결된 워크플로우' : '독립 실행'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}