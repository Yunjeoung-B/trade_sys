import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount, calculateCurrencyAmount, formatInputValue, removeThousandSeparator } from "@/lib/currencyUtils";


export default function MARTrading() {
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [amountCurrency, setAmountCurrency] = useState<"BASE" | "QUOTE">("BASE"); // BASE = USD, QUOTE = KRW
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // MAR 환율은 기준환율 대비 -0.10/+0.10으로 표시
  const marRate = 1250; // MAR 기준환율
  const sellSpread = -0.10; // SELL시 -0.10
  const buySpread = +0.10;  // BUY시 +0.10

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
      amount: parseFloat(removeThousandSeparator(amount)),
      amountCurrency,
      rate: marRate + (direction === "BUY" ? buySpread : sellSpread),
      settlementDate: new Date(),
    });
  };

  return (
    <div className="p-6">
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

          {/* Step 2: Rate display - MAR 스프레드 */}
          <div className="flex items-center mb-6">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">SELL USD</div>
                <div className="text-2xl font-bold text-[#1c5bcb]">
                  {sellSpread.toFixed(2)}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "mt-2 w-full rounded-xl transition-all duration-200",
                    direction === "SELL" 
                      ? "text-white shadow-inner" 
                      : "bg-transparent border-gray-200 text-gray-400 hover:bg-gray-50"
                  )}
                  style={direction === "SELL" ? {
                    backgroundColor: '#4169E1',
                    borderColor: '#4169E1',
                    boxShadow: '0 0 15px rgba(65, 105, 225, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                  } : {}}
                  onClick={() => setDirection("SELL")}
                >
                  SELL선택
                </Button>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">BUY USD</div>
                <div className="text-2xl font-bold text-[#f45da7]">
                  +{buySpread.toFixed(2)}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "mt-2 w-full rounded-xl transition-all duration-200",
                    direction === "BUY" 
                      ? "text-white shadow-inner" 
                      : "bg-transparent border-gray-200 text-gray-400 hover:bg-gray-50"
                  )}
                  style={direction === "BUY" ? { 
                    backgroundColor: '#FF6B6B', 
                    borderColor: '#FF6B6B',
                    boxShadow: '0 0 15px rgba(255, 107, 107, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                  } : {}}
                  onClick={() => setDirection("BUY")}
                >
                  BUY선택
                </Button>
              </div>
            </div>
          </div>

          {/* Step 2.5: MAR 기준환율 표시 */}
          <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-xl">
            <span className="text-sm text-gray-600">환율</span>
            <span className="text-lg font-semibold text-gray-800">
              MAR {direction === "BUY" ? `+${buySpread.toFixed(2)}` : `${sellSpread.toFixed(2)}`}
            </span>
          </div>

          {/* Step 3: Amount input */}
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <div className="text-sm text-gray-700 font-medium mb-2">주문금액</div>
              <div className="flex-1 grid grid-cols-2 gap-2 mb-2">
                <Button 
                  variant="outline"
                  className={cn(
                    "rounded-xl transition-all duration-200",
                    amountCurrency === "BASE" 
                      ? "text-white shadow-inner" 
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  )}
                  style={amountCurrency === "BASE" ? {
                    backgroundColor: '#2dd4bf',
                    borderColor: '#2dd4bf',
                    boxShadow: '0 0 15px rgba(45, 212, 191, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                  } : {}}
                  onClick={() => setAmountCurrency("BASE")}
                >
                  USD {direction === "BUY" ? "매수" : "매도"}
                </Button>
                <Button 
                  variant="outline"
                  className={cn(
                    "rounded-xl transition-all duration-200",
                    amountCurrency === "QUOTE" 
                      ? "text-white shadow-inner" 
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  )}
                  style={amountCurrency === "QUOTE" ? {
                    backgroundColor: '#2dd4bf',
                    borderColor: '#2dd4bf',
                    boxShadow: '0 0 15px rgba(45, 212, 191, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                  } : {}}
                  onClick={() => setAmountCurrency("QUOTE")}
                >
                  KRW {direction === "BUY" ? "매도" : "매수"}
                </Button>
              </div>
              <Input
                type="text"
                placeholder="여기에 주문금액을 입력하세요"
                value={amount}
                onChange={(e) => {
                  const inputCurrency = amountCurrency === "BASE" ? "USD" : "KRW";
                  const formattedValue = formatInputValue(e.target.value, inputCurrency);
                  setAmount(formattedValue);
                }}
                className="text-right text-lg bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-2xl mb-6 shadow-inner">
            <div className="text-sm text-gray-700 mb-2">MAR {direction} 거래</div>
            <div className="text-sm text-gray-600 mb-1">
              거래금액: {amountCurrency === "BASE" ? "USD" : "KRW"} {amount ? formatCurrencyAmount(parseFloat(amount), amountCurrency === "BASE" ? "USD" : "KRW") : "미입력"}
            </div>
            <div className="text-sm text-gray-600">
              적용환율: MAR {direction === "BUY" ? `+${buySpread.toFixed(2)}` : `${sellSpread.toFixed(2)}`}
            </div>
          </div>

          {/* Step 4: Submit button */}
          <Button
            onClick={handleTrade}
            disabled={mutation.isPending || !amount}
            className="w-full py-4 text-lg font-semibold rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            style={{ 
              backgroundColor: direction === "BUY" ? '#FF6B6B' : '#4169E1',
              boxShadow: direction === "BUY" 
                ? '0 0 15px rgba(255, 107, 107, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                : '0 0 15px rgba(65, 105, 225, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            {mutation.isPending ? "처리중..." : "즉시 거래 실행"}
          </Button>

          {/* 시간 안내 */}
          <div className="mt-4 p-3 rounded-2xl text-center shadow-inner bg-[#2c394d]">
            <div className="text-sm text-[#f9fafb]">
              MAR 거래는 오전 9:00 이전에만 가능합니다
            </div>
            <div className="text-xs mt-1 text-[#f9fafb]">
              현재 시간: {new Date().toLocaleTimeString('ko-KR')}
            </div>
          </div>
        </Card>
        
        {/* MAR 안내문구 - 주문창 바로 아래 */}
        <div className="mt-4 text-center">
          <div className="text-white text-sm opacity-80">
            MAR는 당일 장마감후 결정되는 환율로서,<br />
            익영업일 서울외국환중개에 고시됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}