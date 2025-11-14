import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount, calculateCurrencyAmount, formatInputValue, removeThousandSeparator } from "@/lib/currencyUtils";
import { useCustomerRate } from "@/hooks/useCustomerRate";
import type { CurrencyPair } from "@shared/schema";


export default function MARTrading() {
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [amountCurrency, setAmountCurrency] = useState<"BASE" | "QUOTE">("BASE"); // BASE = USD, QUOTE = KRW
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get USD/KRW currency pair
  const { data: currencyPairs = [] } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });
  const usdKrwPair = currencyPairs.find(p => p.symbol === "USD/KRW");

  // Use customer rates for MAR trading (no tenor for MAR)
  const {
    buyRate: customerBuyRate,
    sellRate: customerSellRate,
    spread,
    baseRate,
    isLoading: isRateLoading,
    isError: isRateError,
    dataUpdatedAt,
  } = useCustomerRate("MAR", usdKrwPair?.id, undefined);

  // Check if rates are available
  const hasValidRates = customerBuyRate != null && customerSellRate != null && !isRateError;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const isTrulyStale = dataUpdatedAt && dataUpdatedAt > 0 && lastUpdated && (Date.now() - lastUpdated.getTime() > 30000);

  const buyRate = customerBuyRate || 0;
  const sellRate = customerSellRate || 0;
  
  // MAR displays spread relative to base rate
  const marBaseRate = baseRate ? (Number(baseRate.buyRate) + Number(baseRate.sellRate)) / 2 : 0;
  const sellSpread = hasValidRates && marBaseRate ? sellRate - marBaseRate : 0;
  const buySpread = hasValidRates && marBaseRate ? buyRate - marBaseRate : 0;

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

    if (!hasValidRates) {
      toast({
        title: "환율 정보 없음",
        description: "환율 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!usdKrwPair?.id) {
      toast({
        title: "통화쌍 오류",
        description: "통화쌍 정보를 불러올 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      productType: "MAR",
      currencyPairId: usdKrwPair.id,
      direction,
      amount: parseFloat(removeThousandSeparator(amount)),
      amountCurrency,
      rate: direction === "BUY" ? buyRate : sellRate,
      settlementDate: new Date(),
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">MAR (Market Average Rate)</h2>
        <p className="text-slate-200">오전 9시 이전에 주문 가능한 평균환율 거래입니다.</p>
      </div>

      <Tabs defaultValue="customer" className="max-w-6xl mx-auto">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
          <TabsTrigger value="customer" data-testid="tab-customer-view">고객 뷰</TabsTrigger>
          <TabsTrigger value="trader" data-testid="tab-trader-view">트레이더 뷰</TabsTrigger>
        </TabsList>

        {/* 고객 뷰 - 간단한 인터페이스 */}
        <TabsContent value="customer">
          <div className="max-w-md mx-auto">
            <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
              {/* 통화쌍 고정 */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold text-gray-700">통화쌍</span>
                <div className="text-lg font-medium text-gray-900">USD/KRW</div>
              </div>

              {/* 환율 표시 - MAR 스프레드 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div 
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                    direction === "SELL" 
                      ? "bg-blue-50 border-blue-500 shadow-lg" 
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setDirection("SELL")}
                  data-testid="button-sell-direction"
                >
                  <div className="text-sm text-gray-600 mb-2">매도 (Sell)</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {hasValidRates ? sellSpread.toFixed(2) : '--'}
                  </div>
                  {hasValidRates && spread !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      스프레드 {spread}bps
                    </div>
                  )}
                </div>
                <div 
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                    direction === "BUY" 
                      ? "bg-red-50 border-red-500 shadow-lg" 
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setDirection("BUY")}
                  data-testid="button-buy-direction"
                >
                  <div className="text-sm text-gray-600 mb-2">매수 (Buy)</div>
                  <div className="text-3xl font-bold text-red-500">
                    {hasValidRates ? buySpread.toFixed(2) : '--'}
                  </div>
                  {hasValidRates && spread !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      스프레드 {spread}bps
                    </div>
                  )}
                </div>
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
                      "rounded-xl flex-1",
                      amountCurrency === "BASE" && "bg-teal-500 text-white border-teal-500"
                    )}
                    onClick={() => setAmountCurrency("BASE")}
                    data-testid="button-currency-usd"
                  >
                    USD
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "rounded-xl flex-1",
                      amountCurrency === "QUOTE" && "bg-teal-500 text-white border-teal-500"
                    )}
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
                <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
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
                      <span>MAR 환율:</span>
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

              {/* 거래 시간 안내 */}
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                <div className="font-medium mb-1">⏰ 거래 가능 시간</div>
                <div>오전 9:00 이전까지 주문 가능합니다</div>
                <div className="text-xs mt-1">현재: {new Date().toLocaleTimeString('ko-KR')}</div>
              </div>

              {/* 거래 실행 버튼 */}
              <Button
                onClick={handleTrade}
                disabled={mutation.isPending || !amount || !hasValidRates}
                className="w-full py-6 text-xl font-bold rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                style={{ 
                  backgroundColor: direction === "BUY" ? '#FF6B6B' : '#4169E1',
                  boxShadow: direction === "BUY" 
                    ? '0 0 20px rgba(255, 107, 107, 0.6)' 
                    : '0 0 20px rgba(65, 105, 225, 0.6)'
                }}
                data-testid="button-execute-trade"
              >
                {mutation.isPending ? "처리 중..." : `${direction === "BUY" ? "매수" : "매도"} 주문`}
              </Button>

              {/* MAR 안내 */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                MAR는 당일 장마감 후 결정되는 환율로서, 익영업일 서울외국환중개에 고시됩니다.
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 트레이더 뷰 - 기존의 상세 인터페이스 */}
        <TabsContent value="trader">
          <div className="max-w-md mx-auto">
        <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
          {/* Error/Stale banners */}
          {isRateError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              환율 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
            </div>
          )}
          {isTrulyStale && lastUpdated && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}, 재시도 중...
            </div>
          )}

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
                  {hasValidRates ? sellSpread.toFixed(2) : "--"}
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
                  {hasValidRates ? `+${buySpread.toFixed(2)}` : "--"}
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
            disabled={mutation.isPending || !amount || !hasValidRates}
            className="w-full py-4 text-lg font-semibold rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            title={!hasValidRates ? "환율 정보를 불러오는 중입니다" : ""}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}