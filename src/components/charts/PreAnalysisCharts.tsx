// 사전 분석 결과 시각화 컴포넌트
// 실제 Supabase 데이터를 기반으로 차트 생성

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'
import { Clock, DollarSign, Brain, Users, AlertTriangle } from 'lucide-react'

// 사전 분석 세션 데이터 타입
interface PreAnalysisSession {
  id: string
  aiModel: string
  aiProvider: string
  analysisDepth: string
  processingTime: number
  totalCost: number
  status: string
}

// 질문-답변 데이터 타입
interface QAData {
  category: string
  question: string
  answers: Array<{
    answer: string
    confidence: number
  }>
}

// AI 모델 성능 비교 차트
interface ModelPerformanceChartProps {
  sessions: PreAnalysisSession[]
  className?: string
}

export const ModelPerformanceChart: React.FC<ModelPerformanceChartProps> = ({
  sessions,
  className = ''
}) => {
  const modelStats = sessions.reduce((acc, session) => {
    const key = `${session.aiProvider}-${session.aiModel}`
    if (!acc[key]) {
      acc[key] = {
        model: key,
        totalSessions: 0,
        avgProcessingTime: 0,
        totalCost: 0,
        processingTimes: []
      }
    }
    acc[key].totalSessions++
    acc[key].processingTimes.push(session.processingTime)
    acc[key].totalCost += session.totalCost
    return acc
  }, {} as Record<string, any>)

  const chartData = Object.values(modelStats).map((stat: any) => ({
    model: stat.model.replace('-', ' '),
    avgProcessingTime: Math.round(stat.processingTimes.reduce((a: number, b: number) => a + b, 0) / stat.processingTimes.length),
    totalCost: parseFloat(stat.totalCost.toFixed(4)),
    sessions: stat.totalSessions
  }))

  return (
    <div className={`bg-bg-secondary rounded-lg p-6 border border-border-primary ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-text-primary">AI 모델 성능 비교</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 처리 시간 비교 */}
        <div className="h-64">
          <h4 className="text-sm font-medium text-text-secondary mb-2">평균 처리 시간 (초)</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="model"
                stroke="#9CA3AF"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar dataKey="avgProcessingTime" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 비용 비교 */}
        <div className="h-64">
          <h4 className="text-sm font-medium text-text-secondary mb-2">총 비용 ($)</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="model"
                stroke="#9CA3AF"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar dataKey="totalCost" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// 분석 깊이별 분포 차트
interface AnalysisDepthChartProps {
  sessions: PreAnalysisSession[]
  className?: string
}

export const AnalysisDepthChart: React.FC<AnalysisDepthChartProps> = ({
  sessions,
  className = ''
}) => {
  const depthStats = sessions.reduce((acc, session) => {
    acc[session.analysisDepth] = (acc[session.analysisDepth] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(depthStats).map(([depth, count]) => ({
    name: depth,
    value: count,
    color: {
      'quick': '#8B5CF6',
      'standard': '#06B6D4',
      'deep': '#F59E0B',
      'comprehensive': '#EF4444'
    }[depth] || '#6B7280'
  }))

  return (
    <div className={`bg-bg-secondary rounded-lg p-6 border border-border-primary ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-text-primary">분석 깊이 분포</h3>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, value, percent }) => `${name}: ${value}개 (${(percent * 100).toFixed(0)}%)`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 질문 카테고리별 응답률 차트
interface QACoverageChartProps {
  qaData: QAData[]
  className?: string
}

export const QACoverageChart: React.FC<QACoverageChartProps> = ({
  qaData,
  className = ''
}) => {
  const categoryStats = qaData.reduce((acc, qa) => {
    if (!acc[qa.category]) {
      acc[qa.category] = { total: 0, answered: 0 }
    }
    acc[qa.category].total++
    if (qa.answers.length > 0) {
      acc[qa.category].answered++
    }
    return acc
  }, {} as Record<string, { total: number; answered: number }>)

  const chartData = Object.entries(categoryStats).map(([category, stats]) => ({
    category,
    coverage: Math.round((stats.answered / stats.total) * 100),
    answered: stats.answered,
    total: stats.total
  }))

  return (
    <div className={`bg-bg-secondary rounded-lg p-6 border border-border-primary ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-text-primary">카테고리별 응답률</h3>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" fontSize={12} />
            <YAxis
              type="category"
              dataKey="category"
              stroke="#9CA3AF"
              fontSize={12}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
              formatter={(value, _name, props) => [
                `${value}% (${props.payload.answered}/${props.payload.total})`,
                '응답률'
              ]}
            />
            <Bar dataKey="coverage" fill="#F59E0B" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 시간별 분석 진행률 차트
interface AnalysisTimelineChartProps {
  sessions: PreAnalysisSession[]
  className?: string
}

export const AnalysisTimelineChart: React.FC<AnalysisTimelineChartProps> = ({
  sessions,
  className = ''
}) => {
  // 세션을 시간순으로 정렬하고 누적 데이터 생성
  const sortedSessions = [...sessions].sort((a, b) =>
    new Date(a.id).getTime() - new Date(b.id).getTime()
  )

  const timelineData = sortedSessions.map((session, index) => {
    const date = new Date(session.id).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
    const cumulativeCost = sortedSessions
      .slice(0, index + 1)
      .reduce((sum, s) => sum + s.totalCost, 0)

    return {
      date,
      session: session.id.slice(-8),
      processingTime: session.processingTime,
      cumulativeCost: parseFloat(cumulativeCost.toFixed(4)),
      sessionCost: session.totalCost
    }
  })

  return (
    <div className={`bg-bg-secondary rounded-lg p-6 border border-border-primary ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-text-primary">분석 진행 타임라인</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 처리 시간 트렌드 */}
        <div className="h-64">
          <h4 className="text-sm font-medium text-text-secondary mb-2">세션별 처리 시간</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                labelFormatter={(label) => `날짜: ${label}`}
                formatter={(value, _name) => [`${value}초`, '처리 시간']}
              />
              <Line
                type="monotone"
                dataKey="processingTime"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 누적 비용 */}
        <div className="h-64">
          <h4 className="text-sm font-medium text-text-secondary mb-2">누적 비용</h4>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                labelFormatter={(label) => `날짜: ${label}`}
                formatter={(value, _name) => [`$${value}`, '누적 비용']}
              />
              <Area
                type="monotone"
                dataKey="cumulativeCost"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// 메트릭 카드 컴포넌트
interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = ''
}) => {
  return (
    <div className={`bg-bg-secondary rounded-lg p-6 border border-border-primary ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            {subtitle && (
              <p className="text-xs text-text-muted">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div className={`text-sm font-medium ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  )
}

// 종합 분석 요약 카드
interface AnalysisSummaryProps {
  sessions: PreAnalysisSession[]
  qaData: QAData[]
  className?: string
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  sessions,
  qaData,
  className = ''
}) => {
  const totalSessions = sessions.length
  const totalCost = sessions.reduce((sum, session) => sum + session.totalCost, 0)
  const avgProcessingTime = sessions.length > 0
    ? sessions.reduce((sum, session) => sum + session.processingTime, 0) / sessions.length
    : 0
  const totalQuestions = qaData.length
  const answeredQuestions = qaData.filter(qa => qa.answers.length > 0).length
  const coverageRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <MetricCard
        title="분석 세션"
        value={totalSessions}
        subtitle="완료된 세션"
        icon={<Brain className="w-5 h-5 text-primary" />}
      />
      <MetricCard
        title="총 비용"
        value={`$${totalCost.toFixed(4)}`}
        subtitle="AI 분석 비용"
        icon={<DollarSign className="w-5 h-5 text-primary" />}
      />
      <MetricCard
        title="평균 처리시간"
        value={`${Math.round(avgProcessingTime)}초`}
        subtitle="세션당 처리시간"
        icon={<Clock className="w-5 h-5 text-primary" />}
      />
      <MetricCard
        title="응답률"
        value={`${Math.round(coverageRate)}%`}
        subtitle={`${answeredQuestions}/${totalQuestions} 질문`}
        icon={<Users className="w-5 h-5 text-primary" />}
      />
    </div>
  )
}