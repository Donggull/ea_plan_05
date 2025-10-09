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
  AlertCircle as AlertCircleIcon,
  Briefcase,
  Palette,
  Code,
  Layout,
  ThumbsUp,
  ThumbsDown,
  Clock,
} from 'lucide-react';
import { AnalysisReport as AnalysisReportType } from '../../types/preAnalysis';
import { supabase } from '../../lib/supabase';
import { preAnalysisService } from '../../services/preAnalysis/PreAnalysisService';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'risks' | 'recommendations' | 'baseline' | 'agency'>('summary');
  const [progressMessage, setProgressMessage] = useState<string>('보고서 생성 준비 중...');
  const [progressPercent, setProgressPercent] = useState<number>(80);

  useEffect(() => {
    loadOrGenerateReport();
  }, [sessionId]);

  // 실시간 진행 상황 구독
  useEffect(() => {
    if (!isGenerating || !supabase) return;

    console.log('🔔 [AnalysisReport] 진행 상황 실시간 구독 시작');

    // pre_analysis_progress 테이블에서 report_generation 단계만 구독
    const subscription = supabase
      .channel(`progress:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pre_analysis_progress',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newProgress = payload.new as any;

          // report_generation 단계만 처리
          if (newProgress?.stage === 'report_generation' && newProgress?.message) {
            console.log('📊 [AnalysisReport] 진행 상황 업데이트:', {
              message: newProgress.message,
              progress: newProgress.progress,
              status: newProgress.status
            });

            setProgressMessage(newProgress.message);
            setProgressPercent(newProgress.progress || 80);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [AnalysisReport] 진행 상황 구독 해제');
      subscription.unsubscribe();
    };
  }, [isGenerating, sessionId]);

  const loadOrGenerateReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('데이터베이스 연결이 초기화되지 않았습니다.');
      }

      console.log('📊 보고서 확인 시작:', sessionId);

      // 1. 먼저 기존 보고서가 있는지 확인
      const { data: existingReports } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingReports && existingReports.length > 0) {
        console.log('✅ 기존 보고서 발견:', existingReports[0].id);
        setReport(transformReportData(existingReports[0]));
        setIsLoading(false);
        return;
      }

      console.log('🎯 보고서가 없어서 AI 기반 생성 시작');
      setIsGenerating(true);

      // 2. AI 기반 보고서 생성
      const response = await preAnalysisService.generateReport(sessionId, {
        format: 'json',
        sections: ['all'],
        includeCharts: true,
        includeAppendix: true,
      });

      if (response.success && response.data) {
        console.log('✅ AI 보고서 생성 완료, DB에서 최종 데이터 재조회 중...');

        // 🔥 DB에 저장된 최종 데이터를 다시 가져옵니다 (완전한 데이터 보장)
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기 (DB 저장 완료 대기)

        const { data: finalReport } = await supabase
          .from('analysis_reports')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (finalReport) {
          console.log('✅ DB에서 최종 보고서 조회 완료');
          setReport(transformReportData(finalReport));
        } else {
          console.warn('⚠️ DB 조회 실패, 메모리 데이터 사용');
          setReport(response.data);
        }
      } else {
        throw new Error(response.error || '보고서 생성에 실패했습니다.');
      }

    } catch (error) {
      console.error('❌ 보고서 로드/생성 오류:', error);
      setError(error instanceof Error ? error.message : '보고서를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Supabase 데이터를 AnalysisReportType으로 변환
  const transformReportData = (data: any): AnalysisReportType => {
    return {
      id: data.id,
      sessionId: data.session_id,
      projectId: data.project_id,
      summary: data.summary || '',
      executiveSummary: data.executive_summary || '',
      keyInsights: data.key_insights || [],
      riskAssessment: data.risk_assessment || { high: [], medium: [], low: [], overallScore: 0 },
      recommendations: data.recommendations || [],
      agencyPerspective: data.agency_perspective,
      baselineData: data.baseline_data || {
        requirements: [],
        stakeholders: [],
        constraints: [],
        timeline: [],
        budgetEstimates: {},
        technicalStack: [],
        integrationPoints: [],
      },
      visualizationData: data.visualization_data || {},
      aiModel: data.ai_model || 'unknown',
      aiProvider: data.ai_provider || 'unknown',
      totalProcessingTime: data.total_processing_time || 0,
      totalCost: data.total_cost || 0,
      inputTokens: data.input_tokens || 0,
      outputTokens: data.output_tokens || 0,
      generatedBy: data.generated_by || '',
      createdAt: new Date(data.created_at),
    };
  };

  const handleDownload = (format: 'pdf' | 'json' | 'markdown') => {
    if (!report) return;

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
    if (navigator.share) {
      navigator.share({
        title: '사전 분석 보고서',
        text: report?.summary || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다.');
    }
  };

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-900/20 border-red-800';
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

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'accept':
        return 'text-green-400 bg-green-900/20 border-green-700';
      case 'conditional_accept':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'decline':
        return 'text-red-400 bg-red-900/20 border-red-700';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-700';
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'accept':
        return <ThumbsUp className="w-6 h-6" />;
      case 'conditional_accept':
        return <AlertCircleIcon className="w-6 h-6" />;
      case 'decline':
        return <ThumbsDown className="w-6 h-6" />;
      default:
        return <AlertCircleIcon className="w-6 h-6" />;
    }
  };

  const getDecisionLabel = (decision: string) => {
    switch (decision) {
      case 'accept':
        return '프로젝트 수락 권장';
      case 'conditional_accept':
        return '조건부 수락';
      case 'decline':
        return '프로젝트 거절 권장';
      default:
        return '판단 보류';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">
            {isGenerating ? 'AI가 심층 분석 보고서를 생성하고 있습니다...' : '보고서를 불러오는 중...'}
          </p>

          {isGenerating && (
            <div className="mt-4 space-y-3">
              {/* 진행률 바 */}
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* 실시간 진행 메시지 */}
              <p className="text-blue-400 text-sm font-medium animate-pulse">
                {progressMessage}
              </p>

              {/* 안내 메시지 */}
              <p className="text-gray-500 text-sm mt-3">
                문서 분석, 질문-답변 데이터를 종합하여<br />
                웹에이전시 관점의 전문적인 보고서를 작성 중입니다.
              </p>

              {/* 예상 시간 안내 */}
              <p className="text-gray-600 text-xs mt-2">
                ⏱️ 대용량 문서의 경우 3~5분 소요될 수 있습니다
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">오류 발생</h3>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={loadOrGenerateReport}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">보고서가 없습니다</h3>
        <p className="text-gray-400 mb-4">생성된 보고서가 없습니다.</p>
        <button
          onClick={loadOrGenerateReport}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          보고서 생성
        </button>
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
            AI 기반 심층 분석 결과 - 웹에이전시 엘루오씨앤씨 관점
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

      {/* 🔥 프로젝트 결정 배너 (웹에이전시 관점) */}
      {report.agencyPerspective?.projectDecision && (
        <div className={`p-6 rounded-lg border-2 ${getDecisionColor(report.agencyPerspective.projectDecision.recommendation)}`}>
          <div className="flex items-center gap-4 mb-4">
            {getDecisionIcon(report.agencyPerspective.projectDecision.recommendation)}
            <div>
              <h4 className="text-lg font-bold">
                {getDecisionLabel(report.agencyPerspective.projectDecision.recommendation)}
              </h4>
              <p className="text-sm opacity-80">
                확신도: {report.agencyPerspective.projectDecision.confidence}%
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed opacity-90 mb-4">
            {report.agencyPerspective.projectDecision.reasoning}
          </p>
          {report.agencyPerspective.projectDecision.conditions && report.agencyPerspective.projectDecision.conditions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-current border-opacity-20">
              <p className="text-sm font-semibold mb-2">충족 조건:</p>
              <ul className="space-y-1">
                {report.agencyPerspective.projectDecision.conditions.map((condition, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{condition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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
            { id: 'agency', label: '웹에이전시 관점', icon: Briefcase },
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

        {activeTab === 'agency' && report.agencyPerspective && (
          <div className="space-y-6">
            {/* 4가지 관점 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 기획 관점 */}
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                  <h4 className="text-lg font-semibold text-white">기획 관점</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-400">실행 가능성:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${report.agencyPerspective.perspectives.planning.feasibility}%` }}
                        />
                      </div>
                      <span className="text-white font-semibold">{report.agencyPerspective.perspectives.planning.feasibility}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">예상 공수:</span>
                    <p className="text-white font-medium mt-1">{report.agencyPerspective.perspectives.planning.estimatedEffort}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400 block mb-2">핵심 고려사항:</span>
                    <ul className="space-y-1">
                      {(report.agencyPerspective?.perspectives?.planning?.keyConsiderations || []).map((item, index) => (
                        <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 디자인 관점 */}
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-purple-400" />
                  <h4 className="text-lg font-semibold text-white">디자인 관점</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-400">복잡도:</span>
                    <p className="text-white font-medium mt-1 capitalize">{report.agencyPerspective.perspectives.design.complexity}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">예상 작업 시간:</span>
                    <p className="text-white font-medium mt-1">{report.agencyPerspective.perspectives.design.estimatedHours}시간</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400 block mb-2">필요 스킬:</span>
                    <div className="flex flex-wrap gap-2">
                      {(report.agencyPerspective?.perspectives?.design?.requiredSkills || []).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded text-xs border border-purple-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 퍼블리싱 관점 */}
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Layout className="w-5 h-5 text-green-400" />
                  <h4 className="text-lg font-semibold text-white">퍼블리싱 관점</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-400">반응형 복잡도:</span>
                    <p className="text-white font-medium mt-1 capitalize">{report.agencyPerspective.perspectives.publishing.responsiveComplexity}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">예상 작업 시간:</span>
                    <p className="text-white font-medium mt-1">{report.agencyPerspective.perspectives.publishing.estimatedHours}시간</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400 block mb-2">브라우저 호환성:</span>
                    <div className="flex flex-wrap gap-2">
                      {(report.agencyPerspective?.perspectives?.publishing?.compatibility || []).map((browser, index) => (
                        <span key={index} className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs border border-green-700">
                          {browser}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 개발 관점 */}
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Code className="w-5 h-5 text-orange-400" />
                  <h4 className="text-lg font-semibold text-white">개발 관점</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-400">기술 복잡도:</span>
                    <p className="text-white font-medium mt-1 capitalize">{report.agencyPerspective.perspectives.development.technicalComplexity}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">예상 개발 인월:</span>
                    <p className="text-white font-medium mt-1">{report.agencyPerspective.perspectives.development.estimatedManMonths}MM</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400 block mb-2">핵심 기술:</span>
                    <div className="flex flex-wrap gap-2">
                      {(report.agencyPerspective?.perspectives?.development?.criticalTechnologies || []).map((tech, index) => (
                        <span key={index} className="px-2 py-1 bg-orange-900/30 text-orange-300 rounded text-xs border border-orange-700">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 상세 리스크 분석 */}
            {report.agencyPerspective?.detailedRisks && report.agencyPerspective.detailedRisks.length > 0 && (
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">상세 리스크 분석</h4>
                <div className="space-y-4">
                  {(report.agencyPerspective.detailedRisks || []).map((risk, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getRiskColor(risk.severity)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium">{risk.title}</h5>
                        <span className="text-xs px-2 py-1 rounded bg-current bg-opacity-20 capitalize">
                          {risk.severity}
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
                      <div className="text-sm mb-2">
                        <span className="opacity-70">완화 방안:</span> {risk.mitigation}
                      </div>
                      {risk.contingencyPlan && (
                        <div className="text-sm">
                          <span className="opacity-70">비상 대응:</span> {risk.contingencyPlan}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 실행 계획 */}
            {report.agencyPerspective?.executionPlan && (
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">실행 계획</h4>
                <div className="mb-4">
                  <span className="text-sm text-gray-400">전체 예상 기간:</span>
                  <p className="text-white font-medium text-lg">{report.agencyPerspective.executionPlan.totalEstimatedDays}일</p>
                </div>
                <div className="space-y-4">
                  {(report.agencyPerspective.executionPlan?.phases || []).map((phase, index) => (
                    <div key={index} className="p-4 bg-gray-900/50 rounded border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-white">{phase.name}</h5>
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {phase.duration}일
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-gray-400 block mb-1">산출물:</span>
                          <ul className="space-y-1">
                            {(phase.deliverables || []).map((item, i) => (
                              <li key={i} className="text-gray-300">• {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-1">필요 리소스:</span>
                          <ul className="space-y-1">
                            {(phase.resources || []).map((item, i) => (
                              <li key={i} className="text-gray-300">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 비용 추정 */}
            {report.agencyPerspective.costEstimate && (
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">비용 추정</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-400">기획:</span>
                    <p className="text-white font-medium">{report.agencyPerspective.costEstimate.planning.toLocaleString()} {report.agencyPerspective.costEstimate.currency}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">디자인:</span>
                    <p className="text-white font-medium">{report.agencyPerspective.costEstimate.design.toLocaleString()} {report.agencyPerspective.costEstimate.currency}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">개발:</span>
                    <p className="text-white font-medium">{report.agencyPerspective.costEstimate.development.toLocaleString()} {report.agencyPerspective.costEstimate.currency}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">테스트:</span>
                    <p className="text-white font-medium">{report.agencyPerspective.costEstimate.testing.toLocaleString()} {report.agencyPerspective.costEstimate.currency}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">배포:</span>
                    <p className="text-white font-medium">{report.agencyPerspective.costEstimate.deployment.toLocaleString()} {report.agencyPerspective.costEstimate.currency}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-white">총 예상 비용:</span>
                    <span className="text-2xl font-bold text-blue-400">
                      {report.agencyPerspective.costEstimate.total.toLocaleString()} {report.agencyPerspective.costEstimate.currency}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    신뢰도: {report.agencyPerspective.costEstimate.confidence}%
                  </p>
                </div>
              </div>
            )}
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
                {(report.baselineData?.requirements || []).length > 0 ? (
                  (report.baselineData.requirements || []).map((req, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <span className="text-gray-300">{req}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">데이터가 없습니다</p>
                )}
              </div>
            </div>

            {/* 이해관계자 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">이해관계자</h4>
              <div className="space-y-2">
                {(report.baselineData?.stakeholders || []).length > 0 ? (
                  (report.baselineData.stakeholders || []).map((stakeholder, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-300">{stakeholder}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">데이터가 없습니다</p>
                )}
              </div>
            </div>

            {/* 제약사항 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">제약사항</h4>
              <div className="space-y-2">
                {(report.baselineData?.constraints || []).length > 0 ? (
                  (report.baselineData.constraints || []).map((constraint, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full" />
                      <span className="text-gray-300">{constraint}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">데이터가 없습니다</p>
                )}
              </div>
            </div>

            {/* 기술 스택 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">기술 스택</h4>
              <div className="flex flex-wrap gap-2">
                {(report.baselineData?.technicalStack || []).length > 0 ? (
                  (report.baselineData.technicalStack || []).map((tech, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-900/30 text-green-300 rounded-full text-sm border border-green-700"
                    >
                      {tech}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">데이터가 없습니다</p>
                )}
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
