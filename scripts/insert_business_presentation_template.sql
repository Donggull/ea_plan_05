-- ============================================================================
-- ELUO 프로젝트 - 비즈니스 프레젠테이션 템플릿 등록 스크립트
-- ============================================================================
-- 이 스크립트는 Supabase SQL Editor에서 실행하세요.
-- ============================================================================

-- 1. 기존 템플릿 삭제 (테스트용 - 필요시 주석 해제)
-- DELETE FROM proposal_templates WHERE name = '비즈니스 프레젠테이션 템플릿';

-- 2. 비즈니스 프레젠테이션 템플릿 등록
INSERT INTO public.proposal_templates (
  name,
  description,
  thumbnail_url,
  html_template,
  css_styles,
  template_type,
  is_active
)
VALUES (
  '비즈니스 프레젠테이션 템플릿',
  '깔끔하고 전문적인 비즈니스 프레젠테이션 스타일의 템플릿입니다. 슬라이드 형식으로 제안서를 표현하며, 커버 슬라이드, 섹션 슬라이드, 감사 슬라이드로 구성되어 있습니다.',
  NULL, -- 썸네일 URL은 향후 추가
  E'<!-- 비즈니스 프레젠테이션 템플릿 - ELUO Project -->
<div class="slide cover-slide active" id="slide-cover">
  <div class="slide-content">
    <h1 class="title-main">{{projectName}}</h1>
    <p class="text-body subtitle">{{summary}}</p>
    <div class="blue-line"></div>
    <div class="metadata-footer">
      <p>{{companyName}}</p>
      <p>{{createdDate}}</p>
    </div>
  </div>
</div>

<!-- 섹션 슬라이드들 -->
{{#sections}}
<div class="slide section-slide" id="slide-{{id}}">
  <div class="content-layout">
    <div class="section-header">
      <div class="section-number">{{@index}}</div>
      <h2 class="title-section">{{title}}</h2>
    </div>
    <div class="section-body">
      <div class="section-content">{{{content}}}</div>
    </div>
  </div>
</div>
{{/sections}}

<!-- 마지막 슬라이드 - 감사 메시지 -->
<div class="slide thank-you-slide" id="slide-end">
  <div class="slide-content">
    <h1 class="title-main">감사합니다</h1>
    <div class="contact-info">
      <p class="text-body">{{companyName}}</p>
      <p class="text-body">{{contactEmail}}</p>
    </div>
    <div class="blue-line"></div>
  </div>
</div>',
  E'/* 비즈니스 프레젠테이션 템플릿 CSS - ELUO Project */

/* CSS 변수 정의 */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #000000;
  --text-secondary: #666666;
  --text-light: #999999;
  --circle-dark: #000000;
  --circle-accent: #ffff00;
  --circle-text-white: #ffffff;
  --circle-text-black: #000000;
  --border-primary: #1d4ed8;
  --border-light: #e5e7eb;
  --arrow-color: #374151;
  --table-header: #f3f4f6;
  --table-border: #d1d5db;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: ''Pretendard'', -apple-system, BlinkMacSystemFont, ''Segoe UI'', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

.presentation-container {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.slide {
  width: 100%;
  height: 100%;
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem 6rem;
  position: relative;
  background: var(--bg-primary);
}

.slide.active {
  display: flex;
}

.cover-slide {
  text-align: center;
}

.cover-slide .slide-content {
  max-width: 800px;
}

.cover-slide .title-main {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.cover-slide .subtitle {
  font-size: 1.25rem;
  line-height: 1.8;
  color: var(--text-secondary);
  margin-bottom: 3rem;
}

.cover-slide .metadata-footer {
  margin-top: 4rem;
}

.cover-slide .metadata-footer p {
  color: var(--text-light);
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.section-slide {
  align-items: flex-start;
}

.section-slide .content-layout {
  width: 100%;
  max-width: 1200px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 3rem;
  gap: 1.5rem;
}

.section-number {
  width: 60px;
  height: 60px;
  background: var(--circle-dark);
  color: var(--circle-text-white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  flex-shrink: 0;
}

.title-section {
  font-size: 2.25rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.section-body {
  margin-left: 76px;
}

.section-content {
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--text-secondary);
}

.section-content p {
  margin-bottom: 1rem;
}

.section-content ul,
.section-content ol {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}

.section-content li {
  margin-bottom: 0.5rem;
}

.section-content h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 1.5rem 0 1rem 0;
}

.section-content h4 {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 1rem 0 0.75rem 0;
}

.thank-you-slide {
  text-align: center;
}

.thank-you-slide .slide-content {
  max-width: 600px;
}

.thank-you-slide .title-main {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 3rem;
}

.thank-you-slide .contact-info {
  margin: 2rem 0;
}

.thank-you-slide .contact-info p {
  margin: 1rem 0;
  font-size: 1.125rem;
}

.blue-line {
  width: 100%;
  max-width: 200px;
  height: 3px;
  background: var(--border-primary);
  margin: 2rem auto;
}

.title-main {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.title-section {
  font-size: 1.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
}

.title-sub {
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.text-body {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-primary);
}

.text-small {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--text-secondary);
}

.navigation {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.75rem 1.5rem;
  border-radius: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.nav-btn {
  background: var(--circle-dark);
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s ease;
  font-weight: 500;
}

.nav-btn:hover {
  background: #333;
}

.nav-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.slide-indicators {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ccc;
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator.active {
  background: var(--border-primary);
  transform: scale(1.2);
}

.indicator:hover {
  background: #999;
}

@media (max-width: 768px) {
  .slide {
    padding: 2rem 1.5rem;
  }
  .cover-slide .title-main {
    font-size: 2rem;
  }
  .cover-slide .subtitle {
    font-size: 1rem;
  }
  .title-section {
    font-size: 1.5rem;
  }
  .section-number {
    width: 45px;
    height: 45px;
    font-size: 1.125rem;
  }
  .section-body {
    margin-left: 0;
  }
  .section-content {
    font-size: 1rem;
  }
  .navigation {
    padding: 0.5rem 1rem;
    gap: 0.5rem;
  }
  .nav-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }
  .indicator {
    width: 8px;
    height: 8px;
  }
}

/* ========================================
   Enhanced Layout Components
   ======================================== */

/* 강조 박스 - 중요한 내용 강조 */
.highlight-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.highlight-box p {
  color: white;
  margin-bottom: 0.5rem;
}

/* 통계 카드 컨테이너 */
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.stat-box {
  background: var(--bg-secondary);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  border-left: 4px solid var(--border-primary);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-box:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--border-primary);
  margin-bottom: 0.5rem;
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

/* 솔루션/기능 카드 그리드 */
.solution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.solution-card {
  background: var(--bg-secondary);
  padding: 2rem;
  border-radius: 12px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 2px solid transparent;
}

.solution-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--border-primary);
}

.solution-card .icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  display: block;
}

.solution-card h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.solution-card p {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 개선된 목록 스타일 */
.enhanced-list {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
}

.enhanced-list .list-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-left: 0;
}

.enhanced-list .bullet {
  color: var(--border-primary);
  font-weight: 700;
  margin-right: 0.75rem;
  flex-shrink: 0;
  font-size: 1.25rem;
}

.enhanced-list .content {
  flex: 1;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 문제점 하이라이트 섹션 */
.problem-section {
  margin: 2rem 0;
}

.problem-highlights {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.problem-item {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.problem-item .icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.problem-item .content {
  flex: 1;
  color: #856404;
  font-weight: 500;
}

/* 2-column 레이아웃 */
.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 2rem 0;
}

.column {
  display: flex;
  flex-direction: column;
}

/* 키워드 강조 */
.keyword-highlight {
  background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  color: #000;
}

/* 숫자 강조 */
.number-highlight {
  font-size: 1.5em;
  font-weight: 700;
  color: var(--border-primary);
  white-space: nowrap;
}

/* 기술 스택/태그 리스트 */
.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.tech-tag {
  background: var(--bg-secondary);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  border: 2px solid var(--border-light);
  transition: all 0.3s ease;
}

.tech-tag:hover {
  background: var(--border-primary);
  color: white;
  border-color: var(--border-primary);
}

/* 타임라인 레이아웃 */
.timeline {
  position: relative;
  padding-left: 2rem;
  margin: 2rem 0;
}

.timeline::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-light);
}

.timeline-item {
  position: relative;
  padding-bottom: 2rem;
}

.timeline-item::before {
  content: "";
  position: absolute;
  left: -2.5rem;
  top: 0.5rem;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--border-primary);
  border: 3px solid white;
}

.timeline-item h4 {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.timeline-item p {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Quote/인용구 스타일 */
.quote-box {
  border-left: 4px solid var(--border-primary);
  padding: 1.5rem 2rem;
  margin: 2rem 0;
  background: var(--bg-secondary);
  border-radius: 0 8px 8px 0;
  font-style: italic;
}

.quote-box p {
  color: var(--text-secondary);
  font-size: 1.125rem;
  line-height: 1.8;
}

/* 비교표 섹션 */
.comparison-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin: 2rem 0;
}

.comparison-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.comparison-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.comparison-category {
  grid-column: 1 / -1;
  font-weight: 600;
  font-size: 1.125rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-light);
}

.comparison-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.comparison-item .label {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.comparison-item.ours {
  text-align: right;
}

.comparison-item.ours .label {
  color: var(--border-primary);
}

.comparison-item.theirs .label {
  color: #6b7280;
}

.comparison-item .content {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.comparison-vs {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-light);
  padding: 0.5rem;
}

/* 팀 멤버 그리드 */
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.team-member-card {
  background: var(--bg-secondary);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 2px solid transparent;
}

.team-member-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--border-primary);
}

.member-avatar {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.member-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.member-role {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--border-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.member-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 포트폴리오 그리드 */
.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.portfolio-card {
  background: var(--bg-secondary);
  padding: 2rem;
  border-radius: 12px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 2px solid var(--border-light);
  position: relative;
}

.portfolio-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--border-primary);
}

.portfolio-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.portfolio-icon {
  font-size: 1.5rem;
}

.portfolio-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.portfolio-details {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.portfolio-details li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  color: var(--text-secondary);
  line-height: 1.6;
}

.portfolio-details li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--border-primary);
  font-weight: 700;
}

