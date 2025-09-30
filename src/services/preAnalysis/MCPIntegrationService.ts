import { MCPManager } from './MCPManager';
import { PreAnalysisService } from './PreAnalysisService';
import { contextCache } from './ContextCache';
import { contextManager } from './ContextManager';
import { aiAnalysisService } from './AIAnalysisService';
import { ParallelDocumentProcessor } from './ParallelDocumentProcessor';
import { AIResponseCache } from './AIResponseCache';
import type {
  MCPAnalysisResult,
  AnalysisStep,
  PreAnalysisSession
} from '../../types/preAnalysis';
import type { EnrichedContext } from './MCPAIBridge';
import type { DocumentTask, ProcessingOptions } from './ParallelDocumentProcessor';

/**
 * MCP 통합 서비스 (Enhanced with Context Caching)
 * 사전 분석 워크플로우와 MCP 서버들을 연결하는 서비스
 * 컨텍스트 캐싱과 AI 분석 통합을 지원합니다.
 */
export class MCPIntegrationService {
  private static instance: MCPIntegrationService;
  private mcpManager: MCPManager;
  private preAnalysisService: PreAnalysisService;
  private parallelProcessor: ParallelDocumentProcessor;
  private aiCache: AIResponseCache;

  private constructor() {
    this.mcpManager = MCPManager.getInstance();
    this.preAnalysisService = PreAnalysisService.getInstance();
    this.parallelProcessor = ParallelDocumentProcessor.getInstance();
    this.aiCache = AIResponseCache.getInstance({
      maxSize: 500,
      defaultTtl: 2 * 60 * 60 * 1000, // 2시간
      maxMemoryMB: 50,
      compressionEnabled: true,
      persistToDisk: false,
      autoCleanupInterval: 30 * 60 * 1000 // 30분
    });
  }

  public static getInstance(): MCPIntegrationService {
    if (!MCPIntegrationService.instance) {
      MCPIntegrationService.instance = new MCPIntegrationService();
    }
    return MCPIntegrationService.instance;
  }

  /**
   * 컨텍스트 인식 단계별 MCP-AI 통합 실행 (신규)
   */
  async executeStepAnalysisWithAI(
    sessionId: string,
    step: AnalysisStep,
    session: PreAnalysisSession
  ): Promise<{
    success: boolean;
    results?: MCPAnalysisResult[];
    enrichedContext?: EnrichedContext;
    error?: string;
  }> {
    try {
      console.log(`🧠 컨텍스트 인식 MCP-AI 통합 분석 시작: ${step} (${sessionId})`);

      let enrichedContext: EnrichedContext | undefined;
      const results: MCPAnalysisResult[] = [];

      switch (step) {
        case 'setup':
          // 컨텍스트 프리워밍
          await this.initializeContextCollection(sessionId, session);
          break;

        case 'analysis':
          // 심화 컨텍스트 수집 + AI 분석
          enrichedContext = await contextCache.getOrUpdate(sessionId, {
            includeProjectStructure: true,
            includeMarketAnalysis: true,
            includeTechTrends: true,
            analysisDepth: session.analysisDepth || 'standard'
          });

          // AI 분석 실행
          const analysisOptions = this.buildAnalysisOptions(session, enrichedContext);
          const aiResult = await aiAnalysisService.analyzeProjectWithContext(analysisOptions);

          if (aiResult.success) {
            results.push(this.convertAIResultToMCP(aiResult.data!, 'ai_analysis'));
          }
          break;

        case 'questions':
          // 컨텍스트 기반 질문 생성
          enrichedContext = await contextCache.getOrUpdate(sessionId);
          const questionsOptions = this.buildAnalysisOptions(session, enrichedContext);
          const questionsResult = await aiAnalysisService.generateContextAwareQuestions(questionsOptions);

          if (questionsResult.success) {
            results.push(this.convertQuestionsToMCP(questionsResult.data!));
          }
          break;

        case 'report':
          // 최종 통합 보고서
          enrichedContext = await contextCache.getOrUpdate(sessionId, {}, true); // 강제 새로고침
          const reportResult = await this.generateContextAwareReport(enrichedContext);
          if (reportResult) {
            results.push(reportResult);
          }
          break;
      }

      console.log(`✅ 컨텍스트 인식 MCP-AI 분석 완료: ${step}`);

      return {
        success: true,
        results,
        enrichedContext,
      };

    } catch (error) {
      console.error(`❌ 컨텍스트 인식 MCP-AI 분석 실패 (${step}):`, error);
      // 실패 시 기본 MCP 분석으로 폴백
      return this.executeStepAnalysis(sessionId, step, session);
    }
  }

