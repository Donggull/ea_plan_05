import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Target,
  Lightbulb,
} from 'lucide-react';
import { AnalysisReport as AnalysisReportType } from '../../types/preAnalysis';

interface AnalysisReportProps {
  sessionId: string;
  onComplete: () => void;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({
  sessionId,
  onComplete,
}) => {
  const [report, setReport] = useState<AnalysisReportType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'risks' | 'recommendations' | 'baseline'>('summary');

  useEffect(() => {
    loadReport();
  }, [sessionId]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      // 실제 구현에서는 API 호출
      // const response = await preAnalysisService.getReport(sessionId);

      // 임시 데이터
      const mockReport: AnalysisReportType = {
        id: 'report-1',
        sessionId,
        projectId: 'project-1',
        summary: '이 프로젝트는 웹 기반 대시보드 개발 프로젝트로, React와 TypeScript를 사용한 모던 프론트엔드 애플리케이션 구축을 목표로 합니다. 전반적으로 기술적 복잡도는 중간 수준이며, 적절한 계획과 리소스가 있다면 성공 가능성이 높은 프로젝트로 평가됩니다.',
        executiveSummary: '본 프로젝트는 총 6개월 기간, 약 3억원 예산 규모의 중간 복잡도 웹 개발 프로젝트입니다. 주요 리스크는 요구사항 변경과 제3자 시스템 통합 부분이며, 적절한 프로젝트 관리와 기술적 검토를 통해 성공적 완료가 가능할 것으로 판단됩니다.',
        keyInsights: [
          '현대적인 기술 스택 선택으로 향후 유지보수성 확보',
          '사용자 중심 설계를 통한 높은 사용성 기대',
          '모듈화된 아키텍처로 확장성 고려',
          '클라우드 네이티브 접근으로 운영 효율성 증대',
          'AI/ML 통합 가능성으로 차별화 요소 확보',
        ],
        riskAssessment: {
          high: [
            {
              id: 'risk-1',
              category: 'business',
              title: '요구사항 변경',
              description: '프로젝트 진행 중 비즈니스 요구사항이 자주 변경될 가능성',
              probability: 70,
              impact: 80,
              severity: 'high',
              mitigation: '애자일 방법론 적용 및 정기적 이해관계자 미팅',
            },
          ],
          medium: [
            {
              id: 'risk-2',
              category: 'technical',
              title: '제3자 시스템 통합',
              description: '외부 API 및 레거시 시스템과의 통합 시 기술적 어려움',
              probability: 60,
              impact: 60,
              severity: 'medium',
              mitigation: '사전 API 테스트 및 백업 계획 수립',
            },
            {
              id: 'risk-3',
              category: 'resource',
              title: '개발자 리소스 부족',
              description: '특정 기술 스택에 경험이 있는 개발자 확보 어려움',
              probability: 50,
              impact: 70,
              severity: 'medium',
              mitigation: '교육 계획 수립 및 외부 컨설팅 활용',
            },
          ],
          low: [
            {
              id: 'risk-4',
              category: 'timeline',
              title: '일정 지연',
              description: '예상보다 개발 시간이 오래 걸릴 가능성',
              probability: 40,
              impact: 50,
              severity: 'low',
              mitigation: '버퍼 시간 확보 및 우선순위 기반 개발',
            },
          ],
          overallScore: 65,
        },
        recommendations: [
          '애자일 개발 방법론을 적용하여 변화하는 요구사항에 유연하게 대응',
          'MVP(Minimum Viable Product) 접근법으로 핵심 기능 우선 개발',
          '지속적 통합/배포(CI/CD) 파이프라인 구축으로 품질 관리',
          '정기적인 코드 리뷰와 페어 프로그래밍으로 코드 품질 향상',
          '사용자 피드백을 적극 수집하여 사용성 개선',
          '보안 요구사항을 초기부터 고려한 설계',
          '성능 모니터링 도구 도입으로 사전 문제 감지',
          '문서화를 통한 지식 공유 및 유지보수성 확보',
        ],
        baselineData: {
          requirements: [
            '사용자 대시보드 개발',
            '실시간 데이터 시각화',
            '사용자 권한 관리',
            '모바일 반응형 지원',
            'API 통합',
          ],
          stakeholders: [
            '프로젝트 매니저',
            '제품 오너',
            '개발팀 리더',
            '디자이너',
            '최종 사용자',
          ],
          constraints: [
            '6개월 개발 기간',
            '3억원 예산 한도',
            '기존 시스템과 호환성',
            '보안 규정 준수',
            '성능 요구사항 충족',
          ],
          timeline: [
            {
              phase: '기획 및 설계',
              startDate: '2024-01-01',
              endDate: '2024-01-31',
              duration: 30,
              milestones: ['요구사항 정의', 'UI/UX 설계', '기술 아키텍처'],
            },
            {
              phase: '개발',
              startDate: '2024-02-01',
              endDate: '2024-05-31',
              duration: 120,
              milestones: ['MVP 개발', '기능 구현', '통합 테스트'],
            },
            {
              phase: '테스트 및 배포',
              startDate: '2024-06-01',
              endDate: '2024-06-30',
              duration: 30,
              milestones: ['QA 테스트', '성능 최적화', '배포'],
            },
          ],
          budgetEstimates: {
            development: 200000000,
            design: 50000000,
            testing: 30000000,
            infrastructure: 20000000,
          },
          technicalStack: [
            'React',
            'TypeScript',
            'Vite',
            'Tailwind CSS',
            'Supabase',
            'Vercel',
          ],
          integrationPoints: [
            '사용자 인증 시스템',
            '결제 게이트웨이',
            '이메일 서비스',
            '외부 데이터 API',
            '분석 도구',
          ],
        },
        visualizationData: {
          riskDistribution: {
            high: 1,
            medium: 2,
            low: 1,
          },
          budgetBreakdown: {
            development: 67,
            design: 17,
            testing: 10,
            infrastructure: 6,
          },
          timelinePhases: [
            { name: '기획', duration: 30, progress: 0 },
            { name: '개발', duration: 120, progress: 0 },
            { name: '배포', duration: 30, progress: 0 },
          ],
        },
        aiModel: 'gpt-4o',
        aiProvider: 'openai',
        totalProcessingTime: 180,
        totalCost: 0.25,
        inputTokens: 8000,
        outputTokens: 3000,
        generatedBy: 'user-1',
        createdAt: new Date(),
      };

      setReport(mockReport);
    } catch (error) {
      setError('보고서를 불러오는 중 오류가 발생했습니다.');
      console.error('보고서 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (format: 'pdf' | 'json' | 'markdown') => {
    if (!report) return;

    // 실제 구현에서는 서버에서 파일 생성 후 다운로드
    const data = format === 'json' ? JSON.stringify(report, null, 2) : '보고서 내용';
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-report-${sessionId}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    // 공유 기능 구현
    if (navigator.share) {
      navigator.share({
        title: '사전 분석 보고서',
        text: report?.summary || '',
        url: window.location.href,
      });
    } else {
      // 폴백: 클립보드에 복사
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다.');
    }
  };

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-400 bg-red-900/20 border-red-800';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
      case 'low':
        return 'text-green-400 bg-green-900/20 border-green-800';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">보고서를 생성하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">오류 발생</h3>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">보고서가 없습니다</h3>
        <p className="text-gray-400">생성된 보고서가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">종합 분석 보고서</h3>
          <p className="text-gray-400 mt-1">
            사전 분석 결과를 종합한 보고서입니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            공유
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              다운로드
            </button>
            <div className="absolute right-0 top-full mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleDownload('pdf')}
                className="block w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded-t-lg"
              >
                PDF
              </button>
              <button
                onClick={() => handleDownload('json')}
                className="block w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700"
              >
                JSON
              </button>
              <button
                onClick={() => handleDownload('markdown')}
                className="block w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded-b-lg"
              >
                Markdown
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 보고서 메타 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <BarChart3 className="w-4 h-4" />
            전체 위험도
          </div>
          <div className="text-2xl font-bold text-white">
            {report.riskAssessment.overallScore}/100
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <DollarSign className="w-4 h-4" />
            분석 비용
          </div>
          <div className="text-2xl font-bold text-white">
            ${report.totalCost.toFixed(3)}
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Calendar className="w-4 h-4" />
            처리 시간
          </div>
          <div className="text-2xl font-bold text-white">
            {Math.floor(report.totalProcessingTime / 60)}분
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Target className="w-4 h-4" />
            토큰 사용량
          </div>
          <div className="text-2xl font-bold text-white">
            {((report.inputTokens + report.outputTokens) / 1000).toFixed(1)}K
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'summary', label: '요약', icon: FileText },
            { id: 'insights', label: '주요 인사이트', icon: Lightbulb },
            { id: 'risks', label: '위험 분석', icon: AlertTriangle },
            { id: 'recommendations', label: '권장사항', icon: CheckCircle },
            { id: 'baseline', label: '기초 데이터', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[400px]">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">프로젝트 요약</h4>
              <p className="text-gray-300 leading-relaxed">{report.summary}</p>
            </div>

            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">경영진 요약</h4>
              <p className="text-gray-300 leading-relaxed">{report.executiveSummary}</p>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-4">주요 인사이트</h4>
            <div className="space-y-3">
              {report.keyInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-medium">{index + 1}</span>
                  </div>
                  <p className="text-gray-300">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-6">
            {/* 위험도 분포 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">위험도 분포</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400 mb-1">
                    {report.riskAssessment.high.length}
                  </div>
                  <div className="text-sm text-gray-400">높음</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">
                    {report.riskAssessment.medium.length}
                  </div>
                  <div className="text-sm text-gray-400">보통</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {report.riskAssessment.low.length}
                  </div>
                  <div className="text-sm text-gray-400">낮음</div>
                </div>
              </div>
            </div>

            {/* 위험 목록 */}
            <div className="space-y-4">
              {[...report.riskAssessment.high, ...report.riskAssessment.medium, ...report.riskAssessment.low].map((risk) => (
                <div key={risk.id} className={`p-4 rounded-lg border ${getRiskColor(risk.severity)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium">{risk.title}</h5>
                    <span className="text-xs px-2 py-1 rounded bg-current bg-opacity-20">
                      {risk.severity === 'high' ? '높음' : risk.severity === 'medium' ? '보통' : '낮음'}
                    </span>
                  </div>
                  <p className="text-sm opacity-90 mb-3">{risk.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="opacity-70">발생 확률:</span> {risk.probability}%
                    </div>
                    <div>
                      <span className="opacity-70">영향도:</span> {risk.impact}%
                    </div>
                  </div>
                  {risk.mitigation && (
                    <div className="text-sm">
                      <span className="opacity-70">완화 방안:</span> {risk.mitigation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-4">권장사항</h4>
            <div className="space-y-3">
              {report.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'baseline' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 요구사항 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">핵심 요구사항</h4>
              <div className="space-y-2">
                {report.baselineData.requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-gray-300">{req}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 이해관계자 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">이해관계자</h4>
              <div className="space-y-2">
                {report.baselineData.stakeholders.map((stakeholder, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">{stakeholder}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 제약사항 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">제약사항</h4>
              <div className="space-y-2">
                {report.baselineData.constraints.map((constraint, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                    <span className="text-gray-300">{constraint}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 기술 스택 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">기술 스택</h4>
              <div className="flex flex-wrap gap-2">
                {report.baselineData.technicalStack.map((tech, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-900/30 text-green-300 rounded-full text-sm border border-green-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 완료 버튼 */}
      <div className="flex justify-center pt-8">
        <button
          onClick={onComplete}
          className="flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
        >
          <CheckCircle className="w-5 h-5" />
          사전 분석 완료
        </button>
      </div>
    </div>
  );
};