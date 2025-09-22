// 프로젝트 레이아웃 컴포넌트
// 프로젝트 페이지들을 위한 공통 레이아웃

import React from 'react'

interface ProjectLayoutProps {
  children: React.ReactNode
}

const ProjectLayout: React.FC<ProjectLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg-primary">
      {children}
    </div>
  )
}

export default ProjectLayout