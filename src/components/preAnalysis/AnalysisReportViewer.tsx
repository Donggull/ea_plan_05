import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
// UI 컴포넌트들
import {
  FileText,
  Share2,
  PrinterIcon,
  BarChart3,
  PieChart,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Target,
  DollarSign,
  Calendar,
  Settings,
  FileDown,
  User
} from 'lucide-react';
import type { AnalysisReport } from '@/types/preAnalysis';
import { ReportExporter } from '@/services/preAnalysis/ReportExporter';
import { ReportCharts } from './ReportCharts';

interface AnalysisReportViewerProps {
  report: AnalysisReport;
  onExport?: (format: 'pdf' | 'word' | 'json') => void;
  onShare?: () => void;
  isLoading?: boolean;
}

export const AnalysisReportViewer: React.FC<AnalysisReportViewerProps> = ({
  report,
  onExport,
  onShare,
  isLoading = false
}) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // 컴포넌트 내부 헬퍼 함수들은 실제 사용 시 구현

  // 내보내기 처리
  const handleExport = async (format: 'pdf' | 'word' | 'json') => {
    setIsExporting(true);
    try {
      if (format === 'json') {
        // JSON 형태로 내보내기
        const dataStr = JSON.stringify(report, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `analysis_report_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      } else {
        // PDF/Word 내보내기
        await ReportExporter.exportWithProgress(
          report,
          { format, includeCharts: true, includeRawData: true },
          (progress) => console.log(`내보내기 진행률: ${progress}%`)
        );
      }

      // 부모 컴포넌트에 알림
      onExport?.(format);
    } catch (error) {
      console.error('내보내기 실패:', error);
      alert('내보내기에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsExporting(false);
    }
  };

  // 인쇄 기능
  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;

      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-text-secondary">보고서를 생성하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 및 액션 버튼 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <CardTitle className="text-text-primary">
                  사전 분석 보고서
                </CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  생성일: {new Date(report.createdAt).toLocaleString('ko-KR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                {report.aiProvider} {report.aiModel}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrint}
              >
                <PrinterIcon className="w-4 h-4 mr-2" />
                인쇄
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExport('pdf')}
                  title="PDF로 내보내기"
                >
                  {isExporting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExport('word')}
                  title="Word로 내보내기"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Word
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExport('json')}
                  title="JSON으로 내보내기"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  JSON
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                공유
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 메인 보고서 콘텐츠 */}
      <div ref={printRef}>
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="insights">핵심 인사이트</TabsTrigger>
            <TabsTrigger value="risks">리스크 분석</TabsTrigger>
            <TabsTrigger value="recommendations">권장사항</TabsTrigger>
            <TabsTrigger value="baseline">기초 데이터</TabsTrigger>
            <TabsTrigger value="charts">차트</TabsTrigger>
          </TabsList>

          {/* 개요 탭 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 요약 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-500" />
                  프로젝트 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-primary leading-relaxed">
                  {report.summary}
                </p>
              </CardContent>
            </Card>

            {/* 경영진 요약 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent-blue" />
                  경영진 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-primary leading-relaxed">
                  {report.executiveSummary}
                </p>
              </CardContent>
            </Card>

            {/* 전체 위험도 점수 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-semantic-warning" />
                  전체 위험도 평가
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">위험도 점수</span>
                    <span className={`text-xl font-bold ${
                      report.riskAssessment.overallScore >= 80 ? 'text-semantic-error' :
                      report.riskAssessment.overallScore >= 60 ? 'text-semantic-warning' :
                      'text-accent-green'
                    }`}>
                      {report.riskAssessment.overallScore}/100
                    </span>
                  </div>
                  <Progress
                    value={report.riskAssessment.overallScore}
                    className="h-3"
                  />
                  <div className="text-sm text-text-secondary">
                    {report.riskAssessment.overallScore >= 80 ? '높은 위험도 - 신중한 접근 필요' :
                     report.riskAssessment.overallScore >= 60 ? '중간 위험도 - 관리 필요' :
                     '낮은 위험도 - 안정적 진행 가능'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 핵심 인사이트 탭 */}
          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent-green" />
                  핵심 인사이트
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.keyInsights.map((insight, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-border-primary bg-bg-elevated"
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="primary" size="sm">
                          {index + 1}
                        </Badge>
                        <p className="text-text-primary leading-relaxed">
                          {insight}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 리스크 분석 탭 */}
          <TabsContent value="risks" className="space-y-6">
            {/* 높은 위험도 */}
            {report.riskAssessment.high.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-semantic-error">
                    <AlertTriangle className="w-5 h-5" />
                    높은 위험도 ({report.riskAssessment.high.length}개)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.riskAssessment.high.map((risk, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-semantic-error/20 bg-semantic-error/5"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-text-primary">
                            {risk.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="error" size="sm">
                              확률: {risk.probability}%
                            </Badge>
                            <Badge variant="error" size="sm">
                              영향: {risk.impact}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-text-secondary mb-3">
                          {risk.description}
                        </p>
                        {risk.mitigation && (
                          <div className="p-3 rounded bg-bg-secondary">
                            <p className="text-sm">
                              <strong>대응 방안:</strong> {risk.mitigation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 중간 위험도 */}
            {report.riskAssessment.medium.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-semantic-warning">
                    <Clock className="w-5 h-5" />
                    중간 위험도 ({report.riskAssessment.medium.length}개)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.riskAssessment.medium.map((risk, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-semantic-warning/20 bg-semantic-warning/5"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-text-primary">
                            {risk.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" size="sm">
                              확률: {risk.probability}%
                            </Badge>
                            <Badge variant="default" size="sm">
                              영향: {risk.impact}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-text-secondary mb-3">
                          {risk.description}
                        </p>
                        {risk.mitigation && (
                          <div className="p-3 rounded bg-bg-secondary">
                            <p className="text-sm">
                              <strong>대응 방안:</strong> {risk.mitigation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 낮은 위험도 */}
            {report.riskAssessment.low.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-accent-green">
                    <CheckCircle2 className="w-5 h-5" />
                    낮은 위험도 ({report.riskAssessment.low.length}개)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.riskAssessment.low.map((risk, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-accent-green/20 bg-accent-green/5"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-text-primary">
                            {risk.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="success" size="sm">
                              확률: {risk.probability}%
                            </Badge>
                            <Badge variant="success" size="sm">
                              영향: {risk.impact}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-text-secondary mb-3">
                          {risk.description}
                        </p>
                        {risk.mitigation && (
                          <div className="p-3 rounded bg-bg-secondary">
                            <p className="text-sm">
                              <strong>대응 방안:</strong> {risk.mitigation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 권장사항 탭 */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent-green" />
                  실행 권장사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.recommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border-primary bg-bg-elevated"
                    >
                      <Badge variant="primary" size="sm">
                        {index + 1}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-text-primary leading-relaxed">
                          {recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 기초 데이터 탭 */}
          <TabsContent value="baseline" className="space-y-6">
            {/* 요구사항 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-accent-blue" />
                  핵심 요구사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.baselineData.requirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-accent-green" />
                      <span className="text-text-primary">{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* 이해관계자 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent-purple" />
                  주요 이해관계자
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.baselineData.stakeholders.map((stakeholder, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <User className="w-4 h-4 text-accent-purple" />
                      <span className="text-text-primary">{stakeholder}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* 예산 추정 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-accent-green" />
                  예산 추정
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(report.baselineData.budgetEstimates).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary">
                      <span className="text-text-primary font-medium">{category}</span>
                      <span className="text-text-primary font-bold">
                        {Number(amount).toLocaleString('ko-KR')}원
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 타임라인 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-500" />
                  프로젝트 타임라인
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.baselineData.timeline.map((phase, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg border border-border-primary">
                      <Badge variant="primary" size="sm">
                        {phase.phase}
                      </Badge>
                      <span className="text-text-primary">
                        {phase.duration}일
                      </span>
                      <div className="flex-1">
                        {phase.milestones?.map((milestone, i) => (
                          <span key={i} className="text-sm text-text-secondary mr-2">
                            • {milestone}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 차트 탭 */}
          <TabsContent value="charts" className="space-y-6">
            {report.visualizationData ? (
              <ReportCharts data={report.visualizationData as any} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary-500" />
                    시각화 데이터
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-8 text-text-secondary">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>시각화 데이터가 없습니다.</p>
                    <p className="text-sm mt-2">
                      보고서 재생성 시 차트 데이터가 포함됩니다.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 푸터 정보 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <div className="flex items-center gap-4">
              <span>생성 엔진: {report.generatedBy}</span>
              <span>처리 시간: {report.totalProcessingTime}초</span>
              <span>비용: ₩{report.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>토큰 사용량:</span>
              <Badge variant="default" size="sm">
                입력 {report.inputTokens} / 출력 {report.outputTokens}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};