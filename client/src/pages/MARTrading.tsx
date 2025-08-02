import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function MARTrading() {
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // MAR 환율은 장마감 후 결정됨 (예시)
  const marRate = 1350.25; // 이 값은 나중에 테이블에서 가져올 예정
  const sellRate = marRate - 0.1; // MAR - 0.1
  const buyRate = marRate + 0.1;  // MAR + 0.1

  const mutation = useMutation({
    mutationFn: async (tradeData: any) => {
      return apiRequest("POST", "/api/trades", tradeData);
    },
    onSuccess: () => {
      toast({
        title: "MAR 거래 성공",
        description: "MAR 거래가 성공적으로 체결되었습니다.",
      });
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
    },
    onError: () => {
      toast({
        title: "거래 실패",
        description: "거래 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleTrade = () => {
    if (!amount) {
      toast({
        title: "입력 오류",
        description: "금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // MAR 거래는 9:00 AM 이전에만 가능 (시간 체크 로직)
    const now = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(9, 0, 0, 0);

    if (now > cutoffTime) {
      toast({
        title: "거래 시간 종료",
        description: "MAR 거래는 오전 9시 이전에만 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      productType: "MAR",
      currencyPairId: "usd-krw", // USD/KRW 고정
      direction,
      amount: parseFloat(amount),
      rate: direction === "BUY" ? buyRate : sellRate,
      settlementDate: new Date(),
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">MAR</h2>
        <p className="text-slate-200">Market Average Rate - 오전 9시 이전 주문 제한</p>
      </div>

      <div className="max-w-md mx-auto">
            <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
              {/* Step 1: 통화쌍 선택 */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">MAR</span>
                <Select value="USD/KRW" disabled>
                  <SelectTrigger className="w-32 bg-slate-100 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD/KRW">USD/KRW</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Rate display - MAR 환율 */}
              <div className="flex items-center mb-6">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">SELL USD</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {sellRate.toFixed(2).split('.')[0]}.
                      <span className="text-lg">{sellRate.toFixed(2).split('.')[1]}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "mt-2 w-full rounded-xl transition-all duration-200",
                        direction === "SELL" 
                          ? "bg-gradient-to-r from-teal-200 to-teal-300 border-teal-300 text-teal-800 shadow-md" 
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                      onClick={() => setDirection("SELL")}
                    >
                      SELL
                    </Button>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">BUY USD</div>
                    <div className="text-2xl font-bold text-red-500">
                      {buyRate.toFixed(2).split('.')[0]}.
                      <span className="text-lg">{buyRate.toFixed(2).split('.')[1]}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "mt-2 w-full rounded-xl transition-all duration-200",
                        direction === "BUY" 
                          ? "bg-gradient-to-r from-pink-200 to-pink-300 border-pink-300 text-pink-800 shadow-md" 
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                      onClick={() => setDirection("BUY")}
                    >
                      BUY
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3: Amount input */}
              <div className="flex items-center mb-6">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">금액</div>
                  <Input
                    type="number"
                    placeholder="거래금액을 입력하세요"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-right text-lg bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-2xl mb-6 shadow-inner">
                <div className="text-sm text-gray-700 mb-2">MAR {direction} 거래</div>
                <div className="text-sm text-gray-600 mb-1">
                  거래금액: {amount || "0"} USD
                </div>
                <div className="text-sm text-gray-600">
                  환율: {direction === "BUY" ? buyRate.toFixed(2) : sellRate.toFixed(2)}
                </div>
              </div>

              {/* Step 4: Submit button */}
              <Button
                onClick={handleTrade}
                disabled={mutation.isPending || !amount}
                className="w-full py-4 text-lg font-semibold rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {mutation.isPending ? "처리중..." : "MAR 거래"}
              </Button>

              {/* 시간 안내 */}
              <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-2xl text-center shadow-inner">
                <div className="text-sm text-yellow-700">
                  MAR 거래는 오전 9:00 이전에만 가능합니다
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  현재 시간: {new Date().toLocaleTimeString('ko-KR')}
                </div>
              </div>
            </Card>
      </div>
    </div>
  );
}