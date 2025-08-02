import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

interface Trade {
  id: string;
  tradeNumber: string;
  productType: string;
  currencyPairId: string;
  direction: string;
  amount: string;
  rate: string;
  settlementDate?: string;
  maturityDate?: string;
  status: string;
  createdAt: string;
}

interface CurrencyPair {
  id: string;
  symbol: string;
}

export default function TradingStatus() {
  const { data: trades, refetch } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const { data: currencyPairs } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const getPairSymbol = (pairId: string) => {
    const pair = currencyPairs?.find(p => p.id === pairId);
    return pair?.symbol || "";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "settled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "활성";
      case "pending":
        return "대기";
      case "settled":
        return "정산완료";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">거래현황</h2>
            <p className="text-slate-300">현재 유효한 거래 내역을 확인할 수 있습니다.</p>
          </div>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">활성 거래</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="text-teal-400 border-teal-600 hover:bg-teal-900/20"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-sm text-slate-400 border-b border-slate-700">
                      <th className="text-left py-3">거래번호</th>
                      <th className="text-left py-3">상품</th>
                      <th className="text-left py-3">통화쌍</th>
                      <th className="text-right py-3">금액</th>
                      <th className="text-center py-3">거래일</th>
                      <th className="text-center py-3">만기일</th>
                      <th className="text-center py-3">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades?.map((trade) => (
                      <tr key={trade.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="py-3 font-mono text-sm text-white">{trade.tradeNumber}</td>
                        <td className="py-3 text-white">{trade.productType}</td>
                        <td className="py-3 font-medium text-white">{getPairSymbol(trade.currencyPairId)}</td>
                        <td className="py-3 text-right text-white">
                          {Number(trade.amount).toLocaleString('ko-KR')} USD
                        </td>
                        <td className="py-3 text-center text-white">
                          {new Date(trade.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="py-3 text-center text-white">
                          {trade.maturityDate 
                            ? new Date(trade.maturityDate).toLocaleDateString('ko-KR')
                            : '-'
                          }
                        </td>
                        <td className="py-3 text-center">
                          <Badge className={getStatusColor(trade.status)}>
                            {getStatusText(trade.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {(!trades || trades.length === 0) && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          활성 거래가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
