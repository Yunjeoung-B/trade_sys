import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
              <div className="w-2 h-6 bg-teal-600 rounded-full"></div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choice FX</h1>
          <p className="text-xl text-gray-600 mb-8">The Smartest Choice in FX</p>
          <p className="text-gray-600 max-w-2xl mx-auto">
            전문적인 외환 거래 플랫폼에 오신 것을 환영합니다. 
            실시간 환율 정보와 다양한 FX 상품으로 스마트한 거래를 시작하세요.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exchange-alt text-teal-600 text-xl"></i>
              </div>
              <h3 className="font-semibold mb-2">현물환 거래</h3>
              <p className="text-sm text-gray-600">실시간 환율로 즉시 거래</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-calendar-alt text-teal-600 text-xl"></i>
              </div>
              <h3 className="font-semibold mb-2">선물환 거래</h3>
              <p className="text-sm text-gray-600">미래 환율 미리 확정</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-sync-alt text-teal-600 text-xl"></i>
              </div>
              <h3 className="font-semibold mb-2">스왑 거래</h3>
              <p className="text-sm text-gray-600">복합 거래 상품</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-chart-line text-teal-600 text-xl"></i>
              </div>
              <h3 className="font-semibold mb-2">MAR 거래</h3>
              <p className="text-sm text-gray-600">시장평균환율 거래</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/login">
            <Button size="lg" className="gradient-bg hover:opacity-90 text-white px-8 py-3">
              로그인하여 시작하기
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
