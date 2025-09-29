import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import type { AnalysisReport } from '@/types/preAnalysis';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: any;
  }
}

export interface ExportOptions {
  format: 'pdf' | 'word';
  includeCharts?: boolean;
  includeRawData?: boolean;
  filename?: string;
}

export class ReportExporter {
  /**
   * 분석 보고서를 지정된 형식으로 내보냅니다.
   */
  static async exportReport(
    report: AnalysisReport,
    options: ExportOptions = { format: 'pdf' }
  ): Promise<void> {
    const filename = options.filename || `analysis_report_${new Date().toISOString().split('T')[0]}`;

    try {
      if (options.format === 'pdf') {
        await this.exportToPDF(report, filename, options);
      } else {
        await this.exportToWord(report, filename, options);
      }
    } catch (error) {
      console.error('보고서 내보내기 실패:', error);
      throw new Error('보고서 내보내기에 실패했습니다.');
    }
  }

  /**
   * PDF 형식으로 보고서를 내보냅니다.
   */
  private static async exportToPDF(
    report: AnalysisReport,
    filename: string,
    options: ExportOptions
  ): Promise<void> {
    const pdf = new jsPDF();
    let yPosition = 20;

    // 제목
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('프로젝트 분석 보고서', 20, yPosition);
    yPosition += 15;

    // 메타데이터
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`생성일: ${new Date(report.createdAt).toLocaleDateString('ko-KR')}`, 20, yPosition);
    yPosition += 10;

    if (report.projectId) {
      pdf.text(`프로젝트 ID: ${report.projectId}`, 20, yPosition);
      yPosition += 15;
    }

    // 개요 섹션
    if (report.summary) {
      yPosition = this.addPDFSection(pdf, '1. 프로젝트 개요', report.summary, yPosition);
    }

    // 핵심 인사이트 섹션
    if (report.keyInsights.length > 0) {
      yPosition = this.addPDFSection(pdf, '2. 핵심 인사이트', report.keyInsights.join('\n• '), yPosition);
    }

    // 리스크 분석 섹션
    if (report.riskAssessment) {
      const riskText = [
        ...report.riskAssessment.high.map(r => `[높음] ${r.title}: ${r.description}`),
        ...report.riskAssessment.medium.map(r => `[보통] ${r.title}: ${r.description}`),
        ...report.riskAssessment.low.map(r => `[낮음] ${r.title}: ${r.description}`)
      ].join('\n\n');
      yPosition = this.addPDFSection(pdf, '3. 리스크 분석', riskText, yPosition);
    }

    // 권장사항 섹션
    if (report.recommendations.length > 0) {
      yPosition = this.addPDFSection(pdf, '4. 권장사항', report.recommendations.join('\n• '), yPosition);
    }

    // 기초 데이터 (옵션)
    if (options.includeRawData && report.baselineData) {
      const baselineText = [
        '요구사항: ' + report.baselineData.requirements.join(', '),
        '이해관계자: ' + report.baselineData.stakeholders.join(', '),
        '기술 스택: ' + report.baselineData.technicalStack.join(', ')
      ].join('\n');
      yPosition = this.addPDFSection(pdf, '5. 기초 데이터', baselineText, yPosition);
    }

    // 요약
    if (report.summary) {
      yPosition = this.addPDFSection(pdf, '요약', report.summary, yPosition);
    }

    // PDF 저장
    pdf.save(`${filename}.pdf`);
  }

  /**
   * Word 형식으로 보고서를 내보냅니다.
   */
  private static async exportToWord(
    report: AnalysisReport,
    filename: string,
    options: ExportOptions
  ): Promise<void> {
    const children: Paragraph[] = [];

    // 제목
    children.push(
      new Paragraph({
        text: '프로젝트 분석 보고서',
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 }
      })
    );

    // 메타데이터
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '생성일: ', bold: true }),
          new TextRun(new Date(report.createdAt).toLocaleDateString('ko-KR'))
        ],
        spacing: { after: 200 }
      })
    );

    if (report.projectId) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '프로젝트 ID: ', bold: true }),
            new TextRun(report.projectId)
          ],
          spacing: { after: 400 }
        })
      );
    }

    // 개요 섹션
    if (report.summary) {
      children.push(
        new Paragraph({
          text: '1. 프로젝트 개요',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: report.summary,
          spacing: { after: 400 }
        })
      );
    }

    // 핵심 인사이트 섹션
    if (report.keyInsights.length > 0) {
      children.push(
        new Paragraph({
          text: '2. 핵심 인사이트',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: report.keyInsights.join('\n• '),
          spacing: { after: 400 }
        })
      );
    }

    // 리스크 분석 섹션
    if (report.riskAssessment) {
      const riskText = [
        ...report.riskAssessment.high.map(r => `[높음] ${r.title}: ${r.description}`),
        ...report.riskAssessment.medium.map(r => `[보통] ${r.title}: ${r.description}`),
        ...report.riskAssessment.low.map(r => `[낮음] ${r.title}: ${r.description}`)
      ].join('\n\n');

      children.push(
        new Paragraph({
          text: '3. 리스크 분석',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: riskText,
          spacing: { after: 400 }
        })
      );
    }

    // 권장사항 섹션
    if (report.recommendations.length > 0) {
      children.push(
        new Paragraph({
          text: '4. 권장사항',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: report.recommendations.join('\n• '),
          spacing: { after: 400 }
        })
      );
    }

    // 기초 데이터 (옵션)
    if (options.includeRawData && report.baselineData) {
      const baselineText = [
        '요구사항: ' + report.baselineData.requirements.join(', '),
        '이해관계자: ' + report.baselineData.stakeholders.join(', '),
        '기술 스택: ' + report.baselineData.technicalStack.join(', ')
      ].join('\n');

      children.push(
        new Paragraph({
          text: '5. 기초 데이터',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: baselineText,
          spacing: { after: 400 }
        })
      );
    }

    // 요약
    if (report.summary) {
      children.push(
        new Paragraph({
          text: '요약',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: report.summary,
          spacing: { after: 400 }
        })
      );
    }

    // Word 문서 생성
    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    // Word 파일 저장
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
  }

  /**
   * PDF에 섹션을 추가합니다.
   */
  private static addPDFSection(
    pdf: jsPDF,
    title: string,
    content: string,
    yPosition: number
  ): number {
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    // 페이지 넘김 확인
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }

    // 섹션 제목
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPosition);
    yPosition += 10;

    // 내용
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    const lines = pdf.splitTextToSize(content, pdf.internal.pageSize.width - 2 * margin);

    for (const line of lines) {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    }

    return yPosition + 10;
  }

  // 차트 데이터 처리는 향후 구현 예정

  /**
   * 내보내기 진행률을 추적합니다.
   */
  static async exportWithProgress(
    report: AnalysisReport,
    options: ExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    onProgress?.(0);

    // 데이터 준비
    onProgress?.(20);

    // 내용 생성
    onProgress?.(60);

    // 파일 생성
    await this.exportReport(report, options);
    onProgress?.(100);
  }
}