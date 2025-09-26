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
import { supabase } from '../../lib/supabase';

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
    setError(null);

    try {
      if (!supabase) {
        throw new Error('데이터베이스 연결이 초기화되지 않았습니다.');
      }

      console.log('📊 실제 데이터 기반 보고서 생성 시작:', sessionId);

      // 1. 세션 및 프로젝트 기본 정보 조회
      const { data: session } = await supabase
        .from('pre_analysis_sessions')
        .select(`
          *,
          projects!inner (
            id,
            name,
            description,
            metadata
          )
        `)
        .eq('id', sessionId)
        .single();

      if (!session) {
        throw new Error('세션 정보를 찾을 수 없습니다.');
      }

      const project = session.projects;

      // 2. 문서 분석 결과 조회
      const { data: documentAnalyses } = await supabase
        .from('document_analyses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      // 3. AI 생성 질문들 조회
      const { data: questions } = await supabase
        .from('ai_questions')
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index', { ascending: true });

      // 4. 사용자 답변들 조회
      const { data: answers } = await supabase
        .from('user_answers')
        .select('*')
        .eq('session_id', sessionId);

      console.log('🔍 수집된 데이터:', {
        project: project?.name,
        documentCount: documentAnalyses?.length || 0,
        questionCount: questions?.length || 0,
        answerCount: answers?.length || 0
      });

      // 5. 새로운 웹 에이전시 관점 분석 시스템으로 보고서 생성
      const { ReportAnalysisService } = await import('../../services/analysis/ReportAnalysisService');
      const actualReport = await ReportAnalysisService.generateWebAgencyReport(session.id);

      setReport(actualReport);
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

  // 기존 보고서 생성 로직은 새로운 웹 에이전시 관점 분석 시스템으로 대체됨

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