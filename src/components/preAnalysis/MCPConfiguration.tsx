import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Server,
  Database,
  Search,
  FileText,
  Github,
  Globe,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import type { MCPServer, MCPConfiguration as MCPConfig } from '@/types/preAnalysis';

interface MCPConfigurationProps {
  onConfigurationChange: (config: MCPConfig) => void;
  disabled?: boolean;
}

export const MCPConfiguration: React.FC<MCPConfigurationProps> = ({
  onConfigurationChange,
  disabled = false
}) => {
  const [servers, setServers] = useState<MCPServer[]>([
    {
      id: 'filesystem',
      name: 'File System',
      description: '프로젝트 파일 구조 분석',
      icon: <FileText className="w-4 h-4" />,
      enabled: true,
      status: 'connected',
      config: {},
      capabilities: ['파일 구조 분석', '코드베이스 스캔', '의존성 분석']
    },
    {
      id: 'database',
      name: 'Database',
      description: '기존 프로젝트 데이터 조회',
      icon: <Database className="w-4 h-4" />,
      enabled: true,
      status: 'connected',
      config: {},
      capabilities: ['과거 프로젝트 조회', '패턴 분석', '성공 사례 검색']
    },
    {
      id: 'websearch',
      name: 'Web Search',
      description: '시장 조사 및 트렌드 분석',
      icon: <Search className="w-4 h-4" />,
      enabled: false,
      status: 'disconnected',
      config: {
        apiKey: '',
        searchEngine: 'google',
        maxResults: 10
      },
      capabilities: ['시장 조사', '경쟁사 분석', '기술 트렌드 조사']
    },
    {
      id: 'github',
      name: 'GitHub',
      description: '오픈소스 프로젝트 검색',
      icon: <Github className="w-4 h-4" />,
      enabled: false,
      status: 'disconnected',
      config: {
        token: '',
        organization: ''
      },
      capabilities: ['유사 프로젝트 검색', '오픈소스 라이브러리 분석', 'README 분석']
    },
    {
      id: 'web',
      name: 'Web Browse',
      description: '웹사이트 콘텐츠 분석',
      icon: <Globe className="w-4 h-4" />,
      enabled: false,
      status: 'disconnected',
      config: {
        userAgent: 'ELUO-PreAnalysis-Bot',
        timeout: 10000
      },
      capabilities: ['웹사이트 분석', '콘텐츠 스크래핑', '경쟁사 조사']
    }
  ]);

  const [selectedServer, setSelectedServer] = useState<string>('filesystem');
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  useEffect(() => {
    onConfigurationChange({
      servers: servers.reduce((acc, server) => {
        acc[server.id] = server;
        return acc;
      }, {} as Record<string, MCPServer>),
      enabledServers: servers.filter(s => s.enabled).map(s => s.id),
      serverConfigs: servers.reduce((acc, server) => {
        acc[server.id] = server.config;
        return acc;
      }, {} as Record<string, any>),
      defaultTimeout: 30000,
      maxRetries: 3,
      globalSettings: {
        enableLogging: true,
        enableMetrics: true,
        enableRealtime: true
      }
    });
  }, [servers, onConfigurationChange]);

  const toggleServer = (serverId: string) => {
    setServers(prev => prev.map(server =>
      server.id === serverId
        ? { ...server, enabled: !server.enabled }
        : server
    ));
  };

  const updateServerConfig = (serverId: string, config: any) => {
    setServers(prev => prev.map(server =>
      server.id === serverId
        ? { ...server, config: { ...server.config, ...config } }
        : server
    ));
  };

  const testConnection = async (serverId: string) => {
    setTestingConnection(serverId);
    try {
      // 실제 연결 테스트 로직 구현
      await new Promise(resolve => setTimeout(resolve, 2000));

      setServers(prev => prev.map(server =>
        server.id === serverId
          ? { ...server, status: 'connected' }
          : server
      ));
    } catch (error) {
      setServers(prev => prev.map(server =>
        server.id === serverId
          ? { ...server, status: 'error' }
          : server
      ));
    } finally {
      setTestingConnection(null);
    }
  };

  const getStatusIcon = (status: string, serverId: string) => {
    if (testingConnection === serverId) {
      return <Loader2 className="w-4 h-4 animate-spin text-accent-blue" />;
    }

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


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-text-primary">
          <Server className="w-5 h-5" />
          MCP 서버 설정
        </CardTitle>
        <p className="text-sm text-text-secondary">
          Model Context Protocol 서버를 설정하여 외부 데이터를 활용하세요
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedServer} onValueChange={setSelectedServer}>
          <TabsList className="grid grid-cols-5 w-full mb-6">
            {servers.map((server) => (
              <TabsTrigger
                key={server.id}
                value={server.id}
                className="flex flex-col items-center gap-1 p-3 h-auto"
              >
                {server.icon}
                <span className="text-xs">{server.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {servers.map((server) => (
            <TabsContent key={server.id} value={server.id} className="space-y-6">
              {/* Server Header */}
              <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-border-primary">
                <div className="flex items-center gap-3">
                  {server.icon}
                  <div>
                    <h3 className="font-medium text-text-primary">{server.name}</h3>
                    <p className="text-sm text-text-secondary">{server.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(server.status, server.id)}
                    <Badge variant={getStatusBadgeVariant(server.status)} size="sm">
                      {server.status}
                    </Badge>
                  </div>
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={() => toggleServer(server.id)}
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Server Configuration */}
              {server.enabled && (
                <div className="space-y-4">
                  {/* Capabilities */}
                  <div>
                    <Label className="text-sm font-medium text-text-primary mb-2 block">
                      제공 기능
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {server.capabilities.map((capability, index) => (
                        <Badge key={index} variant="primary" size="sm">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Server-specific Configuration */}
                  {server.id === 'websearch' && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-text-primary">
                          API Key
                        </Label>
                        <Input
                          type="password"
                          placeholder="검색 엔진 API 키를 입력하세요"
                          value={server.config?.['apiKey'] || ''}
                          onChange={(e) => updateServerConfig(server.id, { apiKey: e.target.value })}
                          disabled={disabled}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-text-primary">
                          최대 검색 결과
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={server.config?.['maxResults'] || 10}
                          onChange={(e) => updateServerConfig(server.id, { maxResults: parseInt(e.target.value) })}
                          disabled={disabled}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {server.id === 'github' && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-text-primary">
                          GitHub Token
                        </Label>
                        <Input
                          type="password"
                          placeholder="GitHub Personal Access Token"
                          value={server.config?.['token'] || ''}
                          onChange={(e) => updateServerConfig(server.id, { token: e.target.value })}
                          disabled={disabled}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-text-primary">
                          Organization (선택사항)
                        </Label>
                        <Input
                          placeholder="특정 조직의 저장소만 검색"
                          value={server.config?.['organization'] || ''}
                          onChange={(e) => updateServerConfig(server.id, { organization: e.target.value })}
                          disabled={disabled}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {server.id === 'web' && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-text-primary">
                          User Agent
                        </Label>
                        <Input
                          placeholder="웹 브라우징에 사용할 User Agent"
                          value={server.config?.['userAgent'] || ''}
                          onChange={(e) => updateServerConfig(server.id, { userAgent: e.target.value })}
                          disabled={disabled}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-text-primary">
                          Timeout (ms)
                        </Label>
                        <Input
                          type="number"
                          min="1000"
                          max="60000"
                          value={server.config?.['timeout'] || 10000}
                          onChange={(e) => updateServerConfig(server.id, { timeout: parseInt(e.target.value) })}
                          disabled={disabled}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Test Connection Button */}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => testConnection(server.id)}
                      disabled={disabled || testingConnection === server.id}
                    >
                      {testingConnection === server.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Settings className="w-4 h-4 mr-2" />
                      )}
                      연결 테스트
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Summary */}
        <div className="mt-6 p-4 bg-bg-secondary/50 rounded-lg border border-border-secondary">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">활성화된 서버</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {servers.filter(s => s.enabled).map((server) => (
              <div key={server.id} className="flex items-center gap-2">
                {server.icon}
                <span className="text-sm text-text-primary">{server.name}</span>
                {getStatusIcon(server.status, server.id)}
              </div>
            ))}
          </div>
          {servers.filter(s => s.enabled).length === 0 && (
            <p className="text-sm text-text-tertiary">활성화된 서버가 없습니다</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};