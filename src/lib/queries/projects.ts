import React from 'react'
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { ProjectService } from '../../services/projectService'
import { useAuth } from '@/components/providers/AuthProvider'

// 프로젝트 타입 정의
interface Project {
  id: string
  name: string
  description?: string | null
  status: string
  owner_id: string
  created_at: string | null
  updated_at: string | null
  [key: string]: any
}

interface ProjectInsert {
  name: string
  description?: string
  status?: string
  owner_id: string
}

interface ProjectUpdate {
  name?: string
  description?: string
  status?: string
  updated_at?: string
}

// Query Keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: string) => [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  user: (userId: string) => [...projectKeys.all, 'user', userId] as const,
  recent: (userId: string) => [...projectKeys.all, 'recent', userId] as const,
  byStatus: (userId: string, status: string) => [...projectKeys.all, 'status', userId, status] as const,
}

// 사용자의 모든 프로젝트 조회
export function useProjects(options?: UseQueryOptions<Project[], Error>) {
  const { user } = useAuth()

  return useQuery<Project[], Error>({
    queryKey: projectKeys.user(user?.id || ''),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      return ProjectService.getUserProjects(user.id)
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    ...options,
  })
}

// 특정 프로젝트 조회
export function useProject(projectId: string, options?: UseQueryOptions<Project | null, Error>) {
  return useQuery<Project | null, Error>({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => ProjectService.getProject(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    ...options,
  })
}

// 최근 프로젝트 조회
export function useRecentProjects(limit: number = 5, options?: UseQueryOptions<Project[], Error>) {
  const { user } = useAuth()

  return useQuery<Project[], Error>({
    queryKey: projectKeys.recent(user?.id || ''),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      return ProjectService.getRecentProjects(user.id, limit)
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    ...options,
  })
}

// 상태별 프로젝트 조회
export function useProjectsByStatus(status: string, options?: UseQueryOptions<Project[], Error>) {
  const { user } = useAuth()

  return useQuery<Project[], Error>({
    queryKey: projectKeys.byStatus(user?.id || '', status),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      return ProjectService.getProjectsByStatus(user.id, status)
    },
    enabled: !!user && !!status,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    ...options,
  })
}

// 프로젝트 생성 Mutation
export function useCreateProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<Project, Error, ProjectInsert>({
    mutationFn: async (projectData) => {
      if (!user) throw new Error('User not authenticated')
      return ProjectService.createProject({
        ...projectData,
        owner_id: user.id,
      })
    },
    onSuccess: (newProject) => {
      // 캐시 업데이트
      queryClient.setQueryData<Project[]>(
        projectKeys.user(user?.id || ''),
        (old) => old ? [newProject, ...old] : [newProject]
      )

      // 최근 프로젝트 캐시 업데이트
      queryClient.setQueryData<Project[]>(
        projectKeys.recent(user?.id || ''),
        (old) => old ? [newProject, ...old.slice(0, 4)] : [newProject]
      )

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: projectKeys.all
      })
    },
    onError: (error) => {
      console.error('Failed to create project:', error)
    },
  })
}

// 프로젝트 업데이트 Mutation
export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<Project, Error, { id: string; data: ProjectUpdate }>({
    mutationFn: ({ id, data }) => ProjectService.updateProject(id, data),
    onMutate: async ({ id, data }) => {
      // Optimistic update를 위해 이전 데이터 취소
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(id) })

      // 이전 값 저장
      const previousProject = queryClient.getQueryData<Project>(projectKeys.detail(id))

      // Optimistic update
      if (previousProject) {
        queryClient.setQueryData<Project>(projectKeys.detail(id), {
          ...previousProject,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousProject }
    },
    onError: (_, { id }, context: any) => {
      // 에러 시 이전 값으로 롤백
      if (context?.previousProject) {
        queryClient.setQueryData(projectKeys.detail(id), context.previousProject)
      }
    },
    onSuccess: (updatedProject) => {
      // 성공 시 캐시 업데이트
      queryClient.setQueryData(projectKeys.detail(updatedProject.id), updatedProject)

      // 프로젝트 목록 캐시 업데이트
      queryClient.setQueryData<Project[]>(
        projectKeys.user(user?.id || ''),
        (old) => old ? old.map(p => p.id === updatedProject.id ? updatedProject : p) : []
      )

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: projectKeys.all
      })
    },
  })
}

// 프로젝트 삭제 Mutation
export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<void, Error, string>({
    mutationFn: (projectId) => ProjectService.deleteProject(projectId),
    onMutate: async (projectId) => {
      // Optimistic update를 위해 이전 데이터 취소
      await queryClient.cancelQueries({ queryKey: projectKeys.user(user?.id || '') })

      // 이전 값 저장
      const previousProjects = queryClient.getQueryData<Project[]>(projectKeys.user(user?.id || ''))

      // Optimistic update - 프로젝트 목록에서 제거
      queryClient.setQueryData<Project[]>(
        projectKeys.user(user?.id || ''),
        (old) => old ? old.filter(p => p.id !== projectId) : []
      )

      return { previousProjects }
    },
    onError: (_, __, context: any) => {
      // 에러 시 이전 값으로 롤백
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.user(user?.id || ''), context.previousProjects)
      }
    },
    onSuccess: (_, projectId) => {
      // 성공 시 관련 캐시 정리
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) })

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: projectKeys.all
      })
    },
  })
}

// 프로젝트 활성 개수 조회
export function useActiveProjectsCount(options?: UseQueryOptions<number, Error>) {
  const { user } = useAuth()

  return useQuery<number, Error>({
    queryKey: [...projectKeys.user(user?.id || ''), 'activeCount'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      return ProjectService.getActiveProjectsCount(user.id)
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    ...options,
  })
}

// 프로젝트 검색 (클라이언트 사이드)
export function useProjectSearch(searchQuery: string, projects: Project[] = []) {
  return React.useMemo(() => {
    if (!searchQuery.trim()) return projects

    const query = searchQuery.toLowerCase()
    return projects.filter(project =>
      project.name.toLowerCase().includes(query) ||
      (project.description || '').toLowerCase().includes(query)
    )
  }, [searchQuery, projects])
}

// 프로젝트 필터링 (클라이언트 사이드)
export function useProjectFilter(
  projects: Project[] = [],
  filters: {
    status?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}
) {
  return React.useMemo(() => {
    let filtered = [...projects]

    // 상태별 필터링
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(project => project.status === filters.status)
    }

    // 정렬
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        const aValue = a[filters.sortBy!] || ''
        const bValue = b[filters.sortBy!] || ''

        if (filters.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
    }

    return filtered
  }, [projects, filters])
}