import React from 'react';
import { AnalysisReportViewer } from './AnalysisReportViewer';
import type { AnalysisReport as AnalysisReportType } from '@/types/preAnalysis';

interface AnalysisReportProps {
  report: AnalysisReportType;
  onExport?: (format: 'pdf' | 'word' | 'json' | 'docx') => void;
  onShare?: () => void;
  isLoading?: boolean;
}

/**
 * Phase 5 업데이트된 분석 보고서 컴포넌트
 *
 * 새로운 AnalysisReportViewer를 래핑하여 기존 API 호환성을 유지하면서
 * Phase 5의 향상된 기능들을 제공합니다:
 * - 인터랙티브 탭 기반 UI
 * - PDF/Word/JSON 내보내기 지원
 * - 차트 시각화 데이터 표시
 * - 개선된 리스크 분석 뷰
 * - 향상된 권장사항 표시
 */
export const AnalysisReport: React.FC<AnalysisReportProps> = ({
  report,
  onExport,
  onShare,
  isLoading = false
}) => {
  // 기존 docx 형식을 word로 변환하여 호환성 유지
  const handleExport = (format: 'pdf' | 'word' | 'json') => {
    if (format === 'word') {
      onExport?.('docx' as any); // 기존 API 호환성
    } else {
      onExport?.(format);
    }
  };

  return (
    <AnalysisReportViewer
      report={report}
      onExport={handleExport}
      onShare={onShare}
      isLoading={isLoading}
    />
  );
};