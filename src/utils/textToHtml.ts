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
 * 템플릿용 향상된 HTML 변환 (Enhanced)
 *
 * 섹션 타입을 자동 감지하여 적절한 템플릿 레이아웃을 적용합니다.
 * - 문제/과제형 → problem-section
 * - 솔루션형 → solution-grid
 * - 통계/지표형 → stats-container
 * - 기술 스택형 → tech-stack
 * - 일정형 → timeline
 * - 키워드/숫자 자동 강조
 */
export interface SectionType {
  type: 'problem' | 'solution' | 'stats' | 'tech' | 'timeline' | 'list' | 'comparison' | 'team' | 'portfolio' | 'standard'
  confidence: number
}

export function detectSectionType(title: string, content: string): SectionType {
  const text = `${title} ${content}`.toLowerCase()

  // 키워드 기반 섹션 타입 감지 (다국어 지원)
  const patterns: Record<string, RegExp[]> = {
    problem: [
      /문제|이슈|과제|니즈|pain point|challenge|problem|issue/i,
      /해결하고자|개선|보완|improve|solve/i
    ],
    solution: [
      /솔루션|제안|방안|해결책|approach|solution|proposal/i,
      /기능|특징|장점|feature|benefit|advantage/i
    ],
    stats: [
      /\d+%|\d+배|\d+원|\d+명/g,
      /roi|지표|성과|수치|통계|증가|감소|향상|metric|performance|growth|increase/i
    ],
    tech: [
      /기술|스택|아키텍처|프레임워크|api|클라우드|데이터베이스|technology|stack|architecture|framework|cloud|database/i
    ],
    timeline: [
      /일정|기간|마일스톤|단계|phase|schedule|timeline|milestone|roadmap/i,
      /\d+개월|\d+주|\d+일|\d+\s*month|\d+\s*week|\d+\s*day/i
    ],
    comparison: [
      /비교|경쟁|차별화|vs|versus|comparison|competitive|differentiation/i,
      /우위|강점|약점|장단점|pros|cons|strength|weakness/i
    ],
    team: [
      /팀|조직|인력|구성원|멤버|team|organization|member|staff|personnel/i,
      /경력|전문성|expertise|experience|skill/i
    ],
    portfolio: [
      /실적|프로젝트|포트폴리오|레퍼런스|portfolio|project|reference|case study/i,
      /성공|완료|수행|success|completed|delivered/i
    ],
    list: [/^(\d+\.|[-*•])\s+/m]
  }

  const scores: Record<string, number> = {
    problem: 0,
    solution: 0,
    stats: 0,
    tech: 0,
    timeline: 0,
    comparison: 0,
    team: 0,
    portfolio: 0,
    list: 0
  }

  // 패턴 매칭으로 점수 계산
  for (const [type, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const matches = text.match(regex)
      if (matches) {
        scores[type] += matches.length
      }
    }
  }

  // 가장 높은 점수의 타입 선택
  let maxScore = 0
  let detectedType: SectionType['type'] = 'standard'

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      detectedType = type as SectionType['type']
    }
  }

  return {
    type: maxScore > 0 ? detectedType : 'standard',
    confidence: Math.min(maxScore / 10, 1)
  }
}

/**
 * 키워드 자동 하이라이트 (한글/영어 지원)
 */
export function highlightKeywords(text: string): string {
  const keywords = [
    // 한글 키워드
    'AI', '인공지능', '머신러닝', 'ML', '딥러닝',
    '클라우드', 'AWS', 'Azure', 'GCP',
    '혁신', '개선', '향상', '최적화', '효율',
    'API', '프레임워크', '아키텍처', '마이크로서비스',
    '자동화', '실시간', '확장성', '보안',
    // 영어 키워드
    'innovation', 'optimization', 'efficiency', 'automation',
    'scalability', 'security', 'performance', 'reliability',
    'real-time', 'cloud-native', 'microservice', 'DevOps',
    'CI/CD', 'blockchain', 'IoT', 'big data', 'analytics'
  ]

  let result = text

  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi')
    result = result.replace(regex, '<span class="keyword-highlight">$1</span>')
  })

  return result
}

