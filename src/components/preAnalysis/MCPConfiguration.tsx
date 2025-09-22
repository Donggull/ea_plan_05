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
} from 'lucide-react';
import { AnalysisSettings } from '../../types/preAnalysis';
import { mcpManager } from '../../services/preAnalysis/MCPManager';

interface MCPConfigurationProps {
  settings: AnalysisSettings;
  onSettingsChange: (settings: AnalysisSettings) => void;
}

interface MCPServerInfo {
  id: keyof AnalysisSettings['mcpServers'];
  name: string;
  description: string;
  icon: React.ElementType;
  capabilities: string[];
  requiredFor: string[];
  costImpact: 'none' | 'low' | 'medium' | 'high';
  timeImpact: 'none' | 'low' | 'medium' | 'high';
}

export const MCPConfiguration: React.FC<MCPConfigurationProps> = ({
  settings,
  onSettingsChange,
}) => {
  const [serverHealth, setServerHealth] = useState<Record<string, boolean>>({});
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const mcpServers: MCPServerInfo[] = [
    {
      id: 'filesystem',
      name: '파일시스템',
      description: '프로젝트 파일 구조 및 코드 분석',
      icon: FolderOpen,
      capabilities: ['파일 구조 분석', '코드 복잡도 측정', '기술 스택 탐지'],
      requiredFor: ['기술적 분석', '아키텍처 리뷰'],
      costImpact: 'low',
      timeImpact: 'low',
    },
    {
      id: 'database',
      name: '데이터베이스',
      description: '과거 프로젝트 데이터 및 베스트 프랙티스 조회',
      icon: Database,
      capabilities: ['과거 프로젝트 참조', '성공률 분석', '위험도 평가'],
      requiredFor: ['리스크 분석', '예산 추정', '일정 계획'],
      costImpact: 'none',
      timeImpact: 'low',
    },
    {
      id: 'websearch',
      name: '웹 검색',
      description: '시장 조사 및 최신 트렌드 분석',
      icon: Search,
      capabilities: ['시장 조사', '경쟁사 분석', '기술 트렌드'],
      requiredFor: ['시장 분석', '경쟁력 평가'],
      costImpact: 'medium',
      timeImpact: 'medium',
    },
    {
      id: 'github',
      name: 'GitHub',
      description: '오픈소스 프로젝트 및 코드 패턴 분석',
      icon: Github,
      capabilities: ['유사 프로젝트 검색', '코드 패턴 분석', '라이브러리 추천'],
      requiredFor: ['기술적 참조', '아키텍처 벤치마킹'],
      costImpact: 'low',
      timeImpact: 'medium',
    },
  ];

  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const health = await mcpManager.checkServerHealth();
      setServerHealth(health);
    } catch (error) {
      console.error('서버 상태 확인 오류:', error);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleToggleServer = (serverId: keyof AnalysisSettings['mcpServers']) => {
    const newMcpServers = {
      ...settings.mcpServers,
      [serverId]: !settings.mcpServers[serverId],
    };

    // MCP Manager에도 상태 반영
    mcpManager.setServerStatus(serverId, newMcpServers[serverId]);

    onSettingsChange({
      ...settings,
      mcpServers: newMcpServers,
    });
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'none':
        return 'text-gray-400';
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getImpactText = (impact: string) => {
    switch (impact) {
      case 'none':
        return '없음';
      case 'low':
        return '낮음';
      case 'medium':
        return '보통';
      case 'high':
        return '높음';
      default:
        return '알 수 없음';
    }
  };

  const getEnabledServersCount = () => {
    return Object.values(settings.mcpServers).filter(Boolean).length;
  };

  const getEstimatedImpact = () => {
    const enabledServers = mcpServers.filter(server =>
      settings.mcpServers[server.id]
    );

    const costImpacts = enabledServers.map(s => s.costImpact);
    const timeImpacts = enabledServers.map(s => s.timeImpact);

    const maxCostImpact = costImpacts.includes('high') ? 'high' :
      costImpacts.includes('medium') ? 'medium' :
      costImpacts.includes('low') ? 'low' : 'none';

    const maxTimeImpact = timeImpacts.includes('high') ? 'high' :
      timeImpacts.includes('medium') ? 'medium' :
      timeImpacts.includes('low') ? 'low' : 'none';

    return { cost: maxCostImpact, time: maxTimeImpact };
  };

  const impact = getEstimatedImpact();

  return (
    <div className="space-y-6">
      {/* 헤더 및 상태 */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-300">
            MCP 서버 설정
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {getEnabledServersCount()}개 서버 활성화됨
          </p>
        </div>
        <button
          onClick={checkServerHealth}
          disabled={isCheckingHealth}
          className="flex items-center gap-2 px-3 py-1 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded transition-colors"
        >
          {isCheckingHealth ? (
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Wifi className="w-3 h-3" />
          )}
          상태 확인
        </button>
      </div>

      {/* MCP 서버 목록 */}
      <div className="space-y-4">
        {mcpServers.map((server) => {
          const Icon = server.icon;
          const isEnabled = settings.mcpServers[server.id];
          const isHealthy = serverHealth[server.id];

          return (
            <div
              key={server.id}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${isEnabled
                  ? 'border-blue-500 bg-blue-900/10'
                  : 'border-gray-700 bg-gray-800/50'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`
                    p-2 rounded-lg
                    ${isEnabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className={`font-medium ${
                        isEnabled ? 'text-white' : 'text-gray-400'
                      }`}>
                        {server.name}
                      </h5>

                      {/* 서버 상태 표시 */}
                      {isEnabled && (
                        <div className="flex items-center gap-1">
                          {isHealthy ? (
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-400" />
                          )}
                        </div>
                      )}

                      {/* 정보 툴팁 */}
                      <div
                        className="relative"
                        onMouseEnter={() => setShowTooltip(server.id)}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <Info className="w-3 h-3 text-gray-500 cursor-help" />
                        {showTooltip === server.id && (
                          <div className="absolute left-0 top-5 w-72 p-3 bg-gray-900 border border-gray-600 rounded-lg text-sm z-10">
                            <div className="space-y-2">
                              <p className="text-gray-300">{server.description}</p>

                              <div>
                                <span className="text-gray-400">주요 기능:</span>
                                <ul className="list-disc list-inside text-gray-300 text-xs mt-1">
                                  {server.capabilities.map((cap, idx) => (
                                    <li key={idx}>{cap}</li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <span className="text-gray-400">필요한 경우:</span>
                                <ul className="list-disc list-inside text-gray-300 text-xs mt-1">
                                  {server.requiredFor.map((req, idx) => (
                                    <li key={idx}>{req}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="flex justify-between text-xs">
                                <span>
                                  비용 영향:
                                  <span className={`ml-1 ${getImpactColor(server.costImpact)}`}>
                                    {getImpactText(server.costImpact)}
                                  </span>
                                </span>
                                <span>
                                  시간 영향:
                                  <span className={`ml-1 ${getImpactColor(server.timeImpact)}`}>
                                    {getImpactText(server.timeImpact)}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className={`text-sm ${
                      isEnabled ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {server.description}
                    </p>

                    {/* 기능 태그 */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {server.capabilities.slice(0, 3).map((capability) => (
                        <span
                          key={capability}
                          className={`px-2 py-0.5 rounded text-xs ${
                            isEnabled
                              ? 'bg-blue-900/30 text-blue-300'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 토글 스위치 */}
                <button
                  onClick={() => handleToggleServer(server.id)}
                  className={`
                    relative w-11 h-6 rounded-full transition-colors
                    ${isEnabled ? 'bg-blue-600' : 'bg-gray-600'}
                  `}
                >
                  <div className={`
                    absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform
                    ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}
                  `} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 예상 영향 요약 */}
      {getEnabledServersCount() > 0 && (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h5 className="font-medium text-white mb-3">예상 영향</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">추가 비용:</span>
              <span className={`ml-2 font-medium ${getImpactColor(impact.cost)}`}>
                {getImpactText(impact.cost)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">추가 시간:</span>
              <span className={`ml-2 font-medium ${getImpactColor(impact.time)}`}>
                {getImpactText(impact.time)}
              </span>
            </div>
          </div>

          {getEnabledServersCount() > 2 && (
            <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-800 rounded text-xs text-yellow-300">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              많은 MCP 서버를 활성화하면 분석 시간과 비용이 증가할 수 있습니다.
            </div>
          )}
        </div>
      )}

      {/* 권장 설정 */}
      <div className="p-4 bg-blue-900/10 border border-blue-800 rounded-lg">
        <h5 className="font-medium text-blue-300 mb-2">💡 권장 설정</h5>
        <div className="text-sm text-blue-200 space-y-1">
          <p>• <strong>표준 분석</strong>: 파일시스템 + 데이터베이스</p>
          <p>• <strong>시장 분석 포함</strong>: 파일시스템 + 데이터베이스 + 웹 검색</p>
          <p>• <strong>기술 벤치마킹</strong>: 파일시스템 + GitHub</p>
          <p>• <strong>종합 분석</strong>: 모든 서버 활성화</p>
        </div>
      </div>
    </div>
  );
};