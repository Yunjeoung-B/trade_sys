import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function UnderDevelopment() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-8 flex items-center justify-center">
      <Card className="max-w-2xl w-full bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center border-2 border-orange-400/30">
              <Construction className="h-10 w-10 text-orange-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-white">
            개발 중입니다
          </CardTitle>
          <CardDescription className="text-lg text-slate-300">
            이 페이지는 현재 개발 중이며 관리자 전용으로 제공됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-700/30 backdrop-blur-sm p-6 rounded-xl border border-slate-600/50">
            <h3 className="text-lg font-semibold text-white mb-3">
              알림
            </h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start space-x-2">
                <span className="text-orange-400 mt-1">•</span>
                <span>이 화면은 곧 출시될 예정입니다.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-orange-400 mt-1">•</span>
                <span>현재 고객 거래 메뉴를 통해 거래 기능을 이용하실 수 있습니다.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-orange-400 mt-1">•</span>
                <span>추가 문의사항은 관리자에게 연락해주세요.</span>
              </li>
            </ul>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => setLocation("/customer/spot")}
              className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              고객 거래로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
