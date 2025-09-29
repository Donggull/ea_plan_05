/**
 * 워크플로우 통합 훅
 * 사전 분석과 제안진행 간의 자동 연동을 관리합니다.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WorkflowIntegrationService } from '@/services/integration/WorkflowIntegrationService';
// Note: toast 라이브러리가 설치되지 않았으므로 console.log로 대체
// import { toast } from 'react-hot-toast';

export interface WorkflowTransitionStatus {
  isTransitioning: boolean;
  canTransition: boolean;
  fromStep: string | null;
  toStep: string | null;
  completionPercentage: number;
}

export const useWorkflowIntegration = () => {
  const { user } = useAuth();
  const [transitionStatus, setTransitionStatus] = useState<WorkflowTransitionStatus>({
    isTransitioning: false,
    canTransition: false,
    fromStep: null,
    toStep: null,
    completionPercentage: 0
  });

  const workflowService = WorkflowIntegrationService.getInstance();

  /**
   * 사전 분석 완료 여부 확인
   */
  const checkPreAnalysisCompletion = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      const isCompleted = await workflowService.checkPreAnalysisCompletion(projectId);
      setTransitionStatus(prev => ({
        ...prev,
        canTransition: isCompleted,
        fromStep: 'pre_analysis',
        toStep: 'proposal',
        completionPercentage: isCompleted ? 100 : 0
      }));
      return isCompleted;
    } catch (error) {
      console.error('Error checking pre-analysis completion:', error);
      return false;
    }
  }, [workflowService]);

  /**
   * 제안진행으로 자동 전환
   */
  const transitionToProposal = useCallback(async (projectId: string): Promise<boolean> => {
    if (!user?.id) {
      console.error('사용자 정보를 찾을 수 없습니다.');
      return false;
    }

    setTransitionStatus(prev => ({
      ...prev,
      isTransitioning: true
    }));

    try {
      // 사전 분석 완료 확인
      const isCompleted = await workflowService.checkPreAnalysisCompletion(projectId);
      if (!isCompleted) {
        console.error('사전 분석이 완료되지 않았습니다.');
        return false;
      }

      setTransitionStatus(prev => ({
        ...prev,
        completionPercentage: 25
      }));

      // 제안진행으로 전환
      const success = await workflowService.transitionToProposal(projectId, user.id);

      setTransitionStatus(prev => ({
        ...prev,
        completionPercentage: success ? 100 : 0
      }));

      if (success) {
        console.log('제안진행 단계로 성공적으로 전환되었습니다.');

        // 전환 완료 후 상태 초기화
        setTimeout(() => {
          setTransitionStatus({
            isTransitioning: false,
            canTransition: false,
            fromStep: null,
            toStep: null,
            completionPercentage: 0
          });
        }, 2000);
      } else {
        console.error('제안진행 전환에 실패했습니다.');
      }

      return success;
    } catch (error) {
      console.error('Error transitioning to proposal:', error);
      console.error(`전환 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      return false;
    } finally {
      setTransitionStatus(prev => ({
        ...prev,
        isTransitioning: false
      }));
    }
  }, [user?.id, workflowService]);

  /**
   * 사전 분석 베이스라인 설정
   */
  const setPreAnalysisBaseline = useCallback(async (projectId: string) => {
    if (!user?.id) {
      console.error('사용자 정보를 찾을 수 없습니다.');
      return null;
    }

    try {
      const baseline = await workflowService.setPreAnalysisBaseline(projectId, user.id);
      console.log('사전 분석 베이스라인이 설정되었습니다.');
      return baseline;
    } catch (error) {
      console.error('Error setting pre-analysis baseline:', error);
      console.error('베이스라인 설정에 실패했습니다.');
      return null;
    }
  }, [user?.id, workflowService]);

  /**
   * 제안서 질문 생성
   */
  const generateProposalQuestions = useCallback(async (
    projectId: string,
    preAnalysisData: any
  ): Promise<boolean> => {
    try {
      const success = await workflowService.generateProposalQuestions(projectId, preAnalysisData);
      if (success) {
        console.log('제안서 질문이 생성되었습니다.');
      } else {
        console.error('제안서 질문 생성에 실패했습니다.');
      }
      return success;
    } catch (error) {
      console.error('Error generating proposal questions:', error);
      console.error('질문 생성 중 오류가 발생했습니다.');
      return false;
    }
  }, [workflowService]);

  /**
   * 워크플로우 전환 가능 여부 확인
   */
  const canAutoTransition = useCallback(async (
    projectId: string,
    fromStep: string,
    toStep: string
  ): Promise<boolean> => {
    try {
      if (fromStep === 'pre_analysis' && toStep === 'proposal') {
        return await workflowService.checkPreAnalysisCompletion(projectId);
      }
      // 향후 다른 단계 전환 조건 추가 가능
      return false;
    } catch (error) {
      console.error('Error checking auto transition:', error);
      return false;
    }
  }, [workflowService]);

  /**
   * 현재 워크플로우 단계 조회
   */
  const getCurrentWorkflowStep = useCallback(async (projectId: string): Promise<string | null> => {
    try {
      // 프로젝트 정보에서 현재 단계 조회
      const { supabase } = await import('@/lib/supabase');
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('projects')
        .select('current_workflow_step')
        .eq('id', projectId)
        .single();

      if (error) {
        throw error;
      }

      return data?.current_workflow_step || null;
    } catch (error) {
      console.error('Error getting current workflow step:', error);
      return null;
    }
  }, []);

  /**
   * 단계별 완료 상태 조회
   */
  const getStepCompletionStatus = useCallback(async (projectId: string) => {
    try {
      const preAnalysisCompleted = await workflowService.checkPreAnalysisCompletion(projectId);
      const currentStep = await getCurrentWorkflowStep(projectId);

      return {
        preAnalysis: preAnalysisCompleted,
        currentStep,
        canTransitionToProposal: preAnalysisCompleted && currentStep === 'pre_analysis'
      };
    } catch (error) {
      console.error('Error getting step completion status:', error);
      return {
        preAnalysis: false,
        currentStep: null,
        canTransitionToProposal: false
      };
    }
  }, [workflowService, getCurrentWorkflowStep]);

  return {
    transitionStatus,
    checkPreAnalysisCompletion,
    transitionToProposal,
    setPreAnalysisBaseline,
    generateProposalQuestions,
    canAutoTransition,
    getCurrentWorkflowStep,
    getStepCompletionStatus
  };
};