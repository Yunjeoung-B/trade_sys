'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function FXSpotMonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">FX SPOT 모니터링</h1>
        <p className="text-slate-300">실시간 환율을 모니터링하세요</p>
      </div>

      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">실시간 환율</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-slate-400">
            환율 데이터를 불러오는 중...
            <p className="text-sm mt-2">Infomax API 연결 후 실시간 환율을 확인할 수 있습니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
