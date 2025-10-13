-- =====================================================
-- RLS 정책 수정: 페르소나 분석 단계 권한 문제 해결
-- =====================================================
-- 문제: ai_models, proposal_workflow_* 테이블 접근 권한 오류
-- 해결: admin, subadmin, 생성자가 접근할 수 있도록 RLS 정책 수정
-- =====================================================

-- =====================================================
-- 1. ai_models 테이블 RLS 정책
-- =====================================================
-- 모든 인증된 사용자가 available 상태의 AI 모델을 조회할 수 있도록 허용

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "ai_models_select_policy" ON ai_models;
DROP POLICY IF EXISTS "ai_models_read_policy" ON ai_models;
DROP POLICY IF EXISTS "ai_models_public_read" ON ai_models;

-- 새로운 정책 생성: 모든 인증된 사용자가 조회 가능
CREATE POLICY "ai_models_public_read"
ON ai_models
FOR SELECT
TO authenticated
USING (status = 'available');

-- =====================================================
-- 2. proposal_workflow_questions 테이블 RLS 정책
-- =====================================================
-- admin, subadmin, 프로젝트 소유자가 접근 가능

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "proposal_workflow_questions_select" ON proposal_workflow_questions;
DROP POLICY IF EXISTS "proposal_workflow_questions_insert" ON proposal_workflow_questions;
DROP POLICY IF EXISTS "proposal_workflow_questions_update" ON proposal_workflow_questions;
DROP POLICY IF EXISTS "proposal_workflow_questions_delete" ON proposal_workflow_questions;

-- SELECT 정책: admin, subadmin, 프로젝트 소유자
CREATE POLICY "proposal_workflow_questions_select"
ON proposal_workflow_questions
FOR SELECT
TO authenticated
USING (
  -- Admin 또는 SubAdmin 권한 확인
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  -- 프로젝트 소유자 확인
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_questions.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- INSERT 정책: admin, subadmin, 프로젝트 소유자
CREATE POLICY "proposal_workflow_questions_insert"
ON proposal_workflow_questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_questions.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- UPDATE 정책: admin, subadmin, 프로젝트 소유자
CREATE POLICY "proposal_workflow_questions_update"
ON proposal_workflow_questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_questions.project_id
    AND projects.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_questions.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- DELETE 정책: admin, subadmin, 프로젝트 소유자
CREATE POLICY "proposal_workflow_questions_delete"
ON proposal_workflow_questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_questions.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- =====================================================
-- 3. proposal_workflow_responses 테이블 RLS 정책
-- =====================================================

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "proposal_workflow_responses_select" ON proposal_workflow_responses;
DROP POLICY IF EXISTS "proposal_workflow_responses_insert" ON proposal_workflow_responses;
DROP POLICY IF EXISTS "proposal_workflow_responses_update" ON proposal_workflow_responses;
DROP POLICY IF EXISTS "proposal_workflow_responses_delete" ON proposal_workflow_responses;

-- SELECT 정책: admin, subadmin, 프로젝트 소유자, 답변 작성자
CREATE POLICY "proposal_workflow_responses_select"
ON proposal_workflow_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_responses.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  proposal_workflow_responses.user_id = auth.uid()
);

-- INSERT 정책: admin, subadmin, 프로젝트 소유자
CREATE POLICY "proposal_workflow_responses_insert"
ON proposal_workflow_responses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_responses.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- UPDATE 정책: admin, subadmin, 프로젝트 소유자, 답변 작성자
CREATE POLICY "proposal_workflow_responses_update"
ON proposal_workflow_responses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_responses.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  proposal_workflow_responses.user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_responses.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  proposal_workflow_responses.user_id = auth.uid()
);

-- DELETE 정책: admin, subadmin, 프로젝트 소유자
CREATE POLICY "proposal_workflow_responses_delete"
ON proposal_workflow_responses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_responses.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- =====================================================
-- 4. proposal_workflow_analysis 테이블 RLS 정책
-- =====================================================

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "proposal_workflow_analysis_select" ON proposal_workflow_analysis;
DROP POLICY IF EXISTS "proposal_workflow_analysis_insert" ON proposal_workflow_analysis;
DROP POLICY IF EXISTS "proposal_workflow_analysis_update" ON proposal_workflow_analysis;
DROP POLICY IF EXISTS "proposal_workflow_analysis_delete" ON proposal_workflow_analysis;

-- SELECT 정책: admin, subadmin, 프로젝트 소유자
CREATE POLICY "proposal_workflow_analysis_select"
ON proposal_workflow_analysis
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_analysis.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- INSERT 정책: admin, subadmin, 프로젝트 소유자
CREATE POLICY "proposal_workflow_analysis_insert"
ON proposal_workflow_analysis
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_analysis.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- UPDATE 정책: admin, subadmin, 프로젝트 소유자
CREATE POLICY "proposal_workflow_analysis_update"
ON proposal_workflow_analysis
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_analysis.project_id
    AND projects.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_analysis.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- DELETE 정책: admin, subadmin만 가능
CREATE POLICY "proposal_workflow_analysis_delete"
ON proposal_workflow_analysis
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
);

-- =====================================================
-- 5. profiles 테이블에 role 컬럼이 없다면 추가
-- =====================================================
-- role 컬럼이 이미 존재하면 이 쿼리는 실패하지만 무시해도 됩니다

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'subadmin', 'user'));
    COMMENT ON COLUMN profiles.role IS 'User role: admin, subadmin, or user';
  END IF;
END $$;

-- =====================================================
-- 6. RLS 활성화 확인
-- =====================================================
-- 각 테이블의 RLS가 활성화되어 있는지 확인하고 활성화

ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_workflow_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_workflow_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_workflow_analysis ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 완료 메시지
-- =====================================================
-- SELECT 'RLS policies updated successfully!' as message;
