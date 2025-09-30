import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MCPManager } from '@/services/preAnalysis/MCPManager';
import { mcpIntegrationService } from '@/services/preAnalysis/MCPIntegrationService';

/**
 * MCP 서버 타입 정의
 */
export interface MCPServer {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'warning';
  responseTime?: number;
  lastCheck?: Date;
  error?: string;
  capabilities?: string[];
  config?: Record<string, any>;
}

/**
 * MCP 서버 설정 타입
 */
export interface MCPConfiguration {
  servers: Record<string, MCPServer>;
  enabledServers: string[];
  serverConfigs: Record<string, any>;
  defaultTimeout: number;
  maxRetries: number;
  globalSettings: {
    enableLogging: boolean;
    enableMetrics: boolean;
    enableRealtime: boolean;
  };
}

/**
 * MCP Context 상태 타입
 */
interface MCPContextState {
  // 서버 상태
  servers: MCPServer[];
  serverStatus: Record<string, {
    connected: boolean;
    responseTime: number;
    lastCheck: Date;
    error?: string;
  }>;

  // 로딩 상태
  isLoading: boolean;
  isRefreshing: boolean;

  // 에러 상태
  error: string | null;

  // 통계
  connectedCount: number;
  totalCount: number;
  healthScore: number;

  // 마지막 업데이트
  lastUpdate: Date | null;
}

/**
 * MCP Context Actions 타입
 */
interface MCPContextActions {
  // 서버 제어
  toggleServer: (serverId: string, enabled: boolean) => Promise<void>;
  updateServerConfig: (serverId: string, config: any) => Promise<void>;
  testServerConnection: (serverId: string) => Promise<void>;

  // 상태 새로고침
  refreshStatus: () => Promise<void>;
  refreshServerHealth: () => Promise<void>;

  // 설정 동기화
  syncConfiguration: (config: MCPConfiguration) => Promise<void>;

  // 실시간 모니터링
  startMonitoring: () => void;
  stopMonitoring: () => void;

  // 유틸리티
  getServer: (serverId: string) => MCPServer | undefined;
  isServerEnabled: (serverId: string) => boolean;
  getEnabledServers: () => MCPServer[];
}

/**
 * MCP Context 전체 타입
 */
type MCPContextType = MCPContextState & MCPContextActions;

/**
 * MCP Context 생성
 */
const MCPContext = createContext<MCPContextType | undefined>(undefined);

/**
 * MCP Provider Props
 */
interface MCPProviderProps {
  children: ReactNode;
  autoRefreshInterval?: number; // 자동 새로고침 간격 (ms)
  enableRealtimeSync?: boolean;  // 실시간 동기화 활성화
}

/**
 * MCP Provider 컴포넌트
 */
