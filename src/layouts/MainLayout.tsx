import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'

export function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)

      // 모바일에서는 기본적으로 사이드바를 축소
      if (mobile && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [isSidebarCollapsed])

  // 사이드바 토글 핸들러
  const handleSidebarToggle = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed)
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <Header />

      <div className="flex h-[calc(100vh-4rem)]"> {/* header height 4rem (64px) 제외 */}
        {/* Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleSidebarToggle}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            {/* Content Container */}
            <div className="h-full p-6">
              {/* Page Content */}
              <div className="max-w-full mx-auto h-full">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && !isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-bg-primary/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}
    </div>
  )
}