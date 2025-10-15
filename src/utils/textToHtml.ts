/**
 * 순수 텍스트를 HTML로 변환하는 유틸리티 함수
 *
 * 1차 제안서의 순수 텍스트 content를 템플릿에 맞는 HTML로 변환합니다.
 * - 줄바꿈 → <br> 또는 <p>
 * - 목록 패턴 → <ul><li>
 * - 강조 패턴 → <strong>
 * - 제목 패턴 → <h3>
 */

export interface TextToHtmlOptions {
  useParagraphs?: boolean;      // true: <p> 태그 사용, false: <br> 사용
  convertLists?: boolean;        // 목록 패턴 자동 변환
  convertEmphasis?: boolean;     // 강조 패턴 자동 변환
  convertHeadings?: boolean;     // 제목 패턴 자동 변환
}

const defaultOptions: TextToHtmlOptions = {
  useParagraphs: true,
  convertLists: true,
  convertEmphasis: true,
  convertHeadings: true
};

/**
 * 텍스트를 HTML로 변환
 */
export function textToHtml(text: string, options: TextToHtmlOptions = {}): string {
  if (!text) return '';

  const opts = { ...defaultOptions, ...options };
  let html = text;

  // 1. HTML 태그가 이미 있으면 그대로 반환 (안전장치)
  if (/<[a-z][\s\S]*>/i.test(html)) {
    return html;
  }

  // 2. 제목 패턴 변환 (예: "## 제목" 또는 "**제목**" 단독 줄)
  if (opts.convertHeadings) {
    // Markdown 스타일 헤딩 (## 제목)
    html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');

    // 독립된 줄의 강조 텍스트를 제목으로 (예: "**핵심 가치**\n")
    html = html.replace(/^\*\*(.+?)\*\*$/gm, '<h3>$1</h3>');
  }

  // 3. 목록 패턴 변환
  if (opts.convertLists) {
    // 번호 목록 (1. 항목, 2. 항목)
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');

    // 기호 목록 (- 항목, * 항목, • 항목)
    html = html.replace(/^[-*•]\s+(.+)$/gm, '<li>$1</li>');

    // <li> 태그를 <ul>로 감싸기
    html = html.replace(/(<li>[\s\S]+?<\/li>)/g, (match) => {
      // 연속된 <li> 그룹을 찾아서 <ul>로 감싸기
      const lines = match.split('\n').filter(line => line.trim());
      if (lines.length > 0 && lines.every(line => line.includes('<li>'))) {
        return '<ul>\n' + lines.join('\n') + '\n</ul>';
      }
      return match;
    });
  }

  // 4. 강조 패턴 변환
  if (opts.convertEmphasis) {
    // **굵게** → <strong>굵게</strong>
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // __굵게__ → <strong>굵게</strong>
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  }

  // 5. 줄바꿈 처리
  if (opts.useParagraphs) {
    // 빈 줄로 구분된 문단을 <p> 태그로 변환
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs
      .map(para => {
        para = para.trim();
        // 이미 HTML 태그로 시작하면 그대로 유지
        if (para.startsWith('<')) {
          return para;
        }
        // 일반 텍스트는 <p>로 감싸기
        return `<p>${para.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');
  } else {
    // 단순 줄바꿈을 <br>로 변환
    html = html.replace(/\n/g, '<br>');
  }

  return html;
}

/**
 * HTML을 순수 텍스트로 변환 (역변환)
 */
export function htmlToText(html: string): string {
  if (!html) return '';

  let text = html;

  // HTML 태그 제거
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<li>/gi, '- ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');

  // HTML 엔티티 디코딩
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // 연속된 빈 줄 정리
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * 템플릿용 간소화된 HTML 변환
 *
 * 템플릿 적용 시 사용하는 간단한 변환 함수
 * - 줄바꿈 → <br>
 * - 목록 자동 인식 → <ul><li>
 */
export function textToSimpleHtml(text: string): string {
  if (!text) return '';

  // 이미 HTML이면 그대로 반환
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  let html = text;

  // 1. 목록 패턴 인식 및 변환
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 목록 항목인지 확인
    const isListItem = /^(\d+\.|[-*•])\s+/.test(line);

    if (isListItem) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      // 목록 기호 제거 후 <li> 추가
      const content = line.replace(/^(\d+\.|[-*•])\s+/, '');
      result.push(`<li>${content}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (line) {
        result.push(`<p>${line}</p>`);
      }
    }
  }

  // 목록이 열린 상태로 끝나면 닫기
  if (inList) {
    result.push('</ul>');
  }

  html = result.join('\n');

  // 2. 강조 표현 변환
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  return html;
}

/**
 * 섹션 제목을 슬라이드 제목으로 매핑
 *
 * 1차 제안서의 section 제목을 템플릿의 slide 제목에 맞게 매핑합니다.
 */
export function mapSectionToSlideTitle(sectionTitle: string): string {
  const mapping: Record<string, string> = {
    // Phase 0
    '고객사 비즈니스 현황': '고객사 비즈니스 현황',
    '핵심 문제점 및 니즈': '해결하고자 하는 과제',
    '시장 환경 분석': '시장 환경 분석',
    '프로젝트 추진 배경': '프로젝트 추진 배경',

    // Phase 1
    '솔루션 개요': '제안 솔루션 개요',
    '핵심 가치 제안': '핵심 가치 제안',
    '프로젝트 목표 및 기대효과': '프로젝트 목표 및 기대효과',
    '성공 지표 및 ROI': '성공 지표 및 ROI',

    // Phase 2
    '기술 스택 및 아키텍처': '기술 스택 및 시스템 아키텍처',
    '구현 방법론 및 프로세스': '개발 방법론 및 품질 관리',
    '팀 소개 및 전문성': '팀 소개 및 전문성',
    '유사 프로젝트 실적': '유사 프로젝트 실적 및 레퍼런스',

    // Phase 3
    '프로젝트 일정': '프로젝트 일정 계획',
    '비용 산정': '프로젝트 비용 산정',
    '리스크 관리': '리스크 관리 계획',

    // Phase 4
    '경쟁 우위 및 차별화': '경쟁 우위 및 차별화 포인트',
    '품질 보증 및 사후 지원': '품질 보증 및 사후 지원',
    '고객 추천사 및 레퍼런스': '고객 추천사 및 성공 사례',
    '성공 약속 및 보장': '성공을 위한 약속'
  };

  return mapping[sectionTitle] || sectionTitle;
}
