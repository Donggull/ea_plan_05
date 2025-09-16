import { supabase } from '../lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// 실시간 이벤트 타입 정의
export interface RealtimeEvent {
  id: string
  project_id: string
  user_id: string
  event_type: 'cursor_move' | 'text_edit' | 'selection_change' | 'user_join' | 'user_leave' | 'document_change'
  data: any
  timestamp: string
}

export interface CursorPosition {
  user_id: string
  user_name: string
  user_avatar?: string
  x: number
  y: number
  element_id?: string
  timestamp: string
}

export interface TextEdit {
  user_id: string
  document_id: string
  operation: 'insert' | 'delete' | 'replace'
  position: number
  content: string
  length?: number
  timestamp: string
}

export interface UserPresence {
  user_id: string
  user_name: string
  user_avatar?: string
  status: 'online' | 'away' | 'busy'
  current_document_id?: string
  last_seen: string
}

export class RealtimeService {
  private static channels: Map<string, RealtimeChannel> = new Map()
  private static presence: Map<string, UserPresence> = new Map()
  private static cursors: Map<string, CursorPosition> = new Map()

  /**
   * 프로젝트 채널 구독
   */
  static async subscribeToProject(
    projectId: string,
    callbacks: {
      onUserJoin?: (user: UserPresence) => void
      onUserLeave?: (userId: string) => void
      onCursorMove?: (cursor: CursorPosition) => void
      onTextEdit?: (edit: TextEdit) => void
      onDocumentChange?: (change: any) => void
      onPresenceUpdate?: (presence: UserPresence[]) => void
    }
  ): Promise<RealtimeChannel> {
    const channelName = `project:${projectId}`

    // 기존 채널이 있으면 제거
    if (this.channels.has(channelName)) {
      await this.unsubscribeFromProject(projectId)
    }

    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const channel = supabase.channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        const allPresence: UserPresence[] = []

        Object.keys(presenceState).forEach(userId => {
          const presenceData = presenceState[userId]?.[0]
          if (presenceData && typeof presenceData === 'object') {
            const presence = presenceData as unknown as UserPresence
            this.presence.set(userId, presence)
            allPresence.push(presence)
          }
        })

        callbacks.onPresenceUpdate?.(allPresence)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presenceData = newPresences?.[0]
        if (presenceData && typeof presenceData === 'object') {
          const presence = presenceData as unknown as UserPresence
          this.presence.set(key, presence)
          callbacks.onUserJoin?.(presence)
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        this.presence.delete(key)
        callbacks.onUserLeave?.(key)
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        const cursor = payload as CursorPosition
        this.cursors.set(cursor.user_id, cursor)
        callbacks.onCursorMove?.(cursor)
      })
      .on('broadcast', { event: 'text_edit' }, ({ payload }) => {
        callbacks.onTextEdit?.(payload as TextEdit)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `project_id=eq.${projectId}`
      }, (payload: RealtimePostgresChangesPayload<any>) => {
        callbacks.onDocumentChange?.(payload)
      })

    await channel.subscribe()
    this.channels.set(channelName, channel)

