import { startTransition, useDeferredValue, useState, useCallback, useMemo } from 'react'

// React 19 Concurrent Features를 활용한 성능 최적화 훅

// 1. startTransition을 활용한 상태 업데이트 최적화
export function useOptimizedSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // 긴급하지 않은 검색 결과 업데이트를 위해 startTransition 사용
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setIsSearching(true)

    // 검색 결과 업데이트는 startTransition으로 감싸서 비긴급 처리
    startTransition(() => {
      // 실제 검색 로직 (예: API 호출)
      performSearch(query).then((results) => {
        setSearchResults(results)
        setIsSearching(false)
      })
    })
  }, [])

  // 검색 함수 (실제 구현에서는 Supabase 쿼리)
  const performSearch = async (query: string) => {
    await new Promise(resolve => setTimeout(resolve, 300)) // 모의 지연
    return query ? [{ id: 1, title: `결과: ${query}` }] : []
  }

  return {
    searchQuery,
    searchResults,
    isSearching,
    handleSearch,
  }
}

// 2. useDeferredValue를 활용한 렌더링 최적화
export function useDeferredResults<T>(data: T[]) {
  // 데이터 변경 시 렌더링을 지연시켜 UI 응답성 향상
  const deferredData = useDeferredValue(data)

  // 데이터가 업데이트 중인지 확인
  const isStale = data !== deferredData

  return {
    data: deferredData,
    isStale,
  }
}

// 3. 대용량 리스트 렌더링 최적화
export function useOptimizedList<T>(items: T[], filterFn?: (item: T) => boolean) {
  const [filter, setFilter] = useState('')

  // 필터링된 아이템들을 defer하여 렌더링 성능 향상
  const filteredItems = useMemo(() => {
    if (!filter && !filterFn) return items

    return items.filter(item => {
      if (filterFn && !filterFn(item)) return false
      if (filter && typeof item === 'object' && item !== null) {
        return JSON.stringify(item).toLowerCase().includes(filter.toLowerCase())
      }
      return true
    })
  }, [items, filter, filterFn])

  const deferredItems = useDeferredValue(filteredItems)
  const isFiltering = filteredItems !== deferredItems

  // 필터 업데이트는 startTransition으로 처리
  const updateFilter = useCallback((newFilter: string) => {
    startTransition(() => {
      setFilter(newFilter)
    })
  }, [])

  return {
    items: deferredItems,
    filter,
    updateFilter,
    isFiltering,
  }
}

// 4. 프로젝트 데이터 업데이트 최적화
export function useOptimizedProjectUpdate() {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateProject = useCallback((projectId: string, updates: any) => {
    setIsUpdating(true)

    // 비긴급 업데이트는 startTransition으로 처리
    startTransition(() => {
      // 실제 Supabase 업데이트 로직
      performProjectUpdate(projectId, updates)
        .then(() => {
          setIsUpdating(false)
        })
        .catch((error) => {
          console.error('Project update failed:', error)
          setIsUpdating(false)
        })
    })
  }, [])

  const performProjectUpdate = async (projectId: string, updates: any) => {
    // 실제 구현에서는 Supabase 호출
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log('Project updated:', { projectId, updates })
  }

  return {
    updateProject,
    isUpdating,
  }
}

// 5. 대시보드 위젯 로딩 최적화
export function useDashboardOptimization() {
  const [widgetData, setWidgetData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 위젯 데이터를 defer하여 렌더링 성능 개선
  const deferredWidgetData = useDeferredValue(widgetData)
  const isWidgetStale = widgetData !== deferredWidgetData

  const loadWidgetData = useCallback(() => {
    setIsLoading(true)

    // 위젯 데이터 로딩은 startTransition으로 처리
    startTransition(() => {
      fetchDashboardWidgets()
        .then((data) => {
          setWidgetData(data)
          setIsLoading(false)
        })
        .catch((error) => {
          console.error('Failed to load widget data:', error)
          setIsLoading(false)
        })
    })
  }, [])

  const fetchDashboardWidgets = async () => {
    // 실제 구현에서는 여러 Supabase 쿼리 병렬 실행
    await new Promise(resolve => setTimeout(resolve, 800))
    return [
      { id: 1, type: 'projects', data: { count: 5 } },
      { id: 2, type: 'documents', data: { count: 12 } },
      { id: 3, type: 'analysis', data: { count: 8 } },
    ]
  }

  return {
    widgetData: deferredWidgetData,
    isWidgetStale,
    isLoading,
    loadWidgetData,
  }
}

// 6. Form 입력 최적화 (debounce + startTransition)
export function useOptimizedForm() {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // 폼 데이터를 defer하여 검증 성능 향상
  const deferredFormData = useDeferredValue(formData)
  const isValidating = formData !== deferredFormData

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // 검증은 startTransition으로 처리하여 입력 응답성 보장
    startTransition(() => {
      validateField(field, value)
        .then((error) => {
          setValidationErrors(prev => ({
            ...prev,
            [field]: error || ''
          }))
        })
    })
  }, [])

  const validateField = async (field: string, value: any): Promise<string | null> => {
    // 실제 검증 로직
    await new Promise(resolve => setTimeout(resolve, 100))

    if (field === 'email' && value && !value.includes('@')) {
      return '유효한 이메일 주소를 입력해주세요.'
    }

    if (field === 'name' && value && value.length < 2) {
      return '이름은 2글자 이상이어야 합니다.'
    }

    return null
  }

  return {
    formData: deferredFormData,
    validationErrors,
    isValidating,
    updateField,
  }
}