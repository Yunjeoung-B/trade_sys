'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function InfomaxAPIPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Infomax API</h1>
        <p className="text-slate-300">API 연결 상태 및 설정을 관리하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">API 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">연결 상태</span>
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
                  미연결
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">마지막 업데이트</span>
                <span className="text-slate-400">-</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">API 호출 횟수</span>
                <span className="text-slate-400">0</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/90 border-teal-500/30">
          <CardHeader>
            <CardTitle className="text-teal-300">API 제어</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
              연결 테스트
            </Button>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
              수동 데이터 가져오기
            </Button>
            <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
              설정 보기
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/90 border-teal-500/30">
        <CardHeader>
          <CardTitle className="text-teal-300">최근 데이터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-slate-400">
            API 데이터가 없습니다
            <p className="text-sm mt-2">환경 변수를 설정하고 연결 테스트를 진행하세요</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
