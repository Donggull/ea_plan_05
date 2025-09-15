import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// React 19 스타일 프로젝트 데이터 페칭 (useEffect 기반)
export function useProjectData(projectId: string | null) {
  const [project, setProject] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!projectId || !supabase) {
      setProject(null)
      return
    }

    setIsLoading(true)

    supabase
      .from('projects')
      .select(`
        *,
        owner:profiles!owner_id(*),
        members:project_members(
          *,
          user:profiles(*)
        ),
        documents(count),
        ai_analysis(count)
      `)
      .eq('id', projectId)
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        setProject(data)
      })
      .catch((error: any) => console.error(error))
      .finally(() => setIsLoading(false))
  }, [projectId])

  return {
    project,
    isLoading,
  }
}

// 프로젝트 목록을 위한 Hook 구현 (useEffect 기반)
export function useProjectsList(userId: string | null) {
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || !supabase) {
      setProjects([])
      return
    }

    setIsLoading(true)

    supabase
      .from('projects')
      .select(`
        *,
        owner:profiles!owner_id(full_name, avatar_url),
        members:project_members(count),
        documents(count)
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error
        setProjects(data || [])
      })
      .catch((error: any) => console.error(error))
      .finally(() => setIsLoading(false))
  }, [userId])

  return {
    projects,
    isLoading,
  }
}

// 실시간 프로젝트 데이터 업데이트 Hook (useEffect 기반)
export function useRealtimeProject(projectId: string | null) {
  const [project, setProject] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!projectId || !supabase) {
      setProject(null)
      return
    }

    setIsLoading(true)
    let subscription: any = null

    // 초기 데이터 가져오기
    supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching project:', error)
          return
        }

        setProject(data)
        setIsLoading(false)

        // 실시간 구독 설정
        subscription = supabase
          .channel(`project-${projectId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'projects',
              filter: `id=eq.${projectId}`
            },
            (payload) => {
              // 실시간 업데이트 처리
              if (payload.eventType === 'UPDATE') {
                setProject((prev: any) => ({ ...prev, ...payload.new }))
              }
            }
          )
          .subscribe()
      })
      .catch((error) => {
        console.error('Error in useRealtimeProject:', error)
        setIsLoading(false)
      })

    // 정리 함수
    return () => {
      if (subscription) {
        if (supabase) {
          supabase.removeChannel(subscription)
        }
      }
    }
  }, [projectId])

  return {
    project,
    isLoading,
  }
}

// AI 분석 데이터를 위한 Hook (useEffect 기반)
export function useAIAnalysisData(projectId: string | null) {
  const [analyses, setAnalyses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!projectId || !supabase) {
      setAnalyses([])
      return
    }

    setIsLoading(true)

    supabase
      .from('ai_analysis')
      .select(`
        *,
        document:documents(file_name),
        creator:profiles!created_by(full_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) throw error
        setAnalyses(data || [])
      })
      .catch((error: any) => console.error(error))
      .finally(() => setIsLoading(false))
  }, [projectId])

  return {
    analyses,
    isLoading,
  }
}

// 사용자 API 사용량을 위한 Hook (useEffect 기반)
export function useUserAPIUsage(userId: string | null) {
  const [usage, setUsage] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || !supabase) {
      setUsage([])
      return
    }

    setIsLoading(true)
    const today = new Date().toISOString().split('T')[0]

    supabase
      .from('user_api_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .then(({ data, error }) => {
        if (error) throw error
        setUsage(data || [])
      })
      .catch((error: any) => console.error(error))
      .finally(() => setIsLoading(false))
  }, [userId])

  const totalTokens = useMemo(() =>
    usage.reduce((sum: number, item: any) => sum + (item.total_tokens || 0), 0)
  , [usage])

  const totalCost = useMemo(() =>
    usage.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0)
  , [usage])

  return {
    usage,
    totalTokens,
    totalCost,
    isLoading,
  }
}