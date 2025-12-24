'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TradeManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">거래 관리</h1>
        <p className="text-slate-300">모든 거래 내역을 조회하고 관리하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardContent className="pt-6">
            <div className="text-slate-400 text-sm mb-1">오늘 거래</div>
            <div className="text-3xl font-bold text-white">0</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardContent className="pt-6">
            <div className="text-slate-400 text-sm mb-1">이번 주 거래</div>
            <div className="text-3xl font-bold text-white">0</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardContent className="pt-6">
            <div className="text-slate-400 text-sm mb-1">총 거래액</div>
            <div className="text-3xl font-bold text-white">$0</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">거래 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-slate-400">
            거래 내역이 없습니다
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
