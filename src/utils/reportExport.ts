import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TableRow, TableCell, Table, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { AnalysisReport } from '../types/preAnalysis';

/**
 * 보고서를 Markdown 형식으로 변환
 */
export function convertReportToMarkdown(report: AnalysisReport, sessionId: string): string {
  const md: string[] = [];

  // 제목
  md.push('# 종합 분석 보고서\n');
  md.push(`**Session ID**: ${sessionId}\n`);
  md.push(`**생성일**: ${new Date(report.createdAt).toLocaleString('ko-KR')}\n`);
  md.push(`**AI 모델**: ${report.aiProvider} - ${report.aiModel}\n`);
  md.push('\n---\n\n');

  // 메타 정보
  md.push('## 📊 분석 메타 정보\n\n');
  md.push('| 항목 | 값 |\n');
  md.push('|------|------|\n');
  md.push(`| 전체 위험도 | ${report.riskAssessment.overallScore}/100 |\n`);
  md.push(`| 분석 비용 | $${report.totalCost.toFixed(3)} |\n`);
  md.push(`| 처리 시간 | ${Math.floor(report.totalProcessingTime / 1000 / 60)}분 ${Math.floor((report.totalProcessingTime / 1000) % 60)}초 |\n`);
  md.push(`| 토큰 사용량 | ${((report.inputTokens + report.outputTokens) / 1000).toFixed(1)}K (입력: ${(report.inputTokens / 1000).toFixed(1)}K, 출력: ${(report.outputTokens / 1000).toFixed(1)}K) |\n`);
  md.push('\n');

  // 프로젝트 결정 (웹에이전시 관점)
  if (report.agencyPerspective?.projectDecision) {
    md.push('## 🎯 프로젝트 결정 (웹에이전시 관점)\n\n');
    const decision = report.agencyPerspective.projectDecision;
    const decisionLabel = decision.recommendation === 'accept' ? '프로젝트 수락 권장' :
                          decision.recommendation === 'conditional_accept' ? '조건부 수락' :
                          '프로젝트 거절 권장';
    md.push(`**결정**: ${decisionLabel}\n`);
    md.push(`**확신도**: ${decision.confidence}%\n\n`);
    md.push(`**근거**: ${decision.reasoning}\n\n`);

    if (decision.conditions && decision.conditions.length > 0) {
      md.push('**충족 조건**:\n');
      decision.conditions.forEach(condition => {
        md.push(`- ${condition}\n`);
      });
      md.push('\n');
    }
  }

  // 프로젝트 요약
  md.push('## 📝 프로젝트 요약\n\n');
  md.push(`${report.summary}\n\n`);

  // 경영진 요약
  if (report.executiveSummary) {
    md.push('## 💼 경영진 요약\n\n');
    md.push(`${report.executiveSummary}\n\n`);
  }

  // 주요 인사이트
  if (report.keyInsights && report.keyInsights.length > 0) {
    md.push('## 💡 주요 인사이트\n\n');
    report.keyInsights.forEach((insight, index) => {
      md.push(`${index + 1}. ${insight}\n`);
    });
    md.push('\n');
  }

  // 위험 분석
  md.push('## ⚠️ 위험 분석\n\n');
  md.push(`**전체 위험도**: ${report.riskAssessment.overallScore}/100\n\n`);

  if (report.riskAssessment.high.length > 0) {
    md.push('### 높은 위험\n\n');
    report.riskAssessment.high.forEach(risk => {
      md.push(`#### ${risk.title}\n`);
      md.push(`- **설명**: ${risk.description}\n`);
      md.push(`- **발생 확률**: ${risk.probability}%\n`);
      md.push(`- **영향도**: ${risk.impact}%\n`);
      if (risk.mitigation) {
        md.push(`- **완화 방안**: ${risk.mitigation}\n`);
      }
      md.push('\n');
    });
  }

  if (report.riskAssessment.medium.length > 0) {
    md.push('### 중간 위험\n\n');
    report.riskAssessment.medium.forEach(risk => {
      md.push(`#### ${risk.title}\n`);
      md.push(`- **설명**: ${risk.description}\n`);
      md.push(`- **발생 확률**: ${risk.probability}%\n`);
      md.push(`- **영향도**: ${risk.impact}%\n`);
      if (risk.mitigation) {
        md.push(`- **완화 방안**: ${risk.mitigation}\n`);
      }
      md.push('\n');
    });
  }

  if (report.riskAssessment.low.length > 0) {
    md.push('### 낮은 위험\n\n');
    report.riskAssessment.low.forEach(risk => {
      md.push(`#### ${risk.title}\n`);
      md.push(`- **설명**: ${risk.description}\n`);
      md.push(`- **발생 확률**: ${risk.probability}%\n`);
      md.push(`- **영향도**: ${risk.impact}%\n`);
      if (risk.mitigation) {
        md.push(`- **완화 방안**: ${risk.mitigation}\n`);
      }
      md.push('\n');
    });
  }

  // 권장사항
  if (report.recommendations && report.recommendations.length > 0) {
    md.push('## ✅ 권장사항\n\n');
    report.recommendations.forEach((recommendation, index) => {
      md.push(`${index + 1}. ${recommendation}\n`);
    });
    md.push('\n');
  }

  // 웹에이전시 관점 - 4가지 관점 분석
  if (report.agencyPerspective?.perspectives) {
    md.push('## 🎨 웹에이전시 관점 분석\n\n');

    const perspectives = report.agencyPerspective.perspectives;

    // 기획 관점
    if (perspectives.planning) {
      md.push('### 기획 관점\n\n');
      md.push(`- **실행 가능성**: ${perspectives.planning.feasibility}%\n`);
      md.push(`- **예상 공수**: ${perspectives.planning.estimatedEffort}\n`);
      if (perspectives.planning.challenges && perspectives.planning.challenges.length > 0) {
        md.push(`- **예상 어려움**:\n`);
        perspectives.planning.challenges.forEach(challenge => {
          md.push(`  - ${challenge}\n`);
        });
      }
      if (perspectives.planning.risks && perspectives.planning.risks.length > 0) {
        md.push(`- **리스크**:\n`);
        perspectives.planning.risks.forEach(risk => {
          md.push(`  - ${risk}\n`);
        });
      }
      md.push('\n');
    }

    // 디자인 관점
    if (perspectives.design) {
      md.push('### 디자인 관점\n\n');
      md.push(`- **복잡도**: ${perspectives.design.complexity}\n`);
      md.push(`- **예상 작업 시간**: ${perspectives.design.estimatedHours}시간\n`);
      if (perspectives.design.challenges && perspectives.design.challenges.length > 0) {
        md.push(`- **예상 어려움**:\n`);
        perspectives.design.challenges.forEach(challenge => {
          md.push(`  - ${challenge}\n`);
        });
      }
      if (perspectives.design.risks && perspectives.design.risks.length > 0) {
        md.push(`- **리스크**:\n`);
        perspectives.design.risks.forEach(risk => {
          md.push(`  - ${risk}\n`);
        });
      }
      md.push('\n');
    }

    // 퍼블리싱 관점
    if (perspectives.publishing) {
      md.push('### 퍼블리싱 관점\n\n');
      md.push(`- **반응형 복잡도**: ${perspectives.publishing.responsiveComplexity}\n`);
      md.push(`- **예상 작업 시간**: ${perspectives.publishing.estimatedHours}시간\n`);
      if (perspectives.publishing.challenges && perspectives.publishing.challenges.length > 0) {
        md.push(`- **예상 어려움**:\n`);
        perspectives.publishing.challenges.forEach(challenge => {
          md.push(`  - ${challenge}\n`);
        });
      }
      if (perspectives.publishing.risks && perspectives.publishing.risks.length > 0) {
        md.push(`- **리스크**:\n`);
        perspectives.publishing.risks.forEach(risk => {
          md.push(`  - ${risk}\n`);
        });
      }
      md.push('\n');
    }

    // 개발 관점
    if (perspectives.development) {
      md.push('### 개발 관점\n\n');
      md.push(`- **기술 복잡도**: ${perspectives.development.technicalComplexity}\n`);
      md.push(`- **예상 개발 인월**: ${perspectives.development.estimatedManMonths}MM\n`);
      if (perspectives.development.challenges && perspectives.development.challenges.length > 0) {
        md.push(`- **예상 어려움**:\n`);
        perspectives.development.challenges.forEach(challenge => {
          md.push(`  - ${challenge}\n`);
        });
      }
      if (perspectives.development.risks && perspectives.development.risks.length > 0) {
        md.push(`- **리스크**:\n`);
        perspectives.development.risks.forEach(risk => {
          md.push(`  - ${risk}\n`);
        });
      }
      md.push('\n');
    }
  }

  // 비용 추정
  if (report.agencyPerspective?.costEstimate) {
    md.push('## 💰 비용 추정\n\n');
    const cost = report.agencyPerspective.costEstimate;
    md.push('| 항목 | 비용 |\n');
    md.push('|------|------|\n');
    md.push(`| 기획 | ${cost.planning.toLocaleString()} ${cost.currency} |\n`);
    md.push(`| 디자인 | ${cost.design.toLocaleString()} ${cost.currency} |\n`);
    md.push(`| 개발 | ${cost.development.toLocaleString()} ${cost.currency} |\n`);
    md.push(`| 테스트 | ${cost.testing.toLocaleString()} ${cost.currency} |\n`);
    md.push(`| 배포 | ${cost.deployment.toLocaleString()} ${cost.currency} |\n`);
    md.push(`| **총계** | **${cost.total.toLocaleString()} ${cost.currency}** |\n`);
    md.push(`\n**신뢰도**: ${cost.confidence}%\n\n`);
  }

  // 기초 데이터
  if (report.baselineData) {
    md.push('## 📊 기초 데이터\n\n');

    if (report.baselineData.requirements && report.baselineData.requirements.length > 0) {
      md.push('### 핵심 요구사항\n\n');
      report.baselineData.requirements.forEach(req => {
        md.push(`- ${req}\n`);
      });
      md.push('\n');
    }

    if (report.baselineData.stakeholders && report.baselineData.stakeholders.length > 0) {
      md.push('### 이해관계자\n\n');
      report.baselineData.stakeholders.forEach((stakeholder: any) => {
        const displayText = typeof stakeholder === 'string'
          ? stakeholder
          : stakeholder?.name || JSON.stringify(stakeholder);
        md.push(`- ${displayText}\n`);
      });
      md.push('\n');
    }

    if (report.baselineData.constraints && report.baselineData.constraints.length > 0) {
      md.push('### 제약사항\n\n');
      report.baselineData.constraints.forEach(constraint => {
        md.push(`- ${constraint}\n`);
      });
      md.push('\n');
    }

    if (report.baselineData.technicalStack && report.baselineData.technicalStack.length > 0) {
      md.push('### 기술 스택\n\n');
      report.baselineData.technicalStack.forEach(tech => {
        md.push(`- ${tech}\n`);
      });
      md.push('\n');
    }
  }

  md.push('\n---\n\n');
  md.push(`*본 보고서는 ${new Date(report.createdAt).toLocaleString('ko-KR')}에 AI 기반으로 생성되었습니다.*\n`);

  return md.join('');
}

