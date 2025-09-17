import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Grid3X3, List } from 'lucide-react'
import { useProject } from '../../contexts/ProjectContext'
import { ProjectGrid } from '../../components/projects/ProjectGrid'
import { ProjectFilters } from '../../components/projects/ProjectFilters'
import { PageContainer, PageHeader, PageContent, SearchInput, FilterButton, ViewModeToggle } from '../../components/LinearComponents'

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
    <PageContainer>
      <PageHeader
        title="프로젝트"
        subtitle={`${userProjects.length}개의 프로젝트`}
        actions={
          <button
            onClick={() => navigate('/projects/new')}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>새 프로젝트</span>
          </button>
        }
      />

      <PageContent>
        {/* 검색 및 필터 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 flex-1 max-w-2xl">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="프로젝트 검색..."
              icon={<Search className="w-4 h-4" />}
            />
            <FilterButton
              active={showFilters}
              onClick={() => setShowFilters(!showFilters)}
              icon={<Filter className="w-4 h-4" />}
            >
              필터
            </FilterButton>
          </div>

          <ViewModeToggle
            mode={viewMode}
            onChange={setViewMode}
            gridIcon={<Grid3X3 className="w-4 h-4" />}
            listIcon={<List className="w-4 h-4" />}
          />
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
      </PageContent>
    </PageContainer>
  )
}