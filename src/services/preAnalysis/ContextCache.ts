/**
 * 컨텍스트 캐시 시스템
 * MCP 컨텍스트를 메모리에 캐시하여 성능을 최적화합니다.
 */

import { contextManager, type ContextCollectionOptions } from './ContextManager';
import type { EnrichedContext } from './MCPAIBridge';

export interface CachedContext {
  context: EnrichedContext;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  metadata: {
    cacheHit: boolean;
    generationTime: number;
    isValid: boolean;
  };
}

export interface CacheStatistics {
  totalCaches: number;
  hits: number;
  misses: number;
  hitRate: number;
  averageGenerationTime: number;
  totalMemoryUsage: number;
  oldestCache: number;
  newestCache: number;
}

export class ContextCache {
  private static instance: ContextCache;
  private cache = new Map<string, CachedContext>();
  private defaultTTL = 30 * 60 * 1000; // 30분
  private maxCacheSize = 100; // 최대 캐시 항목 수
  private cleanupInterval: NodeJS.Timeout | null = null;

  // 캐시 통계
  private stats = {
    hits: 0,
    misses: 0,
    generations: 0,
    totalGenerationTime: 0
  };

  private constructor() {
    this.startCleanupTimer();
  }

  public static getInstance(): ContextCache {
    if (!ContextCache.instance) {
      ContextCache.instance = new ContextCache();
    }
    return ContextCache.instance;
  }

  /**
   * 컨텍스트 조회 또는 생성
   */
  async getOrUpdate(
    sessionId: string,
    options: ContextCollectionOptions = {},
    forceRefresh = false
  ): Promise<EnrichedContext> {

    try {
      // 1. 캐시에서 조회
      if (!forceRefresh) {
        const cached = await this.getFromCache(sessionId);
        if (cached) {
          console.log(`🎯 컨텍스트 캐시 히트: ${sessionId} (${cached.accessCount}회 사용됨)`);
          this.stats.hits++;
          return cached.context;
        }
      }

      // 2. 캐시 미스 - 새로 생성
      console.log(`🔄 컨텍스트 새로 생성: ${sessionId}${forceRefresh ? ' (강제 새로고침)' : ''}`);
      this.stats.misses++;

      const generationStart = Date.now();
      const context = await contextManager.buildEnrichedContext(sessionId, options);
      const generationTime = Date.now() - generationStart;

      // 3. 캐시에 저장
      await this.setCache(sessionId, context, generationTime);

      // 4. 통계 업데이트
      this.stats.generations++;
      this.stats.totalGenerationTime += generationTime;

      console.log(`✅ 컨텍스트 생성 완료: ${sessionId} (${generationTime}ms)`);

      return context;

    } catch (error) {
      console.error(`❌ 컨텍스트 조회/생성 실패: ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * 캐시에서 컨텍스트 조회
   */
  private async getFromCache(sessionId: string): Promise<CachedContext | null> {
    const cached = this.cache.get(sessionId);

    if (!cached) {
      return null;
    }

    // TTL 확인
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      console.log(`⏰ 캐시 만료: ${sessionId}`);
      this.cache.delete(sessionId);
      return null;
    }

    // 접근 정보 업데이트
    cached.accessCount++;
    cached.lastAccessed = now;
    cached.metadata.cacheHit = true;

    return cached;
  }

  /**
   * 캐시에 컨텍스트 저장
   */
  private async setCache(
    sessionId: string,
    context: EnrichedContext,
    generationTime: number
  ): Promise<void> {
    try {
      // 캐시 크기 제한 확인
      if (this.cache.size >= this.maxCacheSize) {
        await this.evictOldestCache();
      }

      const now = Date.now();
      const cachedContext: CachedContext = {
        context,
        timestamp: now,
        ttl: this.calculateTTL(context),
        accessCount: 1,
        lastAccessed: now,
        metadata: {
          cacheHit: false,
          generationTime,
          isValid: true
        }
      };

      this.cache.set(sessionId, cachedContext);

      console.log(`💾 컨텍스트 캐시 저장: ${sessionId} (TTL: ${cachedContext.ttl / 1000}초)`);

    } catch (error) {
      console.error(`캐시 저장 실패: ${sessionId}:`, error);
    }
  }

  /**
   * 컨텍스트 품질 기반 TTL 계산
   */
  private calculateTTL(context: EnrichedContext): number {
    let ttl = this.defaultTTL;

    // 데이터 소스 수에 따른 TTL 조정
    const dataSourceCount = context.metadata.dataSourceCount;
    if (dataSourceCount >= 3) {
      ttl *= 1.5; // 완전한 컨텍스트는 더 오래 캐시
    } else if (dataSourceCount === 0) {
      ttl *= 0.3; // 데이터가 없으면 짧게 캐시
    }

    // 신뢰도에 따른 TTL 조정
    const confidence = context.metadata.totalConfidence;
    if (confidence > 0.8) {
      ttl *= 1.3; // 높은 신뢰도는 더 오래 캐시
    } else if (confidence < 0.4) {
      ttl *= 0.5; // 낮은 신뢰도는 짧게 캐시
    }

    return Math.max(ttl, 5 * 60 * 1000); // 최소 5분
  }

  /**
   * 가장 오래된 캐시 항목 제거
   */
  private async evictOldestCache(): Promise<void> {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ 오래된 캐시 제거: ${oldestKey}`);
    }
  }