    return channel
  }

  /**
   * 프로젝트 채널 구독 해제
   */
  static async unsubscribeFromProject(projectId: string): Promise<void> {
    const channelName = `project:${projectId}`
    const channel = this.channels.get(channelName)

    if (channel) {
      await channel.unsubscribe()
      this.channels.delete(channelName)
    }
  }

  /**
   * 사용자 존재 상태 업데이트
   */
  static async updatePresence(
    projectId: string,
    presence: Omit<UserPresence, 'last_seen'>
  ): Promise<void> {
    const channelName = `project:${projectId}`
    const channel = this.channels.get(channelName)

    if (channel) {
      const fullPresence: UserPresence = {
        ...presence,
        last_seen: new Date().toISOString()
      }

      await channel.track(fullPresence)
      this.presence.set(presence.user_id, fullPresence)
    }
  }

  /**
   * 커서 위치 브로드캐스트
   */
  static async broadcastCursorMove(
    projectId: string,
    cursor: Omit<CursorPosition, 'timestamp'>
  ): Promise<void> {
    const channelName = `project:${projectId}`
    const channel = this.channels.get(channelName)

    if (channel) {
      const fullCursor: CursorPosition = {
        ...cursor,
        timestamp: new Date().toISOString()
      }

      await channel.send({
        type: 'broadcast',
        event: 'cursor_move',
        payload: fullCursor
      })

      this.cursors.set(cursor.user_id, fullCursor)
    }
  }

  /**
   * 텍스트 편집 브로드캐스트
   */
  static async broadcastTextEdit(
    projectId: string,
    edit: Omit<TextEdit, 'timestamp'>
  ): Promise<void> {
    const channelName = `project:${projectId}`
    const channel = this.channels.get(channelName)

    if (channel) {
      const fullEdit: TextEdit = {
        ...edit,
        timestamp: new Date().toISOString()
      }

      await channel.send({
        type: 'broadcast',
        event: 'text_edit',
        payload: fullEdit
      })
    }
  }

  /**
   * 현재 접속자 목록 가져오기
   */
  static getPresenceList(): UserPresence[] {
    return Array.from(this.presence.values())
  }

  /**
   * 현재 커서 위치 목록 가져오기
   */
  static getCursorList(): CursorPosition[] {
    return Array.from(this.cursors.values())
  }

  /**
   * 특정 사용자의 커서 위치 가져오기
   */
  static getUserCursor(userId: string): CursorPosition | undefined {
    return this.cursors.get(userId)
  }

  /**
   * 모든 채널 정리
   */
  static async cleanup(): Promise<void> {
    const unsubscribePromises = Array.from(this.channels.values()).map(channel =>
      channel.unsubscribe()
    )

    await Promise.all(unsubscribePromises)

    this.channels.clear()
    this.presence.clear()
    this.cursors.clear()
  }

  /**
   * 문서 동시 편집을 위한 operational transform 적용
   */
  static applyOperationalTransform(
    currentText: string,
    operations: TextEdit[]
  ): string {
    // 시간순으로 정렬
    const sortedOps = operations.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    let result = currentText
    let offset = 0

    for (const op of sortedOps) {
      const adjustedPosition = op.position + offset

      switch (op.operation) {
        case 'insert':
          result = result.slice(0, adjustedPosition) + op.content + result.slice(adjustedPosition)
          offset += op.content.length
          break
        case 'delete':
          const deleteLength = op.length || op.content.length
          result = result.slice(0, adjustedPosition) + result.slice(adjustedPosition + deleteLength)
          offset -= deleteLength
          break
        case 'replace':
          const replaceLength = op.length || 0
          result = result.slice(0, adjustedPosition) + op.content + result.slice(adjustedPosition + replaceLength)
          offset += op.content.length - replaceLength
          break
      }
    }

    return result
  }

  /**
   * 커서 위치 충돌 해결
   */
  static resolveCursorConflicts(cursors: CursorPosition[]): CursorPosition[] {
    const resolved: CursorPosition[] = []
    const positionMap = new Map<string, CursorPosition[]>()

    // 동일한 위치의 커서들 그룹화
    cursors.forEach(cursor => {
      const key = `${cursor.x},${cursor.y}`
      if (!positionMap.has(key)) {
        positionMap.set(key, [])
      }
      positionMap.get(key)!.push(cursor)
    })

    // 충돌 해결: 약간씩 위치 조정
    positionMap.forEach((cursorsAtPosition) => {
      if (cursorsAtPosition.length === 1) {
        resolved.push(cursorsAtPosition[0])
      } else {
        cursorsAtPosition.forEach((cursor, index) => {
          resolved.push({
            ...cursor,
            x: cursor.x + (index * 10), // 10px씩 옆으로 이동
            y: cursor.y + (index * 2)   // 2px씩 아래로 이동
          })
        })
      }
    })

    return resolved
  }
}