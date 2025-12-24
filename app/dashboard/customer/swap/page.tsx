'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SwapTradingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">FX SWAP 거래</h1>
        <p className="text-slate-300">통화 스왑으로 유동성을 관리하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">스왑 포인트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <div className="text-white font-semibold">USD/KRW</div>
                  <div className="text-slate-400 text-sm">1M Swap Point</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">+4.75</div>
                  <div className="text-slate-400 text-sm">Near: 1,350.50</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <div className="text-white font-semibold">USD/KRW</div>
                  <div className="text-slate-400 text-sm">3M Swap Point</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">+12.00</div>
                  <div className="text-slate-400 text-sm">Far: 1,362.50</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <div className="text-white font-semibold">USD/KRW</div>
                  <div className="text-slate-400 text-sm">6M Swap Point</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">+25.30</div>
                  <div className="text-slate-400 text-sm">Far: 1,375.80</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">스왑 거래</CardTitle>
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
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  <p>스왑 거래는 근일과 원일의 두 번의 거래를 동시에 진행합니다</p>
                  <p className="text-sm mt-2">Near Leg와 Far Leg를 함께 설정하세요</p>
                </div>
                <Button className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
                  스왑 거래 시작
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">스왑 거래 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-slate-400">
            스왑 거래 내역이 없습니다
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