  /**
   * 특정 컨텍스트 부분 무효화
   */
  async invalidateContextPart(
    sessionId: string,
    part: 'projectStructure' | 'marketInsights' | 'techAnalysis'
  ): Promise<void> {
    const cached = this.cache.get(sessionId);
    if (!cached) return;

    try {
      // 해당 부분을 새로 업데이트
      const updatedContext = await contextManager.updateContextPart(
        sessionId,
        part,
        cached.context
      );

      if (updatedContext) {
        // 캐시 업데이트
        cached.context = updatedContext;
        cached.timestamp = Date.now();
        cached.metadata.isValid = true;

        console.log(`🔄 컨텍스트 부분 업데이트: ${sessionId}.${part}`);
      }

    } catch (error) {
      console.error(`컨텍스트 부분 무효화 실패: ${sessionId}.${part}:`, error);
      // 실패 시 전체 캐시 무효화
      this.cache.delete(sessionId);
    }
  }

  /**
   * 캐시 완전 무효화
   */
  invalidate(sessionId: string): void {
    if (this.cache.has(sessionId)) {
      this.cache.delete(sessionId);
      console.log(`🧹 캐시 무효화: ${sessionId}`);
    }
  }

  /**
   * 모든 캐시 클리어
   */
  clearAll(): void {
    const count = this.cache.size;
    this.cache.clear();
    console.log(`🧹 전체 캐시 클리어: ${count}개 항목 제거`);
  }

  /**
   * 캐시 통계 조회
   */
  getStatistics(): CacheStatistics {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    const averageGenerationTime = this.stats.generations > 0
      ? this.stats.totalGenerationTime / this.stats.generations
      : 0;

    let oldestCache = Date.now();
    let newestCache = 0;
    let totalMemoryUsage = 0;

    for (const cached of this.cache.values()) {
      if (cached.timestamp < oldestCache) oldestCache = cached.timestamp;
      if (cached.timestamp > newestCache) newestCache = cached.timestamp;

      // 대략적인 메모리 사용량 추정
      totalMemoryUsage += JSON.stringify(cached.context).length;
    }

    return {
      totalCaches: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Number(hitRate.toFixed(2)),
      averageGenerationTime: Number(averageGenerationTime.toFixed(0)),
      totalMemoryUsage: Math.round(totalMemoryUsage / 1024), // KB
      oldestCache: this.cache.size > 0 ? oldestCache : 0,
      newestCache: this.cache.size > 0 ? newestCache : 0
    };
  }

  /**
   * 캐시 상태 조회
   */
  getCacheStatus(sessionId: string): {
    exists: boolean;
    isValid: boolean;
    ageInMinutes: number;
    accessCount: number;
    dataSourceCount: number;
    confidence: number;
  } | null {
    const cached = this.cache.get(sessionId);
    if (!cached) return null;

    const ageInMinutes = (Date.now() - cached.timestamp) / (1000 * 60);
    const isValid = (Date.now() - cached.timestamp) < cached.ttl;

    return {
      exists: true,
      isValid,
      ageInMinutes: Number(ageInMinutes.toFixed(1)),
      accessCount: cached.accessCount,
      dataSourceCount: cached.context.metadata.dataSourceCount,
      confidence: Number((cached.context.metadata.totalConfidence * 100).toFixed(1))
    };
  }

  /**
   * 만료된 캐시 정리
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 만료된 캐시 정리: ${cleanedCount}개 항목 제거`);
    }
  }

  /**
   * 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    // 5분마다 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * 정리 타이머 정지
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 캐시 프리워밍 (사전 로딩)
   */
  async preloadContext(
    sessionId: string,
    options: ContextCollectionOptions = {}
  ): Promise<void> {
    try {
      console.log(`🔥 컨텍스트 프리워밍 시작: ${sessionId}`);
      await this.getOrUpdate(sessionId, options, false);
      console.log(`✅ 컨텍스트 프리워밍 완료: ${sessionId}`);
    } catch (error) {
      console.error(`❌ 컨텍스트 프리워밍 실패: ${sessionId}:`, error);
    }
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clearAll();
    console.log('🧹 ContextCache 리소스 정리 완료');
  }
}

// 싱글톤 인스턴스 export
export const contextCache = ContextCache.getInstance();