export const MCPProvider: React.FC<MCPProviderProps> = ({
  children,
  autoRefreshInterval = 10000, // 기본 10초
  enableRealtimeSync = true
}) => {
  const mcpManager = MCPManager.getInstance();

  // 상태 관리
  const [state, setState] = useState<MCPContextState>({
    servers: [
      {
        id: 'filesystem',
        name: 'File System',
        description: '프로젝트 파일 구조 분석',
        icon: null,
        enabled: true,
        status: 'disconnected',
        capabilities: ['파일 구조 분석', '코드베이스 스캔', '의존성 분석']
      },
      {
        id: 'database',
        name: 'Database',
        description: '기존 프로젝트 데이터 조회',
        icon: null,
        enabled: true,
        status: 'disconnected',
        capabilities: ['과거 프로젝트 조회', '패턴 분석', '성공 사례 검색']
      },
      {
        id: 'websearch',
        name: 'Web Search',
        description: '시장 조사 및 트렌드 분석',
        icon: null,
        enabled: false,
        status: 'disconnected',
        capabilities: ['시장 조사', '경쟁사 분석', '기술 트렌드 조사']
      },
      {
        id: 'github',
        name: 'GitHub',
        description: '오픈소스 프로젝트 검색',
        icon: null,
        enabled: false,
        status: 'disconnected',
        capabilities: ['유사 프로젝트 검색', '오픈소스 라이브러리 분석', 'README 분석']
      }
    ],
    serverStatus: {},
    isLoading: true,
    isRefreshing: false,
    error: null,
    connectedCount: 0,
    totalCount: 4,
    healthScore: 0,
    lastUpdate: null
  });

  const [monitoringCleanup, setMonitoringCleanup] = useState<(() => void) | null>(null);

  /**
   * 서버 상태 새로고침
   */
  const refreshStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isRefreshing: true, error: null }));

      // MCPManager에서 헬스 체크
      const healthStatus = await mcpManager.checkServerHealth();
      const newServerStatus: Record<string, any> = {};

      // 각 서버별 상세 상태 확인
      for (const [serverId, healthy] of Object.entries(healthStatus)) {
        const connectionTest = await mcpManager.testServerConnection(serverId);
        newServerStatus[serverId] = {
          connected: healthy && connectionTest.success,
          responseTime: connectionTest.responseTime,
          lastCheck: new Date(),
          error: connectionTest.error
        };
      }

      // 서버 상태 업데이트
      setState(prev => {
        const updatedServers = prev.servers.map(server => ({
          ...server,
          status: newServerStatus[server.id]?.connected ? 'connected' as const :
                  newServerStatus[server.id]?.error ? 'error' as const : 'disconnected' as const,
          responseTime: newServerStatus[server.id]?.responseTime,
          lastCheck: newServerStatus[server.id]?.lastCheck,
          error: newServerStatus[server.id]?.error
        }));

        const connectedCount = updatedServers.filter(s => s.status === 'connected').length;
        const healthScore = (connectedCount / updatedServers.length) * 100;

        return {
          ...prev,
          servers: updatedServers,
          serverStatus: newServerStatus,
          connectedCount,
          healthScore,
          lastUpdate: new Date(),
          isRefreshing: false,
          isLoading: false
        };
      });

    } catch (error) {
      console.error('Failed to refresh MCP status:', error);
      setState(prev => ({
        ...prev,
        error: 'MCP 서버 상태를 확인하는 중 오류가 발생했습니다',
        isRefreshing: false,
        isLoading: false
      }));
    }
  }, [mcpManager]);

  /**
   * 서버 헬스만 빠르게 체크
   */
  const refreshServerHealth = useCallback(async () => {
    try {
      const healthStatus = await mcpManager.checkServerHealth();

      setState(prev => ({
        ...prev,
        servers: prev.servers.map(server => ({
          ...server,
          status: healthStatus[server.id] ? 'connected' as const : 'disconnected' as const,
          lastCheck: new Date()
        })),
        connectedCount: Object.values(healthStatus).filter(Boolean).length,
        lastUpdate: new Date()
      }));

    } catch (error) {
      console.error('Failed to refresh server health:', error);
    }
  }, [mcpManager]);

  /**
   * 서버 토글
   */
  const toggleServer = useCallback(async (serverId: string, enabled: boolean) => {
    try {
      // MCPManager 상태 업데이트
      mcpManager.setServerStatus(serverId, enabled);

      // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
      setState(prev => ({
        ...prev,
        servers: prev.servers.map(server =>
          server.id === serverId ? { ...server, enabled } : server
        )
      }));

      // 실제 연결 상태 확인
      if (enabled) {
        const connectionTest = await mcpManager.testServerConnection(serverId);
        setState(prev => ({
          ...prev,
          servers: prev.servers.map(server =>
            server.id === serverId
              ? {
                  ...server,
                  status: connectionTest.success ? 'connected' as const : 'error' as const,
                  error: connectionTest.error,
                  responseTime: connectionTest.responseTime,
                  lastCheck: new Date()
                }
              : server
          )
        }));
      } else {
        setState(prev => ({
          ...prev,
          servers: prev.servers.map(server =>
            server.id === serverId
              ? { ...server, status: 'disconnected' as const }
              : server
          )
        }));
      }

      // 전체 상태 새로고침
      await refreshServerHealth();

    } catch (error) {
      console.error(`Failed to toggle server ${serverId}:`, error);
      setState(prev => ({
        ...prev,
        error: `서버 ${serverId} 토글 중 오류가 발생했습니다`
      }));
    }
  }, [mcpManager, refreshServerHealth]);

  /**
   * 서버 설정 업데이트
   */
  const updateServerConfig = useCallback(async (serverId: string, config: any) => {
    try {
      setState(prev => ({
        ...prev,
        servers: prev.servers.map(server =>
          server.id === serverId
            ? { ...server, config: { ...server.config, ...config } }
            : server
        )
      }));

      console.log(`Server ${serverId} config updated:`, config);

    } catch (error) {
      console.error(`Failed to update server ${serverId} config:`, error);
    }
  }, []);

  /**
   * 서버 연결 테스트
   */
  const testServerConnection = useCallback(async (serverId: string) => {
    try {
      setState(prev => ({
        ...prev,
        servers: prev.servers.map(server =>
          server.id === serverId
            ? { ...server, status: 'warning' as const }
            : server
        )
      }));

      const result = await mcpManager.testServerConnection(serverId);

      setState(prev => ({
        ...prev,
        servers: prev.servers.map(server =>
          server.id === serverId
            ? {
                ...server,
                status: result.success ? 'connected' as const : 'error' as const,
                responseTime: result.responseTime,
                error: result.error,
                lastCheck: new Date()
              }
            : server
        )
      }));

    } catch (error) {
      console.error(`Failed to test server ${serverId}:`, error);
    }
  }, [mcpManager]);

  /**
   * 설정 동기화
   */
  const syncConfiguration = useCallback(async (config: MCPConfiguration) => {
    try {
      await mcpIntegrationService.syncServerConfiguration({
        enabledServers: config.enabledServers,
        serverConfigs: config.serverConfigs
      });

      // 상태 업데이트
      setState(prev => ({
        ...prev,
        servers: prev.servers.map(server => ({
          ...server,
          enabled: config.enabledServers.includes(server.id),
          config: config.serverConfigs[server.id] || server.config
        }))
      }));

      // 헬스 체크
      await refreshServerHealth();

    } catch (error) {
      console.error('Failed to sync MCP configuration:', error);
    }
  }, [refreshServerHealth]);

  /**
   * 실시간 모니터링 시작
   */
  const startMonitoring = useCallback(() => {
    if (monitoringCleanup) {
      console.warn('Monitoring already started');
      return;
    }

    console.log('🚀 Starting MCP real-time monitoring');

    // MCPIntegrationService의 실시간 모니터링 시작
    mcpIntegrationService.startStatusMonitoring((status) => {
      setState(prev => ({
        ...prev,
        serverStatus: status,
        lastUpdate: new Date()
      }));
    }).then((cleanup) => {
      setMonitoringCleanup(() => cleanup);
    });

  }, [monitoringCleanup]);

  /**
   * 실시간 모니터링 중지
   */
  const stopMonitoring = useCallback(() => {
    if (monitoringCleanup) {
      console.log('🛑 Stopping MCP real-time monitoring');
      monitoringCleanup();
      setMonitoringCleanup(null);
    }
  }, [monitoringCleanup]);

  /**
   * 서버 조회
   */
  const getServer = useCallback((serverId: string) => {
    return state.servers.find(s => s.id === serverId);
  }, [state.servers]);

  /**
   * 서버 활성화 상태 확인
   */
  const isServerEnabled = useCallback((serverId: string) => {
    return state.servers.find(s => s.id === serverId)?.enabled || false;
  }, [state.servers]);

  /**
   * 활성화된 서버 목록
   */
  const getEnabledServers = useCallback(() => {
    return state.servers.filter(s => s.enabled);
  }, [state.servers]);

  /**
   * 초기화 및 자동 새로고침 설정
   */
  useEffect(() => {
    // 초기 상태 로드
    refreshStatus();

    // 실시간 동기화 활성화
    if (enableRealtimeSync) {
      startMonitoring();
    }

    // 자동 새로고침 설정
    const interval = setInterval(() => {
      refreshServerHealth();
    }, autoRefreshInterval);

    return () => {
      clearInterval(interval);
      stopMonitoring();
    };
  }, [autoRefreshInterval, enableRealtimeSync, refreshStatus, refreshServerHealth, startMonitoring, stopMonitoring]);

  /**
   * Context 값 구성
   */
  const value: MCPContextType = {
    // 상태
    ...state,

    // Actions
    toggleServer,
    updateServerConfig,
    testServerConnection,
    refreshStatus,
    refreshServerHealth,
    syncConfiguration,
    startMonitoring,
    stopMonitoring,
    getServer,
    isServerEnabled,
    getEnabledServers
  };

  return (
    <MCPContext.Provider value={value}>
      {children}
    </MCPContext.Provider>
  );
};

/**
 * MCP Context Hook
 */
export const useMCP = (): MCPContextType => {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error('useMCP must be used within a MCPProvider');
  }
  return context;
};

/**
 * 편의성 Hooks
 */
export const useMCPServer = (serverId: string) => {
  const { getServer, toggleServer, testServerConnection } = useMCP();
  const server = getServer(serverId);

  return {
    server,
    toggle: (enabled: boolean) => toggleServer(serverId, enabled),
    test: () => testServerConnection(serverId)
  };
};

export const useMCPStatus = () => {
  const {
    servers,
    serverStatus,
    connectedCount,
    totalCount,
    healthScore,
    isLoading,
    isRefreshing,
    lastUpdate
  } = useMCP();

  return {
    servers,
    serverStatus,
    connectedCount,
    totalCount,
    healthScore,
    isLoading,
    isRefreshing,
    lastUpdate
  };
};