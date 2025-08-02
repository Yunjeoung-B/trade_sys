import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import type { User, Trade, QuoteRequest } from "@shared/schema";

export default function AdminDashboard() {
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: trades = [] } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const { data: quoteRequests = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
  });

  const activeUsers = users.filter((user) => user.isActive).length;
  const totalTrades = trades.length;
  const pendingQuotes = quoteRequests.filter((req) => req.status === "pending").length;

  // Calculate daily trading volume
  const dailyVolume = trades.reduce((sum: number, trade) => {
    const today = new Date().toDateString();
    const tradeDate = trade.createdAt ? new Date(trade.createdAt).toDateString() : '';
    return today === tradeDate ? sum + Number(trade.amount) : sum;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">관리자 대시보드</h2>
            <p className="text-gray-600">시스템 전체 현황을 모니터링할 수 있습니다.</p>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">활성 사용자</p>
                    <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">일일 거래량</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(dailyVolume / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">승인 대기</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingQuotes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">총 거래</p>
                    <p className="text-2xl font-bold text-gray-900">{totalTrades}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quoteRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      request.status === "approved" ? "bg-green-500" :
                      request.status === "pending" ? "bg-yellow-500" : "bg-red-500"
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {request.status === "pending" ? "신규" : request.status === "approved" ? "승인된" : "거부된"} {request.productType} 거래 요청
                      </p>
                      <p className="text-sm text-gray-500">
                        사용자 ID: {request.userId} - {request.direction} {Number(request.amount).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-sm text-gray-400">
                      {request.createdAt ? new Date(request.createdAt).toLocaleString('ko-KR') : '날짜 없음'}
                    </span>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    최근 활동이 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
