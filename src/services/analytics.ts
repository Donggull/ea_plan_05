import { supabase } from '@/lib/supabase'

export interface RecentActivity {
  id: string
  action: string
  time: string
  type: 'success' | 'info' | 'warning' | 'error'
  project_name?: string
  details?: string
}

export interface AIUsageStats {
  total_analyses: number
  total_tokens: number
  total_cost: number
  models_used: Record<string, number>
  recent_analyses: Array<{
    id: string
    analysis_type: string
    ai_model: string
    created_at: string
    status: string
    project_name?: string
  }>
}

// 최근 활동 조회
export async function getRecentActivity(userId: string): Promise<RecentActivity[]> {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return []
  }

  if (!userId) {
    console.warn('No user ID provided for getRecentActivity')
    return []
  }

  try {
    // AI 분석 활동
    const { data: analyses, error: analysisError } = await supabase
      .from('ai_analysis')
      .select(`
        id,
        analysis_type,
        status,
        created_at,
        completed_at,
        projects:project_id (name)
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (analysisError) {
      console.error('Error fetching recent analyses:', analysisError.message)
    }

    // 문서 업로드 활동
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select(`
        id,
        file_name,
        created_at,
        projects:project_id (name)
      `)
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false })
      .limit(3)

    if (documentsError) {
      console.error('Error fetching recent documents:', documentsError.message)
    }

    const activities: RecentActivity[] = []

    // AI 분석 활동 추가
    analyses?.forEach(analysis => {
      if (!analysis.created_at) return

      const timeDiff = Date.now() - new Date(analysis.created_at).getTime()
      const timeAgo = getTimeAgo(timeDiff)

      let action = ''
      let type: RecentActivity['type'] = 'info'

      if (analysis.status === 'completed') {
        action = `AI analysis completed for ${(analysis.projects as any)?.name || 'Unknown Project'}`
        type = 'success'
      } else if (analysis.status === 'failed') {
        action = `AI analysis failed for ${(analysis.projects as any)?.name || 'Unknown Project'}`
        type = 'error'
      } else {
        action = `AI analysis started for ${(analysis.projects as any)?.name || 'Unknown Project'}`
        type = 'info'
      }

      activities.push({
        id: analysis.id,
        action,
        time: timeAgo,
        type,
        project_name: (analysis.projects as any)?.name
      })
    })

    // 문서 업로드 활동 추가
    documents?.forEach(document => {
      if (!document.created_at) return

      const timeDiff = Date.now() - new Date(document.created_at).getTime()
      const timeAgo = getTimeAgo(timeDiff)

      activities.push({
        id: document.id,
        action: `New document uploaded: ${document.file_name}`,
        time: timeAgo,
        type: 'info',
        project_name: (document.projects as any)?.name
      })
    })

    // 시간순 정렬
    return activities
      .sort((a, b) => {
        const timeA = parseTimeAgo(a.time)
        const timeB = parseTimeAgo(b.time)
        return timeA - timeB
      })
      .slice(0, 4)
  } catch (err) {
    console.error('Unexpected error in getRecentActivity:', err)
    return []
  }
}

// AI 사용량 통계 조회
export async function getAIUsageStats(userId: string): Promise<AIUsageStats> {
  if (!supabase) {
    console.error('Supabase client not initialized')
    throw new Error('Supabase client not initialized')
  }

  try {
    const { data: analyses, error } = await supabase
    .from('ai_analysis')
    .select(`
      id,
      analysis_type,
      ai_model,
      input_tokens,
      output_tokens,
      total_cost,
      status,
      created_at,
      projects:project_id (name)
    `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching AI usage stats:', error)
      throw error
    }

    const total_analyses = analyses?.length || 0
    const total_tokens = analyses?.reduce((sum, a) => sum + (a.input_tokens || 0) + (a.output_tokens || 0), 0) || 0
    const total_cost = analyses?.reduce((sum, a) => sum + (a.total_cost || 0), 0) || 0

    // 모델별 사용량 계산
    const models_used: Record<string, number> = {}
    analyses?.forEach(analysis => {
      const model = analysis.ai_model || 'unknown'
      models_used[model] = (models_used[model] || 0) + 1
    })

    // 최근 분석 (상위 5개)
    const recent_analyses = analyses?.slice(0, 5)
      .filter(analysis => analysis.created_at && analysis.status)
      .map(analysis => ({
        id: analysis.id,
        analysis_type: analysis.analysis_type,
        ai_model: analysis.ai_model,
        created_at: analysis.created_at!,
        status: analysis.status!,
        project_name: (analysis.projects as any)?.name
      })) || []

    return {
      total_analyses,
      total_tokens,
      total_cost,
      models_used,
      recent_analyses
    }
  } catch (err) {
    console.error('Error in getAIUsageStats:', err)
    return {
      total_analyses: 0,
      total_tokens: 0,
      total_cost: 0,
      models_used: {},
      recent_analyses: []
    }
  }
}

// 시간 차이를 텍스트로 변환
function getTimeAgo(timeDiff: number): string {
  const minutes = Math.floor(timeDiff / (1000 * 60))
  const hours = Math.floor(timeDiff / (1000 * 60 * 60))
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minutes ago`
  if (hours < 24) return `${hours} hours ago`
  return `${days} days ago`
}

// 시간 텍스트를 숫자로 변환 (정렬용)
function parseTimeAgo(timeStr: string): number {
  if (timeStr === 'just now') return 0

  const match = timeStr.match(/(\d+)\s+(minutes?|hours?|days?)\s+ago/)
  if (!match) return 0

  const value = parseInt(match[1])
  const unit = match[2]

  if (unit.startsWith('minute')) return value
  if (unit.startsWith('hour')) return value * 60
  if (unit.startsWith('day')) return value * 60 * 24

  return 0
}