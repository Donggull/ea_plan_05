import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
  FileText,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Users,
  Target,
  BarChart3,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { AnalysisReport as AnalysisReportType } from '@/types/preAnalysis';

interface AnalysisReportProps {
  report: AnalysisReportType;
  onExport?: (format: 'pdf' | 'docx' | 'json') => void;
  onShare?: () => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, trend }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${
              trend === 'up' ? 'text-accent-green' :
              trend === 'down' ? 'text-semantic-error' :
              'text-text-secondary'
            }`}>
              {trend === 'up' && <TrendingUp className="w-4 h-4" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4" />}
              {change > 0 ? '+' : ''}{change}%
            </div>
          )}
        </div>
        <div className="p-2 bg-primary-500/10 rounded-lg">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const AnalysisReport: React.FC<AnalysisReportProps> = ({
  report,
  onExport,
  onShare
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'text-semantic-error bg-semantic-error/10 border-semantic-error/20';
      case 'medium': return 'text-semantic-warning bg-semantic-warning/10 border-semantic-warning/20';
      case 'low': return 'text-accent-green bg-accent-green/10 border-accent-green/20';
      default: return 'text-text-secondary bg-text-secondary/10 border-text-secondary/20';
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-text-primary">
                <FileText className="w-5 h-5" />
                분석 보고서
              </CardTitle>
              <p className="text-sm text-text-secondary mt-1">
                생성일: {formatDistanceToNow(new Date(report.createdAt), {
                  locale: ko,
                  addSuffix: true
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={report.confidenceScore && report.confidenceScore >= 80 ? 'success' :
                        report.confidenceScore && report.confidenceScore >= 60 ? 'primary' : 'warning'}
                size="sm"
              >
                신뢰도 {report.confidenceScore || 85}%
              </Badge>
              <Button variant="secondary" size="sm" onClick={onShare}>
                <Share2 className="w-4 h-4 mr-2" />
                공유
              </Button>
              <Button variant="primary" size="sm" onClick={() => onExport?.('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                내보내기
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="예상 개발 기간"
          value={`${report.baselineData.timeline.length * 30}일`}
          icon={<Clock className="w-5 h-5 text-primary-500" />}
        />
        <MetricCard
          title="예상 비용"
          value={`₩${Object.values(report.baselineData.budgetEstimates).reduce((sum, cost) => sum + cost, 0).toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5 text-primary-500" />}
        />
        <MetricCard
          title="필요 인력"
          value={`${report.baselineData.stakeholders.length}명`}
          icon={<Users className="w-5 h-5 text-primary-500" />}
        />
        <MetricCard
          title="성공 확률"
          value={`${100 - report.riskAssessment.overallScore}%`}
          trend={report.riskAssessment.overallScore <= 30 ? 'up' :
                 report.riskAssessment.overallScore <= 60 ? 'stable' : 'down'}
          icon={<Target className="w-5 h-5 text-primary-500" />}
        />
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="technical">기술 분석</TabsTrigger>
          <TabsTrigger value="risks">리스크</TabsTrigger>
          <TabsTrigger value="recommendations">권장사항</TabsTrigger>
          <TabsTrigger value="timeline">타임라인</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-text-primary">프로젝트 개요</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-text-primary mb-2">핵심 요약</h4>
                <p className="text-text-secondary leading-relaxed">
                  {report.executiveSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-text-primary mb-2">주요 기능</h4>
                  <ul className="space-y-1">
                    {report.keyInsights.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-text-secondary">
                        <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary mb-2">기술 스택</h4>
                  <div className="flex flex-wrap gap-2">
                    {report.baselineData.technicalStack.map((tech, index) => (
                      <Badge key={index} variant="primary" size="sm">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Complexity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-text-primary">프로젝트 복잡도</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary mb-1">
                    {Math.min(10, Math.round(report.riskAssessment.overallScore / 10))}/10
                  </div>
                  <div className="text-sm text-text-secondary">기술적 복잡도</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary mb-1">
                    {Math.min(10, Math.round(report.riskAssessment.overallScore / 15))}/10
                  </div>
                  <div className="text-sm text-text-secondary">비즈니스 복잡도</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary mb-1">
                    {Math.min(10, Math.round(report.riskAssessment.overallScore / 12))}/10
                  </div>
                  <div className="text-sm text-text-secondary">통합 복잡도</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical Analysis Tab */}
        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-text-primary">기술 분석</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-text-primary mb-3">아키텍처 권장사항</h4>
                <div className="space-y-3">
                  {report.recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className="p-3 bg-bg-secondary rounded-lg border border-border-primary">
                      <div className="flex items-start gap-3">
                        <Activity className="w-5 h-5 text-accent-blue mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-medium text-text-primary">권장사항 {index + 1}</h5>
                          <p className="text-sm text-text-secondary mt-1">{rec}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="primary" size="sm">일반</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-text-primary mb-3">성능 예측</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-bg-secondary rounded-lg border border-border-primary">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-accent-green" />
                      <span className="font-medium text-text-primary">응답 시간</span>
                    </div>
                    <div className="text-2xl font-bold text-text-primary">
                      {report.totalProcessingTime}ms
                    </div>
                    <div className="text-sm text-text-secondary">평균 응답 시간</div>
                  </div>
                  <div className="p-4 bg-bg-secondary rounded-lg border border-border-primary">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-accent-blue" />
                      <span className="font-medium text-text-primary">동시 사용자</span>
                    </div>
                    <div className="text-2xl font-bold text-text-primary">
                      {report.baselineData.stakeholders.length * 100}
                    </div>
                    <div className="text-sm text-text-secondary">지원 가능 사용자</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-text-primary">리스크 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {Object.values(report.riskAssessment).flat().filter(risk => typeof risk === 'object').map((risk, index) => (
                    <div key={index} className="p-4 bg-bg-secondary rounded-lg border border-border-primary">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            risk.severity === 'high' ? 'text-semantic-error' :
                            risk.severity === 'medium' ? 'text-semantic-warning' :
                            'text-accent-green'
                          }`} />
                          <div>
                            <h4 className="font-medium text-text-primary">{risk.title}</h4>
                            <p className="text-sm text-text-secondary mt-1">{risk.description}</p>
                          </div>
                        </div>
                        <Badge
                          className={getRiskColor(risk.severity)}
                          size="sm"
                        >
                          {risk.severity}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-text-primary">발생 확률: </span>
                          <span className="text-sm text-text-secondary">{risk.probability}%</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-text-primary">대응 방안: </span>
                          {risk.mitigation && (
                            <p className="text-sm text-text-secondary">{risk.mitigation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-text-primary">권장사항</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {report.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-4 bg-bg-secondary rounded-lg border border-border-primary">
                      <div className="flex items-start gap-3">
                        <Target className="w-5 h-5 text-accent-blue mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-text-primary">{recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-text-primary">개발 타임라인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.baselineData.timeline.map((phase, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {index + 1}
                      </div>
                      {index < report.baselineData.timeline.length - 1 && (
                        <div className="w-px h-16 bg-border-primary mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-text-primary">{phase.phase}</h4>
                        {phase.duration && (
                          <Badge variant="primary" size="sm">
                            {phase.duration}일
                          </Badge>
                        )}
                      </div>
                      {(phase.startDate || phase.endDate) && (
                        <p className="text-sm text-text-secondary mb-3">
                          {phase.startDate && `시작: ${phase.startDate}`}
                          {phase.endDate && ` ~ 완료: ${phase.endDate}`}
                        </p>
                      )}
                      {phase.milestones && phase.milestones.length > 0 && (
                        <div className="space-y-1">
                          {phase.milestones.map((milestone, dIndex) => (
                            <div key={dIndex} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
                              <span className="text-text-secondary">{milestone}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Options */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-text-primary">보고서 내보내기</h4>
              <p className="text-sm text-text-secondary">다양한 형식으로 보고서를 내보낼 수 있습니다</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => onExport?.('json')}>
                JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onExport?.('docx')}>
                Word
              </Button>
              <Button variant="primary" size="sm" onClick={() => onExport?.('pdf')}>
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};