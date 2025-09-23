import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  FolderOpen,
  Settings,
  FileText,
  MessageSquare,
  BarChart3,
  CheckCircle,
  Clock,
  Archive,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { PreAnalysisPanel, PreAnalysisPanelRef } from '../../components/preAnalysis/PreAnalysisPanel';
import { PageContainer, PageHeader, PageContent, Card, Button } from '../../components/LinearComponents';
import { supabase } from '../../lib/supabase';
import { ProjectService } from '../../services/projectService';

export const PreAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: projectState, selectProject } = useProject();
  const { user } = useAuth();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const [currentStep, setCurrentStep] = useState<'setup' | 'analysis' | 'questions' | 'report'>('setup');
  const panelRef = useRef<PreAnalysisPanelRef>(null);

  // 프로젝트 로딩 및 선택 로직 (다른 페이지와 동일)
  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // 현재 프로젝트가 이미 선택된 경우
        if (projectState.currentProject?.id === id) {
          setProject(projectState.currentProject);
          await loadDocumentCount();
          setLoading(false);
          return;
        }

        // 프로젝트 상세 정보 로딩
        const projectData = await ProjectService.getProject(id);
        if (projectData) {
          setProject(projectData);
          selectProject(projectData); // 현재 프로젝트로 설정 (localStorage에 저장됨)
          await loadDocumentCount();
        } else {
          setError('프로젝트를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('프로젝트를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id, projectState.currentProject?.id, selectProject]);

  // 문서 수 로드
  const loadDocumentCount = async () => {
    if (!id) return;

    try {
      setDocumentsLoading(true);

      if (!supabase) {
        console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
        return;
      }

      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id!);

      if (error) {
        console.error('문서 수 조회 실패:', error);
        return;
      }

      setDocumentCount(count || 0);
    } catch (error) {
      console.error('문서 수 조회 중 오류:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!user?.id || !id) {
      alert('사용자 인증이 필요합니다.');
      return;
    }

    if (documentCount === 0) {
      alert('분석할 문서를 먼저 업로드해주세요.');
      return;
    }

    setIsStartingAnalysis(true);
    try {
      // PreAnalysisPanel의 분석 시작 함수를 호출하기 위해
      // ref나 상태 공유를 통해 연동할 예정
      console.log('사전 분석 시작:', { projectId: id, userId: user.id });

      // 패널 컴포넌트의 분석 시작 함수 호출
      if (panelRef.current) {
        await panelRef.current.startAnalysis();
      }
    } catch (error) {
      console.error('분석 시작 오류:', error);
      alert('분석 시작 중 오류가 발생했습니다.');
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  // 단계별 정보
  const steps = [
    { id: 'setup', label: '설정', icon: Settings, description: 'AI 모델 및 MCP 설정' },
    { id: 'analysis', label: '문서 분석', icon: FileText, description: '업로드된 문서 AI 분석' },
    { id: 'questions', label: '질문 답변', icon: MessageSquare, description: 'AI 생성 질문에 답변' },
    { id: 'report', label: '보고서', icon: BarChart3, description: '분석 결과 보고서 생성' },
  ];

  // 현재 단계 정보 가져오기
  const getCurrentStepInfo = () => {
    return steps.find(step => step.id === currentStep) || steps[0];
  };

  // 단계별 상태 가져오기
  const getStepStatus = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'in_progress';
    return 'pending';
  };

  // 탭 이동 처리 (모든 단계로 자유 이동 가능)
  const handleStepChange = (stepId: string) => {
    setCurrentStep(stepId as 'setup' | 'analysis' | 'questions' | 'report');
  };

  // 이전/다음 단계로 이동 (자유 이동)
  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      const previousStep = steps[currentIndex - 1];
      handleStepChange(previousStep.id);
    }
  };

  const goToNextStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      handleStepChange(nextStep.id);
    }
  };

  // SNB 탭 네비게이션 렌더링
  const renderSubNavigation = () => {
    return (
      <div className="mb-6">
        <div className="border-b border-border-primary bg-bg-primary">
          <nav className="flex space-x-8 px-1">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const status = getStepStatus(step.id);

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepChange(step.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200
                    ${isActive
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`
                      p-1.5 rounded-lg transition-colors
                      ${isActive
                        ? 'bg-primary-500/10'
                        : status === 'completed'
                        ? 'bg-success/10'
                        : 'bg-bg-secondary group-hover:bg-bg-tertiary'
                      }
                    `}>
                      {status === 'completed' ? (
                        <CheckCircle className={`w-4 h-4 ${isActive ? 'text-primary-500' : 'text-success'}`} />
                      ) : status === 'in_progress' ? (
                        <Clock className={`w-4 h-4 ${isActive ? 'text-primary-500' : 'text-primary-400'}`} />
                      ) : (
                        <Icon className={`w-4 h-4 ${isActive ? 'text-primary-500' : 'text-text-secondary group-hover:text-text-primary'}`} />
                      )}
                    </div>
                    <span className="hidden sm:block">{step.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    );
  };

  // 진행 상태 표시 카드 렌더링 (간소화)
  const renderProgressCard = () => {
    const currentStepInfo = getCurrentStepInfo();
    const completedSteps = steps.filter(step => getStepStatus(step.id) === 'completed').length;
    const progressPercentage = (completedSteps / steps.length) * 100;
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <Card className="mb-6 bg-gradient-to-r from-primary-500/5 to-primary-600/5 border-primary-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <currentStepInfo.icon className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                {currentStepInfo.label}
              </h3>
              <p className="text-text-secondary text-sm">
                {currentStepInfo.description}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* 이전/다음 버튼 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousStep}
                disabled={currentIndex === 0}
                className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="이전 단계"
              >
                <ChevronLeft className="w-4 h-4 text-text-secondary" />
              </button>
              <button
                onClick={goToNextStep}
                disabled={currentIndex === steps.length - 1}
                className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="다음 단계"
              >
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-primary-500">
                {completedSteps}/{steps.length}
              </div>
              <div className="text-text-secondary text-sm">
                단계 완료
              </div>
            </div>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-secondary">전체 진행률</span>
            <span className="text-sm font-medium text-text-primary">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">프로젝트를 불러오는 중...</div>
        </div>
      </PageContainer>
    );
  }

  if (error || !project) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-accent-red mb-4">{error || '프로젝트를 찾을 수 없습니다.'}</div>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              프로젝트 목록으로 돌아가기
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="사전 분석"
        subtitle={project?.name || '프로젝트'}
        description="AI와 MCP를 활용하여 프로젝트를 종합적으로 분석합니다"
        actions={
          <div className="flex items-center space-x-3">
            {/* 문서 상태 표시 */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg">
              <Archive className="w-4 h-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">
                문서: {documentsLoading ? '...' : documentCount}개
              </span>
            </div>

            {/* 빠른 시작 버튼 */}
            <Button.Primary
              onClick={handleStartAnalysis}
              disabled={isStartingAnalysis || documentsLoading || documentCount === 0}
            >
              <div className="flex items-center space-x-2">
                {isStartingAnalysis ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>분석 시작 중...</span>
                  </>
                ) : documentCount === 0 ? (
                  <>
                    <FolderOpen className="w-4 h-4" />
                    <span>문서 업로드 필요</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>빠른 시작</span>
                  </>
                )}
              </div>
            </Button.Primary>

            {/* 프로젝트로 돌아가기 */}
            <Button.Secondary
              onClick={() => navigate(`/projects/${id}`)}
            >
              <div className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>프로젝트로 돌아가기</span>
              </div>
            </Button.Secondary>
          </div>
        }
      />

      <PageContent>
        {/* SNB 탭 네비게이션 */}
        {renderSubNavigation()}

        {/* 진행 상태 카드 */}
        {renderProgressCard()}

        {/* 메인 분석 패널 */}
        <PreAnalysisPanel
          ref={panelRef}
          projectId={id!}
          currentStep={currentStep}
          onDocumentCountChange={setDocumentCount}
          onStepChange={setCurrentStep}
        />
      </PageContent>
    </PageContainer>
  );
};