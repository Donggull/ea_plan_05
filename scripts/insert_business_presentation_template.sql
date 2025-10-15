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
