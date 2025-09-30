import { createHash } from 'crypto';

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  metadata: {
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    contentHash: string;
  };
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalSize: number; // bytes
  oldestEntry: number;
  newestEntry: number;
  averageAccessCount: number;
  costSavings: number; // 캐시로 절약된 비용
}

export interface CacheOptions {
  maxSize: number; // 최대 캐시 엔트리 수
  defaultTtl: number; // 기본 TTL (밀리초)
  maxMemoryMB: number; // 최대 메모리 사용량 (MB)
  compressionEnabled: boolean;
  persistToDisk: boolean;
  autoCleanupInterval: number; // 자동 정리 간격 (밀리초)
}

export class AIResponseCache {
  private static instance: AIResponseCache | null = null;
  private cache: Map<string, CacheEntry>;
  private stats: { hits: number; misses: number; totalCost: number };
  private options: CacheOptions;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor(options: Partial<CacheOptions> = {}) {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, totalCost: 0 };
    this.options = {
      maxSize: 1000,
      defaultTtl: 24 * 60 * 60 * 1000, // 24시간
      maxMemoryMB: 100,
      compressionEnabled: true,
      persistToDisk: false,
      autoCleanupInterval: 60 * 60 * 1000, // 1시간
      ...options
    };

    this.startAutoCleanup();
    console.log('🧠 AI Response Cache 초기화 완료');
  }

  public static getInstance(options?: Partial<CacheOptions>): AIResponseCache {
    if (!AIResponseCache.instance) {
      AIResponseCache.instance = new AIResponseCache(options);
    }
    return AIResponseCache.instance;
  }

  /**
   * 캐시 키 생성 (입력 내용과 설정 기반)
   */
  public generateCacheKey(
    content: string,
    model: string,
    provider: string,
    temperature: number = 0.7,
    additionalParams: Record<string, any> = {}
  ): string {
    const inputData = {
      content,
      model,
      provider,
      temperature,
      ...additionalParams
    };

    const hash = createHash('sha256')
      .update(JSON.stringify(inputData))
      .digest('hex');

    return `${provider}_${model}_${hash.substring(0, 16)}`;
  }

  /**
   * 캐시에서 응답 조회
   */
  public async get(cacheKey: string): Promise<any | null> {
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.stats.misses++;
      console.log(`💫 캐시 미스: ${cacheKey}`);
      return null;
    }

    // TTL 확인
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      console.log(`⏰ 캐시 만료: ${cacheKey}`);
      return null;
    }

    // 액세스 정보 업데이트
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.stats.hits++;
    this.stats.totalCost += entry.metadata.cost;

    console.log(`✨ 캐시 히트: ${cacheKey} (${entry.accessCount}번째 액세스)`);
    return this.decompressData(entry.data);
  }

  /**
   * 캐시에 응답 저장
   */
  public async set(
    cacheKey: string,
    data: any,
    metadata: {
      model: string;
      provider: string;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      content: string;
    },
    customTtl?: number
  ): Promise<void> {
    const ttl = customTtl || this.options.defaultTtl;
    const timestamp = Date.now();

    // 메모리 사용량 확인
    await this.ensureMemoryLimit();

    // 컨텐츠 해시 생성
    const contentHash = createHash('md5').update(metadata.content).digest('hex');

    const entry: CacheEntry = {
      key: cacheKey,
      data: this.compressData(data),
      timestamp,
      ttl,
      accessCount: 0,
      lastAccessed: timestamp,
      metadata: {
        model: metadata.model,
        provider: metadata.provider,
        inputTokens: metadata.inputTokens,
        outputTokens: metadata.outputTokens,
        cost: metadata.cost,
        contentHash
      }
    };

    this.cache.set(cacheKey, entry);

    console.log(`💾 캐시 저장: ${cacheKey} (TTL: ${ttl / 1000}초)`);
    console.log(`📊 토큰: ${metadata.inputTokens}+${metadata.outputTokens}, 비용: $${metadata.cost.toFixed(4)}`);
  }

  /**
   * 스마트 TTL 계산 (응답 품질과 비용 기반)
   */
  public calculateSmartTTL(
    _inputTokens: number,
    outputTokens: number,
    cost: number,
    model: string
  ): number {
    const baseTtl = this.options.defaultTtl;

    // 비용이 높을수록 더 오래 캐시
    const costFactor = Math.min(2.0, 1 + (cost / 0.01)); // 최대 2배

    // 출력 토큰이 많을수록 더 오래 캐시
    const outputFactor = Math.min(1.5, 1 + (outputTokens / 1000));

    // 모델별 가중치
    const modelFactor = model.includes('gpt-4') ? 1.5 : 1.0;

    const smartTtl = baseTtl * costFactor * outputFactor * modelFactor;

    console.log(`🧮 스마트 TTL 계산: ${(smartTtl / 1000 / 60).toFixed(1)}분 (기본: ${(baseTtl / 1000 / 60).toFixed(1)}분)`);

    return Math.min(smartTtl, 7 * 24 * 60 * 60 * 1000); // 최대 7일
  }

  /**
   * 유사한 내용의 캐시 검색 (퍼지 매칭)
   */
  public async findSimilarCache(
    content: string,
    model: string,
    provider: string,
    similarityThreshold: number = 0.8
  ): Promise<{ key: string; data: any; similarity: number } | null> {
    const contentHash = createHash('md5').update(content).digest('hex');

    let bestMatch: { key: string; data: any; similarity: number } | null = null;
    let bestSimilarity = 0;

    for (const [key, entry] of this.cache.entries()) {
      // 같은 모델과 프로바이더만 검사
      if (entry.metadata.model !== model || entry.metadata.provider !== provider) {
        continue;
      }

      // TTL 확인
      if (Date.now() - entry.timestamp > entry.ttl) {
        continue;
      }

      // 단순 해시 비교 (실제로는 더 정교한 유사도 알고리즘 사용 가능)
      const similarity = this.calculateContentSimilarity(contentHash, entry.metadata.contentHash);

      if (similarity > bestSimilarity && similarity >= similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = {
          key,
          data: this.decompressData(entry.data),
          similarity
        };
      }
    }

    if (bestMatch) {
      console.log(`🔍 유사 캐시 발견: ${bestMatch.key} (유사도: ${(bestMatch.similarity * 100).toFixed(1)}%)`);
    }

    return bestMatch;
  }

  /**
   * 컨텐츠 유사도 계산 (간단한 해시 비교)
   */
  private calculateContentSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 1.0;

    // 간단한 문자 단위 유사도 계산
    let matches = 0;
    const minLength = Math.min(hash1.length, hash2.length);

    for (let i = 0; i < minLength; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }

    return matches / Math.max(hash1.length, hash2.length);
  }

  /**
   * 캐시 통계 조회
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalEntries = entries.length;
    const totalHits = this.stats.hits;
    const totalMisses = this.stats.misses;
    const hitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    const totalSize = this.calculateTotalSize();
    const timestamps = entries.map(e => e.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    const averageAccessCount = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length
      : 0;

    const costSavings = entries.reduce((sum, e) => sum + (e.metadata.cost * e.accessCount), 0);

    return {
      totalEntries,
      totalHits,
      totalMisses,
      hitRate,
      totalSize,
      oldestEntry,
      newestEntry,
      averageAccessCount,
      costSavings
    };
  }

  /**
   * 캐시 무효화 (특정 패턴)
   */
  public invalidate(pattern?: string): number {
    let removed = 0;

    if (!pattern) {
      // 전체 캐시 클리어
      removed = this.cache.size;
      this.cache.clear();
    } else {
      // 패턴 매칭으로 삭제
      for (const [key, entry] of this.cache.entries()) {
        if (key.includes(pattern) || entry.metadata.model.includes(pattern)) {
          this.cache.delete(key);
          removed++;
        }
      }
    }

    console.log(`🗑️ 캐시 무효화: ${removed}개 엔트리 삭제`);
    return removed;
  }

  /**
   * 만료된 엔트리 정리
   */
  public cleanup(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 만료된 캐시 정리: ${removed}개 엔트리 삭제`);
    }

    return removed;
  }

  /**
   * 메모리 사용량 제한 확인
   */
  private async ensureMemoryLimit(): Promise<void> {
    const currentSize = this.calculateTotalSize();
    const maxSizeBytes = this.options.maxMemoryMB * 1024 * 1024;

    if (currentSize > maxSizeBytes || this.cache.size >= this.options.maxSize) {
      await this.evictLeastRecentlyUsed();
    }
  }

  /**
   * LRU 기반 캐시 제거
   */
  private async evictLeastRecentlyUsed(): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    const removeCount = Math.ceil(this.cache.size * 0.2); // 20% 제거
    let removed = 0;

    for (const [key] of entries) {
      if (removed >= removeCount) break;
      this.cache.delete(key);
      removed++;
    }

    console.log(`🗑️ LRU 캐시 제거: ${removed}개 엔트리 삭제`);
  }

  /**
   * 총 메모리 사용량 계산
   */
  private calculateTotalSize(): number {
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalSize += JSON.stringify(entry).length * 2; // UTF-16 고려
    }

    return totalSize;
  }

  /**
   * 데이터 압축 (간단한 구현)
   */
  private compressData(data: any): any {
    if (!this.options.compressionEnabled) {
      return data;
    }

    // 실제로는 gzip 등의 압축 알고리즘 사용
    return data;
  }

  /**
   * 데이터 압축 해제
   */
  private decompressData(data: any): any {
    if (!this.options.compressionEnabled) {
      return data;
    }

    return data;
  }

  /**
   * 자동 정리 스케줄러 시작
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.autoCleanupInterval);

    console.log(`⏰ 자동 캐시 정리 스케줄 시작: ${this.options.autoCleanupInterval / 1000}초 간격`);
  }

  /**
   * 캐시 데이터 내보내기 (백업용)
   */
  public exportCache(): any {
    const exported = {
      timestamp: Date.now(),
      version: '1.0.0',
      stats: this.stats,
      entries: Array.from(this.cache.entries())
    };

    console.log(`📤 캐시 데이터 내보내기: ${this.cache.size}개 엔트리`);
    return exported;
  }

  /**
   * 캐시 데이터 가져오기 (복원용)
   */
  public importCache(data: any): boolean {
    try {
      if (!data.entries || !Array.isArray(data.entries)) {
        throw new Error('잘못된 캐시 데이터 형식');
      }

      this.cache.clear();
      this.cache = new Map(data.entries);

      if (data.stats) {
        this.stats = { ...this.stats, ...data.stats };
      }

      console.log(`📥 캐시 데이터 가져오기 완료: ${this.cache.size}개 엔트리`);
      return true;
    } catch (error) {
      console.error('❌ 캐시 데이터 가져오기 실패:', error);
      return false;
    }
  }

  /**
   * 리소스 정리
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.cache.clear();
    console.log('🧹 AI Response Cache 리소스 정리 완료');
  }
}