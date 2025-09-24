import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Supabase null 체크를 위한 가드 함수
const ensureSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized')
  }
  return supabase
}

export interface PreAnalysisStatus {
  sessionId: string | null
  status: 'not_started' | 'in_progress' | 'completed' | 'error'
  progress: number
  currentStep: string | null
  analysisCount: number
  questionCount: number
  reportExists: boolean
  lastUpdated: Date | null
}

export function usePreAnalysisStatus(projectId: string) {
  const [status, setStatus] = useState<PreAnalysisStatus>({
    sessionId: null,
    status: 'not_started',
    progress: 0,
    currentStep: null,
    analysisCount: 0,
    questionCount: 0,
    reportExists: false,
    lastUpdated: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalysisStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. 가장 최근 사전 분석 세션 확인
      const client = ensureSupabase()
      const { data: sessions, error: sessionError } = await client
        .from('pre_analysis_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (sessionError) {
        console.error('세션 조회 오류:', sessionError)
        throw sessionError
      }

      const latestSession = sessions?.[0]

      if (!latestSession) {
        // 세션이 없으면 시작하지 않음
        setStatus(prev => ({
          ...prev,
          status: 'not_started',
          progress: 0,
          sessionId: null,
          currentStep: null
        }))
        setLoading(false)
        return
      }

      // 2. 문서 분석 수 확인
      const { count: analysisCount } = await client
        .from('document_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', latestSession.id)

      // 3. 생성된 질문 수 확인
      const { count: questionCount } = await client
        .from('ai_questions')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', latestSession.id)

      // 4. 분석 보고서 존재 확인
      const { count: reportCount } = await client
        .from('analysis_reports')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', latestSession.id)

      // 5. 진행률 계산
      let progress = 10 // 세션 생성 완료
      let currentStep = '분석 준비 중'
      let sessionStatus: PreAnalysisStatus['status'] = 'in_progress'

      if (latestSession.status === 'completed') {
        progress = 100
        currentStep = '분석 완료'
        sessionStatus = 'completed'
      } else if (latestSession.status === 'failed') {
        sessionStatus = 'error'
        currentStep = '분석 실패'
      } else {
        // 진행 단계별 계산 (더 세밀하게)
        if (analysisCount && analysisCount > 0) {
          progress = Math.max(progress, 30)
          currentStep = '문서 분석 완료'
        }

        if (questionCount && questionCount > 0) {
          progress = Math.max(progress, 70)
          currentStep = '질문 준비 완료'

          // 질문이 있으면 답변 대기 상태로 전환
          if (progress < 85) {
            currentStep = '답변 입력 대기 중'
          }
        }

        if (reportCount && reportCount > 0) {
          progress = Math.max(progress, 90)
          currentStep = '보고서 생성 완료'
        }

        // 최종 완료 상태 체크
        if (latestSession.status === 'completed') {
          progress = 100
          currentStep = '분석 완료'
          sessionStatus = 'completed'
        }
      }

      setStatus({
        sessionId: latestSession.id,
        status: sessionStatus,
        progress,
        currentStep,
        analysisCount: analysisCount || 0,
        questionCount: questionCount || 0,
        reportExists: (reportCount || 0) > 0,
        lastUpdated: latestSession.updated_at ? new Date(latestSession.updated_at) : null
      })

    } catch (err) {
      console.error('분석 상태 로드 실패:', err)
      setError(err instanceof Error ? err.message : '분석 상태를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadAnalysisStatus()
    }
  }, [projectId])

  // 실시간 구독 설정
  useEffect(() => {
    if (!projectId) return

    const client = ensureSupabase()
    const channels = [
      // 사전 분석 세션 변경사항 구독
      client
        .channel(`pre_analysis_sessions_${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pre_analysis_sessions',
            filter: `project_id=eq.${projectId}`
          },
          () => {
            loadAnalysisStatus()
          }
        )
        .subscribe(),

      // 문서 분석 변경사항 구독
      client
        .channel(`document_analyses_${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'document_analyses'
          },
          () => {
            loadAnalysisStatus()
          }
        )
        .subscribe(),

      // AI 질문 변경사항 구독
      client
        .channel(`ai_questions_${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ai_questions'
          },
          () => {
            loadAnalysisStatus()
          }
        )
        .subscribe(),

      // 분석 보고서 변경사항 구독
      client
        .channel(`analysis_reports_${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'analysis_reports'
          },
          () => {
            loadAnalysisStatus()
          }
        )
        .subscribe()
    ]

    return () => {
      channels.forEach(channel => {
        client.removeChannel(channel)
      })
    }
  }, [projectId])

  const refreshStatus = () => {
    loadAnalysisStatus()
  }

  const getStatusColor = (status: PreAnalysisStatus['status']) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-500/10 text-gray-500'
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-500'
      case 'completed':
        return 'bg-green-500/10 text-green-500'
      case 'error':
        return 'bg-red-500/10 text-red-500'
      default:
        return 'bg-gray-500/10 text-gray-500'
    }
  }

  const getStatusLabel = (status: PreAnalysisStatus['status']) => {
    switch (status) {
      case 'not_started':
        return '분석 대기'
      case 'in_progress':
        return '분석 진행중'
      case 'completed':
        return '분석 완료'
      case 'error':
        return '오류 발생'
      default:
        return '알 수 없음'
    }
  }

  return {
    status,
    loading,
    error,
    refreshStatus,
    getStatusColor,
    getStatusLabel
  }
}