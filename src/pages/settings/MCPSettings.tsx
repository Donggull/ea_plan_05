import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Github,
  FolderOpen,
  Wifi,
  WifiOff,
  Info,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings as SettingsIcon,
  BarChart3,
  Clock,
  DollarSign,
  Zap
} from 'lucide-react';
import { MCPManager } from '../../services/preAnalysis/MCPManager';

interface MCPServerConfig {
  id: keyof typeof MCPServerInfo;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  capabilities: string[];
  requiredFor: string[];
  costImpact: 'none' | 'low' | 'medium' | 'high';
  timeImpact: 'none' | 'low' | 'medium' | 'high';
  lastHealthCheck?: Date;
  responseTime?: number;
}

const MCPServerInfo = {
  filesystem: {
    name: '파일시스템',
    description: '프로젝트 파일 구조 및 코드 분석',
    icon: FolderOpen,
    capabilities: ['파일 구조 분석', '코드 복잡도 측정', '기술 스택 탐지'],
    requiredFor: ['기술적 분석', '아키텍처 리뷰'],
    costImpact: 'low' as const,
    timeImpact: 'low' as const,
    connectionString: 'filesystem://local',
  },
  database: {
    name: '데이터베이스',
    description: '과거 프로젝트 데이터 및 베스트 프랙티스 조회',
    icon: Database,
    capabilities: ['과거 프로젝트 참조', '성공률 분석', '위험도 평가'],
    requiredFor: ['리스크 분석', '예산 추정', '일정 계획'],
    costImpact: 'none' as const,
    timeImpact: 'low' as const,
    connectionString: process.env.VITE_SUPABASE_URL,
  },
  websearch: {
    name: '웹 검색',
    description: '시장 조사 및 최신 트렌드 분석',
    icon: Search,
    capabilities: ['시장 조사', '경쟁사 분석', '기술 트렌드'],
    requiredFor: ['시장 분석', '경쟁력 평가'],
    costImpact: 'medium' as const,
    timeImpact: 'medium' as const,
    connectionString: process.env.VITE_BRAVE_API_KEY ? 'brave://search' : undefined,
  },
  github: {
    name: 'GitHub',
    description: '오픈소스 프로젝트 및 코드 패턴 분석',
    icon: Github,
    capabilities: ['유사 프로젝트 검색', '코드 패턴 분석', '라이브러리 추천'],
    requiredFor: ['기술적 참조', '아키텍처 벤치마킹'],
    costImpact: 'low' as const,
    timeImpact: 'medium' as const,
    connectionString: process.env.VITE_GITHUB_TOKEN ? 'github://api' : undefined,
  }
} as const;