/**
 * 보고서를 DOCX 형식으로 변환하여 다운로드
 */
export async function downloadReportAsDocx(report: AnalysisReport, sessionId: string): Promise<void> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // 제목
        new Paragraph({
          text: '종합 분석 보고서',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: '' }), // 빈 줄

        // 메타 정보
        new Paragraph({
          text: '분석 메타 정보',
          heading: HeadingLevel.HEADING_2,
        }),
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '항목', bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '값', bold: true })] })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: '전체 위험도' })] }),
                new TableCell({ children: [new Paragraph({ text: `${report.riskAssessment.overallScore}/100` })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: '분석 비용' })] }),
                new TableCell({ children: [new Paragraph({ text: `$${report.totalCost.toFixed(3)}` })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: '처리 시간' })] }),
                new TableCell({ children: [new Paragraph({ text: `${Math.floor(report.totalProcessingTime / 1000 / 60)}분 ${Math.floor((report.totalProcessingTime / 1000) % 60)}초` })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: '토큰 사용량' })] }),
                new TableCell({ children: [new Paragraph({ text: `${((report.inputTokens + report.outputTokens) / 1000).toFixed(1)}K` })] }),
              ],
            }),
          ],
        }),
        new Paragraph({ text: '' }), // 빈 줄

        // 프로젝트 결정
        ...(report.agencyPerspective?.projectDecision ? [
          new Paragraph({
            text: '프로젝트 결정 (웹에이전시 관점)',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '결정: ', bold: true }),
              new TextRun({
                text: report.agencyPerspective.projectDecision.recommendation === 'accept' ? '프로젝트 수락 권장' :
                      report.agencyPerspective.projectDecision.recommendation === 'conditional_accept' ? '조건부 수락' :
                      '프로젝트 거절 권장'
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '확신도: ', bold: true }),
              new TextRun({ text: `${report.agencyPerspective.projectDecision.confidence}%` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '근거: ', bold: true }),
              new TextRun({ text: report.agencyPerspective.projectDecision.reasoning }),
            ],
          }),
          new Paragraph({ text: '' }),
        ] : []),

        // 프로젝트 요약
        new Paragraph({
          text: '프로젝트 요약',
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: report.summary }),
        new Paragraph({ text: '' }),

        // 경영진 요약
        ...(report.executiveSummary ? [
          new Paragraph({
            text: '경영진 요약',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({ text: report.executiveSummary }),
          new Paragraph({ text: '' }),
        ] : []),

        // 주요 인사이트
        ...(report.keyInsights && report.keyInsights.length > 0 ? [
          new Paragraph({
            text: '주요 인사이트',
            heading: HeadingLevel.HEADING_2,
          }),
          ...report.keyInsights.map((insight, index) =>
            new Paragraph({
              text: `${index + 1}. ${insight}`,
            })
          ),
          new Paragraph({ text: '' }),
        ] : []),

        // 위험 분석
        new Paragraph({
          text: '위험 분석',
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '전체 위험도: ', bold: true }),
            new TextRun({ text: `${report.riskAssessment.overallScore}/100` }),
          ],
        }),
        new Paragraph({ text: '' }),

        // 높은 위험
        ...(report.riskAssessment.high.length > 0 ? [
          new Paragraph({
            text: '높은 위험',
            heading: HeadingLevel.HEADING_3,
          }),
          ...report.riskAssessment.high.flatMap(risk => [
            new Paragraph({
              text: risk.title,
              heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({ text: `설명: ${risk.description}` }),
            new Paragraph({ text: `발생 확률: ${risk.probability}%` }),
            new Paragraph({ text: `영향도: ${risk.impact}%` }),
            ...(risk.mitigation ? [new Paragraph({ text: `완화 방안: ${risk.mitigation}` })] : []),
            new Paragraph({ text: '' }),
          ]),
        ] : []),

        // 중간 위험
        ...(report.riskAssessment.medium.length > 0 ? [
          new Paragraph({
            text: '중간 위험',
            heading: HeadingLevel.HEADING_3,
          }),
          ...report.riskAssessment.medium.flatMap(risk => [
            new Paragraph({
              text: risk.title,
              heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({ text: `설명: ${risk.description}` }),
            new Paragraph({ text: `발생 확률: ${risk.probability}%` }),
            new Paragraph({ text: `영향도: ${risk.impact}%` }),
            ...(risk.mitigation ? [new Paragraph({ text: `완화 방안: ${risk.mitigation}` })] : []),
            new Paragraph({ text: '' }),
          ]),
        ] : []),

        // 낮은 위험
        ...(report.riskAssessment.low.length > 0 ? [
          new Paragraph({
            text: '낮은 위험',
            heading: HeadingLevel.HEADING_3,
          }),
          ...report.riskAssessment.low.flatMap(risk => [
            new Paragraph({
              text: risk.title,
              heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({ text: `설명: ${risk.description}` }),
            new Paragraph({ text: `발생 확률: ${risk.probability}%` }),
            new Paragraph({ text: `영향도: ${risk.impact}%` }),
            ...(risk.mitigation ? [new Paragraph({ text: `완화 방안: ${risk.mitigation}` })] : []),
            new Paragraph({ text: '' }),
          ]),
        ] : []),

        // 권장사항
        ...(report.recommendations && report.recommendations.length > 0 ? [
          new Paragraph({
            text: '권장사항',
            heading: HeadingLevel.HEADING_2,
          }),
          ...report.recommendations.map((recommendation, index) =>
            new Paragraph({ text: `${index + 1}. ${recommendation}` })
          ),
          new Paragraph({ text: '' }),
        ] : []),

        // 푸터
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [new TextRun({
            text: `본 보고서는 ${new Date(report.createdAt).toLocaleString('ko-KR')}에 AI 기반으로 생성되었습니다.`,
            italics: true,
          })],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });

  // DOCX 파일 생성 및 다운로드
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `analysis-report-${sessionId}.docx`);
}

/**
 * 보고서를 JSON 형식으로 다운로드
 */
export function downloadReportAsJson(report: AnalysisReport, sessionId: string): void {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  saveAs(blob, `analysis-report-${sessionId}.json`);
}

/**
 * 보고서를 Markdown 형식으로 다운로드
 */
export function downloadReportAsMarkdown(report: AnalysisReport, sessionId: string): void {
  const markdown = convertReportToMarkdown(report, sessionId);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `analysis-report-${sessionId}.md`);
}
