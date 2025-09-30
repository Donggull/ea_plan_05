// import { DocumentAnalysisService } from './DocumentAnalysisService';
// import type { AIModelConfig, DocumentAnalysisResult } from '@/types/preAnalysis';

// 임시 타입 정의 (실제 구현에서는 올바른 import 사용)
interface AIModelConfig {
  model: string;
  provider: string;
  temperature?: number;
}

interface DocumentAnalysisResult {
  summary: string;
  keyRequirements: string[];
  risks: string[];
  timeline: string[];
  stakeholders: string[];
  technicalStack: string[];
  constraints: string[];
  opportunities: string[];
  processingTime: number;
  model: string;
  provider: string;
  confidence: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  metadata?: any;
}

export interface DocumentTask {
  id: string;
  fileName: string;
  content: string;
  priority: number; // 1 (highest) to 5 (lowest)
  estimatedTokens: number;
}

export interface ProcessingOptions {
  maxConcurrency: number;
  batchSize: number;
  timeoutMs: number;
  retryAttempts: number;
  priorityBased: boolean;
}

export interface ProcessingResult {
  success: boolean;
  completedTasks: Array<{
    taskId: string;
    fileName: string;
    result: DocumentAnalysisResult;
    processingTime: number;
  }>;
  failedTasks: Array<{
    taskId: string;
    fileName: string;
    error: string;
    retryCount: number;
  }>;
  totalProcessingTime: number;
  totalTokensUsed: number;
  totalCost: number;
  performance: {
    throughput: number; // docs per second
    averageProcessingTime: number;
    concurrencyUtilization: number;
  };
}

export class ParallelDocumentProcessor {
  private static instance: ParallelDocumentProcessor | null = null;
  // private documentAnalysisService: DocumentAnalysisService;
  private activeJobs: Map<string, Promise<any>>;
  private processingQueue: DocumentTask[];
  private concurrencyLimit: number;

  private constructor() {
    // this.documentAnalysisService = DocumentAnalysisService.getInstance();
    this.activeJobs = new Map();
    this.processingQueue = [];
    this.concurrencyLimit = 3; // 기본값
  }

  public static getInstance(): ParallelDocumentProcessor {
    if (!ParallelDocumentProcessor.instance) {
      ParallelDocumentProcessor.instance = new ParallelDocumentProcessor();
    }
    return ParallelDocumentProcessor.instance;
  }

  /**
   * 다중 문서를 병렬로 분석 처리
   */
  public async processDocuments(
    documents: DocumentTask[],
    sessionId: string,
    modelConfig: AIModelConfig,
    options: Partial<ProcessingOptions> = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    const processingOptions: ProcessingOptions = {
      maxConcurrency: 3,
      batchSize: 5,
      timeoutMs: 30000,
      retryAttempts: 2,
      priorityBased: true,
      ...options
    };

    // 우선순위 기반 정렬
    const sortedDocuments = processingOptions.priorityBased
      ? [...documents].sort((a, b) => a.priority - b.priority)
      : documents;

    const completedTasks: ProcessingResult['completedTasks'] = [];
    const failedTasks: ProcessingResult['failedTasks'] = [];
    let totalTokensUsed = 0;
    let totalCost = 0;

    // 병렬 처리를 위한 배치 생성
    const batches = this.createBatches(sortedDocuments, processingOptions.batchSize);

    console.log(`📄 병렬 문서 처리 시작: ${documents.length}개 문서, ${batches.length}개 배치`);

    // 각 배치를 순차적으로 처리하되, 배치 내에서는 병렬 처리
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`⚡ 배치 ${i + 1}/${batches.length} 처리 중 (${batch.length}개 문서)`);

      // 배치 내 병렬 처리
      const batchPromises = batch.map(document =>
        this.processDocumentWithRetry(
          document,
          sessionId,
          modelConfig,
          processingOptions.retryAttempts,
          processingOptions.timeoutMs
        )
      );

