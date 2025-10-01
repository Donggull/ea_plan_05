import React, { useState, useEffect } from 'react';
import {
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  FileCheck,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { preAnalysisService } from '../../services/preAnalysis/PreAnalysisService';
import { Card } from '../LinearComponents';

interface AnalysisProgressProps {
  sessionId: string;
  onComplete: () => void;
}

interface DocumentStatus {
  id: string;
  fileName: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  progress: number;
  category?: string;
  processingTime?: number;
  confidenceScore?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
}

interface AnalysisStage {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  estimatedDuration: number; // 초
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  details?: any;
  startTime?: Date;
  endTime?: Date;
}

interface AnalysisProgressRef {
  startAnalysis: () => void;
}

// 분석 진행 상황 컴포넌트 - 문서 분석 및 AI 질문 생성을 담당
export const AnalysisProgress = React.forwardRef<AnalysisProgressRef, AnalysisProgressProps>(
  function AnalysisProgress({ sessionId, onComplete }, ref) {
    const [stages, setStages] = useState<AnalysisStage[]>([
      {
        id: 'document_analysis',
        name: '📄 문서 분석',
        description: 'AI가 업로드된 문서들을 지능적으로 분석하고 핵심 내용을 파악합니다',
        icon: FileText,
        estimatedDuration: 120,
        status: 'pending',
        progress: 0,
      },
      {
        id: 'question_generation',
        name: '🤖 AI 질문 생성',
        description: '분석된 문서 내용을 바탕으로 프로젝트에 적합한 맞춤형 질문을 생성합니다',
        icon: MessageSquare,
        estimatedDuration: 45,
        status: 'pending',
        progress: 0,
      },
    ]);

    const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>([]);
    const [overallProgress, setOverallProgress] = useState(0);
    const [, setCurrentStage] = useState<string>('document_analysis');
    const [isPaused, setIsPaused] = useState(false);
    const [activityLog, setActivityLog] = useState<string[]>([]);
    const [startTime, setStartTime] = useState<Date>(new Date());
    const [elapsedTime, setElapsedTime] = useState(0);
    const [pollInterval, setPollInterval] = useState<number>(3000); // 동적 폴링 간격
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
    const [analysisCompleted, setAnalysisCompleted] = useState(false);
    const [questionGenerationTriggered, setQuestionGenerationTriggered] = useState(false);

    useEffect(() => {
      // 세션 시작 시 초기화
      initializeAnalysis();

      // 적응형 폴링 - 상태에 따라 간격 조정
      let interval: NodeJS.Timeout;

      const startPolling = () => {
        if (interval) clearInterval(interval);

        interval = setInterval(() => {
          // 🔥 폴링 중지 조건 개선: 분석 완료 AND 질문 생성 트리거됨
          if (!isPaused && !(analysisCompleted && questionGenerationTriggered)) {
            checkAnalysisProgress();
          }
          updateElapsedTime();

          // 동적 폴링 간격 조정
          adjustPollingInterval();
        }, pollInterval);
      };

      startPolling();

      return () => clearInterval(interval);
    }, [sessionId, isPaused, analysisCompleted, questionGenerationTriggered]);

    // documentStatuses 변경 시 진행률 업데이트
    useEffect(() => {
      if (documentStatuses.length > 0) {
        updateOverallProgress();
      }
    }, [documentStatuses]);

    const initializeAnalysis = async () => {
      setStartTime(new Date());
      addToActivityLog('🚀 사전 분석 세션을 시작합니다...');

      try {
        // 세션 정보 조회
        const sessionResponse = await preAnalysisService.getSession(sessionId);
        if (!sessionResponse.success || !sessionResponse.data) {
          addToActivityLog('❌ 세션 정보를 조회할 수 없습니다.');
          return;
        }

        const session = sessionResponse.data;
        addToActivityLog(`✓ 세션 정보 로드 완료: ${session.projectId}`);
        console.log('📊 세션 데이터:', session);

        // 완료된 세션인지 확인하고 초기 상태 설정
        if (session.status === 'completed') {
          console.log('✅ 완료된 세션 감지 - 초기 완료 상태 설정');
          setAnalysisCompleted(true);
          await loadCompletedSessionData(session);
          return; // 완료된 세션은 추가 초기화하지 않음
        }

        // 프로젝트 문서 목록 조회
        const documentsResponse = await preAnalysisService.getProjectDocuments(session.projectId);
        if (documentsResponse.success && documentsResponse.data) {
          const documents = documentsResponse.data;

          // 문서별 초기 상태 설정
          const initialStatuses: DocumentStatus[] = documents.map(doc => ({
            id: doc.id,
            fileName: doc.file_name,
            status: 'pending',
            progress: 0,
            category: undefined,
          }));

          setDocumentStatuses(initialStatuses);
          addToActivityLog(`📁 ${documents.length}개 문서 발견`);
          addToActivityLog('📋 분석 준비 완료 - 시작 대기 중...');
          console.log('📄 발견된 문서들:', documents);

          // 자동 시작 제거 - 사용자가 수동으로 시작해야 함
        } else {
          addToActivityLog('⚠️ 분석할 문서가 없습니다.');
          console.warn('📄 문서 조회 실패:', documentsResponse);
        }
      } catch (error) {
        console.error('❌ 분석 초기화 오류:', error);
        addToActivityLog('❌ 분석 초기화 중 오류가 발생했습니다.');
      }
    };

    // 완료된 세션의 데이터를 로드하는 함수
    const loadCompletedSessionData = async (session: any) => {
      try {
        const { supabase } = await import('../../lib/supabase');

        if (!supabase) {
          console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
          return;
        }

        // 실제 데이터베이스에서 완료된 상태 조회
        const [analysisResult, questionsResult] = await Promise.all([
          supabase.from('document_analyses')
            .select('*')
            .eq('session_id', session.id)
            .eq('status', 'completed'),
          supabase.from('ai_questions')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
        ]);

        const completedAnalysisCount = analysisResult.data?.length || 0;
        const totalQuestionCount = questionsResult.count || 0;

        console.log('📊 완료된 세션 데이터:', {
          completedAnalysis: completedAnalysisCount,
          totalQuestions: totalQuestionCount
        });

        // 단계별 완료 상태 설정
        setStages(prev => {
          const updated = [...prev];

          // 문서 분석 단계
          const docStage = updated.find(s => s.id === 'document_analysis');
          if (docStage && completedAnalysisCount > 0) {
            docStage.status = 'completed';
            docStage.progress = 100;
            docStage.message = `문서 분석 완료: 성공 ${completedAnalysisCount}개`;
            docStage.endTime = new Date();
          }

          // AI 질문 생성 단계
          const questionStage = updated.find(s => s.id === 'question_generation');
          if (questionStage && totalQuestionCount > 0) {
            questionStage.status = 'completed';
            questionStage.progress = 100;
            questionStage.message = `${totalQuestionCount}개 맞춤형 질문 생성 완료!`;
            questionStage.endTime = new Date();
          }

          return updated;
        });

        setOverallProgress(100);
        addToActivityLog(`✅ 문서 분석 완료: ${completedAnalysisCount}개 성공`);
        addToActivityLog(`🎯 ${totalQuestionCount}개 맞춤형 질문이 생성되었습니다!`);
        addToActivityLog('🎉 모든 사전 분석이 완료되었습니다!');

        // 완료 콜백 호출 (질문 답변 단계로 이동)
        setTimeout(() => {
          console.log('🏁 완료된 세션 - onComplete 호출');
          onComplete();
        }, 1000);

      } catch (error) {
        console.error('❌ 완료된 세션 데이터 로드 오류:', error);
        addToActivityLog('❌ 완료된 세션 데이터 로드 중 오류가 발생했습니다.');
      }
    };

    // 실제 분석 시작 메서드 (외부에서 호출됨)
    const startDocumentAnalysis = async () => {
      console.log('🔥 문서 분석 시작 함수 호출됨');

      if (documentStatuses.length === 0) {
        addToActivityLog('❌ 분석할 문서가 없습니다.');
        return;
      }

      updateStageStatus('document_analysis', 'processing');
      addToActivityLog('🚀 AI 문서 분석을 시작합니다...');

      // 문서 상태를 분석 중으로 변경
      setDocumentStatuses(prev => prev.map(doc => ({
        ...doc,
        status: 'analyzing' as const,
        progress: 10,
      })));

      try {
        // 세션 정보 조회하여 프로젝트 ID 가져오기
        const sessionResponse = await preAnalysisService.getSession(sessionId);
        if (!sessionResponse.success || !sessionResponse.data) {
          addToActivityLog('❌ 세션 정보를 조회할 수 없습니다.');
          updateStageStatus('document_analysis', 'failed');
          return;
        }

        const projectId = sessionResponse.data.projectId;
        addToActivityLog(`📋 프로젝트 ${projectId}의 문서 분석을 진행합니다...`);
        console.log('🔍 프로젝트 ID:', projectId);

        // 실제 문서 분석 시작
        const analysisResponse = await preAnalysisService.analyzeAllProjectDocuments(
          sessionId,
          projectId
        );

        console.log('📊 분석 응답:', analysisResponse);

        if (analysisResponse.success) {
          addToActivityLog('✅ 문서 분석이 성공적으로 시작되었습니다.');
          addToActivityLog(`📊 총 ${analysisResponse.data?.total || 0}개 문서 분석 중...`);
        } else {
          addToActivityLog(`❌ 문서 분석 시작 실패: ${analysisResponse.error}`);
          updateStageStatus('document_analysis', 'failed');

          // 모든 문서를 오류 상태로 변경
          setDocumentStatuses(prev => prev.map(doc => ({
            ...doc,
            status: 'error' as const,
            error: analysisResponse.error || '분석 시작 실패',
          })));
        }
      } catch (error) {
        console.error('❌ 문서 분석 시작 오류:', error);
        addToActivityLog(`❌ 문서 분석 중 예외 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        updateStageStatus('document_analysis', 'failed');

        // 모든 문서를 오류 상태로 변경
        setDocumentStatuses(prev => prev.map(doc => ({
          ...doc,
          status: 'error' as const,
          error: '분석 중 예외 발생',
        })));
      }
    };

    // 분석 시작을 위한 외부 인터페이스
    React.useImperativeHandle(ref, () => ({
      startAnalysis: startDocumentAnalysis,
    }));

    const checkAnalysisProgress = async () => {
      try {
        console.log('🔍 진행 상황 확인 시작...');

        // 1. 전체 진행 상황 조회
        const progressResponse = await preAnalysisService.getSessionProgress(sessionId);
        if (progressResponse.success && progressResponse.data) {
          // 단계별 진행 상황 업데이트
          const progressData = progressResponse.data;
          console.log('📊 진행 상황 데이터:', progressData);

          setStages(prev => {
            const updated = [...prev];

            progressData.forEach((progress: any) => {
              const stageIndex = updated.findIndex(s => s.id === progress.stage);
              if (stageIndex !== -1) {
                const stage = updated[stageIndex];

                // 실제 변경이 있을 때만 업데이트
                if (stage.status !== progress.status || Math.abs(stage.progress - progress.progress) > 5) {
                  console.log(`🔄 단계 업데이트: ${progress.stage} - ${progress.status} (${progress.progress}%)`);
                  updated[stageIndex] = {
                    ...stage,
                    status: progress.status,
                    progress: progress.progress,
                    message: progress.message,
                    startTime: progress.status === 'processing' && !stage.startTime ? new Date(progress.updated_at) : stage.startTime,
                    endTime: (progress.status === 'completed' || progress.status === 'failed') ? new Date(progress.updated_at) : stage.endTime,
                  };
                }
              }
            });

            return updated;
          });
        }

        // 2. 세션의 문서 분석 상태 조회
        const statusResponse = await preAnalysisService.getSessionDocumentStatus(sessionId);

        if (statusResponse.success && statusResponse.data) {
          const statusMap = statusResponse.data;
          console.log('📄 문서 상태 맵:', statusMap);

          // 문서 상태 업데이트 및 완료 조건 체크
          setDocumentStatuses(prev => {
            const updated = prev.map(doc => {
              const status = statusMap[doc.id];
              if (status) {
                // 유효한 상태 값인지 확인
                let documentStatus: DocumentStatus['status'] = 'pending';
                if (status.status === 'completed') {
                  documentStatus = 'completed';
                } else if (status.status === 'error') {
                  documentStatus = 'error';
                } else if (status.status === 'analyzing' || status.status === 'processing') {
                  documentStatus = 'analyzing';
                }

                // 상태가 실제로 변경된 경우에만 업데이트
                if (doc.status !== documentStatus) {
                  console.log(`📋 문서 상태 변경: ${doc.fileName} - ${doc.status} → ${documentStatus}`);
                  return {
                    ...doc,
                    status: documentStatus,
                    progress: documentStatus === 'completed' ? 100 :
                             documentStatus === 'analyzing' ? Math.min(95, (doc.progress || 0) + 10) : (doc.progress || 0),
                    processingTime: status.processingTime,
                    confidenceScore: status.confidenceScore,
                  };
                }
              }
              return doc;
            });

            // 🔥 중요: 상태 업데이트 콜백 내에서 완료 조건 체크 (클로저 문제 해결)
            const completedDocs = updated.filter(doc => doc.status === 'completed').length;
            const processedDocs = updated.filter(doc => doc.status === 'completed' || doc.status === 'error').length;
            const totalDocs = updated.length;

            console.log('🔍 문서 분석 완료 조건 확인 (최신 상태):', {
              completedDocs,
              processedDocs,
              totalDocs,
              questionGenerationTriggered,
              analysisCompleted
            });

            // 모든 문서가 처리 완료되고, 아직 질문 생성이 트리거되지 않았으면 직접 트리거
            if (totalDocs > 0 && processedDocs === totalDocs && !questionGenerationTriggered && !analysisCompleted) {
              console.log('🚨 문서 분석 완료 감지!');

              // 분석 완료 상태 설정
              setAnalysisCompleted(true);

              // 질문 생성 자동 시작
              if (completedDocs > 0) {
                console.log('🚀 AI 질문 생성을 자동으로 시작합니다!');
                setQuestionGenerationTriggered(true);

                // 즉시 질문 생성 트리거
                setTimeout(() => {
                  console.log('⚡ triggerQuestionGeneration 호출');
                  triggerQuestionGeneration();
                }, 1500); // 1.5초 후 실행
              } else {
                console.log('❌ 성공한 문서가 없어서 질문 생성 불가');
              }
            }

            // 실제 변경이 있었는지 확인
            const hasRealChanges = updated.some((doc, index) =>
              doc.status !== prev[index]?.status ||
              doc.progress !== prev[index]?.progress
            );

            if (hasRealChanges) {
              console.log('📊 문서 상태에 실제 변경 발생');
            }

            return hasRealChanges ? updated : prev;
          });
        }
      } catch (error) {
        console.error('❌ 진행 상황 확인 오류:', error);
      }
    };

    const updateOverallProgress = () => {
      const completedDocs = documentStatuses.filter(doc => doc.status === 'completed').length;
      const analyzingDocs = documentStatuses.filter(doc => doc.status === 'analyzing').length;
      const errorDocs = documentStatuses.filter(doc => doc.status === 'error').length;
      const totalDocs = documentStatuses.length;

      if (totalDocs === 0) return;

      console.log('📊 전체 진행률 업데이트:', {
        completed: completedDocs,
        analyzing: analyzingDocs,
        error: errorDocs,
        total: totalDocs
      });

      // 문서 분석 진행률 계산
      const docProgress = (completedDocs / totalDocs) * 60;
      const analyzingProgress = (analyzingDocs / totalDocs) * 20;
      const processedDocs = completedDocs + errorDocs;

      setStages(prev => {
        const updated = [...prev];
        const docStage = updated.find(s => s.id === 'document_analysis');
        const questionStage = updated.find(s => s.id === 'question_generation');

        if (docStage) {
          const newProgress = Math.min(100, (docProgress + analyzingProgress) * (100/60));

          // 진행률 업데이트
          if (Math.abs(docStage.progress - newProgress) > 5) {
            docStage.progress = newProgress;

            // 메시지 업데이트
            if (analyzingDocs > 0) {
              docStage.message = `${analyzingDocs}개 문서 분석 중...`;
            } else if (processedDocs === totalDocs) {
              docStage.message = `모든 문서 분석 완료 (성공: ${completedDocs}개, 오류: ${errorDocs}개)`;
            } else {
              docStage.message = `${completedDocs}/${totalDocs}개 문서 완료`;
            }
          }

          // 🎯 문서 분석 완료 시 상태 업데이트 (UI 업데이트용)
          // 질문 생성 트리거는 checkAnalysisProgress()에서만 처리
          if (processedDocs === totalDocs && docStage.status !== 'completed' && totalDocs > 0) {
            console.log('📊 updateOverallProgress: 문서 분석 완료 상태 업데이트', {
              processedDocs,
              totalDocs,
              completedDocs,
              errorDocs
            });

            docStage.status = 'completed';
            docStage.endTime = new Date();
            docStage.progress = 100;

            // 로그만 추가 (상태 설정은 checkAnalysisProgress에서 처리)
            if (!analysisCompleted) {
              addToActivityLog(`✅ 문서 분석이 완료되었습니다! (성공: ${completedDocs}개, 오류: ${errorDocs}개)`);
            }

            // 질문 생성 실패 케이스만 여기서 처리
            if (completedDocs === 0 && !questionGenerationTriggered && questionStage && questionStage.status === 'pending') {
              console.log('❌ 성공한 문서가 없어서 질문 생성 불가');
              questionStage.status = 'failed';
              questionStage.endTime = new Date();
              questionStage.message = '분석 성공한 문서가 없음';
              addToActivityLog('❌ 분석 성공한 문서가 없어 질문을 생성할 수 없습니다.');
            }
          }
        }

        // 전체 진행률 계산
        let totalProgress = 0;
        if (docStage) {
          totalProgress += (docStage.progress / 100) * 60; // 60% 비중
        }
        if (questionStage) {
          totalProgress += (questionStage.progress / 100) * 40; // 40% 비중
        }

        const finalProgress = Math.min(100, Math.max(0, totalProgress));
        if (Math.abs(finalProgress - overallProgress) > 1) {
          setOverallProgress(finalProgress);
          console.log('📊 전체 진행률 업데이트:', `${finalProgress.toFixed(1)}%`);
        }

        return updated;
      });
    };

    // 질문 생성 단계 트리거 함수 (분석 완료 후 호출)
    const triggerQuestionGeneration = () => {
      console.log('🎯 AI 질문 생성 트리거 실행됨!');

      setStages(prev => {
        const updated = [...prev];
        const questionStage = updated.find(s => s.id === 'question_generation');

        console.log('📊 현재 질문 생성 단계 상태:', questionStage?.status);

        if (questionStage && questionStage.status === 'pending') {
          console.log('✅ 질문 생성 단계 시작!');
          questionStage.status = 'processing';
          questionStage.startTime = new Date();
          questionStage.progress = 10;
          questionStage.message = 'AI가 맞춤형 질문을 생성하고 있습니다...';

          addToActivityLog('🤖 AI 질문 생성을 시작합니다...');

          // 실제 질문 생성 실행
          setTimeout(() => {
            console.log('🔧 generateQuestions 함수 호출');
            generateQuestions();
          }, 2000); // 2초 후 실행
        } else {
          console.log('⚠️ 질문 생성을 시작할 수 없음:', {
            status: questionStage?.status,
            exists: !!questionStage
          });
        }

        return updated;
      });
    };

    const generateQuestions = async () => {
      try {
        console.log('🔥 질문 생성 함수 실행 시작');

        // 질문 생성 진행률 업데이트
        setStages(prev => {
          const updated = [...prev];
          const questionStage = updated.find(s => s.id === 'question_generation');
          if (questionStage) {
            questionStage.progress = 50;
            questionStage.message = 'AI가 맞춤형 질문을 분석 중입니다...';
          }
          return updated;
        });

        const response = await preAnalysisService.generateQuestions(sessionId, {
          categories: ['business', 'technical', 'timeline', 'stakeholders', 'risks'],
          maxQuestions: 15,
          includeRequired: true,
          customContext: 'detailed analysis context',
        });

        console.log('📊 질문 생성 응답:', response);

        if (response.success) {
          console.log('✅ 질문 생성 API 호출 성공 - 실제 DB 저장 확인 중...');

          // 질문 생성 API 성공 후 실제 DB에 저장되었는지 확인
          const actualQuestionCount = await verifyQuestionsInDB(sessionId);

          if (actualQuestionCount > 0) {
            console.log(`📊 DB에서 ${actualQuestionCount}개 질문 확인 완료`);

            // 질문 생성 완료
            setStages(prev => {
              const updated = [...prev];
              const questionStage = updated.find(s => s.id === 'question_generation');
              if (questionStage) {
                questionStage.status = 'completed';
                questionStage.progress = 100;
                questionStage.endTime = new Date();
                questionStage.message = `${actualQuestionCount}개 맞춤형 질문 생성 완료!`;
              }

              return updated;
            });

            setOverallProgress(100);
            addToActivityLog(`🎯 ${actualQuestionCount}개 맞춤형 질문이 생성되었습니다!`);
            addToActivityLog('🎉 모든 사전 분석이 완료되었습니다!');

            // 완료 콜백 호출 - 질문 답변 단계로 자동 이동
            setTimeout(() => {
              console.log('🏁 분석 완료 - onComplete 호출하여 질문 답변 단계로 이동');
              onComplete();
            }, 1000);
          } else {
            console.log('⏳ DB에 질문이 아직 저장되지 않음 - 재확인 중...');

            // DB 저장 완료까지 대기 (최대 15초)
            await waitForQuestionsInDB(sessionId, (count) => {
              console.log(`📊 DB 확인 중 - 현재 질문 수: ${count}개`);

              if (count > 0) {
                // 질문 생성 완료
                setStages(prev => {
                  const updated = [...prev];
                  const questionStage = updated.find(s => s.id === 'question_generation');
                  if (questionStage) {
                    questionStage.status = 'completed';
                    questionStage.progress = 100;
                    questionStage.endTime = new Date();
                    questionStage.message = `${count}개 맞춤형 질문 생성 완료!`;
                  }

                  return updated;
                });

                setOverallProgress(100);
                addToActivityLog(`🎯 ${count}개 맞춤형 질문이 생성되었습니다!`);
                addToActivityLog('🎉 모든 사전 분석이 완료되었습니다!');

                // 완료 콜백 호출
                setTimeout(() => {
                  console.log('🏁 분석 완료 - onComplete 호출하여 질문 답변 단계로 이동');
                  onComplete();
                }, 1000);

                return true; // 완료 신호
              }
              return false; // 계속 대기
            });
          }
        } else {
          // 질문 생성 실패
          setStages(prev => {
            const updated = [...prev];
            const questionStage = updated.find(s => s.id === 'question_generation');
            if (questionStage) {
              questionStage.status = 'failed';
              questionStage.endTime = new Date();
              questionStage.message = '질문 생성 실패';
            }
            return updated;
          });

          addToActivityLog(`❌ 질문 생성 실패: ${response.error || '알 수 없는 오류'}`);
        }
      } catch (error) {
        console.error('❌ 질문 생성 오류:', error);

        // 질문 생성 오류 상태 업데이트
        setStages(prev => {
          const updated = [...prev];
          const questionStage = updated.find(s => s.id === 'question_generation');
          if (questionStage) {
            questionStage.status = 'failed';
            questionStage.endTime = new Date();
            questionStage.message = '질문 생성 중 오류 발생';
          }
          return updated;
        });

        addToActivityLog(`❌ 질문 생성 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    };

    // 질문 생성 DB 저장 확인 함수
    const verifyQuestionsInDB = async (sessionId: string): Promise<number> => {
      try {
        const { supabase } = await import('../../lib/supabase');
        if (!supabase) {
          console.error('❌ Supabase 클라이언트가 초기화되지 않음');
          return 0;
        }

        const { count, error } = await supabase
          .from('ai_questions')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId);

        if (error) {
          console.error('❌ 질문 수 확인 오류:', error);
          return 0;
        }

        return count || 0;
      } catch (error) {
        console.error('❌ verifyQuestionsInDB 오류:', error);
        return 0;
      }
    };

    // 질문 DB 저장 대기 함수
    const waitForQuestionsInDB = async (
      sessionId: string,
      onUpdate: (count: number) => boolean,
      maxWaitTime: number = 15000
    ): Promise<void> => {
      const startTime = Date.now();
      const checkInterval = 2000; // 2초 간격 확인

      return new Promise((resolve) => {
        const intervalId = setInterval(async () => {
          const elapsed = Date.now() - startTime;

          if (elapsed >= maxWaitTime) {
            console.warn('⚠️ 질문 생성 DB 저장 확인 시간 초과');
            clearInterval(intervalId);
            resolve();
            return;
          }

          const questionCount = await verifyQuestionsInDB(sessionId);
          const completed = onUpdate(questionCount);

          if (completed) {
            clearInterval(intervalId);
            resolve();
          }
        }, checkInterval);
      });
    };

    const renderDocumentProgress = () => {
      if (documentStatuses.length === 0) {
        return (
          <Card className="p-6 bg-gradient-to-br from-bg-secondary to-bg-tertiary border-2 border-primary/20">
            <div className="text-center text-text-muted">
              <div className="relative">
                <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                <div className="absolute inset-0 w-12 h-12 mx-auto mb-4 border-4 border-primary/20 rounded-full animate-ping" />
              </div>
              <h4 className="text-lg font-medium text-text-primary mb-2">문서 정보 준비 중</h4>
              <p className="text-sm text-text-secondary">프로젝트 문서 목록을 불러오고 있습니다...</p>
            </div>
          </Card>
        );
      }

      const completedCount = documentStatuses.filter(d => d.status === 'completed').length;
      const analyzingCount = documentStatuses.filter(d => d.status === 'analyzing').length;
      const errorCount = documentStatuses.filter(d => d.status === 'error').length;
      const pendingCount = documentStatuses.filter(d => d.status === 'pending').length;

      return (
        <Card className="p-6 bg-gradient-to-br from-bg-primary to-bg-secondary border-2 border-primary/20">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-bold text-text-primary flex items-center gap-3">
              <div className="relative">
                <FileCheck className="w-6 h-6 text-primary" />
                {analyzingCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              문서별 분석 현황
            </h4>
            <div className="flex items-center gap-4 text-sm">
              {completedCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-success/20 text-success rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-medium">{completedCount}</span>
                </div>
              )}
              {analyzingCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded-full">
                  <Loader className="w-3 h-3 animate-spin" />
                  <span className="font-medium">{analyzingCount}</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-error/20 text-error rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  <span className="font-medium">{errorCount}</span>
                </div>
              )}
              {pendingCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-text-muted/20 text-text-muted rounded-full">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{pendingCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* 전체 문서 진행률 미니 차트 */}
          <div className="mb-6 p-4 bg-bg-tertiary/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-secondary">전체 문서 처리 현황</span>
              <span className="text-sm font-bold text-text-primary">
                {completedCount + errorCount}/{documentStatuses.length} 처리됨
              </span>
            </div>
            <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden">
              <div className="flex h-2">
                <div
                  className="bg-success transition-all duration-1000"
                  style={{ width: `${(completedCount / documentStatuses.length) * 100}%` }}
                />
                <div
                  className="bg-primary animate-pulse transition-all duration-1000"
                  style={{ width: `${(analyzingCount / documentStatuses.length) * 100}%` }}
                />
                <div
                  className="bg-error transition-all duration-1000"
                  style={{ width: `${(errorCount / documentStatuses.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 max-h-80 overflow-y-auto custom-scrollbar">
            {documentStatuses.map((doc) => {
              const getStatusIcon = () => {
                switch (doc.status) {
                  case 'completed':
                    return <CheckCircle className="w-5 h-5 text-success" />;
                  case 'analyzing':
                    return <Loader className="w-5 h-5 text-primary animate-spin" />;
                  case 'error':
                    return <AlertCircle className="w-5 h-5 text-error" />;
                  default:
                    return <Clock className="w-5 h-5 text-text-muted" />;
                }
              };

              const getDocumentCardStyle = () => {
                switch (doc.status) {
                  case 'completed': return 'border-success/40 bg-gradient-to-r from-success/10 to-success/5 shadow-success/20';
                  case 'analyzing': return 'border-primary/40 bg-gradient-to-r from-primary/10 to-primary/5 shadow-primary/20 animate-pulse';
                  case 'error': return 'border-error/40 bg-gradient-to-r from-error/10 to-error/5 shadow-error/20';
                  default: return 'border-border-primary bg-gradient-to-r from-bg-secondary to-bg-tertiary hover:border-primary/30';
                }
              };

              const getStatusBadge = () => {
                switch (doc.status) {
                  case 'completed': return <span className="px-2 py-1 bg-success/20 text-success text-xs font-bold rounded-full">✓ 완료</span>;
                  case 'analyzing': return <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full animate-pulse">🔄 분석중</span>;
                  case 'error': return <span className="px-2 py-1 bg-error/20 text-error text-xs font-bold rounded-full">⚠ 오류</span>;
                  default: return <span className="px-2 py-1 bg-text-muted/20 text-text-muted text-xs font-bold rounded-full">⏸ 대기</span>;
                }
              };

              return (
                <div
                  key={doc.id}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${getDocumentCardStyle()}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          📄 {doc.fileName}
                        </p>
                        {getStatusBadge()}
                      </div>

                      {/* 분석 중 진행률 표시 */}
                      {doc.status === 'analyzing' && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-primary font-medium">AI 분석 진행률</span>
                            <span className="text-xs text-primary font-bold">{doc.progress}%</span>
                          </div>
                          <div className="w-full bg-bg-secondary/50 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500 relative"
                              style={{ width: `${doc.progress}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 완료된 문서 정보 */}
                      {doc.status === 'completed' && doc.confidenceScore && (
                        <div className="flex items-center gap-4 mt-2 p-2 bg-success/10 rounded-lg">
                          <div className="flex items-center gap-1 text-xs text-success">
                            <div className="w-2 h-2 bg-success rounded-full" />
                            <span className="font-medium">신뢰도: {Math.round(doc.confidenceScore * 100)}%</span>
                          </div>
                          {doc.processingTime && (
                            <div className="flex items-center gap-1 text-xs text-success">
                              <Clock className="w-3 h-3" />
                              <span className="font-medium">처리시간: {doc.processingTime}초</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 오류 정보 */}
                      {doc.status === 'error' && doc.error && (
                        <div className="mt-2 p-3 bg-error/10 border border-error/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-error" />
                            <span className="text-xs font-bold text-error">분석 실패</span>
                          </div>
                          <p className="text-xs text-error/80">
                            {doc.error}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 도움말 텍스트 */}
          <div className="mt-4 p-3 bg-bg-tertiary/30 rounded-lg">
            <p className="text-xs text-text-muted text-center">
              💡 각 문서는 AI가 개별적으로 분석하며, 완료된 문서는 즉시 질문 생성에 활용됩니다
            </p>
          </div>
        </Card>
      );
    };

    const updateStageStatus = (stageId: string, status: AnalysisStage['status']) => {
      // 유효한 상태 값인지 확인
      const validStatuses: AnalysisStage['status'][] = ['pending', 'processing', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        console.error('❌ 잘못된 단계 상태:', status);
        return;
      }

      setStages(prev =>
        prev.map(stage =>
          stage.id === stageId
            ? {
                ...stage,
                status,
                startTime: status === 'processing' ? new Date() : stage.startTime,
                endTime: status === 'completed' || status === 'failed' ? new Date() : stage.endTime,
              }
            : stage
        )
      );
    };

    const addToActivityLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setActivityLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
      console.log('📝', message);
    };

    const adjustPollingInterval = () => {
      // 🔥 분석 완료 및 질문 생성 트리거 완료 시 폴링 완전히 중지
      if (analysisCompleted && questionGenerationTriggered) {
        console.log('✅ 분석 및 질문 생성 완료 - 폴링 중지');
        return; // 더 이상 조정하지 않음
      }

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime;

      // 진행률에 따른 동적 폴링 간격 조정
      const analyzingDocs = documentStatuses.filter(doc => doc.status === 'analyzing').length;
      const completedDocs = documentStatuses.filter(doc => doc.status === 'completed').length;
      const errorDocs = documentStatuses.filter(doc => doc.status === 'error').length;
      const totalDocs = documentStatuses.length;
      const processedDocs = completedDocs + errorDocs;

      let newInterval = pollInterval;

      // 문서 분석 완료 및 질문 생성 대기 중
      if (analysisCompleted && !questionGenerationTriggered) {
        newInterval = 10000; // 10초 간격으로 느리게
        console.log('📊 문서 분석 완료, 질문 생성 대기 중');
      }
      // 전체 문서 처리 완료
      else if (totalDocs > 0 && processedDocs === totalDocs) {
        newInterval = 15000; // 15초 간격으로 대폭 늘림
        console.log('📊 모든 문서 처리 완료, 폴링 간격 대폭 증가');
      }
      // 활발한 분석 중일 때
      else if (analyzingDocs > 0) {
        newInterval = 3000; // 3초 간격 (빠른 폴링)
      }
      // 대기 상태일 때
      else {
        newInterval = 5000; // 5초 간격
      }

      // 간격이 실제로 변경되었을 때만 업데이트
      if (Math.abs(newInterval - pollInterval) > 1000) {
        setPollInterval(newInterval);
        console.log('🔄 폴링 간격 조정:', `${pollInterval}ms → ${newInterval}ms`);
      }

      // 상태 변화가 있었을 때만 최근 업데이트 시간 갱신
      if (timeSinceLastUpdate > 10000) { // 10초 이상 변화가 없으면
        setLastUpdateTime(now);
      }
    };

    const updateElapsedTime = () => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    };

    const handlePauseResume = () => {
      setIsPaused(!isPaused);
      addToActivityLog(isPaused ? '▶️ 분석을 재개합니다' : '⏸️ 분석을 일시 정지합니다');
    };

    const handleRestart = () => {
      if (window.confirm('분석을 처음부터 다시 시작하시겠습니까?')) {
        setStages(prev =>
          prev.map(stage => ({
            ...stage,
            status: 'pending',
            progress: 0,
            message: undefined,
            startTime: undefined,
            endTime: undefined,
          }))
        );
        setOverallProgress(0);
        setCurrentStage('document_analysis');
        setIsPaused(false);
        setActivityLog([]);
        setStartTime(new Date());
        setElapsedTime(0);
        setAnalysisCompleted(false);
        setQuestionGenerationTriggered(false);

        setTimeout(() => initializeAnalysis(), 500);
        addToActivityLog('🔄 분석을 다시 시작합니다...');
      }
    };

    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getEstimatedTimeRemaining = () => {
      const pendingStages = stages.filter(s => s.status === 'pending');
      const inProgressStage = stages.find(s => s.status === 'processing');

      let remainingTime = pendingStages.reduce((sum, stage) => sum + stage.estimatedDuration, 0);

      if (inProgressStage) {
        const stageRemainingTime = inProgressStage.estimatedDuration * (1 - inProgressStage.progress / 100);
        remainingTime += stageRemainingTime;
      }

      return Math.ceil(remainingTime);
    };

    return (
      <div className="space-y-6">
        {/* 헤더 및 컨트롤 */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-text-primary">🎯 사전 분석 진행 상황</h3>
            <p className="text-text-secondary mt-1">
              AI와 MCP를 활용한 문서 분석이 진행 중입니다
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePauseResume}
              className="flex items-center gap-2 px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary text-text-primary rounded-lg transition-colors border border-border-primary"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  재개
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  일시정지
                </>
              )}
            </button>
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-4 py-2 bg-error hover:bg-error/80 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              다시 시작
            </button>
          </div>
        </div>

        {/* 전체 진행률 - 향상된 디자인 */}
        <Card className="p-6 bg-gradient-to-br from-bg-primary to-bg-secondary border-2 border-primary/20 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                사전 분석 전체 진행률
              </h4>
              <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>{Math.round(overallProgress)}% 완료</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>경과 시간: {formatDuration(elapsedTime)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span>예상 남은 시간: {formatDuration(getEstimatedTimeRemaining())}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {Math.round(overallProgress)}%
              </div>
              {isPaused && (
                <div className="text-sm text-warning font-medium flex items-center gap-1">
                  <Pause className="w-3 h-3" />
                  일시정지됨
                </div>
              )}
              {overallProgress === 100 && (
                <div className="text-sm text-success font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  모든 작업 완료!
                </div>
              )}
            </div>
          </div>

          {/* 향상된 진행률 바 */}
          <div className="relative">
            <div className="w-full bg-bg-tertiary/30 rounded-full h-4 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 h-4 rounded-full transition-all duration-1000 ease-out relative shadow-md"
                style={{ width: `${overallProgress}%` }}
              >
                {/* 진행률 바 애니메이션 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />

                {/* 진행률 표시 라벨 */}
                {overallProgress > 10 && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <span className="text-xs font-bold text-white drop-shadow">
                      {Math.round(overallProgress)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 진행률 마일스톤 표시 */}
            <div className="flex justify-between mt-2 text-xs text-text-muted">
              <span>0%</span>
              <span className="text-primary font-medium">25%</span>
              <span className="text-primary font-medium">50%</span>
              <span className="text-primary font-medium">75%</span>
              <span className="text-success font-bold">100%</span>
            </div>
          </div>
        </Card>

        {/* 문서별 분석 상태 */}
        {renderDocumentProgress()}

        {/* 단계별 진행 상황 - 향상된 UI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const isActive = stage.status === 'processing';
            const isCompleted = stage.status === 'completed';
            const isFailed = stage.status === 'failed';

            // 상태별 스타일 정의
            const getStageStyle = () => {
              if (isCompleted) return 'border-success/40 bg-gradient-to-br from-success/10 to-success/5 shadow-success/20';
              if (isFailed) return 'border-error/40 bg-gradient-to-br from-error/10 to-error/5 shadow-error/20';
              if (isActive) return 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 shadow-primary/20 animate-pulse';
              return 'border-border-primary bg-gradient-to-br from-bg-secondary to-bg-tertiary hover:border-primary/30 transition-all';
            };

            const getIconStyle = () => {
              if (isCompleted) return 'bg-gradient-to-br from-success to-success/80 text-white shadow-lg';
              if (isFailed) return 'bg-gradient-to-br from-error to-error/80 text-white shadow-lg';
              if (isActive) return 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg animate-bounce';
              return 'bg-gradient-to-br from-bg-tertiary to-bg-secondary text-text-muted';
            };

            const getStatusBadge = () => {
              if (isCompleted) return <span className="px-2 py-1 bg-success/20 text-success text-xs font-medium rounded-full">✓ 완료</span>;
              if (isFailed) return <span className="px-2 py-1 bg-error/20 text-error text-xs font-medium rounded-full">✗ 실패</span>;
              if (isActive) return <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full animate-pulse">🔄 진행중</span>;
              return <span className="px-2 py-1 bg-text-muted/20 text-text-muted text-xs font-medium rounded-full">⏸ 대기중</span>;
            };

            return (
              <Card
                key={stage.id}
                className={`
                  p-6 border-2 transition-all duration-500 shadow-lg hover:shadow-xl
                  ${getStageStyle()}
                  ${isPaused && isActive ? 'opacity-60' : ''}
                  transform hover:scale-105
                `}
              >
                <div className="flex items-start gap-4">
                  {/* 아이콘 */}
                  <div className={`
                    p-3 rounded-xl transition-all duration-300
                    ${getIconStyle()}
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : isFailed ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : isActive ? (
                      <Loader className="w-6 h-6 animate-spin" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* 단계 제목 및 상태 */}
                    <div className="flex items-center justify-between mb-2">
                      <h5 className={`text-lg font-semibold transition-colors ${
                        isCompleted ? 'text-success' :
                        isActive ? 'text-primary' :
                        isFailed ? 'text-error' :
                        'text-text-primary'
                      }`}>
                        {stage.name}
                      </h5>
                      {getStatusBadge()}
                    </div>

                    {/* 설명 */}
                    <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                      {stage.description}
                    </p>

                    {/* 진행률 바 (향상된 디자인) */}
                    {(isActive || isCompleted || isFailed) && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-text-muted">
                            진행률
                          </span>
                          <span className={`text-xs font-bold ${
                            isCompleted ? 'text-success' :
                            isActive ? 'text-primary' :
                            isFailed ? 'text-error' :
                            'text-text-muted'
                          }`}>
                            {Math.round(stage.progress)}%
                          </span>
                        </div>
                        <div className="w-full bg-bg-tertiary/50 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-3 rounded-full transition-all duration-700 ease-out relative ${
                              isCompleted ? 'bg-gradient-to-r from-success/80 to-success' :
                              isActive ? 'bg-gradient-to-r from-primary/80 to-primary' :
                              isFailed ? 'bg-gradient-to-r from-error/80 to-error' :
                              'bg-text-muted'
                            }`}
                            style={{ width: `${stage.progress}%` }}
                          >
                            {/* 진행률 바 애니메이션 */}
                            {isActive && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 상태 메시지 */}
                    {stage.message && (
                      <div className={`p-3 rounded-lg mb-3 ${
                        isCompleted ? 'bg-success/10 border border-success/20' :
                        isActive ? 'bg-primary/10 border border-primary/20' :
                        isFailed ? 'bg-error/10 border border-error/20' :
                        'bg-bg-tertiary/50 border border-border-primary'
                      }`}>
                        <p className={`text-sm font-medium ${
                          isCompleted ? 'text-success' :
                          isActive ? 'text-primary' :
                          isFailed ? 'text-error' :
                          'text-text-muted'
                        }`}>
                          {stage.message}
                        </p>
                      </div>
                    )}

                    {/* 시간 정보 (향상된 디자인) */}
                    {(stage.startTime || stage.endTime) && (
                      <div className="flex items-center gap-4 text-xs text-text-muted bg-bg-tertiary/30 p-2 rounded-lg">
                        {stage.startTime && (
                          <div className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            <span>시작: {stage.startTime.toLocaleTimeString()}</span>
                          </div>
                        )}
                        {stage.endTime && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>완료: {stage.endTime.toLocaleTimeString()}</span>
                          </div>
                        )}
                        {stage.startTime && stage.endTime && (
                          <div className="flex items-center gap-1 text-primary">
                            <Clock className="w-3 h-3" />
                            <span>소요시간: {Math.round((stage.endTime.getTime() - stage.startTime.getTime()) / 1000)}초</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 실시간 활동 로그 */}
        <Card className="p-4">
          <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            실시간 활동 로그
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {activityLog.length > 0 ? (
              activityLog.map((log, index) => (
                <div
                  key={index}
                  className="text-sm text-text-secondary font-mono bg-bg-tertiary px-3 py-1 rounded animate-fadeIn"
                >
                  {log}
                </div>
              ))
            ) : (
              <div className="text-sm text-text-muted italic">
                활동 로그가 여기에 표시됩니다...
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }
);

AnalysisProgress.displayName = 'AnalysisProgress';