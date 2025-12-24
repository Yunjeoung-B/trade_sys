'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SpotTradingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">FX SPOT 거래</h1>
        <p className="text-slate-300">실시간 환율로 즉시 거래하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">시장 환율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <div className="text-white font-semibold">USD/KRW</div>
                  <div className="text-slate-400 text-sm">미국 달러</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">
                    1,350.50
                  </div>
                  <div className="text-green-400 text-sm">+0.5%</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <div className="text-white font-semibold">EUR/KRW</div>
                  <div className="text-slate-400 text-sm">유로</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">
                    1,450.25
                  </div>
                  <div className="text-red-400 text-sm">-0.3%</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <div className="text-white font-semibold">JPY/KRW</div>
                  <div className="text-slate-400 text-sm">일본 엔</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">9.25</div>
                  <div className="text-green-400 text-sm">+0.2%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">주문하기</CardTitle>
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <p>거래 기능은 Supabase 설정 후 활성화됩니다</p>
                  <p className="text-sm mt-2">
                    환경 변수를 설정하고 데이터베이스를 연결하세요
                  </p>
                </div>
              </div>
            </div>
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
