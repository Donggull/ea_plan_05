import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User, Mail, Lock, Camera, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  updated_at: string
}

export function ProfilePage() {
  const { user, signOut } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // 프로필 정보 로드
  useEffect(() => {
    if (user) {
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.['full_name'] || '',
        avatar_url: user.user_metadata?.['avatar_url'],
        updated_at: user.updated_at || ''
      }

      setProfile(userProfile)
      setFormData({
        full_name: userProfile.full_name,
        email: userProfile.email
      })
    }
  }, [user])

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData['full_name'].trim()) {
      newErrors['full_name'] = '이름을 입력해주세요'
    } else if (formData['full_name'].trim().length < 2) {
      newErrors['full_name'] = '이름은 2자 이상 입력해주세요'
    }

    if (!formData['email']) {
      newErrors['email'] = '이메일을 입력해주세요'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData['email'])) {
      newErrors['email'] = '올바른 이메일 형식을 입력해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))

    // 해당 필드의 에러 제거
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !supabase) {
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData['full_name'].trim()
        }
      })

      if (error) {
        throw error
      }

      // 이메일이 변경된 경우
      if (formData['email'] !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData['email']
        })

        if (emailError) {
          throw emailError
        }

        toast.success('프로필이 업데이트되었습니다', {
          description: '이메일 변경 확인을 위해 새 이메일을 확인해주세요'
        })
      } else {
        toast.success('프로필이 업데이트되었습니다')
      }
    } catch (error: any) {
      console.error('Profile update error:', error)

      let errorMessage = '프로필 업데이트 중 오류가 발생했습니다'

      if (error.message?.includes('email')) {
        errorMessage = '이메일 업데이트 중 오류가 발생했습니다'
        setErrors({ ['email']: errorMessage })
      }

      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('로그아웃되었습니다')
    } catch (error) {
      toast.error('로그아웃 중 오류가 발생했습니다')
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-title1 font-semibold text-text-primary">계정 설정</h1>
        <p className="text-regular text-text-secondary mt-2">
          프로필 정보를 관리하고 계정 설정을 변경하세요
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 프로필 카드 */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-primary-500" />
                  )}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white hover:bg-primary-400 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-title3 font-semibold text-text-primary">
                {profile.full_name || '이름 없음'}
              </h3>
              <p className="text-regular text-text-secondary mb-4">
                {profile.email}
              </p>

              <div className="text-xs text-text-tertiary">
                가입일: {new Date(profile.updated_at).toLocaleDateString('ko-KR')}
              </div>
            </div>
          </Card>
        </div>

        {/* 프로필 정보 수정 */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-title3 font-semibold text-text-primary mb-6">
              프로필 정보
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* 이름 입력 */}
              <div className="space-y-2">
                <label htmlFor="full_name" className="text-sm font-medium text-text-primary">
                  이름
                </label>
                <div className="relative">
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="이름을 입력해주세요"
                    value={formData['full_name']}
                    onChange={handleChange('full_name')}
                    className={`pl-10 ${errors['full_name'] ? 'border-error' : ''}`}
                    disabled={isLoading}
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                </div>
                {errors['full_name'] && (
                  <p className="text-sm text-error flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors['full_name']}
                  </p>
                )}
              </div>

              {/* 이메일 입력 */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-text-primary">
                  이메일
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="이메일을 입력해주세요"
                    value={formData['email']}
                    onChange={handleChange('email')}
                    className={`pl-10 ${errors['email'] ? 'border-error' : ''}`}
                    disabled={isLoading}
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                </div>
                {errors['email'] && (
                  <p className="text-sm text-error flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors['email']}
                  </p>
                )}
                {formData['email'] !== profile.email && (
                  <p className="text-sm text-warning flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    이메일 변경 시 새 이메일로 확인 메일이 전송됩니다
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? '업데이트 중...' : '프로필 업데이트'}
                </Button>
              </div>
            </form>
          </Card>

          {/* 비밀번호 변경 */}
          <Card className="p-6 mt-6">
            <h2 className="text-title3 font-semibold text-text-primary mb-6">
              보안 설정
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-text-secondary" />
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">비밀번호</h3>
                    <p className="text-xs text-text-secondary">마지막 변경: 알 수 없음</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm">
                  변경
                </Button>
              </div>
            </div>
          </Card>

          {/* 계정 관리 */}
          <Card className="p-6 mt-6">
            <h2 className="text-title3 font-semibold text-text-primary mb-6">
              계정 관리
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">로그아웃</h3>
                  <p className="text-xs text-text-secondary">모든 기기에서 로그아웃됩니다</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSignOut}
                >
                  로그아웃
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-error/10 border border-error/20 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-error">계정 삭제</h3>
                  <p className="text-xs text-error/80">계정과 모든 데이터가 영구적으로 삭제됩니다</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => toast.error('계정 삭제 기능은 준비 중입니다')}
                >
                  삭제
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}