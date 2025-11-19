/**
 * Supabase 사용자 비밀번호 직접 변경 스크립트
 *
 * 사용법:
 * npx tsx scripts/reset-password.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role Key 필요

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

// Admin 클라이언트 생성 (Service Role Key 사용)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetPassword(email: string, newPassword: string) {
  console.log(`🔄 비밀번호 변경 시작: ${email}`)

  try {
    // 사용자 조회
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      throw listError
    }

    const user = users.users.find(u => u.email === email)

    if (!user) {
      throw new Error(`사용자를 찾을 수 없습니다: ${email}`)
    }

    console.log(`✓ 사용자 확인: ${user.email} (ID: ${user.id})`)

    // 비밀번호 변경 (Admin API 사용)
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (error) {
      throw error
    }

    console.log('✅ 비밀번호가 성공적으로 변경되었습니다!')
    console.log(`📧 이메일: ${email}`)
    console.log(`🔑 새 비밀번호: ${newPassword}`)
    console.log('\n⚠️  보안을 위해 로그인 후 비밀번호를 변경하세요.')

    return data
  } catch (error: any) {
    console.error('❌ 비밀번호 변경 실패:', error.message)
    throw error
  }
}

// 실행
const targetEmail = 'anyoungbabo@gmail.com'
const newPassword = 'TempPass2025!'

resetPassword(targetEmail, newPassword)
  .then(() => {
    console.log('\n✅ 작업 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 작업 실패:', error)
    process.exit(1)
  })
