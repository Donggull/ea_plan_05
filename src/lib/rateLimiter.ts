/**
 * 고급 Rate Limiter 유틸리티
 * - 요청 제한 (분당, 시간당, 일일)
 * - 동시 요청 제한
 * - 사용자 등급별 차등 적용
 * - 토큰 버킷 알고리즘 구현
 */

interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  concurrentRequests: number
  burstAllowance: number // 버스트 허용량
  windowSize: number // 시간 윈도우 크기 (밀리초)
}

interface TokenBucket {
  tokens: number
  lastRefill: number
  capacity: number
  refillRate: number // tokens per second
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
  reason?: string
}

interface UserLimits {
  admin: RateLimitConfig
  subadmin: RateLimitConfig
  user: RateLimitConfig
}

export class RateLimiter {
  private static readonly USER_LIMITS: UserLimits = {
    admin: {
      requestsPerMinute: -1, // 무제한
      requestsPerHour: -1,
      requestsPerDay: -1,
      concurrentRequests: 50,
      burstAllowance: 100,
      windowSize: 60000 // 1분
    },
    subadmin: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      concurrentRequests: 20,
      burstAllowance: 50,
      windowSize: 60000
    },
    user: {
      requestsPerMinute: 30,
      requestsPerHour: 300,
      requestsPerDay: 1000,
      concurrentRequests: 5,
      burstAllowance: 10,
      windowSize: 60000
    }
  }

  // 메모리 기반 저장소 (실제 환경에서는 Redis 사용 권장)
  private static requestCounts = new Map<string, any>()
  private static tokenBuckets = new Map<string, TokenBucket>()
  private static activeRequests = new Map<string, number>()

  /**
   * 사용자 역할에 따른 제한 설정 조회
   */
  private static getLimits(role: string, userLevel?: number): RateLimitConfig {
    const baseLimits = this.USER_LIMITS[role as keyof UserLimits] || this.USER_LIMITS.user

    if (role === 'admin') {
      return baseLimits // 관리자는 무제한
    }

    // 사용자 레벨에 따른 보정
    const levelMultiplier = userLevel ? Math.min(1 + (userLevel - 1) * 0.2, 2) : 1

    return {
      requestsPerMinute: baseLimits.requestsPerMinute === -1 ? -1 : Math.floor(baseLimits.requestsPerMinute * levelMultiplier),
      requestsPerHour: baseLimits.requestsPerHour === -1 ? -1 : Math.floor(baseLimits.requestsPerHour * levelMultiplier),
      requestsPerDay: baseLimits.requestsPerDay === -1 ? -1 : Math.floor(baseLimits.requestsPerDay * levelMultiplier),
      concurrentRequests: Math.floor(baseLimits.concurrentRequests * levelMultiplier),
      burstAllowance: Math.floor(baseLimits.burstAllowance * levelMultiplier),
      windowSize: baseLimits.windowSize
    }
  }

  /**
   * 토큰 버킷 초기화 또는 조회
   */
  private static getTokenBucket(
    userId: string,
    capacity: number,
    refillRate: number
  ): TokenBucket {
    const key = `bucket_${userId}`
    const now = Date.now()

    if (!this.tokenBuckets.has(key)) {
      this.tokenBuckets.set(key, {
        tokens: capacity,
        lastRefill: now,
        capacity,
        refillRate
      })
    }

    const bucket = this.tokenBuckets.get(key)!

    // 토큰 보충
    const timePassed = (now - bucket.lastRefill) / 1000
    const tokensToAdd = timePassed * refillRate
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now

    return bucket
  }

  /**
   * 요청 가능 여부 확인 (토큰 버킷 알고리즘)
   */
  static async checkRateLimit(
    userId: string,
    role: string,
    userLevel?: number,
    requestWeight: number = 1
  ): Promise<RateLimitResult> {
    const limits = this.getLimits(role, userLevel)
    const now = Date.now()

    // 관리자는 무제한
    if (role === 'admin') {
      return {
        allowed: true,
        remaining: -1,
        resetTime: now + limits.windowSize
      }
    }

    try {
      // 1. 토큰 버킷 확인 (분당 제한)
      const bucketResult = await this.checkTokenBucket(
        userId,
        limits.requestsPerMinute,
        limits.burstAllowance,
        requestWeight
      )

      if (!bucketResult.allowed) {
        return bucketResult
      }

      // 2. 시간당 제한 확인
      const hourlyResult = await this.checkTimeWindow(
        userId,
        'hourly',
        limits.requestsPerHour,
        3600000, // 1시간
        requestWeight
      )

      if (!hourlyResult.allowed) {
        return hourlyResult
      }

      // 3. 일일 제한 확인
      const dailyResult = await this.checkTimeWindow(
        userId,
        'daily',
        limits.requestsPerDay,
        86400000, // 24시간
        requestWeight
      )

      if (!dailyResult.allowed) {
        return dailyResult
      }

      // 4. 동시 요청 수 확인
      const concurrentResult = this.checkConcurrentRequests(
        userId,
        limits.concurrentRequests
      )

      if (!concurrentResult.allowed) {
        return concurrentResult
      }

      // 모든 검사 통과 - 요청 허용
      return {
        allowed: true,
        remaining: Math.min(
          bucketResult.remaining,
          hourlyResult.remaining,
          dailyResult.remaining
        ),
        resetTime: now + limits.windowSize
      }
    } catch (error) {
      console.error('Rate limit 확인 오류:', error)
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + limits.windowSize,
        reason: 'Rate limit 확인 중 오류가 발생했습니다'
      }
    }
  }

  /**
   * 토큰 버킷 알고리즘 구현
   */
  private static async checkTokenBucket(
    userId: string,
    capacity: number,
    refillRate: number,
    tokens: number
  ): Promise<RateLimitResult> {
    if (capacity === -1) {
      return {
        allowed: true,
        remaining: -1,
        resetTime: Date.now() + 60000
      }
    }

    const bucket = this.getTokenBucket(userId, capacity, refillRate / 60) // per second

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime: Date.now() + 60000
      }
    }

    // 토큰 부족 - 다음 토큰까지의 대기 시간 계산
    const tokensNeeded = tokens - bucket.tokens
    const waitTime = Math.ceil((tokensNeeded / bucket.refillRate) * 1000)

    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + waitTime,
      retryAfter: waitTime,
      reason: `분당 요청 제한 초과 (${capacity}회)`
    }
  }

  /**
   * 시간 윈도우 기반 제한 확인
   */
  private static async checkTimeWindow(
    userId: string,
    window: string,
    limit: number,
    windowSize: number,
    requestWeight: number
  ): Promise<RateLimitResult> {
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        resetTime: Date.now() + windowSize
      }
    }

    const key = `${window}_${userId}`
    const now = Date.now()
    const windowStart = now - windowSize

    // 현재 윈도우 데이터 조회
    let windowData = this.requestCounts.get(key) || {
      requests: [],
      totalWeight: 0
    }

    // 만료된 요청 제거
    windowData.requests = windowData.requests.filter((req: any) => req.timestamp > windowStart)
    windowData.totalWeight = windowData.requests.reduce((sum: number, req: any) => sum + req.weight, 0)

    // 제한 확인
    if (windowData.totalWeight + requestWeight > limit) {
      const oldestRequest = windowData.requests[0]
      const resetTime = oldestRequest ? oldestRequest.timestamp + windowSize : now + windowSize

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: resetTime - now,
        reason: `${window === 'hourly' ? '시간당' : '일일'} 요청 제한 초과 (${limit}회)`
      }
    }

    // 요청 기록
    windowData.requests.push({
      timestamp: now,
      weight: requestWeight
    })
    windowData.totalWeight += requestWeight

    this.requestCounts.set(key, windowData)

    return {
      allowed: true,
      remaining: limit - windowData.totalWeight,
      resetTime: now + windowSize
    }
  }

  /**
   * 동시 요청 수 확인
   */
  private static checkConcurrentRequests(
    userId: string,
    limit: number
  ): RateLimitResult {
    const currentCount = this.activeRequests.get(userId) || 0

    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        reason: `동시 요청 수 제한 초과 (${limit}개)`
      }
    }

    return {
      allowed: true,
      remaining: limit - currentCount,
      resetTime: Date.now() + 60000
    }
  }

  /**
   * 요청 시작 추적
   */
  static trackRequestStart(userId: string): void {
    const currentCount = this.activeRequests.get(userId) || 0
    this.activeRequests.set(userId, currentCount + 1)
  }

  /**
   * 요청 완료 추적
   */
  static trackRequestEnd(userId: string): void {
    const currentCount = this.activeRequests.get(userId) || 0
    if (currentCount > 0) {
      this.activeRequests.set(userId, currentCount - 1)
    }
  }

  /**
   * 사용자 제한 상태 조회
   */
  static async getLimitStatus(
    userId: string,
    role: string,
    userLevel?: number
  ): Promise<{
    limits: RateLimitConfig
    current: {
      minuteRequests: number
      hourRequests: number
      dayRequests: number
      concurrentRequests: number
    }
    remaining: {
      minuteRemaining: number
      hourRemaining: number
      dayRemaining: number
      concurrentRemaining: number
    }
    resetTimes: {
      minuteReset: number
      hourReset: number
      dayReset: number
    }
  }> {
    const limits = this.getLimits(role, userLevel)
    const now = Date.now()

    // 현재 사용량 계산
    const minuteData = this.requestCounts.get(`minute_${userId}`) || { totalWeight: 0 }
    const hourData = this.requestCounts.get(`hourly_${userId}`) || { totalWeight: 0 }
    const dayData = this.requestCounts.get(`daily_${userId}`) || { totalWeight: 0 }
    const concurrentCount = this.activeRequests.get(userId) || 0

    return {
      limits,
      current: {
        minuteRequests: minuteData.totalWeight || 0,
        hourRequests: hourData.totalWeight || 0,
        dayRequests: dayData.totalWeight || 0,
        concurrentRequests: concurrentCount
      },
      remaining: {
        minuteRemaining: limits.requestsPerMinute === -1 ? -1 : Math.max(0, limits.requestsPerMinute - (minuteData.totalWeight || 0)),
        hourRemaining: limits.requestsPerHour === -1 ? -1 : Math.max(0, limits.requestsPerHour - (hourData.totalWeight || 0)),
        dayRemaining: limits.requestsPerDay === -1 ? -1 : Math.max(0, limits.requestsPerDay - (dayData.totalWeight || 0)),
        concurrentRemaining: Math.max(0, limits.concurrentRequests - concurrentCount)
      },
      resetTimes: {
        minuteReset: now + 60000,
        hourReset: now + 3600000,
        dayReset: now + 86400000
      }
    }
  }

  /**
   * 긴급 제한 해제 (관리자 전용)
   */
  static emergencyReset(userId: string): void {
    const keys = Array.from(this.requestCounts.keys()).filter(key => key.includes(userId))
    keys.forEach(key => this.requestCounts.delete(key))

    this.tokenBuckets.delete(`bucket_${userId}`)
    this.activeRequests.delete(userId)
  }

  /**
   * 글로벌 통계
   */
  static getGlobalStats(): {
    totalUsers: number
    totalActiveRequests: number
    averageRequestsPerUser: number
    topUsers: { userId: string; requests: number }[]
  } {
    const totalUsers = new Set([
      ...Array.from(this.activeRequests.keys()),
      ...Array.from(this.requestCounts.keys()).map(key => key.split('_')[1])
    ]).size

    const totalActiveRequests = Array.from(this.activeRequests.values())
      .reduce((sum, count) => sum + count, 0)

    const userRequestCounts: Record<string, number> = {}
    this.requestCounts.forEach((data, key) => {
      const userId = key.split('_')[1]
      if (userId) {
        userRequestCounts[userId] = (userRequestCounts[userId] || 0) + (data.totalWeight || 0)
      }
    })

    const topUsers = Object.entries(userRequestCounts)
      .map(([userId, requests]) => ({ userId, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)

    return {
      totalUsers,
      totalActiveRequests,
      averageRequestsPerUser: totalUsers > 0 ? totalActiveRequests / totalUsers : 0,
      topUsers
    }
  }

  /**
   * 정리 작업 (메모리 관리)
   */
  static cleanup(): void {
    const now = Date.now()

    // 만료된 요청 카운트 정리
    this.requestCounts.forEach((data, key) => {
      if (data.requests) {
        const windowSize = key.includes('daily') ? 86400000 : key.includes('hourly') ? 3600000 : 60000
        data.requests = data.requests.filter((req: any) => now - req.timestamp < windowSize)
        data.totalWeight = data.requests.reduce((sum: number, req: any) => sum + req.weight, 0)

        if (data.requests.length === 0) {
          this.requestCounts.delete(key)
        }
      }
    })

    // 비활성 토큰 버킷 정리
    this.tokenBuckets.forEach((bucket, key) => {
      if (now - bucket.lastRefill > 3600000) { // 1시간 이상 비활성
        this.tokenBuckets.delete(key)
      }
    })

    // 0개 요청 사용자 정리
    this.activeRequests.forEach((count, userId) => {
      if (count <= 0) {
        this.activeRequests.delete(userId)
      }
    })
  }
}

// 주기적 정리 작업 (5분마다)
if (typeof window !== 'undefined') {
  setInterval(() => {
    RateLimiter.cleanup()
  }, 5 * 60 * 1000)
}