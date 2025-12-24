'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        // Check if user is admin (based on metadata or email)
        setIsAdmin(user.user_metadata?.role === 'admin' || user.email?.includes('admin'))
      }
      setLoading(false)
    }

    checkUser()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-blue-800">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const customerMenus = [
    { name: 'SPOT 거래', path: '/dashboard/customer/spot', icon: '💱' },
    { name: 'FORWARD 거래', path: '/dashboard/customer/forward', icon: '📈' },
    { name: 'SWAP 거래', path: '/dashboard/customer/swap', icon: '🔄' },
    { name: 'MAR 거래', path: '/dashboard/customer/mar', icon: '⏰' },
  ]

  const adminMenus = [
    { name: '대시보드', path: '/dashboard/admin', icon: '📊' },
    { name: '스프레드 설정', path: '/dashboard/admin/spreads', icon: '⚙️' },
    { name: '견적 승인', path: '/dashboard/admin/approvals', icon: '✅' },
    { name: '사용자 관리', path: '/dashboard/admin/users', icon: '👥' },
    { name: '거래 관리', path: '/dashboard/admin/trades', icon: '📋' },
    { name: 'FX SPOT', path: '/dashboard/admin/fx-spot', icon: '💱' },
    { name: 'FX SWAP', path: '/dashboard/admin/fx-swap', icon: '🔄' },
    { name: '선물환율 계산기', path: '/dashboard/admin/forward-calculator', icon: '🧮' },
    { name: 'Infomax API', path: '/dashboard/admin/infomax', icon: '🔌' },
  ]

  const menus = isAdmin ? adminMenus : customerMenus

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-blue-800">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-teal-500/30 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-teal-400 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
            </div>
            <h1 className="text-xl font-bold text-white">CHOICE FX</h1>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-teal-300 text-sm">
              {user.email?.split('@')[0]} {isAdmin && '(관리자)'}
            </span>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10"
            >
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/50 border-r border-teal-500/30 min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-2">
            {menus.map((menu) => (
              <Link
                key={menu.path}
                href={menu.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === menu.path
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <span className="text-xl">{menu.icon}</span>
                <span className="font-medium">{menu.name}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
