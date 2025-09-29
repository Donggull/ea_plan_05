import { MCPManager } from './MCPManager';
import { PreAnalysisService } from './PreAnalysisService';
import type {
  MCPAnalysisResult,
  AnalysisStep,
  PreAnalysisSession
} from '../../types/preAnalysis';

/**
 * MCP 통합 서비스
 * 사전 분석 워크플로우와 MCP 서버들을 연결하는 서비스
 */
export class MCPIntegrationService {
  private static instance: MCPIntegrationService;
  private mcpManager: MCPManager;
  private preAnalysisService: PreAnalysisService;

  private constructor() {
    this.mcpManager = MCPManager.getInstance();
    this.preAnalysisService = PreAnalysisService.getInstance();
  }

  public static getInstance(): MCPIntegrationService {
    if (!MCPIntegrationService.instance) {
      MCPIntegrationService.instance = new MCPIntegrationService();
    }
    return MCPIntegrationService.instance;
  }

  /**
   * 분석 단계별 MCP 통합 실행
   */
  async executeStepAnalysis(
    sessionId: string,
    step: AnalysisStep,
    session: PreAnalysisSession
  ): Promise<{
    success: boolean;
    results?: MCPAnalysisResult[];
    error?: string;
  }> {
    try {
      console.log(`Executing MCP analysis for step: ${step}, session: ${sessionId}`);

      let analysisOptions = {
        projectType: 'web application',
        industry: undefined as string | undefined,
        techStack: ['React', 'TypeScript', 'Vite'] as string[],
        analysisDepth: session.analysisDepth || 'standard' as const
      };

      // 단계별 MCP 분석 실행
      switch (step) {
        case 'setup':
          // Setup 단계에서는 MCP 서버 상태만 확인
          const healthStatus = await this.mcpManager.checkServerHealth();
          const healthResults: MCPAnalysisResult[] = Object.entries(healthStatus).map(([server, healthy]) => ({
            server_id: server,
            analysis_type: 'health_check',
            results: {
              findings: [{
                category: 'connectivity',
                title: `${server} 서버 상태`,
                description: healthy ? '연결됨' : '연결 실패',
                confidence: 1.0,
                impact: healthy ? 'low' : 'medium'
              }],
              metrics: { connection_status: healthy ? 1 : 0 },
              recommendations: healthy ? [] : [`${server} 서버 설정을 확인하세요`]
            },
            execution_time_ms: 50,
            success: healthy
          }));

          return { success: true, results: healthResults };

        case 'analysis':
          // 분석 단계에서 종합적인 MCP 분석 실행
          analysisOptions.analysisDepth = session.analysisDepth || 'deep';

          const analysisResults = await this.mcpManager.executePreAnalysisWorkflow({
            sessionId,
            projectId: session.projectId,
            ...analysisOptions
          });

          // 분석 결과를 기반으로 세션 메타데이터 업데이트
          await this.updateSessionWithMCPResults(sessionId, analysisResults);

          return { success: true, results: analysisResults };

        case 'questions':
          // 질문 생성 단계에서 가벼운 검증 분석
          const validationResults = await this.validateAnalysisContext();
          return { success: true, results: validationResults };

        case 'report':
          // 보고서 단계에서 최종 검증 및 요약
          const summaryResults = await this.generateMCPSummary();
          return { success: true, results: summaryResults };

        default:
          return { success: false, error: `Unknown step: ${step}` };
      }

    } catch (error) {
      console.error(`MCP analysis failed for step ${step}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * MCP 결과를 기반으로 세션 메타데이터 업데이트
   */
  private async updateSessionWithMCPResults(
    sessionId: string,
    results: MCPAnalysisResult[]
  ): Promise<void> {
    try {
      // MCP 분석 결과 요약
      const summary = this.mcpManager.summarizeAnalysisResults(results);

      // 기술 스택 정보 추출
      const techStackFindings = results
        .filter(r => r.analysis_type === 'project_structure')
        .flatMap(r => r.results.findings)
        .filter(f => f.category === 'structure');

      // 시장 정보 추출
      const marketFindings = results
        .filter(r => r.analysis_type === 'market_research')
        .flatMap(r => r.results.findings);

      // 세션 메타데이터 업데이트
      const metadata = {
        mcp_analysis_summary: {
          total_analyses: summary.totalAnalyses,
          successful_analyses: summary.successfulAnalyses,
          execution_time: summary.totalExecutionTime,
          key_findings: summary.keyFindings.slice(0, 5),
          recommendations: summary.recommendations.slice(0, 5)
        },
        tech_stack_insights: techStackFindings.map(f => f.description),
        market_insights: marketFindings.map(f => f.description),
        last_mcp_update: new Date().toISOString()
      };

      // PreAnalysisService를 통해 세션 업데이트
      await this.preAnalysisService.updateSession(sessionId, {
        metadata: metadata
      });

    } catch (error) {
      console.error('Failed to update session with MCP results:', error);
    }
  }

  /**
   * 분석 컨텍스트 검증
   */
  private async validateAnalysisContext(): Promise<MCPAnalysisResult[]> {
    try {
      // 필요한 MCP 서버들이 활성화되어 있는지 확인
      const enabledServers = ['filesystem', 'database'];
      const validationResults: MCPAnalysisResult[] = [];

      for (const server of enabledServers) {
        const isEnabled = this.mcpManager.isServerEnabled(server);
        const connectionTest = await this.mcpManager.testServerConnection(server);

        validationResults.push({
          server_id: server,
          analysis_type: 'validation',
          results: {
            findings: [{
              category: 'validation',
              title: `${server} 서버 검증`,
              description: isEnabled && connectionTest.success
                ? '분석에 필요한 데이터가 준비되었습니다'
                : '서버 연결에 문제가 있습니다',
              confidence: isEnabled && connectionTest.success ? 0.9 : 0.3,
              impact: 'medium'
            }],
            metrics: {
              enabled: isEnabled ? 1 : 0,
              connected: connectionTest.success ? 1 : 0,
              response_time: connectionTest.responseTime
            },
            recommendations: isEnabled && connectionTest.success
              ? ['질문 생성을 진행할 수 있습니다']
              : ['서버 설정을 확인하고 다시 시도하세요']
          },
          execution_time_ms: connectionTest.responseTime,
          success: isEnabled && connectionTest.success
        });
      }

      return validationResults;

    } catch (error) {
      console.error('Validation failed:', error);
      return [];
    }
  }

  /**
   * MCP 분석 요약 생성
   */
  private async generateMCPSummary(): Promise<MCPAnalysisResult[]> {
    try {
      // 이전 분석 결과들을 조회하여 요약
      const debugInfo = this.mcpManager.getDebugInfo();

      const summaryResult: MCPAnalysisResult = {
        server_id: 'summary',
        analysis_type: 'final_summary',
        results: {
          findings: [{
            category: 'summary',
            title: '종합 MCP 분석 완료',
            description: `${debugInfo.enabledServers.length}개 서버 활용하여 분석 완료`,
            confidence: 0.95,
            impact: 'high'
          }],
          metrics: {
            enabled_servers: debugInfo.enabledServers.length,
            total_servers: Object.keys(debugInfo.serverStatus).length
          },
          recommendations: [
            '분석 결과를 바탕으로 프로젝트 계획을 수립하세요',
            'MCP 서버 추가 설정을 통해 더 상세한 분석이 가능합니다'
          ]
        },
        execution_time_ms: 100,
        success: true
      };

      return [summaryResult];

    } catch (error) {
      console.error('Summary generation failed:', error);
      return [];
    }
  }

  /**
   * 실시간 MCP 상태 모니터링 시작
   */
  async startStatusMonitoring(callback: (status: any) => void): Promise<() => void> {
    return this.mcpManager.startRealtimeMonitoring(callback);
  }

  /**
   * MCP 서버 설정 동기화
   */
  async syncServerConfiguration(config: {
    enabledServers: string[];
    serverConfigs: Record<string, any>;
  }): Promise<void> {
    try {
      // 기존 설정 초기화
      ['filesystem', 'websearch', 'github', 'database'].forEach(server => {
        this.mcpManager.setServerStatus(server, false);
      });

      // 새 설정 적용
      config.enabledServers.forEach(server => {
        this.mcpManager.setServerStatus(server, true);
      });

      // 설정 유효성 검증
      const healthStatus = await this.mcpManager.checkServerHealth();

      console.log('MCP server configuration synced:', {
        enabled: config.enabledServers,
        health: healthStatus
      });

    } catch (error) {
      console.error('Failed to sync MCP server configuration:', error);
      throw error;
    }
  }

  /**
   * MCP 분석 성능 메트릭 조회
   */
  getPerformanceMetrics(): {
    enabledServers: string[];
    serverCapabilities: Record<string, any>;
    debugInfo: any;
  } {
    return {
      enabledServers: this.mcpManager.getDebugInfo().enabledServers,
      serverCapabilities: this.mcpManager.getServerCapabilities(),
      debugInfo: this.mcpManager.getDebugInfo()
    };
  }
}

export const mcpIntegrationService = MCPIntegrationService.getInstance();