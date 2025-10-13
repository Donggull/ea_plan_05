-- =====================================================
-- RLS 정책 수정: 페르소나 및 시장조사 답변 저장 406 에러 해결
-- =====================================================
-- 문제: proposal_workflow_responses INSERT 시 406 Not Acceptable 에러
-- 원인: responded_by = auth.uid() 조건이 INSERT 시점에 적절히 검증되지 않음
-- 해결: 프로젝트 멤버 기반 권한으로 단순화 및 명확화
-- =====================================================

-- =====================================================
-- 1. proposal_workflow_responses INSERT 정책 수정
-- =====================================================
-- Admin, SubAdmin, 프로젝트 소유자, 프로젝트 멤버가 답변 저장 가능

DROP POLICY IF EXISTS "Allow insert for authorized users" ON proposal_workflow_responses;

CREATE POLICY "Allow insert for authorized users"
ON proposal_workflow_responses
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admin 또는 SubAdmin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  -- 프로젝트 소유자
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_responses.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  -- 프로젝트 멤버 (활성 상태)
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = proposal_workflow_responses.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.is_active = true
  )
);

-- =====================================================
-- 2. proposal_workflow_responses UPDATE 정책 수정
-- =====================================================
-- Admin, SubAdmin, 프로젝트 소유자, 프로젝트 멤버, 답변 작성자가 수정 가능

DROP POLICY IF EXISTS "Allow update for authorized users" ON proposal_workflow_responses;

CREATE POLICY "Allow update for authorized users"
ON proposal_workflow_responses
FOR UPDATE
TO authenticated
USING (
  -- Admin 또는 SubAdmin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  -- 프로젝트 소유자
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_responses.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  -- 프로젝트 멤버 (활성 상태)
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = proposal_workflow_responses.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.is_active = true
  )
  OR
  -- 답변 작성자
  responded_by = auth.uid()
)
WITH CHECK (
  -- Admin 또는 SubAdmin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'subadmin')
  )
  OR
  -- 프로젝트 소유자
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = proposal_workflow_responses.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  -- 프로젝트 멤버 (활성 상태)
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = proposal_workflow_responses.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.is_active = true
  )
  OR
  -- 답변 작성자
  responded_by = auth.uid()
);

-- =====================================================
-- 검증 쿼리
-- =====================================================
-- 변경된 정책 확인
SELECT
  policyname,
  cmd,
  CASE
    WHEN cmd = 'INSERT' THEN 'INSERT 정책'
    WHEN cmd = 'UPDATE' THEN 'UPDATE 정책'
    ELSE cmd
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'proposal_workflow_responses'
  AND policyname IN ('Allow insert for authorized users', 'Allow update for authorized users')
ORDER BY cmd;

-- =====================================================
-- 변경 사항 요약
-- =====================================================
-- INSERT 정책:
--   - 기존: admin, subadmin, 프로젝트 소유자, responded_by = auth.uid() (문제 원인)
--   - 변경: admin, subadmin, 프로젝트 소유자, 프로젝트 멤버
--
-- UPDATE 정책:
--   - WITH CHECK 조건 추가 (INSERT와 동일한 조건 + 답변 작성자)
--   - USING과 WITH CHECK 일관성 확보
--
-- 영향 범위:
--   - 시장 조사 (market_research) 답변 저장
--   - 페르소나 분석 (personas) 답변 저장
--   - 모든 proposal_workflow_responses 테이블 INSERT/UPDATE 작업
--
-- 예상 효과:
--   - 406 Not Acceptable 에러 해결
--   - 프로젝트 멤버도 답변 저장 가능
--   - 권한 검증 로직 명확화
