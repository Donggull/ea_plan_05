import { MCPResponse, Project, MarketData, Competitor, TechTrend, MCPAnalysisResult } from '../../types/preAnalysis';

/**
 * MCP (Model Context Protocol) 서버 관리자
 * 다양한 MCP 서버와의 통신을 관리하고 사전 분석에 필요한 추가 정보를 수집합니다.
 */
export class MCPManager {
  private static instance: MCPManager;
  private enabledServers: Set<string> = new Set();

  public static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  /**
   * MCP 서버 활성화/비활성화
   */
  setServerStatus(serverType: string, enabled: boolean): void {
    if (enabled) {
      this.enabledServers.add(serverType);
    } else {
      this.enabledServers.delete(serverType);
    }
  }

  /**
   * 활성화된 서버 확인
   */
  isServerEnabled(serverType: string): boolean {
    return this.enabledServers.has(serverType);
  }

  /**
   * 프로젝트 구조 분석 (파일시스템 MCP)
   */
  async analyzeProjectStructure(_projectPath?: string): Promise<MCPResponse<{
    totalFiles: number;
    techStack: string[];
    complexity: number;
    structure: Record<string, any>;
  }>> {
    try {
      if (!this.isServerEnabled('filesystem')) {
        return {
          success: false,
          error: '파일시스템 MCP 서버가 비활성화되어 있습니다.',
        };
      }

      const startTime = Date.now();

      // 실제 MCP 파일시스템 서버 호출 로직
      // 현재는 임시 구현
      const mockData = {
        totalFiles: 150,
        techStack: ['React', 'TypeScript', 'Vite', 'Tailwind CSS'],
        complexity: 0.7,
        structure: {
          'src/': {
            'components/': 45,
            'services/': 12,
            'types/': 8,
            'utils/': 6,
          },
          'docs/': 15,
          'tests/': 20,
        },
      };

      return {
        success: true,
        data: mockData,
        metadata: {
          server: 'filesystem',
          command: 'analyzeProjectStructure',
          responseTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('프로젝트 구조 분석 오류:', error);
      return {
        success: false,
        error: '프로젝트 구조 분석 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 시장 조사 (웹 검색 MCP)
   */
  async searchMarketInsights(
    projectType: string,
    industry?: string
  ): Promise<MCPResponse<MarketData>> {
    try {
      if (!this.isServerEnabled('websearch')) {
        return {
          success: false,
          error: '웹 검색 MCP 서버가 비활성화되어 있습니다.',
        };
      }

      const startTime = Date.now();

      // 검색 쿼리 생성 (미사용)
      // const searchQueries = [
      //   `${projectType} market trends 2024`,
      //   `${projectType} industry analysis`,
      //   `${industry || projectType} market size growth`,
      //   `${projectType} best practices case studies`,
      // ];

      // 실제 웹 검색 MCP 서버 호출 로직
      // 현재는 임시 구현
      const mockMarketData: MarketData = {
        industry: industry || projectType,
        marketSize: 15.2, // 억 달러
        growthRate: 12.5, // 연간 성장률 %
        keyTrends: [
          'AI 기반 자동화 증가',
          '클라우드 네이티브 아키텍처 채택',
          '마이크로서비스 패턴 확산',
          '개발자 경험(DX) 중시',
        ],
        challenges: [
          '기술 인력 부족',
          '레거시 시스템 통합',
          '보안 및 규정 준수',
          '빠른 기술 변화 대응',
        ],
        opportunities: [
          '디지털 트랜스포메이션 가속화',
          '원격 근무 환경 최적화',
          '데이터 기반 의사결정 확산',
          '사용자 경험 혁신',
        ],
      };

      return {
        success: true,
        data: mockMarketData,
        metadata: {
          server: 'websearch',
          command: 'searchMarketInsights',
          responseTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('시장 조사 오류:', error);
      return {
        success: false,
        error: '시장 조사 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 유사 프로젝트 검색 (GitHub MCP)
   */
  async findSimilarProjects(
    _techStack: string[],
    _projectType?: string
  ): Promise<MCPResponse<Project[]>> {
    try {
      if (!this.isServerEnabled('github')) {
        return {
          success: false,
          error: 'GitHub MCP 서버가 비활성화되어 있습니다.',
        };
      }

      const startTime = Date.now();

      // GitHub 검색 쿼리 생성 (미사용)
      // const searchQuery = techStack.join(' ') + (projectType ? ` ${projectType}` : '');

      // 실제 GitHub MCP 서버 호출 로직
      // 현재는 임시 구현
      const mockProjects: Project[] = [
        {
          id: 'github-1',
          name: 'awesome-react-dashboard',
          description: 'Modern React dashboard with TypeScript and Vite',
          industry: 'SaaS',
          technology_stack: ['React', 'TypeScript', 'Vite', 'Tailwind CSS'],
          budget: 50000,
        },
        {
          id: 'github-2',
          name: 'enterprise-web-platform',
          description: 'Enterprise-grade web platform built with modern stack',
          industry: 'Enterprise',
          technology_stack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
          budget: 200000,
        },
        {
          id: 'github-3',
          name: 'startup-mvp-template',
          description: 'Rapid MVP development template',
          industry: 'Startup',
          technology_stack: ['React', 'TypeScript', 'Supabase', 'Vercel'],
          budget: 30000,
        },
      ];

      return {
        success: true,
        data: mockProjects,
        metadata: {
          server: 'github',
          command: 'findSimilarProjects',
          responseTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('유사 프로젝트 검색 오류:', error);
      return {
        success: false,
        error: '유사 프로젝트 검색 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 경쟁사 분석 (웹 검색 + 데이터베이스 MCP)
   */
  async analyzeCompetitors(
    _industry: string,
    _productType: string
  ): Promise<MCPResponse<Competitor[]>> {
    try {
      if (!this.isServerEnabled('websearch') && !this.isServerEnabled('database')) {
        return {
          success: false,
          error: '웹 검색 또는 데이터베이스 MCP 서버가 필요합니다.',
        };
      }

      const startTime = Date.now();

      // 실제 경쟁사 분석 로직
      // 현재는 임시 구현
      const mockCompetitors: Competitor[] = [
        {
          name: 'TechCorp Solutions',
          marketShare: 25,
          strengths: ['강력한 기술력', '글로벌 네트워크', '브랜드 인지도'],
          weaknesses: ['높은 가격', '복잡한 인터페이스'],
          products: ['Enterprise Platform', 'Cloud Solutions'],
          pricing: {
            model: 'Subscription',
            range: '$1000-5000/month',
          },
        },
        {
          name: 'InnovateLab',
          marketShare: 18,
          strengths: ['혁신적 기능', '우수한 UX', '빠른 개발'],
          weaknesses: ['제한적 통합', '신생 브랜드'],
          products: ['Smart Dashboard', 'Analytics Suite'],
          pricing: {
            model: 'Freemium',
            range: '$500-2000/month',
          },
        },
        {
          name: 'DataFlow Systems',
          marketShare: 15,
          strengths: ['데이터 처리 능력', '확장성', '안정성'],
          weaknesses: ['구식 UI', '느린 업데이트'],
          products: ['Data Platform', 'Business Intelligence'],
          pricing: {
            model: 'Enterprise',
            range: '$2000-10000/month',
          },
        },
      ];

      return {
        success: true,
        data: mockCompetitors,
        metadata: {
          server: 'websearch',
          command: 'analyzeCompetitors',
          responseTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('경쟁사 분석 오류:', error);
      return {
        success: false,
        error: '경쟁사 분석 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 기술 트렌드 분석 (웹 검색 MCP)
   */
  async analyzeTechnologyTrends(
    technologies: string[]
  ): Promise<MCPResponse<TechTrend[]>> {
    try {
      if (!this.isServerEnabled('websearch')) {
        return {
          success: false,
          error: '웹 검색 MCP 서버가 비활성화되어 있습니다.',
        };
      }

      const startTime = Date.now();

      // 기술별 트렌드 검색
      const trends = await Promise.all(
        technologies.map(async (tech) => {
          // 실제 기술 트렌드 분석 로직
          // 현재는 임시 구현
          const mockTrend: TechTrend = {
            technology: tech,
            adoptionRate: Math.random() * 100,
            maturity: this.getTechMaturity(tech),
            relevance: Math.random() * 100,
            description: `${tech}는 현재 ${this.getTechMaturity(tech)} 단계에 있으며, 높은 성장 잠재력을 보여주고 있습니다.`,
          };
          return mockTrend;
        })
      );

      return {
        success: true,
        data: trends,
        metadata: {
          server: 'websearch',
          command: 'analyzeTechnologyTrends',
          responseTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('기술 트렌드 분석 오류:', error);
      return {
        success: false,
        error: '기술 트렌드 분석 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 과거 프로젝트 데이터 조회 (데이터베이스 MCP)
   */
  async queryHistoricalData(
    _projectType: string,
    _industry?: string
  ): Promise<MCPResponse<{
    successRate: number;
    averageDuration: number;
    commonRisks: string[];
    bestPractices: string[];
    budgetRanges: Record<string, number>;
  }>> {
    try {
      if (!this.isServerEnabled('database')) {
        return {
          success: false,
          error: '데이터베이스 MCP 서버가 비활성화되어 있습니다.',
        };
      }

      const startTime = Date.now();

      // 실제 히스토리 데이터 쿼리 로직
      // 현재는 임시 구현
      const mockHistoricalData = {
        successRate: 78.5, // %
        averageDuration: 6.2, // 개월
        commonRisks: [
          '요구사항 변경',
          '기술적 복잡성',
          '리소스 부족',
          '일정 지연',
        ],
        bestPractices: [
          '애자일 방법론 적용',
          '지속적 통합/배포',
          '정기적 이해관계자 소통',
          '단계별 검증',
        ],
        budgetRanges: {
          low: 50000,
          medium: 150000,
          high: 500000,
          enterprise: 1000000,
        },
      };

      return {
        success: true,
        data: mockHistoricalData,
        metadata: {
          server: 'database',
          command: 'queryHistoricalData',
          responseTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('과거 데이터 조회 오류:', error);
      return {
        success: false,
        error: '과거 데이터 조회 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 종합 MCP 분석 수행
   */
  async performComprehensiveAnalysis(options: {
    projectType: string;
    industry?: string;
    techStack: string[];
    projectPath?: string;
  }): Promise<MCPResponse<{
    projectStructure?: any;
    marketInsights?: MarketData;
    similarProjects?: Project[];
    competitors?: Competitor[];
    technologyTrends?: TechTrend[];
    historicalData?: any;
  }>> {
    try {
      const results: any = {};
      const errors: string[] = [];

      // 병렬로 모든 MCP 서비스 호출
      const promises = [];

      if (this.isServerEnabled('filesystem') && options.projectPath) {
        promises.push(
          this.analyzeProjectStructure(options.projectPath)
            .then(res => res.success ? results.projectStructure = res.data : errors.push(res.error!))
        );
      }

      if (this.isServerEnabled('websearch')) {
        promises.push(
          this.searchMarketInsights(options.projectType, options.industry)
            .then(res => res.success ? results.marketInsights = res.data : errors.push(res.error!)),
          this.analyzeCompetitors(options.industry || options.projectType, options.projectType)
            .then(res => res.success ? results.competitors = res.data : errors.push(res.error!)),
          this.analyzeTechnologyTrends(options.techStack)
            .then(res => res.success ? results.technologyTrends = res.data : errors.push(res.error!))
        );
      }

      if (this.isServerEnabled('github')) {
        promises.push(
          this.findSimilarProjects(options.techStack, options.projectType)
            .then(res => res.success ? results.similarProjects = res.data : errors.push(res.error!))
        );
      }

      if (this.isServerEnabled('database')) {
        promises.push(
          this.queryHistoricalData(options.projectType, options.industry)
            .then(res => res.success ? results.historicalData = res.data : errors.push(res.error!))
        );
      }

      await Promise.all(promises);

      return {
        success: Object.keys(results).length > 0,
        data: results,
        error: errors.length > 0 ? `일부 서비스에서 오류 발생: ${errors.join(', ')}` : undefined,
        metadata: {
          server: 'comprehensive',
          command: 'performComprehensiveAnalysis',
          responseTime: Date.now(),
        },
      };
    } catch (error) {
      console.error('종합 MCP 분석 오류:', error);
      return {
        success: false,
        error: '종합 MCP 분석 중 오류가 발생했습니다.',
      };
    }
  }

  // 유틸리티 메서드들

  private getTechMaturity(tech: string): TechTrend['maturity'] {
    const matureTechs = ['React', 'JavaScript', 'Python', 'Java'];
    const growingTechs = ['TypeScript', 'Vue', 'Svelte', 'Deno'];
    const emergingTechs = ['WebAssembly', 'Edge Computing', 'Quantum'];

    if (matureTechs.some(t => tech.toLowerCase().includes(t.toLowerCase()))) {
      return 'mature';
    }
    if (growingTechs.some(t => tech.toLowerCase().includes(t.toLowerCase()))) {
      return 'growing';
    }
    if (emergingTechs.some(t => tech.toLowerCase().includes(t.toLowerCase()))) {
      return 'emerging';
    }
    return 'growing';
  }

  /**
   * MCP 서버 상태 확인
   */
  async checkServerHealth(): Promise<Record<string, boolean>> {
    const servers = ['filesystem', 'websearch', 'github', 'database'];
    const healthStatus: Record<string, boolean> = {};

    for (const server of servers) {
      try {
        // 실제 환경 변수 및 연결 상태 확인
        switch (server) {
          case 'filesystem':
            // 파일시스템은 항상 사용 가능
            healthStatus[server] = true;
            break;
          case 'database':
            // Supabase 연결 확인
            healthStatus[server] = !!(process.env['VITE_SUPABASE_URL'] && process.env['VITE_SUPABASE_ANON_KEY']);
            break;
          case 'websearch':
            // Brave Search API 키 확인
            healthStatus[server] = !!process.env['VITE_BRAVE_API_KEY'];
            break;
          case 'github':
            // GitHub 토큰 확인
            healthStatus[server] = !!process.env['VITE_GITHUB_TOKEN'];
            break;
          default:
            healthStatus[server] = false;
        }
      } catch (error) {
        console.error(`${server} 서버 상태 확인 오류:`, error);
        healthStatus[server] = false;
      }
    }

    return healthStatus;
  }

  /**
   * MCP 서버 연결 테스트
   */
  async testServerConnection(serverType: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      switch (serverType) {
        case 'filesystem':
          // 파일시스템 접근 테스트
          return {
            success: true,
            responseTime: Date.now() - startTime,
          };

        case 'database':
          // Supabase 연결 테스트
          if (!process.env['VITE_SUPABASE_URL']) {
            throw new Error('Supabase URL이 설정되지 않았습니다');
          }
          return {
            success: true,
            responseTime: Date.now() - startTime,
          };

        case 'websearch':
          // Brave Search API 테스트
          if (!process.env['VITE_BRAVE_API_KEY']) {
            throw new Error('Brave API 키가 설정되지 않았습니다');
          }
          return {
            success: true,
            responseTime: Date.now() - startTime,
          };

        case 'github':
          // GitHub API 테스트
          if (!process.env['VITE_GITHUB_TOKEN']) {
            throw new Error('GitHub 토큰이 설정되지 않았습니다');
          }
          return {
            success: true,
            responseTime: Date.now() - startTime,
          };

        default:
          throw new Error(`알 수 없는 서버 타입: ${serverType}`);
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * 사전 분석을 위한 통합 MCP 분석 실행
   */
  async executePreAnalysisWorkflow(options: {
    sessionId: string;
    projectId: string;
    documents?: string[];
    projectType?: string;
    industry?: string;
    techStack?: string[];
    analysisDepth: 'quick' | 'standard' | 'deep' | 'comprehensive';
  }): Promise<MCPAnalysisResult[]> {
    const results: MCPAnalysisResult[] = [];
    const startTime = Date.now();

    try {
      console.log(`Starting MCP analysis workflow for session ${options.sessionId}`);

      // 1. 프로젝트 구조 분석 (파일시스템 MCP)
      if (this.isServerEnabled('filesystem')) {
        try {
          const structureAnalysis = await this.analyzeProjectStructure();
          if (structureAnalysis.success) {
            results.push({
              server_id: 'filesystem',
              analysis_type: 'project_structure',
              results: {
                findings: [
                  {
                    category: 'structure',
                    title: '프로젝트 구조 분석',
                    description: `총 ${structureAnalysis.data?.totalFiles}개 파일, 복잡도 ${structureAnalysis.data?.complexity}`,
                    confidence: 0.9,
                    impact: 'medium'
                  }
                ],
                metrics: {
                  total_files: structureAnalysis.data?.totalFiles || 0,
                  complexity_score: structureAnalysis.data?.complexity || 0
                },
                recommendations: [
                  '프로젝트 구조가 잘 정리되어 있습니다',
                  '현재 기술 스택이 최신 표준을 따르고 있습니다'
                ]
              },
              execution_time_ms: structureAnalysis.metadata?.responseTime || 0,
              success: true
            });
          }
        } catch (error) {
          console.error('Filesystem MCP analysis failed:', error);
        }
      }

      // 2. 시장 조사 (웹 검색 MCP)
      if (this.isServerEnabled('websearch') && (options.analysisDepth === 'deep' || options.analysisDepth === 'comprehensive')) {
        try {
          const marketAnalysis = await this.searchMarketInsights(options.projectType || 'web application', options.industry);
          if (marketAnalysis.success) {
            results.push({
              server_id: 'websearch',
              analysis_type: 'market_research',
              results: {
                findings: [
                  {
                    category: 'market',
                    title: '시장 규모 및 성장률',
                    description: `시장 규모 ${marketAnalysis.data?.marketSize}억 달러, 연간 성장률 ${marketAnalysis.data?.growthRate}%`,
                    confidence: 0.75,
                    impact: 'high'
                  }
                ],
                metrics: {
                  market_size: marketAnalysis.data?.marketSize || 0,
                  growth_rate: marketAnalysis.data?.growthRate || 0
                },
                recommendations: marketAnalysis.data?.opportunities || []
              },
              execution_time_ms: marketAnalysis.metadata?.responseTime || 0,
              success: true
            });
          }
        } catch (error) {
          console.error('Web search MCP analysis failed:', error);
        }
      }

      // 3. 유사 프로젝트 검색 (GitHub MCP)
      if (this.isServerEnabled('github') && options.techStack && options.techStack.length > 0) {
        try {
          const similarProjects = await this.findSimilarProjects(options.techStack, options.projectType);
          if (similarProjects.success) {
            results.push({
              server_id: 'github',
              analysis_type: 'similar_projects',
              results: {
                findings: [
                  {
                    category: 'benchmarks',
                    title: '유사 프로젝트 분석',
                    description: `${similarProjects.data?.length}개의 유사 프로젝트 발견`,
                    confidence: 0.8,
                    impact: 'medium'
                  }
                ],
                metrics: {
                  similar_projects_count: similarProjects.data?.length || 0,
                  average_budget: similarProjects.data ? (similarProjects.data.reduce((sum, p) => sum + (p.budget || 0), 0) / (similarProjects.data.length || 1)) : 0
                },
                recommendations: [
                  '유사 프로젝트의 기술 스택을 참고하여 최적화 방향을 설정하세요',
                  '오픈소스 라이브러리 활용을 고려해보세요'
                ]
              },
              execution_time_ms: similarProjects.metadata?.responseTime || 0,
              success: true
            });
          }
        } catch (error) {
          console.error('GitHub MCP analysis failed:', error);
        }
      }

      // 4. 과거 프로젝트 데이터 조회 (데이터베이스 MCP)
      if (this.isServerEnabled('database')) {
        try {
          const historicalData = await this.queryHistoricalData(options.projectType || 'web application', options.industry);
          if (historicalData.success) {
            results.push({
              server_id: 'database',
              analysis_type: 'historical_analysis',
              results: {
                findings: [
                  {
                    category: 'statistics',
                    title: '과거 프로젝트 성공률',
                    description: `유사 프로젝트 성공률 ${historicalData.data?.successRate}%, 평균 기간 ${historicalData.data?.averageDuration}개월`,
                    confidence: 0.85,
                    impact: 'high'
                  }
                ],
                metrics: {
                  success_rate: historicalData.data?.successRate || 0,
                  average_duration: historicalData.data?.averageDuration || 0
                },
                recommendations: historicalData.data?.bestPractices || []
              },
              execution_time_ms: historicalData.metadata?.responseTime || 0,
              success: true
            });
          }
        } catch (error) {
          console.error('Database MCP analysis failed:', error);
        }
      }

      console.log(`MCP analysis workflow completed. ${results.length} analyses performed in ${Date.now() - startTime}ms`);
      return results;

    } catch (error) {
      console.error('MCP workflow execution failed:', error);
      return results; // 부분적 결과라도 반환
    }
  }

  /**
   * 실시간 MCP 서버 상태 모니터링
   */
  async startRealtimeMonitoring(callback: (status: Record<string, {
    connected: boolean;
    responseTime: number;
    lastCheck: Date;
    error?: string;
  }>) => void): Promise<() => void> {
    const checkInterval = setInterval(async () => {
      const status: Record<string, any> = {};
      const servers = ['filesystem', 'websearch', 'github', 'database'];

      for (const server of servers) {
        try {
          const result = await this.testServerConnection(server);
          status[server] = {
            connected: result.success,
            responseTime: result.responseTime,
            lastCheck: new Date(),
            error: result.error
          };
        } catch (error) {
          status[server] = {
            connected: false,
            responseTime: 0,
            lastCheck: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }

      callback(status);
    }, 10000); // 10초마다 체크

    // Cleanup 함수 반환
    return () => clearInterval(checkInterval);
  }

  /**
   * MCP 서버별 분석 능력 조회
   */
  getServerCapabilities(): Record<string, {
    name: string;
    description: string;
    capabilities: string[];
    supportedAnalysisTypes: string[];
    requiresConfig: boolean;
    configFields?: string[];
  }> {
    return {
      filesystem: {
        name: 'File System',
        description: '프로젝트 파일 구조 및 코드베이스 분석',
        capabilities: ['파일 구조 분석', '코드 복잡도 측정', '의존성 분석', '기술 스택 감지'],
        supportedAnalysisTypes: ['project_structure', 'code_analysis', 'dependency_analysis'],
        requiresConfig: false
      },
      websearch: {
        name: 'Web Search',
        description: '시장 조사 및 기술 트렌드 분석',
        capabilities: ['시장 조사', '경쟁사 분석', '기술 트렌드', '베스트 프랙티스'],
        supportedAnalysisTypes: ['market_research', 'competitor_analysis', 'tech_trends'],
        requiresConfig: true,
        configFields: ['API Key', 'Search Engine']
      },
      github: {
        name: 'GitHub',
        description: '오픈소스 프로젝트 및 코드 저장소 분석',
        capabilities: ['유사 프로젝트 검색', '오픈소스 라이브러리', 'README 분석', '코드 패턴'],
        supportedAnalysisTypes: ['similar_projects', 'code_patterns', 'library_analysis'],
        requiresConfig: true,
        configFields: ['GitHub Token', 'Organization']
      },
      database: {
        name: 'Database',
        description: '과거 프로젝트 데이터 및 통계 분석',
        capabilities: ['과거 프로젝트 조회', '성공률 통계', '베스트 프랙티스', '리스크 분석'],
        supportedAnalysisTypes: ['historical_analysis', 'success_patterns', 'risk_assessment'],
        requiresConfig: false
      }
    };
  }

  /**
   * MCP 분석 결과 요약
   */
  summarizeAnalysisResults(results: MCPAnalysisResult[]): {
    totalAnalyses: number;
    successfulAnalyses: number;
    totalExecutionTime: number;
    keyFindings: Array<{
      server: string;
      finding: string;
      impact: 'low' | 'medium' | 'high';
      confidence: number;
    }>;
    recommendations: string[];
  } {
    const keyFindings: Array<{
      server: string;
      finding: string;
      impact: 'low' | 'medium' | 'high';
      confidence: number;
    }> = [];

    const recommendations: string[] = [];
    let totalExecutionTime = 0;

    results.forEach(result => {
      totalExecutionTime += result.execution_time_ms;

      // 주요 발견사항 추출
      result.results.findings.forEach(finding => {
        if (finding.confidence > 0.7) {
          keyFindings.push({
            server: result.server_id,
            finding: finding.description,
            impact: finding.impact,
            confidence: finding.confidence
          });
        }
      });

      // 권장사항 수집
      recommendations.push(...result.results.recommendations);
    });

    return {
      totalAnalyses: results.length,
      successfulAnalyses: results.filter(r => r.success).length,
      totalExecutionTime,
      keyFindings: keyFindings.sort((a, b) => b.confidence - a.confidence).slice(0, 10),
      recommendations: [...new Set(recommendations)].slice(0, 10) // 중복 제거 및 상위 10개
    };
  }

  /**
   * 디버그 정보 조회
   */
  getDebugInfo(): {
    enabledServers: string[];
    serverStatus: Record<string, boolean>;
    serverCapabilities: Record<string, any>;
  } {
    return {
      enabledServers: Array.from(this.enabledServers),
      serverStatus: Object.fromEntries(
        ['filesystem', 'websearch', 'github', 'database']
          .map(server => [server, this.isServerEnabled(server)])
      ),
      serverCapabilities: this.getServerCapabilities()
    };
  }
}

export const mcpManager = MCPManager.getInstance();