      // 배치 완료 대기
      const batchResults = await Promise.allSettled(batchPromises);

      // 결과 처리
      batchResults.forEach((result, index) => {
        const document = batch[index];

        if (result.status === 'fulfilled' && result.value.success) {
          const analysisResult = result.value.data!;
          completedTasks.push({
            taskId: document.id,
            fileName: document.fileName,
            result: analysisResult,
            processingTime: analysisResult.processingTime || 0
          });

          totalTokensUsed += analysisResult.inputTokens + analysisResult.outputTokens;
          totalCost += analysisResult.cost;
        } else {
          const error = result.status === 'rejected'
            ? result.reason.message
            : result.value.error;

          failedTasks.push({
            taskId: document.id,
            fileName: document.fileName,
            error,
            retryCount: processingOptions.retryAttempts
          });
        }
      });

      // 배치 간 간격 (API 레이트 리밋 방지)
      if (i < batches.length - 1) {
        await this.delay(1000);
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    // 성능 지표 계산
    const performance = this.calculatePerformanceMetrics(
      completedTasks,
      totalProcessingTime,
      processingOptions.maxConcurrency
    );

    console.log(`✅ 병렬 처리 완료: ${completedTasks.length}개 성공, ${failedTasks.length}개 실패`);
    console.log(`📊 처리량: ${performance.throughput.toFixed(2)} docs/sec`);

    return {
      success: failedTasks.length === 0,
      completedTasks,
      failedTasks,
      totalProcessingTime,
      totalTokensUsed,
      totalCost,
      performance
    };
  }