export const MCPSettings: React.FC = () => {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const mcpManager = MCPManager.getInstance();

  // 서버 상태 초기화
  useEffect(() => {
    const initializeServers = () => {
      const initialServers: MCPServerConfig[] = Object.entries(MCPServerInfo).map(([id, info]) => ({
        id: id as keyof typeof MCPServerInfo,
        name: info.name,
        description: info.description,
        icon: info.icon,
        enabled: id === 'filesystem' || id === 'database', // 기본적으로 filesystem과 database만 활성화
        status: 'disconnected' as const,
        capabilities: info.capabilities,
        requiredFor: info.requiredFor,
        costImpact: info.costImpact,
        timeImpact: info.timeImpact,
        lastHealthCheck: undefined,
        responseTime: undefined,
      }));

      setServers(initialServers);

      // MCPManager에 초기 상태 설정
      initialServers.forEach(server => {
        mcpManager.setServerStatus(server.id, server.enabled);
      });
    };

    initializeServers();
  }, [mcpManager]);

  // 서버 헬스체크
  const checkServerHealth = async () => {
    setIsCheckingHealth(true);
    const startTime = Date.now();

    try {
      const healthStatus = await mcpManager.checkServerHealth();
      const endTime = Date.now();

      setServers(prev => prev.map(server => ({
        ...server,
        status: healthStatus[server.id] ? 'connected' : 'disconnected',
        lastHealthCheck: new Date(),
        responseTime: endTime - startTime,
      })));

      setLastHealthCheck(new Date());
    } catch (error) {
      console.error('MCP 서버 상태 확인 실패:', error);
      setServers(prev => prev.map(server => ({
        ...server,
        status: 'error',
        lastHealthCheck: new Date(),
      })));
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // 서버 토글
  const toggleServer = (serverId: keyof typeof MCPServerInfo) => {
    setServers(prev => prev.map(server => {
      if (server.id === serverId) {
        const newEnabled = !server.enabled;
        mcpManager.setServerStatus(serverId, newEnabled);
        return { ...server, enabled: newEnabled };
      }
      return server;
    }));
  };

  // 영향도 색상
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'none': return 'text-gray-400';
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getImpactText = (impact: string) => {
    switch (impact) {
      case 'none': return '없음';
      case 'low': return '낮음';
      case 'medium': return '보통';
      case 'high': return '높음';
      default: return '알 수 없음';
    }
  };

  const getStatusIcon = (status: MCPServerConfig['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-accent-green" />;
      case 'disconnected':
        return <WifiOff className="w-5 h-5 text-text-muted" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-accent-red" />;
      default:
        return <WifiOff className="w-5 h-5 text-text-muted" />;
    }
  };

  const enabledCount = servers.filter(s => s.enabled).length;
  const connectedCount = servers.filter(s => s.status === 'connected').length;

  // 초기 헬스체크
  useEffect(() => {
    checkServerHealth();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">MCP 서버 설정</h1>
          <p className="text-text-secondary mt-1">
            Model Context Protocol 서버를 관리하고 사전 분석 기능을 설정합니다
          </p>
        </div>
        <button
          onClick={checkServerHealth}
          disabled={isCheckingHealth}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          상태 확인
        </button>
      </div>

      {/* 상태 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-primary-500" />
            <div>
              <div className="text-text-secondary text-sm">활성화된 서버</div>
              <div className="text-white text-xl font-semibold">{enabledCount}/{servers.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-accent-green" />
            <div>
              <div className="text-text-secondary text-sm">연결된 서버</div>
              <div className="text-white text-xl font-semibold">{connectedCount}/{servers.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-accent-blue" />
            <div>
              <div className="text-text-secondary text-sm">마지막 확인</div>
              <div className="text-white text-sm">
                {lastHealthCheck ? lastHealthCheck.toLocaleTimeString() : '미확인'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-accent-orange" />
            <div>
              <div className="text-text-secondary text-sm">평균 응답시간</div>
              <div className="text-white text-sm">
                {servers.some(s => s.responseTime)
                  ? `${Math.round(servers.reduce((sum, s) => sum + (s.responseTime || 0), 0) / servers.filter(s => s.responseTime).length)}ms`
                  : '측정 전'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MCP 서버 목록 */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-white">MCP 서버 목록</h2>

        <div className="grid gap-4">
          {servers.map((server) => {
            const Icon = server.icon;
            const serverInfo = MCPServerInfo[server.id];

            return (
              <div
                key={server.id}
                className={`
                  bg-bg-secondary border-2 rounded-lg p-6 transition-all
                  ${server.enabled
                    ? 'border-primary-500/50 bg-primary-900/10'
                    : 'border-border-primary hover:border-border-secondary'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`
                      p-3 rounded-lg
                      ${server.enabled
                        ? 'bg-primary-600 text-white'
                        : 'bg-bg-tertiary text-text-secondary'
                      }
                    `}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-lg font-medium ${
                          server.enabled ? 'text-white' : 'text-text-secondary'
                        }`}>
                          {server.name}
                        </h3>
                        {getStatusIcon(server.status)}
                        {serverInfo.connectionString ? (
                          <CheckCircle className="w-4 h-4 text-accent-green" title="설정 완료" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-accent-orange" title="설정 필요" />
                        )}
                      </div>

                      <p className={`text-sm mb-3 ${
                        server.enabled ? 'text-text-primary' : 'text-text-muted'
                      }`}>
                        {server.description}
                      </p>

                      {/* 주요 기능 태그 */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {server.capabilities.slice(0, 3).map((capability) => (
                          <span
                            key={capability}
                            className={`px-2 py-1 rounded text-xs ${
                              server.enabled
                                ? 'bg-primary-900/30 text-primary-300'
                                : 'bg-bg-tertiary text-text-muted'
                            }`}
                          >
                            {capability}
                          </span>
                        ))}
                      </div>

                      {/* 영향도 정보 */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">비용 영향:</span>
                          <span className={`font-medium ${getImpactColor(server.costImpact)}`}>
                            {getImpactText(server.costImpact)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">시간 영향:</span>
                          <span className={`font-medium ${getImpactColor(server.timeImpact)}`}>
                            {getImpactText(server.timeImpact)}
                          </span>
                        </div>
                      </div>

                      {/* 상세 정보 토글 */}
                      {showDetails === server.id && (
                        <div className="mt-4 p-4 bg-bg-tertiary rounded-lg space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-white mb-2">필요한 경우</h4>
                            <ul className="list-disc list-inside text-sm text-text-primary space-y-1">
                              {server.requiredFor.map((req) => (
                                <li key={req}>{req}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-white mb-2">연결 정보</h4>
                            <div className="text-sm text-text-secondary">
                              {serverInfo.connectionString ? (
                                <span className="text-accent-green">✓ 연결 설정 완료</span>
                              ) : (
                                <span className="text-accent-orange">⚠ 환경 변수 설정 필요</span>
                              )}
                            </div>
                          </div>

                          {server.lastHealthCheck && (
                            <div>
                              <h4 className="text-sm font-medium text-white mb-2">상태 정보</h4>
                              <div className="text-sm text-text-secondary space-y-1">
                                <div>마지막 확인: {server.lastHealthCheck.toLocaleString()}</div>
                                {server.responseTime && (
                                  <div>응답 시간: {server.responseTime}ms</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowDetails(showDetails === server.id ? null : server.id)}
                      className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                      title="상세 정보"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {/* 토글 스위치 */}
                    <button
                      onClick={() => toggleServer(server.id)}
                      className={`
                        relative w-12 h-6 rounded-full transition-colors
                        ${server.enabled ? 'bg-primary-600' : 'bg-bg-tertiary'}
                      `}
                      title={`${server.enabled ? '비활성화' : '활성화'}`}
                    >
                      <div className={`
                        absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform
                        ${server.enabled ? 'translate-x-6' : 'translate-x-0.5'}
                      `} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 권장 설정 */}
      <div className="bg-primary-900/10 border border-primary-500/20 rounded-lg p-6">
        <h3 className="text-lg font-medium text-primary-300 mb-3">💡 권장 설정</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-white mb-2">표준 분석</h4>
            <p className="text-text-secondary">파일시스템 + 데이터베이스</p>
            <p className="text-text-muted text-xs">기본적인 프로젝트 분석에 적합</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">시장 분석 포함</h4>
            <p className="text-text-secondary">파일시스템 + 데이터베이스 + 웹 검색</p>
            <p className="text-text-muted text-xs">경쟁사 및 시장 트렌드 분석 추가</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">기술 벤치마킹</h4>
            <p className="text-text-secondary">파일시스템 + GitHub</p>
            <p className="text-text-muted text-xs">오픈소스 프로젝트 참조 및 코드 패턴 분석</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">종합 분석</h4>
            <p className="text-text-secondary">모든 서버 활성화</p>
            <p className="text-text-muted text-xs">최대한 상세한 분석 (비용 및 시간 증가)</p>
          </div>
        </div>
      </div>

      {/* 예상 영향 요약 */}
      {enabledCount > 0 && (
        <div className="bg-bg-secondary border border-border-primary rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">예상 영향</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-accent-green" />
                <span className="text-text-secondary">추가 비용</span>
              </div>
              <div className={`text-lg font-medium ${getImpactColor(
                servers.filter(s => s.enabled).some(s => s.costImpact === 'high') ? 'high' :
                servers.filter(s => s.enabled).some(s => s.costImpact === 'medium') ? 'medium' :
                servers.filter(s => s.enabled).some(s => s.costImpact === 'low') ? 'low' : 'none'
              )}`}>
                {getImpactText(
                  servers.filter(s => s.enabled).some(s => s.costImpact === 'high') ? 'high' :
                  servers.filter(s => s.enabled).some(s => s.costImpact === 'medium') ? 'medium' :
                  servers.filter(s => s.enabled).some(s => s.costImpact === 'low') ? 'low' : 'none'
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-accent-blue" />
                <span className="text-text-secondary">추가 시간</span>
              </div>
              <div className={`text-lg font-medium ${getImpactColor(
                servers.filter(s => s.enabled).some(s => s.timeImpact === 'high') ? 'high' :
                servers.filter(s => s.enabled).some(s => s.timeImpact === 'medium') ? 'medium' :
                servers.filter(s => s.enabled).some(s => s.timeImpact === 'low') ? 'low' : 'none'
              )}`}>
                {getImpactText(
                  servers.filter(s => s.enabled).some(s => s.timeImpact === 'high') ? 'high' :
                  servers.filter(s => s.enabled).some(s => s.timeImpact === 'medium') ? 'medium' :
                  servers.filter(s => s.enabled).some(s => s.timeImpact === 'low') ? 'low' : 'none'
                )}
              </div>
            </div>
          </div>

          {enabledCount > 2 && (
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-sm text-yellow-300">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              많은 MCP 서버를 활성화하면 분석 시간과 비용이 증가할 수 있습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
};