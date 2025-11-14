import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount, formatInputValue, removeThousandSeparator } from "@/lib/currencyUtils";
import type { CurrencyPair } from "@shared/schema";
import { useCustomerRate } from "@/hooks/useCustomerRate";

export default function ForwardTradingCustomer() {
  const [selectedPair, setSelectedPair] = useState("USD/KRW");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [amountCurrency, setAmountCurrency] = useState<"BASE" | "QUOTE">("BASE");
  const [valueDate, setValueDate] = useState<Date>(addDays(new Date(), 7));
  const { toast} = useToast();
  const queryClient = useQueryClient();

  const { data: currencyPairs = [] } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const selectedPairData = currencyPairs.find(p => p.symbol === selectedPair);

  const getTenorFromDate = (date: Date): string | undefined => {
    const today = new Date();
    const daysToMaturity = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysToMaturity <= 10) return "1W";
    if (daysToMaturity <= 45) return "1M";
    if (daysToMaturity <= 75) return "2M";
    if (daysToMaturity <= 105) return "3M";
    if (daysToMaturity <= 270) return "6M";
    if (daysToMaturity <= 315) return "9M";
    return "12M";
  };

  const tenor = getTenorFromDate(valueDate);

  const {
    buyRate: customerBuyRate,
    sellRate: customerSellRate,
    isError: isRateError,
  } = useCustomerRate("Forward", selectedPairData?.id, tenor);

  const buyRate = customerBuyRate || 0;
  const sellRate = customerSellRate || 0;
  const hasValidRates = customerBuyRate != null && customerSellRate != null && !isRateError;

  const mutation = useMutation({
    mutationFn: async (quoteData: any) => {
      return apiRequest("POST", "/api/quote-requests", quoteData);
    },
    onSuccess: () => {
      toast({
        title: "가격 요청 성공",
        description: "선물환 가격 요청이 성공적으로 전송되었습니다. 관리자 승인을 기다려주세요.",
      });
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
    },
    onError: () => {
      toast({
        title: "요청 실패",
        description: "가격 요청 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleRequest = () => {
    if (!hasValidRates) {
      toast({
        title: "환율 오류",
        description: "현재 거래 가능한 환율이 없습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPairData || !amount) {
      toast({
        title: "입력 오류",
        description: "통화쌍과 금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      productType: "Forward",
      currencyPairId: selectedPairData.id,
      direction,
      amount: parseFloat(removeThousandSeparator(amount)),
      amountCurrency,
      settlementDate: valueDate,
      requestedRate: direction === "BUY" ? buyRate : sellRate,
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">선물환 거래 (FX FORWARD)</h2>
        <p className="text-slate-200">미래 환율을 미리 확정하는 거래</p>
      </div>

      <div className="max-w-md mx-auto">
        <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
          {/* 통화쌍 선택 */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-lg font-semibold text-gray-700">통화쌍</span>
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-40 bg-gray-50 border-gray-200 rounded-xl shadow-sm text-lg font-medium" data-testid="select-currency-pair">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyPairs.map((pair) => (
                  <SelectItem key={pair.id} value={pair.symbol}>
                    {pair.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 환율 표시 - 큰 카드 스타일 + 화려한 색깔 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div 
              className={cn(
                "p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                direction === "SELL" 
                  ? "border-transparent" 
                  : "bg-gray-50 border-gray-200 hover:border-gray-300"
              )}
              style={direction === "SELL" ? {
                backgroundColor: '#EFF6FF',
                borderColor: '#4169E1',
                boxShadow: '0 0 20px rgba(65, 105, 225, 0.4)'
              } : {}}
              onClick={() => setDirection("SELL")}
              data-testid="button-sell-direction"
            >
              <div className="text-sm text-gray-600 mb-2">매도 (Sell)</div>
              <div className="text-3xl font-bold" style={{ color: '#4169E1' }}>
                {hasValidRates ? sellRate.toFixed(2) : '--'}
              </div>
            </div>
            <div 
              className={cn(
                "p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                direction === "BUY" 
                  ? "border-transparent" 
                  : "bg-gray-50 border-gray-200 hover:border-gray-300"
              )}
              style={direction === "BUY" ? {
                backgroundColor: '#FEF2F2',
                borderColor: '#FF6B6B',
                boxShadow: '0 0 20px rgba(255, 107, 107, 0.4)'
              } : {}}
              onClick={() => setDirection("BUY")}
              data-testid="button-buy-direction"
            >
              <div className="text-sm text-gray-600 mb-2">매수 (Buy)</div>
              <div className="text-3xl font-bold" style={{ color: '#FF6B6B' }}>
                {hasValidRates ? buyRate.toFixed(2) : '--'}
              </div>
            </div>
          </div>

          {/* 결제일 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">결제일</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal rounded-xl bg-gray-50 border-gray-200"
                  data-testid="button-settlement-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(valueDate, "yyyy-MM-dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={valueDate}
                  onSelect={(date) => date && setValueDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 금액 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              거래 금액
            </label>
            <div className="flex gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-xl flex-1 transition-all duration-200",
                  amountCurrency === "BASE" && "border-transparent"
                )}
                style={amountCurrency === "BASE" ? {
                  backgroundColor: '#2dd4bf',
                  color: 'white',
                  borderColor: '#2dd4bf',
                  boxShadow: '0 0 15px rgba(45, 212, 191, 0.5)'
                } : {}}
                onClick={() => setAmountCurrency("BASE")}
                data-testid="button-currency-usd"
              >
                USD
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-xl flex-1 transition-all duration-200",
                  amountCurrency === "QUOTE" && "border-transparent"
                )}
                style={amountCurrency === "QUOTE" ? {
                  backgroundColor: '#2dd4bf',
                  color: 'white',
                  borderColor: '#2dd4bf',
                  boxShadow: '0 0 15px rgba(45, 212, 191, 0.5)'
                } : {}}
                onClick={() => setAmountCurrency("QUOTE")}
                data-testid="button-currency-krw"
              >
                KRW
              </Button>
            </div>
            <Input
              type="text"
              placeholder="금액을 입력하세요"
              value={amount}
              onChange={(e) => setAmount(formatInputValue(e.target.value, amountCurrency === "BASE" ? "USD" : "KRW"))}
              className="text-lg rounded-xl"
              data-testid="input-amount"
            />
          </div>

          {/* 거래 내역 요약 */}
          {amount && hasValidRates && (
            <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl shadow-inner">
              <div className="text-sm font-medium text-gray-700 mb-2">거래 내역</div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>{direction === "BUY" ? "매수" : "매도"}:</span>
                  <span className="font-medium">
                    {amountCurrency === "BASE" 
                      ? `USD ${formatCurrencyAmount(parseFloat(removeThousandSeparator(amount)), "USD")}`
                      : `USD ${formatCurrencyAmount(parseFloat(removeThousandSeparator(amount)) / (direction === "BUY" ? buyRate : sellRate), "USD")}`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>결제일:</span>
                  <span className="font-medium">{format(valueDate, "yyyy-MM-dd")}</span>
                </div>
                <div className="flex justify-between">
                  <span>환율:</span>
                  <span className="font-medium">{(direction === "BUY" ? buyRate : sellRate).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>총 금액:</span>
                  <span className="font-medium">
                    {amountCurrency === "QUOTE"
                      ? `KRW ${formatCurrencyAmount(parseFloat(removeThousandSeparator(amount)), "KRW")}`
                      : `KRW ${formatCurrencyAmount(parseFloat(removeThousandSeparator(amount)) * (direction === "BUY" ? buyRate : sellRate), "KRW")}`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 승인 안내 */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            선물환 거래는 관리자 승인 후 체결됩니다
          </div>

          {/* 가격 요청 버튼 - 화려한 색깔 */}
          <Button
            onClick={handleRequest}
            disabled={mutation.isPending || !amount || !hasValidRates}
            className="w-full py-6 text-xl font-bold rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            style={{ 
              backgroundColor: direction === "BUY" ? '#FF6B6B' : '#4169E1',
              boxShadow: direction === "BUY" 
                ? '0 0 20px rgba(255, 107, 107, 0.6)' 
                : '0 0 20px rgba(65, 105, 225, 0.6)'
            }}
            data-testid="button-request-quote"
          >
            {mutation.isPending ? "처리 중..." : "가격 요청"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