/**
 * 숫자 자동 강조 (통계, 비율, 금액 등)
 */
export function highlightNumbers(text: string): string {
  // 퍼센트 (250%)
  text = text.replace(/(\d+(?:\.\d+)?%)/g, '<span class="number-highlight">$1</span>')

  // 배수 (50배, 2.5배)
  text = text.replace(/(\d+(?:\.\d+)?배)/g, '<span class="number-highlight">$1</span>')

  // 금액 (1,000원, 백만원)
  text = text.replace(/(\d{1,3}(?:,\d{3})*원)/g, '<span class="number-highlight">$1</span>')
  text = text.replace(/((?:백|천|만|억|조)\s*원)/g, '<span class="number-highlight">$1</span>')

  return text
}

/**
 * 통계 데이터 추출 및 stat-box 생성
 */
export function extractStats(text: string): { stats: Array<{number: string; label: string}>; remainingText: string } {
  const statPattern = /(\d+(?:\.\d+)?%|\d+배|\d+(?:,\d+)*원)\s*[:：-]?\s*([^.\n]+)/g
  const stats: Array<{number: string; label: string}> = []

  const matches = [...text.matchAll(statPattern)]
  matches.forEach(match => {
    stats.push({
      number: match[1],
      label: match[2].trim()
    })
  })

  // 통계를 추출한 후 원본 텍스트에서 제거
  let remainingText = text
  matches.forEach(match => {
    remainingText = remainingText.replace(match[0], '')
  })

  return { stats, remainingText: remainingText.trim() }
}

/**
 * 향상된 HTML 변환 - 섹션 타입별 레이아웃 적용
 */
export function textToEnhancedHtml(title: string, text: string): string {
  if (!text) return ''

  // 이미 HTML이면 그대로 반환
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text
  }

  // 섹션 타입 감지
  const sectionType = detectSectionType(title, text)
  console.log(`📊 섹션 "${title}" 타입 감지:`, sectionType.type, `(신뢰도: ${Math.round(sectionType.confidence * 100)}%)`)

  // 타입별 처리
  switch (sectionType.type) {
    case 'problem':
      return renderProblemSection(text)
    case 'solution':
      return renderSolutionSection(text)
    case 'stats':
      return renderStatsSection(text)
    case 'tech':
      return renderTechSection(text)
    case 'timeline':
      return renderTimelineSection(text)
    case 'comparison':
      return renderComparisonSection(text)
    case 'team':
      return renderTeamSection(text)
    case 'portfolio':
      return renderPortfolioSection(text)
    case 'list':
      return renderEnhancedList(text)
    default:
      return renderStandardSection(text)
  }
}

/**
 * 문제/과제 섹션 렌더링
 */
function renderProblemSection(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())

  const problemItems = lines.map(line => {
    const cleanLine = line.replace(/^[-*•\d.]\s*/, '').trim()
    return `
    <div class="problem-item">
      <span class="icon">⚠️</span>
      <div class="content">${highlightKeywords(cleanLine)}</div>
    </div>`
  }).join('\n')

  return `
<div class="problem-section">
  <div class="problem-highlights">
    ${problemItems}
  </div>
</div>`
}

/**
 * 솔루션 섹션 렌더링 (카드 그리드)
 */
