import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { ProjectService } from '../services/projectService'
import { useAuth } from '@/components/providers/AuthProvider'

// 프로젝트 타입 정의 (실제 Supabase 스키마에 맞춰 수정)
interface Project {
  id: string
  name: string
  description?: string | null
  status: string
  owner_id: string
  created_at: string | null
  updated_at: string | null
  [key: string]: any // 추가 필드들을 위한 인덱스 시그니처
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

// 프로젝트 상태 타입 정의
interface ProjectState {
  currentProject: Project | null
  userProjects: Project[]
  recentProjects: Project[]
  loading: boolean
  error: string | null
}

// 액션 타입 정의
type ProjectAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null }
  | { type: 'SET_USER_PROJECTS'; payload: Project[] }
  | { type: 'SET_RECENT_PROJECTS'; payload: Project[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'REMOVE_PROJECT'; payload: string }
  | { type: 'CLEAR_PROJECTS' }

// 초기 상태
const initialState: ProjectState = {
  currentProject: null,
  userProjects: [],
  recentProjects: [],
  loading: false,
  error: null
}

// 리듀서
function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload }
    case 'SET_USER_PROJECTS':
      return { ...state, userProjects: action.payload, loading: false }
    case 'SET_RECENT_PROJECTS':
      return { ...state, recentProjects: action.payload }
    case 'ADD_PROJECT':
      return {
        ...state,
        userProjects: [action.payload, ...state.userProjects],
        recentProjects: [action.payload, ...state.recentProjects.slice(0, 4)]
      }
    case 'UPDATE_PROJECT':
      return {
        ...state,
        userProjects: state.userProjects.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
        recentProjects: state.recentProjects.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
        currentProject: state.currentProject?.id === action.payload.id
          ? action.payload
          : state.currentProject
      }
    case 'REMOVE_PROJECT':
      return {
        ...state,
        userProjects: state.userProjects.filter(p => p.id !== action.payload),
        recentProjects: state.recentProjects.filter(p => p.id !== action.payload),
        currentProject: state.currentProject?.id === action.payload
          ? null
          : state.currentProject
      }
    case 'CLEAR_PROJECTS':
      return {
        ...state,
        currentProject: null,
        userProjects: [],
        recentProjects: []
      }
    default:
      return state
  }
}

// 컨텍스트 타입 정의
interface ProjectContextType {
  state: ProjectState
  selectProject: (project: Project) => void
  loadUserProjects: () => Promise<void>
  loadRecentProjects: () => Promise<void>
  createProject: (projectData: ProjectInsert) => Promise<Project>
  updateProject: (projectId: string, updates: ProjectUpdate) => Promise<Project>
  deleteProject: (projectId: string) => Promise<void>
  getCurrentProject: () => Project | null
  clearProjects: () => void
}

// 컨텍스트 생성
const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

// 프로바이더 컴포넌트
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState)
  const { user } = useAuth()

  // 사용자 프로젝트 로딩
  const loadUserProjects = async () => {
    if (!user) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const projects = await ProjectService.getUserProjects(user.id)
      dispatch({ type: 'SET_USER_PROJECTS', payload: projects })

      // 현재 프로젝트가 설정되지 않았고 프로젝트가 있다면 첫 번째 프로젝트를 선택
      if (!state.currentProject && projects.length > 0) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: projects[0] })
      }
    } catch (error) {
      console.error('Failed to load user projects:', error)
      dispatch({ type: 'SET_ERROR', payload: '프로젝트를 불러오는데 실패했습니다.' })
    }
  }

  // 최근 프로젝트 로딩
  const loadRecentProjects = async () => {
    if (!user) return

    try {
      const recentProjects = await ProjectService.getRecentProjects(user.id, 5)
      dispatch({ type: 'SET_RECENT_PROJECTS', payload: recentProjects })
    } catch (error) {
      console.error('Failed to load recent projects:', error)
    }
  }

  // 프로젝트 생성
  const createProject = async (
    projectData: ProjectInsert
  ): Promise<Project> => {
    if (!user) throw new Error('사용자가 인증되지 않았습니다.')

    try {
      const newProject = await ProjectService.createProject({
        ...projectData,
        owner_id: user.id
      })

      dispatch({ type: 'ADD_PROJECT', payload: newProject })
      return newProject
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  }

  // 프로젝트 업데이트
  const updateProject = async (
    projectId: string,
    updates: ProjectUpdate
  ): Promise<Project> => {
    try {
      const updatedProject = await ProjectService.updateProject(projectId, updates)
      dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject })
      return updatedProject
    } catch (error) {
      console.error('Failed to update project:', error)
      throw error
    }
  }

  // 프로젝트 삭제
  const deleteProject = async (projectId: string): Promise<void> => {
    try {
      await ProjectService.deleteProject(projectId)
      dispatch({ type: 'REMOVE_PROJECT', payload: projectId })
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw error
    }
  }

  // 프로젝트 선택
  const selectProject = (project: Project) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project })

    // 로컬 스토리지에 현재 프로젝트 저장
    try {
      localStorage.setItem('currentProject', JSON.stringify(project))
    } catch (error) {
      console.error('Failed to save current project to localStorage:', error)
    }
  }

  // 현재 프로젝트 가져오기
  const getCurrentProject = (): Project | null => {
    return state.currentProject
  }

  // 프로젝트 정리
  const clearProjects = () => {
    dispatch({ type: 'CLEAR_PROJECTS' })
    try {
      localStorage.removeItem('currentProject')
    } catch (error) {
      console.error('Failed to clear current project from localStorage:', error)
    }
  }

  // 컴포넌트 마운트 시 사용자 프로젝트 로딩
  useEffect(() => {
    if (user) {
      loadUserProjects()
      loadRecentProjects()

      // 로컬 스토리지에서 현재 프로젝트 복원
      try {
        const savedProject = localStorage.getItem('currentProject')
        if (savedProject) {
          const project = JSON.parse(savedProject)
          dispatch({ type: 'SET_CURRENT_PROJECT', payload: project })
        }
      } catch (error) {
        console.error('Failed to restore current project from localStorage:', error)
      }
    } else {
      clearProjects()
    }
  }, [user])

  // 컨텍스트 값
  const contextValue: ProjectContextType = {
    state,
    selectProject,
    loadUserProjects,
    loadRecentProjects,
    createProject,
    updateProject,
    deleteProject,
    getCurrentProject,
    clearProjects
  }

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  )
}

// 커스텀 훅
export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}

// 현재 프로젝트만 가져오는 훅
export function useCurrentProject() {
  const { state, getCurrentProject } = useProject()
  return {
    currentProject: getCurrentProject(),
    loading: state.loading,
    error: state.error
  }
}

// 사용자 프로젝트 목록만 가져오는 훅
export function useUserProjects() {
  const { state } = useProject()
  return {
    projects: state.userProjects,
    recentProjects: state.recentProjects,
    loading: state.loading,
    error: state.error
  }
}