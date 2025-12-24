'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

export default function MARTradingPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isWithinTradingHours, setIsWithinTradingHours] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)

      // MAR 거래 시간: 오전 9시까지
      const hour = now.getHours()
      setIsWithinTradingHours(hour < 9)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">MAR 거래</h1>
        <p className="text-slate-300">시장 평균 환율로 거래하세요 (오전 9시까지)</p>
      </div>

      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">거래 시간 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <div className="text-4xl font-bold text-teal-400 mb-4">
              {formatTime(currentTime)}
            </div>
            {isWithinTradingHours ? (
              <div className="inline-flex items-center px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-green-300 font-medium">거래 가능 시간</span>
              </div>
            ) : (
              <div className="inline-flex items-center px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                <span className="text-red-300 font-medium">거래 마감 (오전 9시 이후)</span>
              </div>
            )}
            <p className="text-slate-400 text-sm mt-4">
              MAR 거래는 매일 오전 9시까지만 가능합니다
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">시장 평균 환율 (예상)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <div className="text-white font-semibold">USD/KRW</div>
                  <div className="text-slate-400 text-sm">오늘의 MAR</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">1,350.25</div>
                  <div className="text-slate-400 text-sm">09:00 확정 예정</div>
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {isWithinTradingHours ? (
                    <>
                      <p>MAR 거래 주문이 가능합니다</p>
                      <p className="text-sm mt-2">
                        오전 9시에 확정된 환율로 거래됩니다
                      </p>
                    </>
                  ) : (
                    <>
                      <p>오전 9시 이후에는 MAR 거래가 불가능합니다</p>
                      <p className="text-sm mt-2">내일 오전 9시 이전에 다시 시도하세요</p>
                    </>
                  )}
                </div>
                <Button
                  className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                  disabled={!isWithinTradingHours}
                >
                  {isWithinTradingHours ? 'MAR 주문하기' : '거래 시간 종료'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">MAR 거래 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-slate-400">
            MAR 거래 내역이 없습니다
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