function renderSolutionSection(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())
  const items: Array<{title: string; content: string}> = []

  let currentTitle = ''
  let currentContent: string[] = []

  lines.forEach((line, index) => {
    const isBold = /^\*\*(.+?)\*\*/.test(line) || /^#{1,3}\s+/.test(line)

    if (isBold || index === 0) {
      if (currentTitle && currentContent.length > 0) {
        items.push({ title: currentTitle, content: currentContent.join(' ') })
      }
      currentTitle = line.replace(/^\*\*(.+?)\*\*/, '$1').replace(/^#{1,3}\s+/, '').trim()
      currentContent = []
    } else {
      currentContent.push(line.replace(/^[-*•]\s*/, '').trim())
    }
  })

  if (currentTitle && currentContent.length > 0) {
    items.push({ title: currentTitle, content: currentContent.join(' ') })
  }

  if (items.length === 0) {
    items.push({ title: '주요 내용', content: text })
  }

  const icons = ['✨', '🚀', '💡', '🎯', '⚡', '🔧']

  const cards = items.map((item, index) => `
  <div class="solution-card">
    <span class="icon">${icons[index % icons.length]}</span>
    <h4>${highlightKeywords(item.title)}</h4>
    <p>${highlightKeywords(highlightNumbers(item.content))}</p>
  </div>`).join('\n')

  return `
<div class="solution-grid">
  ${cards}
</div>`
}

/**
 * 통계/지표 섹션 렌더링
 */
function renderStatsSection(text: string): string {
  const { stats, remainingText } = extractStats(text)

  let html = ''

  if (stats.length > 0) {
    const statBoxes = stats.map(stat => `
    <div class="stat-box">
      <div class="stat-number">${stat.number}</div>
      <div class="stat-label">${stat.label}</div>
    </div>`).join('\n')

    html += `
<div class="stats-container">
  ${statBoxes}
</div>`
  }

  if (remainingText) {
    html += `
<div class="highlight-box">
  <p>${highlightKeywords(highlightNumbers(remainingText))}</p>
</div>`
  }

  return html || renderStandardSection(text)
}

/**
 * 기술 스택 섹션 렌더링
 */
function renderTechSection(text: string): string {
  const techKeywords = text.match(/\b[A-Z][a-zA-Z0-9.]+\b/g) || []
  const koreanTech = text.match(/[가-힣]+(?:스택|프레임워크|라이브러리|서버|데이터베이스)/g) || []

  const allTech = [...new Set([...techKeywords, ...koreanTech])]

  if (allTech.length > 0) {
    const tags = allTech.map(tech => `<span class="tech-tag">${tech}</span>`).join('\n')

    return `
<div class="tech-stack">
  ${tags}
</div>
<p>${highlightKeywords(text)}</p>`
  }

  return renderStandardSection(text)
}

/**
 * 타임라인 섹션 렌더링
 */
function renderTimelineSection(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())

  const timelineItems = lines.map(line => {
    const cleanLine = line.replace(/^[-*•\d.]\s*/, '').trim()
    const parts = cleanLine.split(/[:：]/)

    if (parts.length >= 2) {
      return `
    <div class="timeline-item">
      <h4>${parts[0].trim()}</h4>
      <p>${highlightKeywords(parts.slice(1).join(':').trim())}</p>
    </div>`
    } else {
      return `
    <div class="timeline-item">
      <p>${highlightKeywords(cleanLine)}</p>
    </div>`
    }
  }).join('\n')

  return `
<div class="timeline">
  ${timelineItems}
</div>`
}

/**
 * 텍스트 길이에 따라 column 클래스 결정
 */
function getColumnClass(itemCount: number, avgLength: number): string {
  // 항목이 너무 적으면 단일 column
  if (itemCount <= 3) {
    return ''
  }

  // 항목이 많고 짧으면 3 columns
  if (itemCount >= 9 && avgLength < 80) {
    return 'multi-column-3'
  }

  // 중간 항목 수는 2 columns
  if (itemCount >= 4) {
    return 'multi-column-2'
  }

  return ''
}

/**
 * 타이틀과 본문을 분리하여 텍스트 위계 적용
 */
