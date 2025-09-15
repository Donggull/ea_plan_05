import { useEffect } from 'react'
import { useProjectsList, useUserAPIUsage } from '@/hooks/useProjectData'
import { useOptimizedSearch, useDeferredResults, useDashboardOptimization } from '@/hooks/useConcurrentFeatures'
import { SuspenseWrapper } from '@/components/common/SuspenseWrapper'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Search, Plus, BarChart3, FileText, Users, Zap } from 'lucide-react'

interface OptimizedDashboardProps {
  userId: string
}

// React 19 기능을 모두 활용한 최적화된 대시보드
function OptimizedDashboardInner({ userId }: OptimizedDashboardProps) {
  // React 19 use() Hook 활용
  const { projects } = useProjectsList(userId)
  const { totalTokens, totalCost } = useUserAPIUsage(userId)

  // Concurrent Features 활용
  const { searchQuery, searchResults, isSearching, handleSearch } = useOptimizedSearch()
  const { data: deferredProjects, isStale } = useDeferredResults(projects)
  const { isWidgetStale, loadWidgetData } = useDashboardOptimization()

  useEffect(() => {
    loadWidgetData()
  }, [loadWidgetData])

  return (
    <div className="space-y-6 p-6">
      {/* 검색 섹션 - startTransition 활용 */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="프로젝트 검색..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          )}
        </div>
        <button className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          <span>새 프로젝트</span>
        </button>
      </div>

      {/* 대시보드 위젯 - useDeferredValue 활용 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardWidget
          title="전체 프로젝트"
          value={deferredProjects.length}
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          isStale={isStale}
        />

        <DashboardWidget
          title="오늘 API 사용량"
          value={`${totalTokens.toLocaleString()} 토큰`}
          icon={<Zap className="h-5 w-5 text-green-600" />}
          subtitle={`₩${totalCost.toFixed(2)}`}
        />

        <DashboardWidget
          title="팀 멤버"
          value="12명"
          icon={<Users className="h-5 w-5 text-purple-600" />}
        />

        <DashboardWidget
          title="AI 분석"
          value="8개"
          icon={<BarChart3 className="h-5 w-5 text-orange-600" />}
          isStale={isWidgetStale}
        />
      </div>

      {/* 프로젝트 목록 - defer된 데이터 표시 */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">최근 프로젝트</h2>
          {isStale && (
            <div className="text-sm text-gray-500">업데이트 중...</div>
          )}
        </div>

        <div className="space-y-3">
          {deferredProjects.slice(0, 5).map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      {/* 검색 결과 */}
      {searchQuery && (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">
            검색 결과 "{searchQuery}"
          </h2>

          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <div key={index} className="rounded border p-3">
                  {result.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 위젯 컴포넌트
function DashboardWidget({
  title,
  value,
  subtitle,
  icon,
  isStale = false
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  isStale?: boolean
}) {
  return (
    <div className={`rounded-lg border bg-white p-4 ${isStale ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          {icon}
        </div>
      </div>
      {isStale && (
        <div className="mt-2 text-xs text-yellow-600">업데이트 중...</div>
      )}
    </div>
  )
}

// 프로젝트 카드 컴포넌트
function ProjectCard({ project }: { project: any }) {
  if (!project) return null
  return (
    <div className="flex items-center space-x-4 rounded-lg border p-4 hover:bg-gray-50">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
        <FileText className="h-5 w-5 text-blue-600" />
      </div>

      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{project.name}</h3>
        <p className="text-sm text-gray-500">
          {project.description || '설명 없음'}
        </p>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium text-gray-900">
          {project.status}
        </div>
        <div className="text-xs text-gray-500">
          {new Date(project.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}

// 메인 Export - ErrorBoundary와 Suspense로 감싸진 최적화된 대시보드
export function OptimizedDashboard({ userId }: OptimizedDashboardProps) {
  return (
    <ErrorBoundary>
      <SuspenseWrapper loadingType="data">
        <OptimizedDashboardInner userId={userId} />
      </SuspenseWrapper>
    </ErrorBoundary>
  )
}

export default OptimizedDashboard