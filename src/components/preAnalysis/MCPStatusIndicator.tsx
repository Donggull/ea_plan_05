import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Settings,
  Database,
  Search,
  Github,
  FolderOpen,
  Clock,
} from 'lucide-react';
import { MCPManager } from '@/services/preAnalysis/MCPManager';
import { mcpIntegrationService } from '@/services/preAnalysis/MCPIntegrationService';

interface MCPServerStatus {
  connected: boolean;
  responseTime: number;
  lastCheck: Date;
  error?: string;
}

interface MCPStatusIndicatorProps {
  variant?: 'full' | 'compact' | 'sidebar';
  showMetrics?: boolean;
  onServerToggle?: (serverId: string, enabled: boolean) => void;
}

export const MCPStatusIndicator: React.FC<MCPStatusIndicatorProps> = ({
  variant = 'full',
  showMetrics = true,
  onServerToggle
}) => {
  const [serverStatus, setServerStatus] = useState<Record<string, MCPServerStatus>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const mcpManager = MCPManager.getInstance();

  const serverConfig = {
    filesystem: {
      name: 'File System',
      icon: FolderOpen,
      description: '프로젝트 구조 분석',
      color: 'text-accent-blue'
    },
    database: {
      name: 'Database',
      icon: Database,
      description: '과거 프로젝트 데이터',
      color: 'text-accent-green'
    },
    websearch: {
      name: 'Web Search',
      icon: Search,
      description: '시장 조사',
      color: 'text-accent-orange'
    },
    github: {
      name: 'GitHub',
      icon: Github,
      description: '오픈소스 분석',
      color: 'text-text-secondary'
    }
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initializeMonitoring = async () => {
      try {
        setLoading(true);

        // 초기 상태 체크
        await checkServerStatus();

        // 실시간 모니터링 시작
        cleanup = await mcpIntegrationService.startStatusMonitoring((status) => {
          setServerStatus(status);
          setLastUpdate(new Date());
        });

      } catch (error) {
        console.error('Failed to initialize MCP monitoring:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeMonitoring();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const checkServerStatus = async () => {
    try {
      const healthStatus = await mcpManager.checkServerHealth();
      const status: Record<string, MCPServerStatus> = {};

      for (const [server, healthy] of Object.entries(healthStatus)) {
        const connectionTest = await mcpManager.testServerConnection(server);
        status[server] = {
          connected: healthy && connectionTest.success,
          responseTime: connectionTest.responseTime,
          lastCheck: new Date(),
          error: connectionTest.error
        };
      }

      setServerStatus(status);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to check server status:', error);
    }
  };

  const getStatusIcon = (status: MCPServerStatus) => {
    if (status.connected) {
      return <CheckCircle2 className="w-4 h-4 text-accent-green" />;
    } else if (status.error) {
      return <XCircle className="w-4 h-4 text-semantic-error" />;
    } else {
      return <AlertTriangle className="w-4 h-4 text-semantic-warning" />;
    }
  };

  const getStatusBadgeVariant = (status: MCPServerStatus) => {
    if (status.connected) return 'success';
    if (status.error) return 'error';
    return 'warning';
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 100) return 'text-accent-green';
    if (responseTime < 500) return 'text-semantic-warning';
    return 'text-semantic-error';
  };

  const handleServerToggle = (serverId: string) => {
    const isEnabled = mcpManager.isServerEnabled(serverId);
    mcpManager.setServerStatus(serverId, !isEnabled);
    onServerToggle?.(serverId, !isEnabled);

    // 상태 업데이트
    checkServerStatus();
  };

  const totalServers = Object.keys(serverConfig).length;
  const connectedServers = Object.values(serverStatus).filter(s => s.connected).length;
  const overallHealth = connectedServers / totalServers;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
        <span className="ml-2 text-sm text-text-secondary">MCP 서버 상태 확인 중...</span>
      </div>
    );
  }

  // Sidebar 변형 (사이드바용 컴팩트 버전)
  if (variant === 'sidebar') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
            MCP Status
          </span>
          <div className="flex items-center gap-1">
            <Activity className={`w-3 h-3 ${overallHealth > 0.7 ? 'text-accent-green' : 'text-semantic-warning'}`} />
            <span className="text-xs text-text-secondary">
              {connectedServers}/{totalServers}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          {Object.entries(serverConfig).slice(0, 3).map(([serverId, config]) => {
            const status = serverStatus[serverId];
            const Icon = config.icon;
            const isEnabled = mcpManager.isServerEnabled(serverId);

            return (
              <div
                key={serverId}
                className="flex items-center justify-between p-1.5 bg-bg-tertiary/30 rounded text-mini hover:bg-bg-tertiary/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-3 h-3 text-text-secondary" />
                  {status && getStatusIcon(status)}
                  <span className="text-text-primary font-medium">{config.name}</span>
                </div>
                <button
                  onClick={() => handleServerToggle(serverId)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    isEnabled
                      ? 'bg-accent-green'
                      : 'bg-text-muted hover:bg-text-secondary'
                  }`}
                  title={`${isEnabled ? 'Disable' : 'Enable'} ${config.name}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Compact 변형
  if (variant === 'compact') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className={`w-5 h-5 ${overallHealth > 0.7 ? 'text-accent-green' : 'text-semantic-warning'}`} />
              <span className="font-medium text-text-primary">MCP Servers</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={overallHealth > 0.7 ? 'success' : 'warning'} size="sm">
                {connectedServers}/{totalServers} Connected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={checkServerStatus}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(serverConfig).map(([serverId, config]) => {
              const status = serverStatus[serverId];
              const Icon = config.icon;
              const isEnabled = mcpManager.isServerEnabled(serverId);

              return (
                <div
                  key={serverId}
                  className={`p-2 rounded-lg border transition-colors ${
                    status?.connected
                      ? 'bg-accent-green/5 border-accent-green/20'
                      : 'bg-bg-secondary border-border-primary'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    {status && getStatusIcon(status)}
                    <span className="text-sm font-medium text-text-primary">
                      {config.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">
                      {status ? `${status.responseTime}ms` : 'N/A'}
                    </span>
                    <button
                      onClick={() => handleServerToggle(serverId)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        isEnabled
                          ? 'bg-accent-green/20 text-accent-green'
                          : 'bg-text-tertiary/20 text-text-tertiary hover:bg-text-tertiary/30'
                      }`}
                    >
                      {isEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full 변형 (기본)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <Activity className="w-5 h-5" />
            MCP Server Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={overallHealth > 0.7 ? 'success' : overallHealth > 0.3 ? 'warning' : 'error'}
              size="sm"
            >
              Health: {Math.round(overallHealth * 100)}%
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkServerStatus}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 서버 목록 */}
        <div className="space-y-3">
          {Object.entries(serverConfig).map(([serverId, config]) => {
            const status = serverStatus[serverId];
            const Icon = config.icon;
            const isEnabled = mcpManager.isServerEnabled(serverId);

            return (
              <div
                key={serverId}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  status?.connected
                    ? 'bg-accent-green/5 border-accent-green/20'
                    : status?.error
                    ? 'bg-semantic-error/5 border-semantic-error/20'
                    : 'bg-bg-secondary border-border-primary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-text-primary">{config.name}</h4>
                        {status && getStatusIcon(status)}
                        <Badge variant={getStatusBadgeVariant(status || { connected: false, responseTime: 0, lastCheck: new Date() })} size="sm">
                          {status?.connected ? 'Connected' : status?.error ? 'Error' : 'Disconnected'}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary">{config.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {status && showMetrics && (
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getResponseTimeColor(status.responseTime)}`}>
                          {status.responseTime}ms
                        </div>
                        <div className="text-xs text-text-tertiary">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {status.lastCheck.toLocaleTimeString()}
                        </div>
                      </div>
                    )}

                    <Button
                      variant={isEnabled ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleServerToggle(serverId)}
                    >
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>

                {status?.error && (
                  <div className="mt-2 p-2 bg-semantic-error/10 rounded text-sm text-semantic-error">
                    {status.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 성능 메트릭 */}
        {showMetrics && (
          <div className="border-t border-border-primary pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-text-primary">Performance Metrics</h4>
              <span className="text-xs text-text-tertiary">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {connectedServers}
                </div>
                <div className="text-sm text-text-secondary">Connected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {Object.values(serverStatus).length > 0
                    ? Math.round(
                        Object.values(serverStatus)
                          .filter(s => s.connected)
                          .reduce((sum, s) => sum + s.responseTime, 0) /
                        Math.max(connectedServers, 1)
                      )
                    : 0}ms
                </div>
                <div className="text-sm text-text-secondary">Avg Response</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {Math.round(overallHealth * 100)}%
                </div>
                <div className="text-sm text-text-secondary">Health Score</div>
              </div>
            </div>
          </div>
        )}

        {/* 설정 버튼 */}
        <div className="border-t border-border-primary pt-4">
          <Button variant="ghost" size="sm" className="w-full">
            <Settings className="w-4 h-4 mr-2" />
            Configure MCP Servers
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};