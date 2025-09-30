import React from 'react';
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
import { useMCP, useMCPStatus } from '@/contexts/MCPContext';

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
  // MCP Context 사용
  const {
    toggleServer,
    refreshStatus,
    isServerEnabled
  } = useMCP();

  const {
    servers,
    serverStatus,
    connectedCount,
    totalCount,
    healthScore,
    isLoading,
    isRefreshing,
    lastUpdate
  } = useMCPStatus();

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
  } as const;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-accent-green" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-semantic-error" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-semantic-warning" />;
      default:
        return <XCircle className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 100) return 'text-accent-green';
    if (responseTime < 500) return 'text-semantic-warning';
    return 'text-semantic-error';
  };

  const handleServerToggle = async (serverId: string) => {
    const currentEnabled = isServerEnabled(serverId);
    await toggleServer(serverId, !currentEnabled);
    onServerToggle?.(serverId, !currentEnabled);
  };

  const overallHealth = connectedCount / Math.max(totalCount, 1);

  if (isLoading) {
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
              {connectedCount}/{totalCount}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          {servers.slice(0, 3).map((server) => {
            const config = serverConfig[server.id as keyof typeof serverConfig];
            if (!config) return null;

            const Icon = config.icon;

            return (
              <div
                key={server.id}
                className="flex items-center justify-between p-1.5 bg-bg-tertiary/30 rounded text-mini hover:bg-bg-tertiary/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-3 h-3 text-text-secondary" />
                  {getStatusIcon(server.status)}
                  <span className="text-text-primary font-medium">{config.name}</span>
                </div>
                <button
                  onClick={() => handleServerToggle(server.id)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    server.enabled
                      ? 'bg-accent-green'
                      : 'bg-text-muted hover:bg-text-secondary'
                  }`}
                  title={`${server.enabled ? 'Disable' : 'Enable'} ${config.name}`}
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
                {connectedCount}/{totalCount} Connected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshStatus}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {servers.map((server) => {
              const config = serverConfig[server.id as keyof typeof serverConfig];
              if (!config) return null;

              const Icon = config.icon;

              return (
                <div
                  key={server.id}
                  className={`p-2 rounded-lg border transition-colors ${
                    server.status === 'connected'
                      ? 'bg-accent-green/5 border-accent-green/20'
                      : 'bg-bg-secondary border-border-primary'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    {getStatusIcon(server.status)}
                    <span className="text-sm font-medium text-text-primary">
                      {config.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">
                      {server.responseTime ? `${server.responseTime}ms` : 'N/A'}
                    </span>
                    <button
                      onClick={() => handleServerToggle(server.id)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        server.enabled
                          ? 'bg-accent-green/20 text-accent-green'
                          : 'bg-text-tertiary/20 text-text-tertiary hover:bg-text-tertiary/30'
                      }`}
                    >
                      {server.enabled ? 'ON' : 'OFF'}
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
              Health: {Math.round(healthScore)}%
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshStatus}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 서버 목록 */}
        <div className="space-y-3">
          {servers.map((server) => {
            const config = serverConfig[server.id as keyof typeof serverConfig];
            if (!config) return null;

            const Icon = config.icon;
            const status = serverStatus[server.id];

            return (
              <div
                key={server.id}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  server.status === 'connected'
                    ? 'bg-accent-green/5 border-accent-green/20'
                    : server.status === 'error'
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
                        {getStatusIcon(server.status)}
                        <Badge variant={getStatusBadgeVariant(server.status)} size="sm">
                          {server.status === 'connected' ? 'Connected' : server.status === 'error' ? 'Error' : 'Disconnected'}
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
                      variant={server.enabled ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleServerToggle(server.id)}
                    >
                      {server.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>

                {server.error && (
                  <div className="mt-2 p-2 bg-semantic-error/10 rounded text-sm text-semantic-error">
                    {server.error}
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
                Last updated: {lastUpdate?.toLocaleTimeString() || 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {connectedCount}
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
                        Math.max(connectedCount, 1)
                      )
                    : 0}ms
                </div>
                <div className="text-sm text-text-secondary">Avg Response</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {Math.round(healthScore)}%
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