import { ChevronDown } from 'lucide-react'

interface ProjectFiltersProps {
  filters: {
    status: string
    sortBy: string
    sortOrder: 'asc' | 'desc'
  }
  onFiltersChange: (filters: any) => void
}

export function ProjectFilters({ filters, onFiltersChange }: ProjectFiltersProps) {
  const statusOptions = [
    { value: 'all', label: '전체 상태' },
    { value: 'planning', label: '계획 중' },
    { value: 'active', label: '진행 중' },
    { value: 'in_progress', label: '진행 중' },
    { value: 'completed', label: '완료' },
    { value: 'on_hold', label: '보류' },
    { value: 'cancelled', label: '취소' },
  ]

  const sortOptions = [
    { value: 'updated_at', label: '최근 업데이트' },
    { value: 'created_at', label: '생성일' },
    { value: 'name', label: '이름' },
    { value: 'status', label: '상태' },
  ]

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 상태 필터 */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            상태
          </label>
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full appearance-none bg-bg-primary border border-border-primary rounded-lg px-3 py-2 pr-8 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* 정렬 기준 */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            정렬 기준
          </label>
          <div className="relative">
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full appearance-none bg-bg-primary border border-border-primary rounded-lg px-3 py-2 pr-8 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* 정렬 순서 */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            정렬 순서
          </label>
          <div className="relative">
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="w-full appearance-none bg-bg-primary border border-border-primary rounded-lg px-3 py-2 pr-8 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="desc">내림차순</option>
              <option value="asc">오름차순</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 필터 초기화 */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() =>
            onFiltersChange({
              status: 'all',
              sortBy: 'updated_at',
              sortOrder: 'desc',
            })
          }
          className="px-3 py-1 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          필터 초기화
        </button>
      </div>
    </div>
  )
}