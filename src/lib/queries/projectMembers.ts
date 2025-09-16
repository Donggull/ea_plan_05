import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { ProjectMemberService, ProjectMember, ProjectMemberInsert, ProjectMemberUpdate } from '../../services/projectMemberService'

// Query Keys
export const projectMemberKeys = {
  all: ['projectMembers'] as const,
  lists: () => [...projectMemberKeys.all, 'list'] as const,
  list: (projectId: string) => [...projectMemberKeys.lists(), projectId] as const,
  details: () => [...projectMemberKeys.all, 'detail'] as const,
  detail: (memberId: string) => [...projectMemberKeys.details(), memberId] as const,
  membership: (projectId: string, userId: string) => [...projectMemberKeys.all, 'membership', projectId, userId] as const,
  search: (query: string) => [...projectMemberKeys.all, 'search', query] as const,
}

// 프로젝트 멤버 목록 조회
export function useProjectMembers(projectId: string, options?: UseQueryOptions<ProjectMember[], Error>) {
  return useQuery<ProjectMember[], Error>({
    queryKey: projectMemberKeys.list(projectId),
    queryFn: () => ProjectMemberService.getProjectMembers(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    ...options,
  })
}

// 사용자 멤버십 확인
export function useUserMembership(
  projectId: string,
  userId: string | undefined,
  options?: UseQueryOptions<ProjectMember | null, Error>
) {
  return useQuery<ProjectMember | null, Error>({
    queryKey: projectMemberKeys.membership(projectId, userId || ''),
    queryFn: () => ProjectMemberService.getUserMembership(projectId, userId || ''),
    enabled: !!projectId && !!userId,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    ...options,
  })
}

// 사용자 검색
export function useUserSearch(query: string, options?: UseQueryOptions<{ id: string; email: string; full_name: string | null }[], Error>) {
  return useQuery({
    queryKey: projectMemberKeys.search(query),
    queryFn: () => ProjectMemberService.searchUsers(query),
    enabled: query.length >= 2, // 최소 2글자 이상
    staleTime: 30 * 1000, // 30초
    gcTime: 60 * 1000, // 1분
    ...options,
  })
}

// 멤버 초대 Mutation
export function useInviteMember() {
  const queryClient = useQueryClient()

  return useMutation<ProjectMember, Error, ProjectMemberInsert>({
    mutationFn: (memberData) => ProjectMemberService.inviteMemberByEmail(memberData),
    onSuccess: (newMember) => {
      // 프로젝트 멤버 목록 캐시 업데이트
      queryClient.setQueryData<ProjectMember[]>(
        projectMemberKeys.list(newMember.project_id || ''),
        (old) => old ? [newMember, ...old] : [newMember]
      )

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: projectMemberKeys.lists()
      })
    },
    onError: (error) => {
      console.error('Failed to invite member:', error)
    },
  })
}

// 멤버 업데이트 Mutation
export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation<ProjectMember, Error, { memberId: string; data: ProjectMemberUpdate }>({
    mutationFn: ({ memberId, data }) => ProjectMemberService.updateMember(memberId, data),
    onMutate: async ({ memberId, data }) => {
      // Optimistic update를 위해 이전 데이터 취소
      await queryClient.cancelQueries({ queryKey: projectMemberKeys.detail(memberId) })

      // 이전 값 저장
      const previousMember = queryClient.getQueryData<ProjectMember>(projectMemberKeys.detail(memberId))

      // Optimistic update
      if (previousMember) {
        queryClient.setQueryData<ProjectMember>(projectMemberKeys.detail(memberId), {
          ...previousMember,
          ...data,
        })
      }

      return { previousMember }
    },
    onError: (_, { memberId }, context: any) => {
      // 에러 시 이전 값으로 롤백
      if (context?.previousMember) {
        queryClient.setQueryData(projectMemberKeys.detail(memberId), context.previousMember)
      }
    },
    onSuccess: (updatedMember) => {
      // 성공 시 캐시 업데이트
      queryClient.setQueryData(projectMemberKeys.detail(updatedMember.id), updatedMember)

      // 프로젝트 멤버 목록 캐시 업데이트
      queryClient.setQueryData<ProjectMember[]>(
        projectMemberKeys.list(updatedMember.project_id || ''),
        (old) => old ? old.map(m => m.id === updatedMember.id ? updatedMember : m) : []
      )

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: projectMemberKeys.lists()
      })
    },
  })
}

// 멤버 제거 Mutation
export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { memberId: string; projectId: string }>({
    mutationFn: ({ memberId }) => ProjectMemberService.removeMember(memberId),
    onMutate: async ({ memberId, projectId }) => {
      // Optimistic update를 위해 이전 데이터 취소
      await queryClient.cancelQueries({ queryKey: projectMemberKeys.list(projectId) })

      // 이전 값 저장
      const previousMembers = queryClient.getQueryData<ProjectMember[]>(projectMemberKeys.list(projectId))

      // Optimistic update - 멤버 목록에서 제거
      queryClient.setQueryData<ProjectMember[]>(
        projectMemberKeys.list(projectId),
        (old) => old ? old.filter(m => m.id !== memberId) : []
      )

      return { previousMembers }
    },
    onError: (_, { projectId }, context: any) => {
      // 에러 시 이전 값으로 롤백
      if (context?.previousMembers) {
        queryClient.setQueryData(projectMemberKeys.list(projectId), context.previousMembers)
      }
    },
    onSuccess: (_, { memberId }) => {
      // 성공 시 관련 캐시 정리
      queryClient.removeQueries({ queryKey: projectMemberKeys.detail(memberId) })

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: projectMemberKeys.lists()
      })
    },
  })
}

// 초대 링크 생성 Mutation
export function useGenerateInviteLink() {
  return useMutation<string, Error, { projectId: string; role: string; invitedBy: string }>({
    mutationFn: ({ projectId, role, invitedBy }) =>
      ProjectMemberService.generateInviteLink(projectId, role, invitedBy),
    onError: (error) => {
      console.error('Failed to generate invite link:', error)
    },
  })
}

// 멤버 역할 목록 가져오기 (정적 데이터)
export function useMemberRoles() {
  return ProjectMemberService.getMemberRoles()
}

// 권한 확인 헬퍼 훅
export function useHasPermission(member: ProjectMember | undefined, permission: string): boolean {
  if (!member) return false
  return ProjectMemberService.hasPermission(member, permission)
}