'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const adminMenus = [
    {
      title: '스프레드 설정',
      description: '통화별, 상품별 스프레드 관리',
      icon: '⚙️',
      href: '/dashboard/admin/spreads',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: '견적 승인',
      description: 'Forward/Swap 견적 요청 승인',
      icon: '✅',
      href: '/dashboard/admin/approvals',
      color: 'from-green-500 to-green-600',
    },
    {
      title: '사용자 관리',
      description: '고객 계정 및 권한 관리',
      icon: '👥',
      href: '/dashboard/admin/users',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: '거래 관리',
      description: '모든 거래 내역 조회 및 관리',
      icon: '📊',
      href: '/dashboard/admin/trades',
      color: 'from-orange-500 to-orange-600',
    },
    {
      title: 'FX SPOT 모니터링',
      description: '실시간 환율 모니터링',
      icon: '💱',
      href: '/dashboard/admin/fx-spot',
      color: 'from-teal-500 to-teal-600',
    },
    {
      title: 'FX SWAP 모니터링',
      description: '스왑 포인트 관리',
      icon: '🔄',
      href: '/dashboard/admin/fx-swap',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      title: '선물환율 계산기',
      description: '이론 선물환율 계산',
      icon: '🧮',
      href: '/dashboard/admin/forward-calculator',
      color: 'from-pink-500 to-pink-600',
    },
    {
      title: 'Infomax API',
      description: 'API 상태 및 설정',
      icon: '🔌',
      href: '/dashboard/admin/infomax',
      color: 'from-yellow-500 to-yellow-600',
    },
  ]

  const stats = [
    { label: '오늘 거래', value: '0', change: '+0%' },
    { label: '대기중 견적', value: '0', change: '-' },
    { label: '활성 사용자', value: '0', change: '+0%' },
    { label: '총 거래량', value: '$0', change: '+0%' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">관리자 대시보드</h1>
        <p className="text-slate-300">시스템 전체를 관리하세요</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-slate-800/90 border-teal-500/30">
            <CardContent className="pt-6">
              <div className="text-slate-400 text-sm mb-1">{stat.label}</div>
              <div className="text-3xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-green-400 text-sm">{stat.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin Menus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {adminMenus.map((menu, index) => (
          <Link key={index} href={menu.href}>
            <Card className="bg-slate-800/90 border-teal-500/30 hover:border-teal-400/50 transition-all cursor-pointer h-full">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${menu.color} flex items-center justify-center text-2xl mb-3`}>
                  {menu.icon}
                </div>
                <CardTitle className="text-teal-300 text-lg">
                  {menu.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm">{menu.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-slate-400">
            최근 활동 내역이 없습니다
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
