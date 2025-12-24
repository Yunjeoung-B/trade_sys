'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: '비밀번호 불일치',
        description: '비밀번호가 일치하지 않습니다.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: '비밀번호 오류',
        description: '비밀번호는 최소 6자 이상이어야 합니다.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: `${username}@choicefx.com`,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/customer/spot`,
          data: {
            username: username,
            role: 'client', // Default role
          },
        },
      })

      if (error) {
        toast({
          title: '회원가입 실패',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        // Check if email confirmation is required
        if (data.user && !data.session) {
          toast({
            title: '이메일 확인 필요',
            description: 'Supabase 설정에서 이메일 확인이 비활성화되지 않았습니다.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: '회원가입 성공',
            description: '자동으로 로그인됩니다.',
          })
          // Auto-login successful, redirect to dashboard
          router.push('/dashboard/customer/spot')
          router.refresh()
        }
      }
    } catch (error) {
      toast({
        title: '회원가입 오류',
        description: '회원가입 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 bg-slate-800/90 border-teal-500/30">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 bg-teal-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="w-2 h-8 bg-slate-900 rounded-full"></div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">CHOICE FX</h1>
          <p className="text-teal-300 text-sm">The Smartest Choice in FX</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-teal-300">
                사용자 ID
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="예: admin, client1, user123"
                className="bg-slate-700/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                이메일이 아닌 ID만 입력하세요 (자동으로 @choicefx.com이 추가됩니다)
              </p>
            </div>

            <div>
              <Label htmlFor="password" className="text-teal-300">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요 (최소 6자)"
                className="bg-slate-700/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                required
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-teal-300">
                비밀번호 확인
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className="bg-slate-700/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? '가입 중...' : '회원가입'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/login"
                className="text-teal-400 hover:text-teal-300 font-medium"
              >
                로그인
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
