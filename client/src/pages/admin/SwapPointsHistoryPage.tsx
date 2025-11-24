import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import type { CurrencyPair, SwapPointsHistory } from "@shared/schema";
import { TrendingUp } from "lucide-react";
import { useState } from "react";

export default function SwapPointsHistoryPage() {
  const [selectedPairId, setSelectedPairId] = useState<string>("");

  const { data: currencyPairs = [] } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const { data: history = [] } = useQuery<SwapPointsHistory[]>({
    queryKey: ["/api/swap-points-history", selectedPairId],
    enabled: !!selectedPairId,
    queryFn: async () => {
      const res = await fetch(`/api/swap-points-history?currencyPairId=${selectedPairId}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatSettlementDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-400";
    if (change < 0) return "text-red-400";
    return "text-gray-400";
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          FX SWAP 가격변동내역
        </h1>
        <p className="text-slate-400">Swap Point 변경 이력을 시간별로 확인합니다</p>
      </div>

      <Card className="bg-white/10 backdrop-blur-md border-white/20 rounded-3xl">
        <CardHeader className="bg-gradient-to-r from-teal-600/20 to-blue-600/20 border-b border-white/10">
          <CardTitle className="text-white">통화쌍 선택</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Select value={selectedPairId} onValueChange={setSelectedPairId}>
            <SelectTrigger className="w-full md:w-64 bg-white/10 border-white/30 text-white rounded-2xl">
              <SelectValue placeholder="통화쌍을 선택하세요" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/20">
              {currencyPairs.map((pair) => (
                <SelectItem key={pair.id} value={pair.id} className="text-white hover:bg-slate-800">
                  {pair.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedPairId && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20 rounded-3xl">
          <CardHeader className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10">
            <CardTitle className="text-white">
              변경 내역 ({history.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600 bg-slate-800/50">
                      <th className="text-left py-4 px-6 text-white font-semibold">변경 시간</th>
                      <th className="text-left py-4 px-6 text-white font-semibold">Tenor</th>
                      <th className="text-left py-4 px-6 text-white font-semibold">결제일</th>
                      <th className="text-right py-4 px-6 text-white font-semibold">변경 전</th>
                      <th className="text-right py-4 px-6 text-white font-semibold">변경 후</th>
                      <th className="text-right py-4 px-6 text-white font-semibold">변화량</th>
                      <th className="text-left py-4 px-6 text-white font-semibold">사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, idx) => {
                      const prevVal = item.previousSwapPoint ? parseFloat(item.previousSwapPoint) : 0;
                      const newVal = parseFloat(item.newSwapPoint);
                      const change = newVal - prevVal;
                      return (
                        <tr 
                          key={idx} 
                          className="border-b border-slate-600 hover:bg-slate-700/30 text-white transition"
                        >
                          <td className="py-4 px-6 text-sm">
                            {formatDate(item.changedAt || item.createdAt)}
                          </td>
                          <td className="py-4 px-6 text-sm font-mono">
                            {item.tenor || "-"}
                          </td>
                          <td className="py-4 px-6 text-sm">
                            {formatSettlementDate(item.settlementDate)}
                          </td>
                          <td className="py-4 px-6 text-right text-slate-300 font-mono">
                            {item.previousSwapPoint ? parseFloat(item.previousSwapPoint).toFixed(4) : "-"}
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-teal-300 font-semibold">
                            {newVal.toFixed(4)}
                          </td>
                          <td className={`py-4 px-6 text-right font-mono font-semibold ${getChangeColor(change)}`}>
                            {change > 0 ? '+' : ''}{change.toFixed(4)}
                          </td>
                          <td className="py-4 px-6 text-sm text-blue-300">
                            {item.changeReason === 'manual_update' && '수동 변경'}
                            {item.changeReason === 'excel_upload' && 'Excel 업로드'}
                            {!item.changeReason && '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>변경 내역이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
