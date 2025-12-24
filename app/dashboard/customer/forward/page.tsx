'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ForwardTradingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">FX FORWARD 거래</h1>
        <p className="text-slate-300">미래 환율을 미리 고정하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">선물 환율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <div className="text-white font-semibold">USD/KRW</div>
                  <div className="text-slate-400 text-sm">1개월 선물</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">1,355.25</div>
                  <div className="text-slate-400 text-sm">스프레드: +4.75</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <div className="text-white font-semibold">USD/KRW</div>
                  <div className="text-slate-400 text-sm">3개월 선물</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">1,362.50</div>
                  <div className="text-slate-400 text-sm">스프레드: +12.00</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <div className="text-white font-semibold">USD/KRW</div>
                  <div className="text-slate-400 text-sm">6개월 선물</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">1,375.80</div>
                  <div className="text-slate-400 text-sm">스프레드: +25.30</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">견적 요청</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-8">
                <div className="text-slate-400 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>선물환 거래는 견적 요청 후 승인이 필요합니다</p>
                  <p className="text-sm mt-2">관리자가 확인 후 거래가 가능합니다</p>
                </div>
                <Button className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
                  견적 요청하기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">견적 요청 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-slate-400">
            견적 요청 내역이 없습니다
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
