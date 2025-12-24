'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function FXSwapMonitoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">FX SWAP 모니터링</h1>
          <p className="text-slate-300">스왑 포인트를 관리하세요</p>
        </div>
        <Button className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
          Excel 업로드
        </Button>
      </div>

      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">스왑 포인트 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-slate-400">
            스왑 포인트 데이터가 없습니다
            <p className="text-sm mt-2">Excel 파일을 업로드하여 스왑 포인트를 추가하세요</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
