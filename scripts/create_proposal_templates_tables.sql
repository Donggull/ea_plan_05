-- ============================================================================
-- ELUO 프로젝트 - 제안서 템플릿 테이블 생성 스크립트
-- ============================================================================
--  이 스크립트는 Supabase SQL Editor에서 실행하세요.
-- ============================================================================

-- 1. proposal_templates 테이블 생성
CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  html_template TEXT NOT NULL,
  css_styles TEXT,
  template_type VARCHAR(50) DEFAULT 'standard'
    CHECK (template_type IN ('standard', 'technical', 'creative', 'business', 'modern')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_proposal_templates_type ON proposal_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_active ON proposal_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_created ON proposal_templates(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE TRIGGER update_proposal_templates_updated_at
  BEFORE UPDATE ON proposal_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. proposal_template_selections 테이블 생성
CREATE TABLE IF NOT EXISTS public.proposal_template_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES proposal_templates(id) ON DELETE CASCADE,
  selected_by UUID REFERENCES profiles(id),
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- 프로젝트당 하나의 템플릿만 선택 가능
  UNIQUE(project_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_template_selections_project ON proposal_template_selections(project_id);
CREATE INDEX IF NOT EXISTS idx_template_selections_template ON proposal_template_selections(template_id);

-- 3. RLS 정책 설정

-- proposal_templates: 모든 인증 사용자가 조회 가능
ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON proposal_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- 관리자만 템플릿 생성/수정/삭제 가능
CREATE POLICY "Admins can manage templates"
  ON proposal_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'subadmin')
    )
  );

-- proposal_template_selections: 프로젝트 소유자만 접근 가능
ALTER TABLE proposal_template_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage template selections"
  ON proposal_template_selections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = proposal_template_selections.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- 4. 기본 함수 생성 (없는 경우)

-- updated_at 자동 업데이트 함수 (이미 있을 수 있음)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 완료!
-- ============================================================================
-- 다음 단계: 템플릿 등록 스크립트를 실행하세요.
-- ============================================================================
