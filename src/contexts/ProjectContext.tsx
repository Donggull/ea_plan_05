import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ProjectService } from '../services/projectService';
import { useAuth } from './AuthContext';

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  owner_id: string;
  created_at: string | null;
  updated_at: string | null;
  [key: string]: any;
}

interface ProjectInsert {
  name: string;
  description?: string;
  status?: string;
  owner_id: string;
}

interface ProjectUpdate {
  name?: string;
  description?: string;
  status?: string;
  updated_at?: string;
}

interface ProjectState {
  currentProject: Project | null;
  userProjects: Project[];
  recentProjects: Project[];
  loading: boolean;
  error: string | null;
}

type ProjectAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null }
  | { type: 'SET_USER_PROJECTS'; payload: Project[] }
  | { type: 'SET_RECENT_PROJECTS'; payload: Project[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'REMOVE_PROJECT'; payload: string }
  | { type: 'CLEAR_PROJECTS' };

const initialState: ProjectState = {
  currentProject: null,
  userProjects: [],
  recentProjects: [],
  loading: false,
  error: null
};

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload };
    case 'SET_USER_PROJECTS':
      return { ...state, userProjects: action.payload, loading: false };
    case 'SET_RECENT_PROJECTS':
      return { ...state, recentProjects: action.payload };
    case 'ADD_PROJECT':
      return {
        ...state,
        userProjects: [action.payload, ...state.userProjects],
        recentProjects: [action.payload, ...state.recentProjects.slice(0, 4)]
      };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        userProjects: state.userProjects.map(project =>
          project.id === action.payload.id ? action.payload : project
        ),
        recentProjects: state.recentProjects.map(project =>
          project.id === action.payload.id ? action.payload : project
        ),
        currentProject: state.currentProject?.id === action.payload.id ? action.payload : state.currentProject
      };
    case 'REMOVE_PROJECT':
      return {
        ...state,
        userProjects: state.userProjects.filter(project => project.id !== action.payload),
        recentProjects: state.recentProjects.filter(project => project.id !== action.payload),
        currentProject: state.currentProject?.id === action.payload ? null : state.currentProject
      };
    case 'CLEAR_PROJECTS':
      return {
        ...state,
        currentProject: null,
        userProjects: [],
        recentProjects: [],
        loading: false,
        error: null
      };
    default:
      return state;
  }
}

interface ProjectContextType {
  state: ProjectState;
  selectProject: (project: Project) => void;
  loadUserProjects: (options?: { silent?: boolean }) => Promise<void>;
  loadRecentProjects: () => Promise<void>;
  createProject: (projectData: ProjectInsert) => Promise<Project>;
  updateProject: (projectId: string, updates: ProjectUpdate) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  getCurrentProject: () => Project | null;
  clearProjects: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const lastLoadedUserIdRef = useRef<string | null>(null);
  const hasLoadedProjectsRef = useRef(false);

  const loadUserProjects = async (options?: { silent?: boolean }) => {
    if (!user) return;

    const shouldShowLoading = !(options?.silent && hasLoadedProjectsRef.current);

    try {
      if (shouldShowLoading) {
        dispatch({ type: 'SET_LOADING', payload: true });
      }
      dispatch({ type: 'SET_ERROR', payload: null });

      const projects = await ProjectService.getUserProjects(user.id);
      dispatch({ type: 'SET_USER_PROJECTS', payload: projects });

      if (!state.currentProject && projects.length > 0) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: projects[0] });
      }

      hasLoadedProjectsRef.current = true;
    } catch (error) {
      console.error('Failed to load user projects:', error);
      dispatch({ type: 'SET_ERROR', payload: '프로젝트를 불러오는데 실패했습니다.' });
    }
  };

  const loadRecentProjects = async () => {
    if (!user) return;

    try {
      const recentProjects = await ProjectService.getRecentProjects(user.id, 5);
      dispatch({ type: 'SET_RECENT_PROJECTS', payload: recentProjects });
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    }
  };

  const createProject = async (projectData: ProjectInsert): Promise<Project> => {
    if (!user) throw new Error('사용자가 인증되지 않았습니다.');

    try {
      const newProject = await ProjectService.createProject({
        ...projectData,
        owner_id: user.id
      });

      dispatch({ type: 'ADD_PROJECT', payload: newProject });
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const updateProject = async (projectId: string, updates: ProjectUpdate): Promise<Project> => {
    try {
      const updatedProject = await ProjectService.updateProject(projectId, updates);
      dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
      return updatedProject;
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    try {
      await ProjectService.deleteProject(projectId);
      dispatch({ type: 'REMOVE_PROJECT', payload: projectId });
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  };

  const selectProject = (project: Project) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });

    try {
      localStorage.setItem('currentProject', JSON.stringify(project));
    } catch (error) {
      console.error('Failed to save current project to localStorage:', error);
    }
  };

  const getCurrentProject = (): Project | null => {
    return state.currentProject;
  };

  const clearProjects = () => {
    hasLoadedProjectsRef.current = false;
    lastLoadedUserIdRef.current = null;
    dispatch({ type: 'CLEAR_PROJECTS' });

    try {
      localStorage.removeItem('currentProject');
    } catch (error) {
      console.error('Failed to clear current project from localStorage:', error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      clearProjects();
      return;
    }

    const isSameUser = lastLoadedUserIdRef.current === user.id;
    const shouldUseSilentMode = isSameUser && hasLoadedProjectsRef.current;

    const restoreCurrentProject = () => {
      try {
        const savedProject = localStorage.getItem('currentProject');
        if (savedProject) {
          const parsedProject: Project = JSON.parse(savedProject);
          dispatch({ type: 'SET_CURRENT_PROJECT', payload: parsedProject });
        }
      } catch (error) {
        console.error('Failed to restore current project from localStorage:', error);
      }
    };

    const syncData = async () => {
      try {
        await loadUserProjects({ silent: shouldUseSilentMode });
        await loadRecentProjects();
        lastLoadedUserIdRef.current = user.id;
      } catch (error) {
        console.error('Failed to load project data:', error);
      }
    };

    if (!shouldUseSilentMode) {
      restoreCurrentProject();
    }

    syncData();
  }, [isAuthenticated, user?.id]);

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
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

export function useCurrentProject() {
  const { state, getCurrentProject } = useProject();
  return {
    currentProject: getCurrentProject(),
    loading: state.loading,
    error: state.error
  };
}

export function useUserProjects() {
  const { state } = useProject();
  return {
    projects: state.userProjects,
    recentProjects: state.recentProjects,
    loading: state.loading,
    error: state.error
  };
};