  /**
   * 재시도 로직이 포함된 문서 처리
   */
  private async processDocumentWithRetry(
    document: DocumentTask,
    _sessionId: string,
    modelConfig: AIModelConfig,
    maxRetries: number,
    timeoutMs: number
  ): Promise<{ success: boolean; data?: DocumentAnalysisResult; error?: string }> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 문서 처리 시도 ${attempt}/${maxRetries + 1}: ${document.fileName}`);

        // 타임아웃 설정 - 임시 모킹 (실제 구현 시 DocumentAnalysisService 인스턴스 사용)
        const shouldSucceed = Math.random() > 0.1; // 90% 성공률
        const analysisPromise = Promise.resolve(
          shouldSucceed ? {
            success: true,
            data: {
              summary: `분석 완료: ${document.fileName}`,
              keyRequirements: ['요구사항 1', '요구사항 2'],
              risks: ['위험 요소 1'],
              timeline: ['1주차', '2주차'],
              stakeholders: ['이해관계자 1'],
              technicalStack: ['기술 1', '기술 2'],
              constraints: ['제약사항 1'],
              opportunities: ['기회 요소 1'],
              processingTime: Math.random() * 1000 + 500,
              model: modelConfig.model,
              provider: modelConfig.provider,
              confidence: 0.85,
              inputTokens: Math.floor(document.estimatedTokens * 0.8),
              outputTokens: Math.floor(document.estimatedTokens * 0.2),
              cost: Math.random() * 0.01 + 0.001,
              metadata: {}
            }
          } : {
            success: false,
            error: '분석 처리 중 오류 발생'
          }
        );

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('처리 시간 초과')), timeoutMs);
        });

        const result = await Promise.race([analysisPromise, timeoutPromise]);

        if (result.success) {
          console.log(`✅ 문서 처리 성공: ${document.fileName} (시도 ${attempt})`);
          return result;
        } else {
          lastError = result.error || '알 수 없는 오류';
          console.log(`❌ 문서 처리 실패: ${document.fileName} - ${lastError}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : '처리 중 오류 발생';
        console.log(`⚠️ 문서 처리 예외: ${document.fileName} - ${lastError}`);
      }

      // 마지막 시도가 아니면 재시도 전 대기
      if (attempt <= maxRetries) {
        const backoffTime = Math.pow(2, attempt - 1) * 1000; // 지수 백오프
        await this.delay(backoffTime);
      }
    }

    return { success: false, error: lastError };
  }

  /**
   * 문서 배치 생성
   */
  private createBatches(documents: DocumentTask[], batchSize: number): DocumentTask[][] {
    const batches: DocumentTask[][] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * 성능 지표 계산
   */
  private calculatePerformanceMetrics(
    completedTasks: ProcessingResult['completedTasks'],
    totalTime: number,
    maxConcurrency: number
  ): ProcessingResult['performance'] {
    const throughput = completedTasks.length / (totalTime / 1000);

    const averageProcessingTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => sum + task.processingTime, 0) / completedTasks.length
      : 0;

    const theoreticalMaxTime = completedTasks.reduce((sum, task) => sum + task.processingTime, 0);
    const concurrencyUtilization = theoreticalMaxTime > 0
      ? Math.min(1.0, (theoreticalMaxTime / maxConcurrency) / totalTime)
      : 0;

    return {
      throughput,
      averageProcessingTime,
      concurrencyUtilization
    };
  }

  /**
   * 토큰 수 추정 (문서 내용 기반)
   */
  public estimateTokens(content: string): number {
    // 간단한 토큰 추정 (실제로는 tokenizer 사용 권장)
    const words = content.split(/\s+/).length;
    const characters = content.length;

    // GPT 계열: 대략 1 토큰 = 4 글자 (영어 기준)
    // 한국어는 더 많은 토큰 사용
    const estimatedTokens = Math.ceil(characters / 3); // 한국어 고려

    return Math.max(words, estimatedTokens);
  }

  /**
   * 문서 우선순위 자동 계산
   */
  public calculatePriority(document: { fileName: string; content: string }): number {
    const fileName = document.fileName.toLowerCase();
    const contentLength = document.content.length;

    // 파일명 기반 우선순위
    if (fileName.includes('readme') || fileName.includes('overview')) return 1;
    if (fileName.includes('plan') || fileName.includes('spec')) return 2;
    if (fileName.includes('requirement') || fileName.includes('needs')) return 2;
    if (fileName.includes('design') || fileName.includes('architecture')) return 3;
    if (fileName.includes('technical') || fileName.includes('detail')) return 3;

    // 내용 길이 기반 우선순위 (짧은 문서가 우선)
    if (contentLength < 1000) return 2;
    if (contentLength < 5000) return 3;
    if (contentLength < 10000) return 4;

    return 5; // 기본값
  }

  /**
   * 메모리 사용량 최적화를 위한 큰 문서 분할
   */
  public splitLargeDocument(
    document: DocumentTask,
    maxChunkSize: number = 8000
  ): DocumentTask[] {
    if (document.content.length <= maxChunkSize) {
      return [document];
    }

    const chunks: DocumentTask[] = [];
    const content = document.content;
    const totalChunks = Math.ceil(content.length / maxChunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * maxChunkSize;
      const end = Math.min(start + maxChunkSize, content.length);
      const chunkContent = content.slice(start, end);

      chunks.push({
        id: `${document.id}_chunk_${i + 1}`,
        fileName: `${document.fileName} (${i + 1}/${totalChunks})`,
        content: chunkContent,
        priority: document.priority,
        estimatedTokens: this.estimateTokens(chunkContent)
      });
    }

    console.log(`📑 큰 문서 분할: ${document.fileName} → ${chunks.length}개 청크`);
    return chunks;
  }

  /**
   * 처리 상태 모니터링
   */
  public getProcessingStatus(): {
    activeJobs: number;
    queueLength: number;
    concurrencyLimit: number;
  } {
    return {
      activeJobs: this.activeJobs.size,
      queueLength: this.processingQueue.length,
      concurrencyLimit: this.concurrencyLimit
    };
  }

  /**
   * 유틸리티: 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 리소스 정리
   */
  public cleanup(): void {
    this.activeJobs.clear();
    this.processingQueue = [];
    console.log('🧹 ParallelDocumentProcessor 리소스 정리 완료');
  }
}