import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import {
  PieChart,
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle
} from 'lucide-react';
import type { ReportVisualizationData } from '@/services/preAnalysis/ReportGenerator';

interface ReportChartsProps {
  data: ReportVisualizationData;
  className?: string;
}

export const ReportCharts: React.FC<ReportChartsProps> = ({
  data,
  className = ''
}) => {
  // 리스크 분포 계산
  const totalRisks = Object.values(data.riskDistribution).reduce((sum, count) => sum + count, 0);

  // 리스크 레벨별 색상
  const riskColors = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e'
  };

  // 진행률 평균 계산
  const avgProgress = data.categoryProgress.length > 0
    ? data.categoryProgress.reduce((sum, cat) => sum + cat.progress, 0) / data.categoryProgress.length
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 리스크 분포 원형 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-semantic-warning" />
            리스크 분포 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 원형 차트 영역 */}
            <div className="relative">
              <div className="w-40 h-40 mx-auto relative">
                {/* CSS로 구현한 간단한 원형 차트 */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 to-green-500 opacity-20"></div>
                <div className="absolute inset-2 rounded-full bg-bg-primary flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-text-primary">{totalRisks}</div>
                    <div className="text-sm text-text-secondary">총 리스크</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 범례 */}
            <div className="space-y-3">
              {Object.entries(data.riskDistribution).map(([level, count]) => {
                const percentage = totalRisks > 0 ? Math.round((count / totalRisks) * 100) : 0;
                return (
                  <div key={level} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: riskColors[level as keyof typeof riskColors] }}
                      />
                      <span className="text-sm text-text-primary capitalize">
                        {level === 'critical' ? '심각' :
                         level === 'high' ? '높음' :
                         level === 'medium' ? '보통' : '낮음'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" size="sm">{count}개</Badge>
                      <span className="text-sm text-text-secondary">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 카테고리별 진행률 막대 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent-blue" />
            카테고리별 분석 진행률
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-text-secondary">평균 진행률</span>
              <Badge variant="primary" size="sm">{Math.round(avgProgress)}%</Badge>
            </div>

            {data.categoryProgress.map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">
                    {category.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        category.status === 'completed' ? 'success' :
                        category.status === 'in_progress' ? 'primary' : 'default'
                      }
                      size="sm"
                    >
                      {category.status === 'completed' ? '완료' :
                       category.status === 'in_progress' ? '진행중' : '대기중'}
                    </Badge>
                    <span className="text-sm text-text-secondary">
                      {category.progress}%
                    </span>
                  </div>
                </div>
                <Progress value={category.progress} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 타임라인 간트 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            프로젝트 타임라인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.timelineChart.map((phase, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">
                    {phase.phase}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" size="sm">
                      {phase.duration}일
                    </Badge>
                    <span className="text-xs text-text-secondary">
                      {new Date(phase.startDate).toLocaleDateString('ko-KR')} ~{' '}
                      {new Date(phase.endDate).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>

                {/* 간단한 간트 바 */}
                <div className="relative">
                  <div className="w-full h-4 bg-bg-secondary rounded">
                    <div
                      className="h-full bg-primary-500 rounded"
                      style={{
                        width: `${Math.min(100, (phase.duration / 100) * 100)}%`
                      }}
                    />
                  </div>
                  {phase.dependencies.length > 0 && (
                    <div className="text-xs text-text-secondary mt-1">
                      종속성: {phase.dependencies.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 비용 분석 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent-green" />
            비용 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.costAnalysis.map((cost, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">
                    {cost.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={cost.confidence >= 80 ? 'success' : cost.confidence >= 60 ? 'primary' : 'default'}
                      size="sm"
                    >
                      신뢰도 {cost.confidence}%
                    </Badge>
                    <span className="text-sm font-bold text-text-primary">
                      {cost.estimated.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="w-full h-3 bg-bg-secondary rounded">
                    <div
                      className="h-full bg-accent-green rounded"
                      style={{
                        width: `${cost.confidence}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 기술 스택 복잡도 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-purple" />
            기술 스택 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.techStackAnalysis.map((tech, index) => (
              <div key={index} className="p-4 rounded-lg border border-border-primary">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-text-primary">
                    {tech.technology}
                  </span>
                  <Badge
                    variant={
                      tech.recommendation === '권장' ? 'success' :
                      tech.recommendation === '조건부' ? 'primary' : 'default'
                    }
                    size="sm"
                  >
                    {tech.recommendation}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-text-secondary">복잡도</span>
                      <span className="text-text-primary">{tech.complexity}/10</span>
                    </div>
                    <Progress value={tech.complexity * 10} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-text-secondary">영향도</span>
                      <span className="text-text-primary">{tech.impact}/10</span>
                    </div>
                    <Progress value={tech.impact * 10} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 전체 분석 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-semantic-warning" />
            분석 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-semantic-error/5 border border-semantic-error/20">
              <div className="text-2xl font-bold text-semantic-error mb-2">
                {data.riskDistribution.high + data.riskDistribution.critical}
              </div>
              <div className="text-sm text-text-secondary">높은 위험 요소</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-accent-blue/5 border border-accent-blue/20">
              <div className="text-2xl font-bold text-accent-blue mb-2">
                {Math.round(avgProgress)}%
              </div>
              <div className="text-sm text-text-secondary">평균 완성도</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-accent-green/5 border border-accent-green/20">
              <div className="text-2xl font-bold text-accent-green mb-2">
                {data.costAnalysis.reduce((sum, cost) => sum + cost.estimated, 0).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-sm text-text-secondary">총 예상 비용 (원)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};