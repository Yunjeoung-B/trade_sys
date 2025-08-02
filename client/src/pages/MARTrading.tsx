import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">MAR</h2>
            <p className="text-gray-600">Market Average Rate - 오전 9시 이전 주문 제한</p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="p-6">
              {/* Step 1: MAR */}
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  1
                </div>
                <span className="text-sm text-gray-600">MAR</span>
                <div className="ml-auto flex items-center">
                  <span className="text-sm font-medium">🇺🇸 USD/KRW</span>
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm ml-4">
                    2
                  </div>
                </div>
              </div>

              {/* Step 3: Rate display - MAR 환율 */}
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4">
                  3
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">SELL USD</div>
                    <div className="text-2xl font-bold text-blue-600">
                      -2.50
                    </div>
                    <div className="text-sm text-gray-500 mt-1">SELL선택</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">BUY USD</div>
                    <div className="text-2xl font-bold text-red-500">
                      +2.50
                    </div>
                    <Button 
                      size="sm" 
                      className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => setDirection("BUY")}
                    >
                      BUY선택
                    </Button>
                  </div>
                </div>
              </div>

              {/* MAR 거래 정보 */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">만기일</div>
                <div className="text-lg font-medium">2024 06 28</div>
                <div className="text-sm text-gray-600 mt-2">환율</div>
                <div className="text-lg font-medium">MAR ↓ 2.50</div>
              </div>

              {/* Step 5: Amount input */}
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4">
                  5
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">금액</div>
                  <div className="text-sm text-gray-600 mb-1">BUY USD</div>
                  <div className="flex items-center mb-2">
                    <span className="text-lg font-semibold text-green-600">+1M</span>
                    <span className="ml-auto text-lg font-semibold text-green-600">+0.1M</span>
                  </div>
                  <div className="text-sm">SELL KRW</div>
                  <div className="text-gray-400 text-sm mb-2">상대감슈 간신원 MAR간융</div>
                  
                  <Input
                    type="number"
                    placeholder="거래금액을 입력하세요"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-right text-lg"
                  />
                </div>
              </div>

              {/* Step 4: Final step indicator */}
              <div className="flex justify-center mb-4">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  4
                </div>
              </div>

              <Button
                onClick={handleTrade}
                disabled={mutation.isPending || !amount}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 text-lg font-semibold"
              >
                {mutation.isPending ? "처리중..." : "MAR 거래"}
              </Button>

              {/* 시간 안내 */}
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-center">
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
      </div>
    </div>
  );
}