  /**
   * 기본 분석 단계별 MCP 통합 실행
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

  /**
   * 컨텍스트 수집 초기화
   */
  private async initializeContextCollection(
    sessionId: string,
    session: PreAnalysisSession
  ): Promise<void> {
    try {
      console.log(`🔄 컨텍스트 수집 초기화: ${sessionId}`);

      // MCP 서버 상태 확인
      const healthStatus = await this.mcpManager.checkServerHealth();
      const enabledCount = Object.values(healthStatus).filter(Boolean).length;

      console.log(`📊 MCP 서버 상태: ${enabledCount}개 서버 활성화`);

      // 컨텍스트 프리워밍
      await contextCache.preloadContext(sessionId, {
        includeProjectStructure: true,
        includeMarketAnalysis: session.analysisDepth !== 'quick',
        includeTechTrends: session.analysisDepth !== 'quick',
        analysisDepth: session.analysisDepth
      });

      console.log(`✅ 컨텍스트 초기화 완료: ${sessionId}`);

    } catch (error) {
      console.error(`❌ 컨텍스트 초기화 실패: ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * AI 분석 옵션 구성
   */
  private buildAnalysisOptions(
    session: PreAnalysisSession,
    enrichedContext?: EnrichedContext
  ): any {
    return {
      model: {
        model_id: session.aiModel || 'claude-3-5-sonnet-20241022',
        provider: session.aiProvider || 'anthropic'
      },
      depth: session.analysisDepth || 'standard',
      temperature: 0.7,
      projectId: session.projectId,
      sessionId: session.id,
      enrichedContext,
      useContextEnhancement: true,
      analysisType: 'comprehensive' as const,
      projectContext: {
        name: 'Unknown Project',
        description: 'Project description',
        industry: 'technology',
        techStack: []
      }
    };
  }

  /**
   * AI 분석 결과를 MCP 형식으로 변환
   */
  private convertAIResultToMCP(analysisResult: any, analysisType: string): MCPAnalysisResult {
    return {
      server_id: 'ai_enhanced',
      analysis_type: analysisType,
      results: {
        findings: analysisResult.keyFindings.map((finding: string, index: number) => ({
          category: 'ai_insight',
          title: `AI 인사이트 ${index + 1}`,
          description: finding,
          confidence: analysisResult.confidence / 100,
          impact: 'medium'
        })),
        metrics: {
          confidence: analysisResult.confidence,
          estimated_cost: analysisResult.estimatedCost
        },
        recommendations: analysisResult.recommendations || []
      },
      execution_time_ms: 0,
      success: true
    };
  }

  /**
   * 질문 결과를 MCP 형식으로 변환
   */
  private convertQuestionsToMCP(questions: any[]): MCPAnalysisResult {
    return {
      server_id: 'ai_questions',
      analysis_type: 'question_generation',
      results: {
        findings: [{
          category: 'questions',
          title: '컨텍스트 기반 질문 생성',
          description: `${questions.length}개의 맞춤형 질문이 생성되었습니다`,
          confidence: 0.9,
          impact: 'high'
        }],
        metrics: {
          question_count: questions.length,
          categorized: 1
        },
        recommendations: [
          '생성된 질문을 통해 더 상세한 프로젝트 정보를 수집하세요',
          '우선순위가 높은 질문부터 답변을 진행하세요'
        ]
      },
      execution_time_ms: 0,
      success: true
    };
  }

  /**
   * 컨텍스트 인식 보고서 생성
   */
  private async generateContextAwareReport(
    enrichedContext: EnrichedContext
  ): Promise<MCPAnalysisResult> {
    try {
      const contextSummary = contextManager.generateContextSummary(enrichedContext);
      const validation = contextManager.validateContext(enrichedContext);

      return {
        server_id: 'context_aware_report',
        analysis_type: 'comprehensive_report',
        results: {
          findings: [
            {
              category: 'context_summary',
              title: '종합 컨텍스트 분석',
              description: contextSummary,
              confidence: enrichedContext.metadata.totalConfidence,
              impact: 'high'
            },
            ...(!validation.isValid ? [{
              category: 'validation_issues',
              title: '컨텍스트 검증 결과',
              description: `${validation.issues.length}개의 이슈가 발견되었습니다`,
              confidence: 0.8,
              impact: 'medium' as const
            }] : [])
          ],
          metrics: {
            data_source_count: enrichedContext.metadata.dataSourceCount,
            total_confidence: enrichedContext.metadata.totalConfidence,
            processing_time: enrichedContext.metadata.processingTime,
            validation_passed: validation.isValid ? 1 : 0
          },
          recommendations: [
            '분석 결과를 바탕으로 프로젝트 전략을 수립하세요',
            ...validation.recommendations
          ]
        },
        execution_time_ms: enrichedContext.metadata.processingTime,
        success: true
      };

    } catch (error) {
      console.error('컨텍스트 인식 보고서 생성 실패:', error);
      return {
        server_id: 'context_aware_report',
        analysis_type: 'comprehensive_report',
        results: {
          findings: [{
            category: 'error',
            title: '보고서 생성 실패',
            description: '컨텍스트 인식 보고서 생성 중 오류가 발생했습니다',
            confidence: 0.3,
            impact: 'low'
          }],
          metrics: {},
          recommendations: ['기본 분석 결과를 참조하세요']
        },
        execution_time_ms: 0,
        success: false
      };
    }
  }

  /**
   * 캐시 상태 조회
   */
  getCacheStatus(sessionId: string) {
    return contextCache.getCacheStatus(sessionId);
  }

  /**
   * 컨텍스트 캐시 무효화
   */
  invalidateCache(sessionId: string): void {
    contextCache.invalidate(sessionId);
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStatistics() {
    return contextCache.getStatistics();
  }

  /**
   * 병렬 문서 분석 처리 (성능 최적화)
   */
  async processDocumentsInParallel(
    documents: Array<{
      fileName: string;
      content: string;
      metadata?: any;
    }>,
    sessionId: string,
    modelConfig: { model: string; provider: string; temperature?: number },
    options?: Partial<ProcessingOptions>
  ) {
    console.log(`🚀 병렬 문서 처리 시작: ${documents.length}개 문서`);

    // 문서를 DocumentTask 형태로 변환
    const documentTasks: DocumentTask[] = documents.map((doc, index) => ({
      id: `${sessionId}_doc_${index}`,
      fileName: doc.fileName,
      content: doc.content,
      priority: this.parallelProcessor.calculatePriority(doc),
      estimatedTokens: this.parallelProcessor.estimateTokens(doc.content)
    }));

    // 대용량 문서 분할 처리
    const processedTasks: DocumentTask[] = [];
    for (const task of documentTasks) {
      const splitTasks = this.parallelProcessor.splitLargeDocument(task, 8000);
      processedTasks.push(...splitTasks);
    }

    // 병렬 처리 실행
    const result = await this.parallelProcessor.processDocuments(
      processedTasks,
      sessionId,
      modelConfig,
      {
        maxConcurrency: 3,
        batchSize: 5,
        timeoutMs: 30000,
        retryAttempts: 2,
        priorityBased: true,
        ...options
      }
    );

    console.log(`📊 병렬 처리 결과: ${result.completedTasks.length}개 성공, ${result.failedTasks.length}개 실패`);
    console.log(`⚡ 성능 지표: ${result.performance.throughput.toFixed(2)} docs/sec`);

    return result;
  }

  /**
   * AI 응답 캐싱을 활용한 분석 (비용 최적화)
   */
  async analyzeWithCaching(
    content: string,
    modelConfig: { model: string; provider: string; temperature?: number },
    analysisType: string = 'document_analysis'
  ) {
    const cacheKey = this.aiCache.generateCacheKey(
      content,
      modelConfig.model,
      modelConfig.provider,
      modelConfig.temperature || 0.7
    );

    console.log(`🔍 캐시 확인: ${cacheKey}`);

    // 캐시에서 확인
    let cachedResult = await this.aiCache.get(cacheKey);

    if (!cachedResult) {
      // 유사한 내용의 캐시 검색
      const similarCache = await this.aiCache.findSimilarCache(
        content,
        modelConfig.model,
        modelConfig.provider,
        0.8
      );

      if (similarCache) {
        console.log(`🔄 유사 캐시 발견: ${(similarCache.similarity * 100).toFixed(1)}% 유사도`);
        cachedResult = similarCache.data;
      }
    }

    if (cachedResult) {
      console.log(`✨ 캐시 히트: 비용 절약 효과`);
      return cachedResult;
    }

    // 캐시 미스 - 새로운 분석 실행
    console.log(`🔄 새로운 분석 실행: ${analysisType}`);

    // 임시 분석 결과 (실제 구현에서는 실제 AI 서비스 호출)
    const analysisResult = {
      summary: `${analysisType} 분석 결과`,
      keyFindings: ['핵심 발견사항 1', '핵심 발견사항 2'],
      recommendations: ['권장사항 1', '권장사항 2'],
      confidence: 0.85,
      processingTime: Math.random() * 2000 + 1000
    };

    const inputTokens = this.parallelProcessor.estimateTokens(content);
    const outputTokens = Math.floor(inputTokens * 0.3);
    const cost = (inputTokens * 0.00003) + (outputTokens * 0.00006); // GPT-4 기준 예시

    // 스마트 TTL 계산하여 캐시 저장
    const smartTtl = this.aiCache.calculateSmartTTL(
      inputTokens,
      outputTokens,
      cost,
      modelConfig.model
    );

    await this.aiCache.set(
      cacheKey,
      analysisResult,
      {
        model: modelConfig.model,
        provider: modelConfig.provider,
        inputTokens,
        outputTokens,
        cost,
        content
      },
      smartTtl
    );

    return analysisResult;
  }

  /**
   * 캐시 통계 및 병렬 처리 성능 지표 조회
   */
  getOptimizationMetrics() {
    const cacheStats = this.aiCache.getStats();
    const processingStatus = this.parallelProcessor.getProcessingStatus();

    return {
      cache: {
        totalEntries: cacheStats.totalEntries,
        hitRate: (cacheStats.hitRate * 100).toFixed(1),
        costSavings: cacheStats.costSavings.toFixed(4),
        averageAccessCount: cacheStats.averageAccessCount.toFixed(1)
      },
      parallelProcessing: {
        activeJobs: processingStatus.activeJobs,
        queueLength: processingStatus.queueLength,
        concurrencyLimit: processingStatus.concurrencyLimit
      }
    };
  }

  /**
   * 성능 최적화 시스템 정리
   */
  cleanup() {
    this.parallelProcessor.cleanup();
    this.aiCache.destroy();
    console.log('🧹 MCPIntegrationService 성능 최적화 시스템 정리 완료');
  }
}

export const mcpIntegrationService = MCPIntegrationService.getInstance();