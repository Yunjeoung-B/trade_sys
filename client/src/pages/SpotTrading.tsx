import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyAmount, calculateCurrencyAmount, formatInputValue, removeThousandSeparator } from "@/lib/currencyUtils";
import { getTodayLocal } from "@/lib/dateUtils";
import type { CurrencyPair } from "@shared/schema";
import { useCustomerRate } from "@/hooks/useCustomerRate";


export default function SpotTrading() {
  const [selectedPair, setSelectedPair] = useState("USD/KRW");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [amount, setAmount] = useState("");
  const [amountCurrency, setAmountCurrency] = useState<"BASE" | "QUOTE">("BASE"); // BASE = USD, QUOTE = KRW
  const [limitRate, setLimitRate] = useState("");
  const [validityType, setValidityType] = useState<"DAY" | "TIME">("DAY");
  const [validUntilTime, setValidUntilTime] = useState("15:30");
  const [valueDate, setValueDate] = useState<Date>(getTodayLocal());
  const { toast } = useToast();

  // Extract base and quote currencies from selected pair
  const [baseCurrency, quoteCurrency] = selectedPair.split('/');
  
  // Determine display currencies based on direction
  const sellCurrency = direction === "BUY" ? quoteCurrency : baseCurrency;
  const buyCurrency = direction === "BUY" ? baseCurrency : quoteCurrency;
  const queryClient = useQueryClient();

  const { data: currencyPairs = [] } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const selectedPairData = currencyPairs.find(p => p.symbol === selectedPair);

  // Get customer rates with spread applied for selected pair (no tenor for Spot)
  const {
    buyRate: customerBuyRate,
    sellRate: customerSellRate,
    spread,
    baseRate,
    isLoading: isRateLoading,
    isError: isRateError,
    isStale,
    dataUpdatedAt,
  } = useCustomerRate("Spot", selectedPairData?.id, undefined);

  const mutation = useMutation({
    mutationFn: async (tradeData: any) => {
      return apiRequest("POST", "/api/trades", tradeData);
    },
    onSuccess: () => {
      toast({
        title: "거래 성공",
        description: "현물환 거래가 성공적으로 체결되었습니다.",
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

  // Use customer rates with spread applied
  const buyRate = customerBuyRate || 0;
  const sellRate = customerSellRate || 0;
  
  // Check if rates are available (use != null to allow 0 as valid rate)
  const hasValidRates = customerBuyRate != null && customerSellRate != null && !isRateError;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  
  // Check if data is truly stale (more than 30 seconds old, and we have received at least one update)
  const isTrulyStale = dataUpdatedAt && dataUpdatedAt > 0 && lastUpdated && (Date.now() - lastUpdated.getTime() > 30000);

  const handleTrade = () => {
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

    if (orderType === "LIMIT" && !limitRate) {
      toast({
        title: "입력 오류", 
        description: "지정가 주문의 경우 지정환율을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const tradeRate = orderType === "MARKET" 
      ? (direction === "BUY" ? buyRate : sellRate)
      : parseFloat(limitRate);

    // Calculate valid until datetime for LIMIT orders
    let validUntilDateTime = undefined;
    if (orderType === "LIMIT") {
      const today = getTodayLocal();
      if (validityType === "TIME") {
        const [hours, minutes] = validUntilTime.split(':').map(Number);
        validUntilDateTime = new Date(today);
        validUntilDateTime.setHours(hours, minutes, 0, 0);
      } else {
        // DAY type - valid until end of day
        validUntilDateTime = new Date(today);
        validUntilDateTime.setHours(23, 59, 59, 999);
      }
    }

    mutation.mutate({
      productType: "Spot",
      currencyPairId: selectedPairData.id,
      direction,
      orderType,
      amount: parseFloat(removeThousandSeparator(amount)),
      amountCurrency,
      rate: tradeRate,
      settlementDate: valueDate,
      validUntil: validUntilDateTime,
      validityType,
      validUntilTime: validityType === "TIME" ? validUntilTime : undefined,
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">FX SPOT</h2>
        <p className="text-slate-200">실시간 환율로 즉시 거래가 가능합니다.</p>
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
              {/* 통화쌍 선택 */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold text-gray-700">통화쌍</span>
                <Select value={selectedPair} onValueChange={setSelectedPair}>
                  <SelectTrigger className="w-40 bg-gray-50 border-gray-200 rounded-xl shadow-sm text-lg font-medium">
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
                    direction === "SELL" 
                      ? "bg-blue-50 border-blue-500 shadow-lg" 
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setDirection("SELL")}
                  data-testid="button-sell-direction"
                >
                  <div className="text-sm text-gray-600 mb-2">매도 (Sell)</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {hasValidRates ? sellRate.toFixed(2) : '--'}
                  </div>
                  {hasValidRates && spread !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      수수료 {spread}bps
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
                    {hasValidRates ? buyRate.toFixed(2) : '--'}
                  </div>
                  {hasValidRates && spread !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      수수료 {spread}bps
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
                    data-testid="button-currency-base"
                  >
                    {baseCurrency}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "rounded-xl flex-1",
                      amountCurrency === "QUOTE" && "bg-teal-500 text-white border-teal-500"
                    )}
                    onClick={() => setAmountCurrency("QUOTE")}
                    data-testid="button-currency-quote"
                  >
                    {quoteCurrency}
                  </Button>
                </div>
                <Input
                  type="text"
                  placeholder="금액을 입력하세요"
                  value={amount}
                  onChange={(e) => setAmount(formatInputValue(e.target.value, amountCurrency === "BASE" ? baseCurrency : quoteCurrency))}
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
                          ? `${baseCurrency} ${formatCurrencyAmount(parseFloat(removeThousandSeparator(amount)), baseCurrency)}`
                          : `${baseCurrency} ${formatCurrencyAmount(parseFloat(removeThousandSeparator(amount)) / (direction === "BUY" ? buyRate : sellRate), baseCurrency)}`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>거래환율:</span>
                      <span className="font-medium">{(direction === "BUY" ? buyRate : sellRate).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>총 금액:</span>
                      <span className="font-medium">
                        {amountCurrency === "QUOTE"
                          ? `${quoteCurrency} ${formatCurrencyAmount(parseFloat(removeThousandSeparator(amount)), quoteCurrency)}`
                          : `${quoteCurrency} ${formatCurrencyAmount(parseFloat(removeThousandSeparator(amount)) * (direction === "BUY" ? buyRate : sellRate), quoteCurrency)}`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                {mutation.isPending ? "처리 중..." : `${direction === "BUY" ? "매수" : "매도"} 실행`}
              </Button>
            </Card>
          </div>
        </TabsContent>

        {/* 트레이더 뷰 - 기존의 상세 인터페이스 */}
        <TabsContent value="trader">
          <div className="max-w-md mx-auto">
            <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
              {/* Step 1: 통화쌍 선택 */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">현물환</span>
                <Select value={selectedPair} onValueChange={setSelectedPair}>
                  <SelectTrigger className="w-32 bg-gray-50 border-gray-200 rounded-xl shadow-sm">
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

              {/* Rate status banner */}
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

              {/* Step 2: Rate display */}
              <div className="flex items-center mb-6">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">SELL {baseCurrency}</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasValidRates ? sellRate.toFixed(2).split('.')[0] : '--'}.
                      <span className="text-lg">{hasValidRates ? sellRate.toFixed(2).split('.')[1] : '--'}</span>
                    </div>
                    {hasValidRates && spread !== undefined && baseRate && (
                      <div className="text-xs text-gray-500 mt-1" title={`기준환율: ${Number(baseRate.sellRate).toFixed(2)}`}>
                        수수료 {spread}bps
                      </div>
                    )}

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
                      SELL
                    </Button>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">BUY {baseCurrency}</div>
                    <div className="text-2xl font-bold text-red-500">
                      {hasValidRates ? buyRate.toFixed(2).split('.')[0] : '--'}.
                      <span className="text-lg">{hasValidRates ? buyRate.toFixed(2).split('.')[1] : '--'}</span>
                    </div>
                    {hasValidRates && spread !== undefined && baseRate && (
                      <div className="text-xs text-gray-500 mt-1" title={`기준환율: ${Number(baseRate.buyRate).toFixed(2)}`}>
                        수수료 {spread}bps
                      </div>
                    )}

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
                      BUY
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3: Order Type buttons */}
              <div className="flex items-center mb-4">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      orderType === "MARKET" 
                        ? "text-white shadow-inner" 
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    )}
                    style={orderType === "MARKET" ? {
                      backgroundColor: '#2dd4bf',
                      borderColor: '#2dd4bf',
                      boxShadow: '0 0 15px rgba(45, 212, 191, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                    } : {}}
                    onClick={() => setOrderType("MARKET")}
                  >
                    시장가
                  </Button>
                  <Button 
                    variant="outline"
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      orderType === "LIMIT" 
                        ? "text-white shadow-inner" 
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    )}
                    style={orderType === "LIMIT" ? {
                      backgroundColor: '#2dd4bf',
                      borderColor: '#2dd4bf',
                      boxShadow: '0 0 15px rgba(45, 212, 191, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                    } : {}}
                    onClick={() => setOrderType("LIMIT")}
                  >
                    지정가
                  </Button>
                </div>
              </div>

              {/* Step 3.5: Limit Rate Input (only show for LIMIT orders) */}
              {orderType === "LIMIT" && (
                <div className="flex items-center mb-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 font-medium mb-2">지정환율</div>
                    <Input
                      type="number"
                      placeholder="원하는 환율을 입력하세요"
                      value={limitRate}
                      onChange={(e) => setLimitRate(e.target.value)}
                      className="text-right text-lg bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200"
                      step="0.01"
                    />
                  </div>
                </div>
              )}

              {/* Step 3.6: Valid Until (only show for LIMIT orders) */}
              {orderType === "LIMIT" && (
                <div className="flex items-center mb-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 font-medium mb-2">주문유효기간</div>
                    
                    {/* Validity Type Selection */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Button 
                        variant="outline"
                        className={cn(
                          "rounded-xl transition-all duration-200",
                          validityType === "DAY" 
                            ? "text-white shadow-inner" 
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        )}
                        style={validityType === "DAY" ? {
                          backgroundColor: '#2dd4bf',
                          borderColor: '#2dd4bf',
                          boxShadow: '0 0 15px rgba(45, 212, 191, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                        } : {}}
                        onClick={() => setValidityType("DAY")}
                      >
                        당일
                      </Button>
                      <Button 
                        variant="outline"
                        className={cn(
                          "rounded-xl transition-all duration-200",
                          validityType === "TIME" 
                            ? "text-white shadow-inner" 
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        )}
                        style={validityType === "TIME" ? {
                          backgroundColor: '#2dd4bf',
                          borderColor: '#2dd4bf',
                          boxShadow: '0 0 15px rgba(45, 212, 191, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                        } : {}}
                        onClick={() => setValidityType("TIME")}
                      >
                        시간 지정
                      </Button>
                    </div>

                    {/* Time Selection (only show when TIME is selected) */}
                    {validityType === "TIME" && (
                      <Select value={validUntilTime} onValueChange={setValidUntilTime}>
                        <SelectTrigger className="w-full bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200">
                          <SelectValue placeholder="마감시간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="09:00">09:00 (오전 9시)</SelectItem>
                          <SelectItem value="10:00">10:00 (오전 10시)</SelectItem>
                          <SelectItem value="11:00">11:00 (오전 11시)</SelectItem>
                          <SelectItem value="12:00">12:00 (정오)</SelectItem>
                          <SelectItem value="13:00">13:00 (오후 1시)</SelectItem>
                          <SelectItem value="14:00">14:00 (오후 2시)</SelectItem>
                          <SelectItem value="15:00">15:00 (오후 3시)</SelectItem>
                          <SelectItem value="15:30">15:30 (오후 3시 30분)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Display current selection */}
                    <div className="text-xs text-gray-500 mt-2">
                      {validityType === "DAY" 
                        ? "당일 마감까지 유효" 
                        : `당일 ${validUntilTime}까지 유효`
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Value date */}
              <div className="flex items-center mb-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-700 font-medium mb-2">결제일</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-gray-50 border-gray-300 text-gray-900",
                          !valueDate && "text-gray-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {valueDate ? format(valueDate, "yyyy MM dd") : "날짜 선택"}
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
              </div>



              {/* Step 6: Amount input */}
              <div className="flex items-center mb-6">
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
                      {baseCurrency} {direction === "BUY" ? "매수" : "매도"}
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
                      {quoteCurrency} {direction === "BUY" ? "매도" : "매수"}
                    </Button>
                  </div>
                  <Input
                    type="text"
                    placeholder="여기에 주문금액을 입력하세요"
                    value={amount}
                    onChange={(e) => {
                      const inputCurrency = amountCurrency === "BASE" ? baseCurrency : quoteCurrency;
                      const formattedValue = formatInputValue(e.target.value, inputCurrency);
                      setAmount(formattedValue);
                    }}
                    className="text-right text-lg bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {/* Step 7: Trade Summary */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-2xl mb-6 shadow-inner">
                <div className="text-sm text-gray-700 mb-2">
                  현물환 {baseCurrency} {direction}/{quoteCurrency} {direction === "BUY" ? "SELL" : "BUY"} 주문
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {direction === "BUY" ? "BUY" : "SELL"}: {baseCurrency} {hasValidRates && amountCurrency === "BASE" ? 
                    formatCurrencyAmount(parseFloat(removeThousandSeparator(amount || "0")), baseCurrency) : 
                    hasValidRates ? formatCurrencyAmount(calculateCurrencyAmount(parseFloat(removeThousandSeparator(amount || "0")) / (direction === "BUY" ? buyRate : sellRate), baseCurrency), baseCurrency) : "--"
                  }
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {direction === "BUY" ? "SELL" : "BUY"}: {quoteCurrency} {hasValidRates && amountCurrency === "QUOTE" ? 
                    formatCurrencyAmount(parseFloat(removeThousandSeparator(amount || "0")), quoteCurrency) : 
                    hasValidRates ? formatCurrencyAmount(calculateCurrencyAmount(parseFloat(removeThousandSeparator(amount || "0")) * (direction === "BUY" ? buyRate : sellRate), quoteCurrency), quoteCurrency) : "--"
                  }
                </div>
                {orderType === "LIMIT" && (
                  <div className="text-sm text-gray-600 mb-1">
                    지정환율: {limitRate || "미지정"}
                  </div>
                )}
                <div className="text-sm text-gray-600 mb-1">
                  거래환율: {hasValidRates && orderType === "MARKET" 
                    ? (direction === "BUY" ? buyRate.toFixed(2) : sellRate.toFixed(2))
                    : orderType === "LIMIT" ? (limitRate || "미지정") : "--"
                  }
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  결제일: {valueDate.toISOString().split('T')[0]}
                </div>
                {orderType === "LIMIT" && (
                  <div className="text-xs text-gray-500">
                    유효기간: {validityType === "DAY" 
                      ? "당일 마감까지" 
                      : `당일 ${validUntilTime}까지`
                    }
                  </div>
                )}
              </div>

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
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}