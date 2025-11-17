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

export default function SwapTradingCustomer() {
  const [selectedPair, setSelectedPair] = useState("USD/KRW");
  const [direction, setDirection] = useState<"BUY_SELL_USD" | "SELL_BUY_USD">("BUY_SELL_USD");
  const [nearDate, setNearDate] = useState<Date>(addDays(new Date(), 1));
  const [farDate, setFarDate] = useState<Date>(addDays(new Date(), 30));
  const [nearAmount, setNearAmount] = useState("");
  const [nearAmountCurrency, setNearAmountCurrency] = useState<"USD" | "KRW">("USD");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [baseCurrency, quoteCurrency] = selectedPair.split('/');

  const { data: currencyPairs = [] } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const selectedPairData = currencyPairs.find(p => p.symbol === selectedPair);

  // Convert farDate to tenor for spread lookup
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

  const tenor = getTenorFromDate(farDate);

  const {
    buyRate: customerBuyRate,
    sellRate: customerSellRate,
    isLoading: isRateLoading,
    isError: isRateError,
    dataUpdatedAt,
  } = useCustomerRate("Swap", selectedPairData?.id, tenor);

  const buyRate = customerBuyRate || 0;
  const sellRate = customerSellRate || 0;
  const hasValidRates = customerBuyRate != null && customerSellRate != null && !isRateError;

  const mutation = useMutation({
    mutationFn: async (requestData: any) => {
      return apiRequest("POST", "/api/quote-requests", requestData);
    },
    onSuccess: () => {
      toast({
        title: "스왑 가격 요청 성공",
        description: "외환스왑 가격 요청이 제출되었습니다. 승인을 기다려주세요.",
      });
      setNearAmount("");
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

    if (!selectedPairData || !nearAmount) {
      toast({
        title: "입력 오류",
        description: "통화쌍과 금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      productType: "Swap",
      currencyPairId: selectedPairData.id,
      direction,
      nearDate,
      farDate,
      nearAmount: parseFloat(removeThousandSeparator(nearAmount)),
      nearAmountCurrency,
      farAmount: parseFloat(removeThousandSeparator(nearAmount)),
      farAmountCurrency: nearAmountCurrency,
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">스왑 거래 (FX SWAP)</h2>
        <p className="text-slate-200">두 개의 반대 방향 거래를 동시에 체결합니다</p>
      </div>

      <div className="max-w-md mx-auto">
            <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
              {/* 통화쌍 선택 */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold text-gray-700">통화쌍</span>
                <Select value={selectedPair} onValueChange={setSelectedPair}>
                  <SelectTrigger className="w-40 bg-gray-50 border-gray-200 rounded-xl shadow-sm text-lg font-medium" data-testid="select-currency-pair-trader">
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

              {/* 환율 표시 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div 
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                    direction === "BUY_SELL_USD" 
                      ? "bg-blue-50 border-blue-500 shadow-lg" 
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setDirection("BUY_SELL_USD")}
                  data-testid="button-buy-sell-direction-trader"
                >
                  <div className="text-sm text-gray-600 mb-2">{selectedPair.split('/')[0]} Buy & Sell</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {hasValidRates ? buyRate.toFixed(2) : '--'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">현물매수/선물매도</div>
                </div>
                <div 
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                    direction === "SELL_BUY_USD" 
                      ? "bg-red-50 border-red-500 shadow-lg" 
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setDirection("SELL_BUY_USD")}
                  data-testid="button-sell-buy-direction-trader"
                >
                  <div className="text-sm text-gray-600 mb-2">{selectedPair.split('/')[0]} Sell & Buy</div>
                  <div className="text-2xl font-bold text-red-500">
                    {hasValidRates ? sellRate.toFixed(2) : '--'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">현물매도/선물매수</div>
                </div>
              </div>

              {/* 날짜 선택 */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-700 font-medium mb-2">Near Date</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-gray-50 border-gray-300 text-gray-900 rounded-xl"
                        )}
                        data-testid="button-near-date-trader"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(nearDate, "yyyy-MM-dd")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={nearDate}
                        onSelect={(date) => date && setNearDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <div className="text-sm text-gray-700 font-medium mb-2">Far Date</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-gray-50 border-gray-300 text-gray-900 rounded-xl"
                        )}
                        data-testid="button-far-date-trader"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(farDate, "yyyy-MM-dd")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={farDate}
                        onSelect={(date) => date && setFarDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* 금액 입력 */}
              <div className="mb-6">
                <div className="text-sm text-gray-700 font-medium mb-2">거래 금액</div>
                <div className="flex-1 grid grid-cols-2 gap-2 mb-2">
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      nearAmountCurrency === "USD" 
                        ? "text-white shadow-inner" 
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    )}
                    style={nearAmountCurrency === "USD" ? {
                      backgroundColor: '#2dd4bf',
                      borderColor: '#2dd4bf',
                      boxShadow: '0 0 15px rgba(45, 212, 191, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                    } : {}}
                    onClick={() => setNearAmountCurrency("USD")}
                    data-testid="button-currency-usd-trader"
                  >
                    USD
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      nearAmountCurrency === "KRW" 
                        ? "text-white shadow-inner" 
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    )}
                    style={nearAmountCurrency === "KRW" ? {
                      backgroundColor: '#2dd4bf',
                      borderColor: '#2dd4bf',
                      boxShadow: '0 0 15px rgba(45, 212, 191, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                    } : {}}
                    onClick={() => setNearAmountCurrency("KRW")}
                    data-testid="button-currency-krw-trader"
                  >
                    KRW
                  </Button>
                </div>
                <Input
                  type="text"
                  placeholder="여기에 거래금액을 입력하세요"
                  value={nearAmount}
                  onChange={(e) => setNearAmount(formatInputValue(e.target.value, nearAmountCurrency))}
                  className="text-right text-lg bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200"
                  data-testid="input-amount-trader"
                />
              </div>

              {/* 거래 내역 요약 */}
              {nearAmount && hasValidRates && (
                <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
                  <div className="text-sm font-medium text-gray-700 mb-2">거래 내역</div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Near Leg:</span>
                      <span className="font-medium">{format(nearDate, "yyyy-MM-dd")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Far Leg:</span>
                      <span className="font-medium">{format(farDate, "yyyy-MM-dd")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>거래금액:</span>
                      <span className="font-medium">
                        {nearAmountCurrency} {formatCurrencyAmount(parseFloat(removeThousandSeparator(nearAmount)), nearAmountCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 승인 안내 */}
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                스왑 거래는 관리자 승인 후 체결됩니다
              </div>

              {/* 가격 요청 버튼 */}
              <Button
                onClick={handleRequest}
                disabled={mutation.isPending || !nearAmount || !hasValidRates}
                className="w-full py-6 text-xl font-bold rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                style={{ 
                  backgroundColor: direction === "BUY_SELL_USD" ? '#4169E1' : '#FF6B6B',
                  boxShadow: direction === "BUY_SELL_USD" 
                    ? '0 0 20px rgba(65, 105, 225, 0.6)' 
                    : '0 0 20px rgba(255, 107, 107, 0.6)'
                }}
                data-testid="button-request-quote-trader"
              >
                {mutation.isPending ? "처리 중..." : "가격 요청"}
              </Button>
            </Card>
          </div>
    </div>
  );
}