.portfolio-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 1rem;
}

/* ========================================
   Animations
   ======================================== */

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 슬라이드 전환 시 애니메이션 적용 */
.slide.active {
  animation: fadeIn 0.6s ease-out;
}

.solution-card,
.stat-box,
.team-member-card,
.portfolio-card {
  animation: scaleIn 0.5s ease-out;
  animation-fill-mode: both;
}

.solution-card:nth-child(1) { animation-delay: 0.1s; }
.solution-card:nth-child(2) { animation-delay: 0.2s; }
.solution-card:nth-child(3) { animation-delay: 0.3s; }
.solution-card:nth-child(4) { animation-delay: 0.4s; }
.solution-card:nth-child(5) { animation-delay: 0.5s; }
.solution-card:nth-child(6) { animation-delay: 0.6s; }

.stat-box:nth-child(1) { animation-delay: 0.1s; }
.stat-box:nth-child(2) { animation-delay: 0.2s; }
.stat-box:nth-child(3) { animation-delay: 0.3s; }
.stat-box:nth-child(4) { animation-delay: 0.4s; }

.team-member-card:nth-child(1) { animation-delay: 0.1s; }
.team-member-card:nth-child(2) { animation-delay: 0.2s; }
.team-member-card:nth-child(3) { animation-delay: 0.3s; }
.team-member-card:nth-child(4) { animation-delay: 0.4s; }

