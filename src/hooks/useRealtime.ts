import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { RealtimeService, type UserPresence, type CursorPosition, type TextEdit } from '../services/realtimeService'

export interface UseRealtimeOptions {
  projectId: string
  documentId?: string
  enableCursorTracking?: boolean
  enableTextSync?: boolean
  cursorThrottleMs?: number
}

export interface UseRealtimeReturn {
  // 접속자 관리
  presenceList: UserPresence[]
  isConnected: boolean

  // 커서 관리
  cursors: CursorPosition[]
  updateCursor: (x: number, y: number, elementId?: string) => void

  // 텍스트 편집
  pendingEdits: TextEdit[]
  broadcastTextEdit: (edit: Omit<TextEdit, 'user_id' | 'timestamp'>) => void

  // 연결 관리
  connect: () => Promise<void>
  disconnect: () => Promise<void>

  // 상태 업데이트
  updatePresence: (status: UserPresence['status'], documentId?: string) => void
}

export function useRealtime(options: UseRealtimeOptions): UseRealtimeReturn {
  const { user } = useAuth()
  const [presenceList, setPresenceList] = useState<UserPresence[]>([])
  const [cursors, setCursors] = useState<CursorPosition[]>([])
  const [pendingEdits, setPendingEdits] = useState<TextEdit[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const cursorThrottleRef = useRef<NodeJS.Timeout>()
  const lastCursorUpdateRef = useRef<number>(0)

  // 접속자 목록 업데이트
  const handlePresenceUpdate = useCallback((presence: UserPresence[]) => {
    setPresenceList(presence)
  }, [])

  // 사용자 입장
  const handleUserJoin = useCallback((newUser: UserPresence) => {
    setPresenceList(prev => {
      const exists = prev.some(u => u.user_id === newUser.user_id)
      return exists ? prev : [...prev, newUser]
    })
  }, [])

  // 사용자 퇴장
  const handleUserLeave = useCallback((userId: string) => {
    setPresenceList(prev => prev.filter(u => u.user_id !== userId))
    setCursors(prev => prev.filter(c => c.user_id !== userId))
  }, [])

  // 커서 이동
  const handleCursorMove = useCallback((cursor: CursorPosition) => {
    // 자신의 커서는 표시하지 않음
    if (cursor.user_id === user?.id) return

    setCursors(prev => {
      const others = prev.filter(c => c.user_id !== cursor.user_id)
      return [...others, cursor]
    })
  }, [user?.id])

  // 텍스트 편집
  const handleTextEdit = useCallback((edit: TextEdit) => {
    // 자신의 편집은 제외
    if (edit.user_id === user?.id) return

    setPendingEdits(prev => [...prev, edit])
  }, [user?.id])

  // 문서 변경
  const handleDocumentChange = useCallback((change: any) => {
    // 문서 변경 시 필요한 처리
    console.log('Document changed:', change)
  }, [])

  // 실시간 연결
  const connect = useCallback(async () => {
    if (!user || isConnected) return

    try {
      await RealtimeService.subscribeToProject(options.projectId, {
        onPresenceUpdate: handlePresenceUpdate,
        onUserJoin: handleUserJoin,
        onUserLeave: handleUserLeave,
        onCursorMove: options.enableCursorTracking ? handleCursorMove : undefined,
        onTextEdit: options.enableTextSync ? handleTextEdit : undefined,
        onDocumentChange: handleDocumentChange
      })

      // 자신의 존재 상태 업데이트
      await RealtimeService.updatePresence(options.projectId, {
        user_id: user.id,
        user_name: user.user_metadata?.['full_name'] || user.email || 'Unknown User',
        user_avatar: user.user_metadata?.['avatar_url'],
        status: 'online',
        current_document_id: options.documentId
      })

      setIsConnected(true)
    } catch (error) {
      console.error('Failed to connect to realtime:', error)
    }
  }, [
    user,
    isConnected,
    options.projectId,
    options.documentId,
    options.enableCursorTracking,
    options.enableTextSync,
    handlePresenceUpdate,
    handleUserJoin,
    handleUserLeave,
    handleCursorMove,
    handleTextEdit,
    handleDocumentChange
  ])

  // 실시간 연결 해제
  const disconnect = useCallback(async () => {
    if (!isConnected) return

    try {
      await RealtimeService.unsubscribeFromProject(options.projectId)
      setIsConnected(false)
      setPresenceList([])
      setCursors([])
      setPendingEdits([])
    } catch (error) {
      console.error('Failed to disconnect from realtime:', error)
    }
  }, [isConnected, options.projectId])

  // 커서 위치 업데이트 (스로틀링 적용)
  const updateCursor = useCallback((x: number, y: number, elementId?: string) => {
    if (!user || !isConnected || !options.enableCursorTracking) return

    const now = Date.now()
    const throttleMs = options.cursorThrottleMs || 100

    if (now - lastCursorUpdateRef.current < throttleMs) {
      // 스로틀링: 기존 타이머 취소하고 새로 설정
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current)
      }

      cursorThrottleRef.current = setTimeout(() => {
        RealtimeService.broadcastCursorMove(options.projectId, {
          user_id: user.id,
          user_name: user.user_metadata?.['full_name'] || user.email || 'Unknown User',
          user_avatar: user.user_metadata?.['avatar_url'],
          x,
          y,
          element_id: elementId
        })
        lastCursorUpdateRef.current = Date.now()
      }, throttleMs)

      return
    }

    // 즉시 전송
    RealtimeService.broadcastCursorMove(options.projectId, {
      user_id: user.id,
      user_name: user.user_metadata?.['full_name'] || user.email || 'Unknown User',
      user_avatar: user.user_metadata?.['avatar_url'],
      x,
      y,
      element_id: elementId
    })
    lastCursorUpdateRef.current = now
  }, [user, isConnected, options.enableCursorTracking, options.cursorThrottleMs, options.projectId])

  // 텍스트 편집 브로드캐스트
  const broadcastTextEdit = useCallback((edit: Omit<TextEdit, 'user_id' | 'timestamp'>) => {
    if (!user || !isConnected || !options.enableTextSync) return

    RealtimeService.broadcastTextEdit(options.projectId, {
      ...edit,
      user_id: user.id
    })
  }, [user, isConnected, options.enableTextSync, options.projectId])

  // 존재 상태 업데이트
  const updatePresence = useCallback((status: UserPresence['status'], documentId?: string) => {
    if (!user || !isConnected) return

    RealtimeService.updatePresence(options.projectId, {
      user_id: user.id,
      user_name: user.user_metadata?.['full_name'] || user.email || 'Unknown User',
      user_avatar: user.user_metadata?.['avatar_url'],
      status,
      current_document_id: documentId || options.documentId
    })
  }, [user, isConnected, options.projectId, options.documentId])

  // 자동 연결/해제
  useEffect(() => {
    if (user && options.projectId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [user, options.projectId, connect, disconnect])

  // 페이지 이탈 시 정리
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isConnected) {
        RealtimeService.unsubscribeFromProject(options.projectId)
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away')
      } else {
        updatePresence('online')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isConnected, options.projectId, updatePresence])

  // 커서 위치 충돌 해결
  const resolvedCursors = RealtimeService.resolveCursorConflicts(cursors)

  return {
    presenceList,
    isConnected,
    cursors: resolvedCursors,
    updateCursor,
    pendingEdits,
    broadcastTextEdit,
    connect,
    disconnect,
    updatePresence
  }
}