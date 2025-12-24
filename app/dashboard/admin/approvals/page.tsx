'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function QuoteApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">견적 승인</h1>
        <p className="text-slate-300">Forward/Swap 견적 요청을 검토하고 승인하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/90 border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="text-slate-400 text-sm mb-1">대기 중</div>
            <div className="text-3xl font-bold text-yellow-400">0</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/90 border-green-500/30">
          <CardContent className="pt-6">
            <div className="text-slate-400 text-sm mb-1">승인 완료</div>
            <div className="text-3xl font-bold text-green-400">0</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">대기 중인 견적 요청</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-slate-400">
            대기 중인 견적 요청이 없습니다
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
