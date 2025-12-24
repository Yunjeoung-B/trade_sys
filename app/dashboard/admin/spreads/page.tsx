'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SpreadSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">스프레드 설정</h1>
          <p className="text-slate-300">통화별, 상품별 스프레드를 관리하세요</p>
        </div>
        <Button className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
          + 새 스프레드 추가
        </Button>
      </div>

      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">스프레드 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-slate-400">
            설정된 스프레드가 없습니다
            <p className="text-sm mt-2">Supabase 연결 후 스프레드 설정이 가능합니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
