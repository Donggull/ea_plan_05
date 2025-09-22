// 분석 보고서용 차트 컴포넌트
// 위험 분석, 비용 분석, 일정 분석 등을 시각화

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
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'

// 위험 분포 차트
interface RiskDistributionChartProps {
  data: {
    high: number
    medium: number
    low: number
  }
  className?: string
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ data, className = '' }) => {
  const chartData = [
    { name: '높음', value: data.high, color: '#ef4444' },
    { name: '보통', value: data.medium, color: '#f59e0b' },
    { name: '낮음', value: data.low, color: '#10b981' }
  ]

  const total = data.high + data.medium + data.low

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">위험 분포</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#f9fafb'
              }}
              formatter={(value: number) => [`${value}개`, '위험 수']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-4">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-300">
              {item.name}: {item.value}개 ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 비용 분석 차트
interface CostAnalysisChartProps {
  data: Array<{
    category: string
    amount: number
    percentage: number
  }>
  className?: string
}

export const CostAnalysisChart: React.FC<CostAnalysisChartProps> = ({ data, className = '' }) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">비용 분석</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="category"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value: number) => `${(value / 1000000).toFixed(0)}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#f9fafb'
              }}
              formatter={(value: number) => [`₩${(value / 1000000).toFixed(1)}M`, '비용']}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 일정 분석 차트
interface TimelineChartProps {
  data: Array<{
    phase: string
    start: number
    duration: number
    progress: number
  }>
  className?: string
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ data, className = '' }) => {
  const chartData = data.map((item, index) => ({
    ...item,
    end: item.start + item.duration,
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
  }))

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">프로젝트 일정</h3>
      <div className="space-y-4">
        {chartData.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-300">{item.phase}</span>
              <span className="text-xs text-gray-400">{item.duration}일</span>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${item.progress}%`,
                    backgroundColor: item.color
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>시작</span>
                <span>{item.progress}% 완료</span>
                <span>완료</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 기술 분석 레이더 차트
interface TechAnalysisRadarProps {
  data: {
    scalability: number
    performance: number
    security: number
    maintainability: number
    usability: number
  }
  className?: string
}

export const TechAnalysisRadar: React.FC<TechAnalysisRadarProps> = ({ data, className = '' }) => {
  const radarData = [
    { subject: '확장성', A: data.scalability, fullMark: 100 },
    { subject: '성능', A: data.performance, fullMark: 100 },
    { subject: '보안', A: data.security, fullMark: 100 },
    { subject: '유지보수성', A: data.maintainability, fullMark: 100 },
    { subject: '사용성', A: data.usability, fullMark: 100 }
  ]

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">기술 분석</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
            <PolarGrid gridType="polygon" stroke="#374151" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              className="text-xs"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickCount={6}
            />
            <Radar
              name="기술 점수"
              dataKey="A"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 위험 점수 트렌드 차트
interface RiskTrendChartProps {
  data: Array<{
    date: string
    overall: number
    technical: number
    business: number
    operational: number
  }>
  className?: string
}

export const RiskTrendChart: React.FC<RiskTrendChartProps> = ({ data, className = '' }) => {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">위험 점수 추이</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#f9fafb'
              }}
            />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="#ef4444"
              strokeWidth={3}
              name="전체"
            />
            <Line
              type="monotone"
              dataKey="technical"
              stroke="#3b82f6"
              strokeWidth={2}
              name="기술적"
            />
            <Line
              type="monotone"
              dataKey="business"
              stroke="#10b981"
              strokeWidth={2}
              name="비즈니스"
            />
            <Line
              type="monotone"
              dataKey="operational"
              stroke="#f59e0b"
              strokeWidth={2}
              name="운영"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ROI 분석 차트
interface ROIAnalysisChartProps {
  data: Array<{
    period: string
    investment: number
    revenue: number
    roi: number
  }>
  className?: string
}

export const ROIAnalysisChart: React.FC<ROIAnalysisChartProps> = ({ data, className = '' }) => {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">ROI 분석</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="period"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value: number) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#f9fafb'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'roi') return [`${value}%`, 'ROI']
                return [`₩${(value / 1000000).toFixed(1)}M`, name === 'investment' ? '투자' : '수익']
              }}
            />
            <Area
              type="monotone"
              dataKey="roi"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 메트릭 요약 카드
interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  icon?: React.ReactNode
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  trend,
  trendValue,
  icon,
  className = ''
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-400'
      case 'down': return 'text-red-400'
      case 'stable': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗'
      case 'down': return '↘'
      case 'stable': return '→'
      default: return ''
    }
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white">
            {value}{unit}
          </div>
          {trend && trendValue && (
            <div className={`text-sm ${getTrendColor()} flex items-center gap-1 mt-1`}>
              <span>{getTrendIcon()}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}