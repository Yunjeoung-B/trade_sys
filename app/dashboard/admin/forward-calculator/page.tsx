'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForwardCalculatorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">이론 선물환율 계산기</h1>
        <p className="text-slate-300">스왑 포인트를 기반으로 선물환율을 계산하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">계산 입력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300">현물 환율</Label>
              <Input
                type="number"
                placeholder="1,350.50"
                className="bg-slate-700/80 border-teal-500/30 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">스왑 포인트</Label>
              <Input
                type="number"
                placeholder="4.75"
                className="bg-slate-700/80 border-teal-500/30 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">기간 (일)</Label>
              <Input
                type="number"
                placeholder="30"
                className="bg-slate-700/80 border-teal-500/30 text-white"
              />
            </div>
            <Button className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
              계산하기
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">계산 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8 text-slate-400">
              값을 입력하고 계산하기 버튼을 클릭하세요
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
