import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Grid3X3, List } from 'lucide-react'
import { useProject } from '../../contexts/ProjectContext'
import { ProjectGrid } from '../../components/projects/ProjectGrid'
import { ProjectFilters } from '../../components/projects/ProjectFilters'

export function ProjectsPage() {
  const navigate = useNavigate()
  const { state: projectState } = useProject()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'updated_at',
    sortOrder: 'desc' as 'asc' | 'desc'
  })

  const { userProjects, loading, error } = projectState

  // 프로젝트 필터링 및 검색
  const filteredProjects = userProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filters.status === 'all' || project.status === filters.status

    return matchesSearch && matchesStatus
  })

  // 프로젝트 정렬
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const aValue = a[filters.sortBy as keyof typeof a] || ''
    const bValue = b[filters.sortBy as keyof typeof b] || ''

    if (filters.sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <div className="border-b border-border-primary bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">프로젝트</h1>
              <p className="text-text-secondary mt-1">
                {userProjects.length}개의 프로젝트
              </p>
            </div>

            <button
              onClick={() => navigate('/projects/new')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>새 프로젝트</span>
            </button>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 flex-1 max-w-2xl">
            {/* 검색 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder-text-muted"
              />
            </div>

            {/* 필터 버튼 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-bg-secondary text-text-secondary border-border-primary hover:text-text-primary'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>필터</span>
            </button>
          </div>

          {/* 뷰 모드 토글 */}
          <div className="flex items-center space-x-1 bg-bg-secondary rounded-lg p-1 border border-border-primary">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-500 text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-500 text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="mb-6">
            <ProjectFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
        )}

        {/* 프로젝트 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-text-secondary">프로젝트를 불러오는 중...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-accent-red">{error}</div>
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-text-secondary mb-4">
              {searchQuery || filters.status !== 'all'
                ? '검색 조건에 맞는 프로젝트가 없습니다.'
                : '아직 프로젝트가 없습니다.'
              }
            </div>
            {!searchQuery && filters.status === 'all' && (
              <button
                onClick={() => navigate('/projects/new')}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>첫 번째 프로젝트 만들기</span>
              </button>
            )}
          </div>
        ) : (
          <ProjectGrid
            projects={sortedProjects}
            viewMode={viewMode}
          />
        )}
      </div>
    </div>
  )
}