.portfolio-card:nth-child(1) { animation-delay: 0.1s; }
.portfolio-card:nth-child(2) { animation-delay: 0.2s; }
.portfolio-card:nth-child(3) { animation-delay: 0.3s; }

.comparison-row {
  animation: slideInLeft 0.5s ease-out;
  animation-fill-mode: both;
}

.comparison-row:nth-child(1) { animation-delay: 0.1s; }
.comparison-row:nth-child(2) { animation-delay: 0.2s; }
.comparison-row:nth-child(3) { animation-delay: 0.3s; }

.timeline-item {
  animation: slideInRight 0.5s ease-out;
  animation-fill-mode: both;
}

.timeline-item:nth-child(1) { animation-delay: 0.1s; }
.timeline-item:nth-child(2) { animation-delay: 0.2s; }
.timeline-item:nth-child(3) { animation-delay: 0.3s; }
.timeline-item:nth-child(4) { animation-delay: 0.4s; }
.timeline-item:nth-child(5) { animation-delay: 0.5s; }

/* 호버 효과 강화 */
.solution-card:hover,
.stat-box:hover,
.team-member-card:hover,
.portfolio-card:hover {
  animation: none; /* 호버 시 애니메이션 제거 */
}

/* 반응형 조정 */
@media (max-width: 768px) {
  .stats-container {
    grid-template-columns: 1fr;
  }

  .solution-grid {
    grid-template-columns: 1fr;
  }

  .two-column {
    grid-template-columns: 1fr;
  }

  .timeline {
    padding-left: 1.5rem;
  }

  .team-grid {
    grid-template-columns: 1fr;
  }

  .portfolio-grid {
    grid-template-columns: 1fr;
  }

  .comparison-row {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .comparison-item.ours {
    text-align: center;
  }

  .comparison-vs {
    grid-row: 2;
    grid-column: 1;
  }

  .comparison-category {
    text-align: center;
  }
}

@media print {
  .slide {
    page-break-after: always;
    display: flex !important;
    height: 100vh;
  }
  .navigation {
    display: none;
  }
  body {
    background: white;
  }
}',
  'business',
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  css_styles = EXCLUDED.css_styles,
  template_type = EXCLUDED.template_type,
  is_active = EXCLUDED.is_active,
  updated_at = TIMEZONE('utc', NOW());

-- 3. 등록 확인
SELECT id, name, template_type, is_active, created_at
FROM proposal_templates
WHERE name = '비즈니스 프레젠테이션 템플릿';

-- ============================================================================
-- 완료!
-- ============================================================================
-- 템플릿이 성공적으로 등록되었습니다.
-- 이제 프론트엔드에서 템플릿을 선택하고 사용할 수 있습니다.
-- ============================================================================
