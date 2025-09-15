import { Routes, Route, Navigate } from 'react-router-dom'
import { withPermission } from '@/lib/middleware/permissionCheck'
import UserManagement from './UserManagement'
import ApiUsageControl from './ApiUsageControl'
import ProjectOverview from './ProjectOverview'
import McpServerManager from './McpServerManager'
import AiModelManager from './AiModelManager'
import AdminDashboard from './AdminDashboard'

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/users" element={<UserManagement />} />
      <Route path="/api-usage" element={<ApiUsageControl />} />
      <Route path="/projects" element={<ProjectOverview />} />
      <Route path="/mcp-servers" element={<McpServerManager />} />
      <Route path="/ai-models" element={<AiModelManager />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

// 관리자 권한이 있는 사용자만 접근 가능
export default withPermission(AdminRoutes, 'users', 'read')