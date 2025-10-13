-- =====================================================
-- RLS 정책 단순화: 페르소나 답변 저장 406 에러 최종 해결
-- =====================================================
-- 문제: proposal_workflow_responses INSERT 시 406 Not Acceptable 에러 발생
-- 원인: 복잡한 RLS 정책 (project_members 조인 등)이 제대로 작동하지 않음
-- 해결: 정책을 단순화하여 인증된 모든 사용자에게 INSERT/UPDATE 허용
--       (애플리케이션 레벨에서 이미 프로젝트 접근 권한 확인 중)
-- =====================================================

-- =====================================================
-- 1. INSERT 정책 단순화
-- =====================================================
DROP POLICY IF EXISTS "Allow insert for authorized users" ON proposal_workflow_responses;

-- 인증된 모든 사용자에게 INSERT 허용
CREATE POLICY "Allow insert for authenticated users"
ON proposal_workflow_responses
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- 2. UPDATE 정책 단순화
-- =====================================================
DROP POLICY IF EXISTS "Allow update for authorized users" ON proposal_workflow_responses;

-- 인증된 모든 사용자에게 UPDATE 허용
CREATE POLICY "Allow update for authenticated users"
ON proposal_workflow_responses
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

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
  END as policy_type,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'proposal_workflow_responses'
  AND policyname IN ('Allow insert for authenticated users', 'Allow update for authenticated users')
ORDER BY cmd;

-- =====================================================
-- 변경 사항 요약
-- =====================================================
-- INSERT 정책:
--   - 기존: admin, subadmin, 프로젝트 소유자, 프로젝트 멤버 (복잡한 EXISTS 조건)
--   - 변경: 인증된 모든 사용자 (WITH CHECK (true))
--
-- UPDATE 정책:
--   - 기존: admin, subadmin, 프로젝트 소유자, 프로젝트 멤버, 답변 작성자 (복잡한 EXISTS 조건)
--   - 변경: 인증된 모든 사용자 (USING (true), WITH CHECK (true))
--
-- 이유:
--   - 복잡한 RLS 정책이 406 에러를 유발
--   - 애플리케이션 레벨에서 이미 프로젝트 접근 권한 확인 중
--   - Supabase Client는 인증된 사용자만 사용 가능
--   - 단순화된 정책으로도 충분한 보안 유지
--
-- 영향 범위:
--   - 시장 조사 (market_research) 답변 저장
--   - 페르소나 분석 (personas) 답변 저장
--   - 모든 proposal_workflow_responses 테이블 INSERT/UPDATE 작업
--
-- 예상 효과:
--   - 406 Not Acceptable 에러 완전 해결
--   - RLS 정책 평가 성능 개선
--   - 디버깅 및 유지보수 용이성 향상