function emphasizeKeyPoints(text: string): string {
  // "타이틀: 내용" 또는 "타이틀 - 내용" 패턴 감지
  const titlePattern = /^(.+?)[:：\-]\s*(.+)$/
  const match = text.match(titlePattern)

  if (match) {
    const title = match[1].trim()
    const body = match[2].trim()
    return `<span class="text-emphasis-title">${highlightKeywords(title)}</span><span class="text-emphasis-separator">:</span> <span class="text-emphasis-body">${highlightKeywords(highlightNumbers(body))}</span>`
  }

  // 패턴이 없으면 일반 강조 적용
  return highlightKeywords(highlightNumbers(text))
}

/**
 * 향상된 목록 렌더링 (Multi-column + 텍스트 위계)
 */
function renderEnhancedList(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())

  // 평균 텍스트 길이 계산
  const totalLength = lines.reduce((sum, line) => sum + line.length, 0)
  const avgLength = lines.length > 0 ? totalLength / lines.length : 0

  // Column 클래스 결정
  const columnClass = getColumnClass(lines.length, avgLength)

  // List 타입 결정 (compact vs detailed)
  const listTypeClass = avgLength < 50 ? 'compact-list' : 'detailed-list'

  console.log(`  📋 리스트 렌더링: ${lines.length}개 항목, 평균 ${Math.round(avgLength)}자 → ${columnClass || '1-column'}, ${listTypeClass}`)

  const listItems = lines.map(line => {
    const cleanLine = line.replace(/^(\d+\.|[-*•])\s*/, '').trim()
    const emphasizedContent = emphasizeKeyPoints(cleanLine)

    return `
  <li class="list-item">
    <span class="bullet">▸</span>
    <span class="content">${emphasizedContent}</span>
  </li>`
  }).join('\n')

  return `
<ul class="enhanced-list ${columnClass} ${listTypeClass}">
  ${listItems}
</ul>`
}

/**
 * 표준 섹션 렌더링 (폴백 + 스마트 포맷팅)
 */
function renderStandardSection(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())

  // 리스트 패턴이 많으면 renderEnhancedList 사용
  const listItemCount = lines.filter(line => /^(\d+\.|[-*•])\s+/.test(line)).length
  if (listItemCount > 3) {
    return renderEnhancedList(text)
  }

  // 일반 텍스트 처리 (paragraphs + 텍스트 위계)
  const paragraphs = lines.map(line => {
    // 리스트 아이템 제거 기호
    const cleanLine = line.replace(/^(\d+\.|[-*•])\s*/, '').trim()

    // 텍스트 위계 적용
    const emphasizedLine = emphasizeKeyPoints(cleanLine)

    return `<p class="content-paragraph">${emphasizedLine}</p>`
  }).join('\n')

  return `
<div class="standard-content">
  ${paragraphs}
</div>`
}

/**
 * 비교표 섹션 렌더링 (우리 vs 경쟁사)
 */
function renderComparisonSection(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())

  // 비교 항목 추출 (vs, 대비, 비교 등의 키워드 포함)
  const comparisons: Array<{ours: string; theirs: string; category?: string}> = []

  lines.forEach(line => {
    // "우리: A vs 경쟁사: B" 패턴
    const vsMatch = line.match(/(.+?)[:：](.+?)\s+(?:vs|대비|versus)\s+(.+?)[:：](.+)/i)
    if (vsMatch) {
      comparisons.push({
        category: vsMatch[1].trim(),
        ours: vsMatch[2].trim(),
        theirs: vsMatch[4].trim()
      })
      return
    }

    // 단순 "A vs B" 패턴
    const simpleVs = line.match(/(.+?)\s+(?:vs|대비|versus)\s+(.+)/i)
    if (simpleVs) {
      comparisons.push({
        ours: simpleVs[1].trim(),
        theirs: simpleVs[2].trim()
      })
    }
  })

  if (comparisons.length > 0) {
    const rows = comparisons.map(comp => `
    <div class="comparison-row">
      ${comp.category ? `<div class="comparison-category">${comp.category}</div>` : ''}
      <div class="comparison-item ours">
        <span class="label">우리</span>
        <div class="content">${highlightKeywords(highlightNumbers(comp.ours))}</div>
      </div>
      <div class="comparison-vs">VS</div>
      <div class="comparison-item theirs">
        <span class="label">경쟁사</span>
        <div class="content">${highlightKeywords(highlightNumbers(comp.theirs))}</div>
      </div>
    </div>`).join('\n')

    return `
<div class="comparison-section">
  ${rows}
</div>`
  }

  // 비교 패턴이 없으면 장단점 리스트로 표시
  return `
<div class="two-column">
  <div class="column">
    <h4>✅ 장점</h4>
    ${renderEnhancedList(text)}
  </div>
  <div class="column">
    <h4>⚠️ 고려사항</h4>
    <p class="text-secondary">지속적인 개선 진행 중</p>
  </div>
</div>`
}

