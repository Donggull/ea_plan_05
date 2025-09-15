import { useState, useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'

// React 19 자동 배치 업데이트 최적화 훅

interface BatchUpdate {
  id: string
  type: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
}

interface BatchUpdateOptions {
  batchSize?: number
  debounceMs?: number
  forceSync?: boolean
}

// 1. 배치 업데이트 관리 훅
export function useBatchUpdates(options: BatchUpdateOptions = {}) {
  const {
    batchSize = 10,
    debounceMs = 500,
    forceSync = false
  } = options

  const [pendingUpdates, setPendingUpdates] = useState<BatchUpdate[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // 배치 처리 실행
  const processBatch = useCallback(async (updates: BatchUpdate[]) => {
    if (updates.length === 0) return

    setIsProcessing(true)

    try {
      // 업데이트 타입별로 그룹화
      const groupedUpdates = updates.reduce((acc, update) => {
        if (!acc[update.type]) acc[update.type] = []
        acc[update.type].push(update)
        return acc
      }, {} as Record<string, BatchUpdate[]>)

      // 각 타입별로 배치 처리
      for (const [type, typeUpdates] of Object.entries(groupedUpdates)) {
        await processBatchByType(type as BatchUpdate['type'], typeUpdates)
      }

      // 처리 완료된 업데이트 제거
      setPendingUpdates(prev =>
        prev.filter(update => !updates.includes(update))
      )

    } catch (error) {
      console.error('Batch processing failed:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [])

  // 타입별 배치 처리
  const processBatchByType = async (type: BatchUpdate['type'], updates: BatchUpdate[]) => {
    console.log(`Processing ${updates.length} ${type} operations`)

    // 실제 구현에서는 Supabase 배치 쿼리 사용
    switch (type) {
      case 'create':
        // Bulk insert
        break
      case 'update':
        // Bulk update
        break
      case 'delete':
        // Bulk delete
        break
    }

    // 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // 업데이트 추가
  const addUpdate = useCallback((update: Omit<BatchUpdate, 'timestamp'>) => {
    const newUpdate: BatchUpdate = {
      ...update,
      timestamp: Date.now()
    }

    if (forceSync) {
      // 동기적 업데이트 (flushSync 사용)
      flushSync(() => {
        setPendingUpdates(prev => [...prev, newUpdate])
      })
    } else {
      // 비동기 업데이트 (React 19 자동 배치)
      setPendingUpdates(prev => [...prev, newUpdate])
    }

    // 디바운스 처리
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setPendingUpdates(current => {
        if (current.length >= batchSize) {
          const batch = current.slice(0, batchSize)
          processBatch(batch)
          return current.slice(batchSize)
        } else if (current.length > 0) {
          processBatch(current)
          return []
        }
        return current
      })
    }, debounceMs)
  }, [batchSize, debounceMs, forceSync, processBatch])

  // 즉시 플러시
  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (pendingUpdates.length > 0) {
      processBatch(pendingUpdates)
    }
  }, [pendingUpdates, processBatch])

  return {
    pendingCount: pendingUpdates.length,
    isProcessing,
    addUpdate,
    flushUpdates,
  }
}

// 2. 폼 상태 배치 업데이트 훅
export function useFormBatchUpdates() {
  const [formState, setFormState] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const updateQueue = useRef<Array<{ field: string; value: any }>>([])

  // 배치 필드 업데이트
  const updateFields = useCallback((updates: Record<string, any>) => {
    // React 19 자동 배치를 활용한 다중 상태 업데이트
    Object.entries(updates).forEach(([field, value]) => {
      updateQueue.current.push({ field, value })
    })

    // 배치로 상태 업데이트
    setFormState(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }, [])

  // 단일 필드 업데이트
  const updateField = useCallback((field: string, value: any) => {
    updateFields({ [field]: value })
  }, [updateFields])

  // 변경사항 커밋
  const commitChanges = useCallback(() => {
    const changes = updateQueue.current
    updateQueue.current = []
    setHasChanges(false)
    return changes
  }, [])

  // 변경사항 리셋
  const resetChanges = useCallback(() => {
    updateQueue.current = []
    setHasChanges(false)
  }, [])

  return {
    formState,
    hasChanges,
    updateField,
    updateFields,
    commitChanges,
    resetChanges,
  }
}

// 3. 리스트 아이템 배치 업데이트 훅
export function useListBatchUpdates<T extends { id: string }>() {
  const [items, setItems] = useState<T[]>([])
  const { addUpdate, pendingCount, isProcessing, flushUpdates } = useBatchUpdates({
    batchSize: 5,
    debounceMs: 300
  })

  // 아이템 추가
  const addItem = useCallback((item: T) => {
    setItems(prev => [...prev, item])
    addUpdate({
      id: item.id,
      type: 'create',
      data: item
    })
  }, [addUpdate])

  // 아이템 업데이트
  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ))
    addUpdate({
      id,
      type: 'update',
      data: updates
    })
  }, [addUpdate])

  // 아이템 삭제
  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
    addUpdate({
      id,
      type: 'delete',
      data: { id }
    })
  }, [addUpdate])

  // 다중 아이템 업데이트
  const updateMultipleItems = useCallback((updates: Array<{ id: string; data: Partial<T> }>) => {
    // React 19 자동 배치를 활용하여 한 번에 여러 상태 업데이트
    updates.forEach(({ id, data }) => {
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, ...data } : item
      ))
      addUpdate({
        id,
        type: 'update',
        data
      })
    })
  }, [addUpdate])

  return {
    items,
    pendingCount,
    isProcessing,
    addItem,
    updateItem,
    removeItem,
    updateMultipleItems,
    flushUpdates,
  }
}

// 4. 실시간 동기화를 위한 배치 업데이트 훅
export function useRealtimeBatchSync<T>() {
  const [localData, setLocalData] = useState<T[]>([])
  const [remoteData, setRemoteData] = useState<T[]>([])
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'conflict'>('synced')

  // 로컬 변경사항 배치 동기화
  const syncBatch = useCallback(async (changes: BatchUpdate[]) => {
    setSyncStatus('syncing')

    try {
      // 배치로 원격 동기화
      const results = await Promise.allSettled(
        changes.map(change => syncSingleChange(change))
      )

      const conflicts = results.filter(result => result.status === 'rejected')

      if (conflicts.length > 0) {
        setSyncStatus('conflict')
        console.warn('Sync conflicts detected:', conflicts)
      } else {
        setSyncStatus('synced')
      }

    } catch (error) {
      console.error('Batch sync failed:', error)
      setSyncStatus('conflict')
    }
  }, [])

  const syncSingleChange = async (change: BatchUpdate) => {
    // 실제 원격 동기화 로직
    await new Promise(resolve => setTimeout(resolve, 50))
    return change
  }

  return {
    localData,
    remoteData,
    syncStatus,
    setLocalData,
    setRemoteData,
    syncBatch,
  }
}