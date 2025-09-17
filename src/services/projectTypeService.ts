import { supabase } from '../lib/supabase'
import {
  ProjectType,
  WorkflowStep,
  ProjectStageSelection,
  ProjectProgress,
  PROJECT_TYPE_CONFIGS,
  WORKFLOW_STEP_CONFIGS
} from '../types/project'
import { ProposalDataManager } from './proposal/dataManager'

export class ProjectTypeService {
  /**
   * 프로젝트에 선택된 타입과 단계 저장
   */
  static async updateProjectTypes(
    projectId: string,
    selection: ProjectStageSelection
  ): Promise<void> {
    try {
      const { error } = await supabase!
        .from('projects')
        .update({
          project_types: selection.selectedTypes,
          current_workflow_step: selection.selectedSteps[0] || null,
          workflow_config: {
            selectedSteps: selection.selectedSteps,
            enableConnectedMode: selection.enableConnectedMode,
            stepOrder: selection.selectedSteps.map(step =>
              WORKFLOW_STEP_CONFIGS[step]?.order || 0
            ).sort((a, b) => a - b)
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update project types:', error)
      throw error
    }
  }

  /**
   * 프로젝트의 타입과 워크플로우 설정 조회
   */
  static async getProjectTypes(projectId: string): Promise<{
    projectTypes: ProjectType[]
    workflowSteps: WorkflowStep[]
    currentStep?: WorkflowStep
    enableConnectedMode: boolean
  }> {
    try {
      const { data, error } = await supabase!
        .from('projects')
        .select('project_types, current_workflow_step, workflow_config')
        .eq('id', projectId)
        .single()

      if (error) throw error

      const workflowConfig = data?.workflow_config as any || {}

      return {
        projectTypes: (data?.project_types as ProjectType[]) || [],
        workflowSteps: (workflowConfig.selectedSteps as WorkflowStep[]) || [],
        currentStep: data?.current_workflow_step as WorkflowStep,
        enableConnectedMode: workflowConfig.enableConnectedMode || false
      }
    } catch (error) {
      console.error('Failed to get project types:', error)
      throw error
    }
  }

  /**
   * 프로젝트 진행 상황 계산
   */
  static async getProjectProgress(projectId: string): Promise<ProjectProgress> {
    try {
      const projectConfig = await this.getProjectTypes(projectId)
      const { workflowSteps } = projectConfig

      if (!workflowSteps.length) {
        return {
          totalSteps: 0,
          completedSteps: 0,
          progressPercentage: 0,
          stepStatuses: {} as Record<WorkflowStep, 'not_started' | 'in_progress' | 'completed'>
        }
      }

      // 각 단계별 완료 상태 확인
      const stepStatuses: Record<WorkflowStep, 'not_started' | 'in_progress' | 'completed'> = {} as any
      let completedSteps = 0

      for (const step of workflowSteps) {
        const completion = await ProposalDataManager.getStepCompletionStatus(projectId, step)

        if (completion.isCompleted) {
          stepStatuses[step] = 'completed'
          completedSteps++
        } else if (completion.completionRate > 0) {
          stepStatuses[step] = 'in_progress'
        } else {
          stepStatuses[step] = 'not_started'
        }
      }

      // 현재 단계 결정
      const currentStep = workflowSteps.find(step =>
        stepStatuses[step] === 'in_progress'
      ) || workflowSteps.find(step =>
        stepStatuses[step] === 'not_started'
      )

      const progressPercentage = workflowSteps.length > 0
        ? (completedSteps / workflowSteps.length) * 100
        : 0

      return {
        totalSteps: workflowSteps.length,
        completedSteps,
        currentStep,
        progressPercentage,
        stepStatuses
      }
    } catch (error) {
      console.error('Failed to get project progress:', error)
      throw error
    }
  }

  /**
   * 다음 단계로 진행
   */
  static async moveToNextStep(projectId: string): Promise<WorkflowStep | null> {
    try {
      const projectConfig = await this.getProjectTypes(projectId)
      const { workflowSteps, currentStep } = projectConfig

      if (!workflowSteps.length) return null

      // 현재 단계 인덱스 찾기
      const currentIndex = currentStep ? workflowSteps.indexOf(currentStep) : -1
      const nextIndex = currentIndex + 1

      if (nextIndex >= workflowSteps.length) {
        // 모든 단계 완료
        await supabase!
          .from('projects')
          .update({
            current_workflow_step: null,
            workflow_progress: 100,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)

        return null
      }

      const nextStep = workflowSteps[nextIndex]

      // 다음 단계로 업데이트
      await supabase!
        .from('projects')
        .update({
          current_workflow_step: nextStep,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      return nextStep
    } catch (error) {
      console.error('Failed to move to next step:', error)
      throw error
    }
  }

  /**
   * 활성화된 프로젝트 타입 목록 조회
   */
  static getEnabledProjectTypes(): ProjectType[] {
    return Object.values(PROJECT_TYPE_CONFIGS)
      .filter(config => config.isEnabled)
      .map(config => config.id)
  }

  /**
   * 특정 프로젝트 타입의 사용 가능한 단계 조회
   */
  static getAvailableSteps(projectType: ProjectType): WorkflowStep[] {
    return PROJECT_TYPE_CONFIGS[projectType]?.availableSteps || []
  }

  /**
   * 프로젝트 타입별 설정 정보 조회
   */
  static getProjectTypeConfig(projectType: ProjectType) {
    return PROJECT_TYPE_CONFIGS[projectType]
  }

  /**
   * 워크플로우 단계별 설정 정보 조회
   */
  static getWorkflowStepConfig(step: WorkflowStep) {
    return WORKFLOW_STEP_CONFIGS[step]
  }
}