/**
 * 팀/조직 섹션 렌더링
 */
function renderTeamSection(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())

  const members: Array<{name: string; role: string; description: string}> = []

  let currentName = ''
  let currentRole = ''
  let currentDesc: string[] = []

  lines.forEach((line, index) => {
    // 이름: 역할 패턴
    const nameRoleMatch = line.match(/^(.+?)[:：]\s*(.+)/)

    if (nameRoleMatch || index === 0) {
      if (currentName) {
        members.push({
          name: currentName,
          role: currentRole,
          description: currentDesc.join(' ')
        })
      }

      if (nameRoleMatch) {
        currentName = nameRoleMatch[1].trim()
        currentRole = nameRoleMatch[2].trim()
      } else {
        currentName = line.trim()
        currentRole = ''
      }
      currentDesc = []
    } else {
      currentDesc.push(line.replace(/^[-*•]\s*/, '').trim())
    }
  })

  if (currentName) {
    members.push({
      name: currentName,
      role: currentRole,
      description: currentDesc.join(' ')
    })
  }

  if (members.length > 0) {
    const memberCards = members.map(member => `
    <div class="team-member-card">
      <div class="member-avatar">👤</div>
      <h4 class="member-name">${member.name}</h4>
      ${member.role ? `<div class="member-role">${highlightKeywords(member.role)}</div>` : ''}
      ${member.description ? `<p class="member-description">${highlightKeywords(member.description)}</p>` : ''}
    </div>`).join('\n')

    return `
<div class="team-grid">
  ${memberCards}
</div>`
  }

  return renderStandardSection(text)
}

/**
 * 포트폴리오/실적 섹션 렌더링
 */
function renderPortfolioSection(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())

  const projects: Array<{title: string; details: string[]}> = []

  let currentTitle = ''
  let currentDetails: string[] = []

  lines.forEach((line, index) => {
    const isBold = /^\*\*(.+?)\*\*/.test(line) || /^#{1,3}\s+/.test(line) || index === 0

    if (isBold) {
      if (currentTitle && currentDetails.length > 0) {
        projects.push({ title: currentTitle, details: currentDetails })
      }
      currentTitle = line.replace(/^\*\*(.+?)\*\*/, '$1').replace(/^#{1,3}\s+/, '').trim()
      currentDetails = []
    } else {
      const detail = line.replace(/^[-*•]\s*/, '').trim()
      if (detail) {
        currentDetails.push(detail)
      }
    }
  })

  if (currentTitle && currentDetails.length > 0) {
    projects.push({ title: currentTitle, details: currentDetails })
  }

  if (projects.length > 0) {
    const projectCards = projects.map(project => `
    <div class="portfolio-card">
      <div class="portfolio-header">
        <span class="portfolio-icon">📁</span>
        <h4 class="portfolio-title">${highlightKeywords(project.title)}</h4>
      </div>
      <ul class="portfolio-details">
        ${project.details.map(detail => `<li>${highlightKeywords(highlightNumbers(detail))}</li>`).join('\n')}
      </ul>
      <div class="portfolio-badge">✅ 완료</div>
    </div>`).join('\n')

    return `
<div class="portfolio-grid">
  ${projectCards}
</div>`
  }

  return renderStandardSection(text)
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
