import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CurrencyPair } from "@shared/schema";


export default function ForwardTrading() {
  const [selectedPair, setSelectedPair] = useState("USD/KRW");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [amount, setAmount] = useState("");
  const [amountCurrency, setAmountCurrency] = useState<"BASE" | "QUOTE">("BASE"); 
  const [limitRate, setLimitRate] = useState("");
  const [validityType, setValidityType] = useState<"DAY" | "TIME">("DAY");
  const [validUntilTime, setValidUntilTime] = useState("15:30");
  const [valueDate, setValueDate] = useState<Date>(addDays(new Date(), 7)); // 1주일 후로 기본 설정
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

  const { data: marketRates = [] } = useQuery<any[]>({
    queryKey: ["/api/market-rates"],
  });

  const mutation = useMutation({
    mutationFn: async (requestData: any) => {
      return apiRequest("POST", "/api/quote-requests", requestData);
    },
    onSuccess: () => {
      toast({
        title: "견적 요청 성공",
        description: "선물환 견적 요청이 제출되었습니다. 승인을 기다려주세요.",
      });
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
    },
    onError: () => {
      toast({
        title: "요청 실패",
        description: "견적 요청 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const selectedPairData = currencyPairs.find(p => p.symbol === selectedPair);
  const currentRate = marketRates.find((r: any) => r.currencyPairId === selectedPairData?.id);

  // SPOT 레이트 (현물환과 동일)
  const spotBuyRate = currentRate ? Number(currentRate.buyRate) : 1394.55;
  const spotSellRate = currentRate ? Number(currentRate.sellRate) : 1382.95;
  
  // SWAP POINT 계산 (만기일까지의 기간에 따라)
  const calculateSwapPoints = (spotRate: number, valueDate: Date) => {
    if (!valueDate) return 0;
    const today = new Date();
    const daysToMaturity = Math.ceil((valueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // 간단한 스왑포인트 계산 (실제로는 금리 차이에 따라 계산)
    return daysToMaturity * 0.05; // 예시: 일당 0.05 포인트
  };
  
  const swapPointsBuy = calculateSwapPoints(spotBuyRate, valueDate);
  const swapPointsSell = calculateSwapPoints(spotSellRate, valueDate);
  
  // 선물환 레이트 = SPOT + SWAP POINTS
  const buyRate = spotBuyRate + swapPointsBuy;
  const sellRate = spotSellRate + swapPointsSell;

  const handleTrade = () => {
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
      orderType,
      amount: parseFloat(amount),
      amountCurrency,
      limitRate: orderType === "LIMIT" ? parseFloat(limitRate) : undefined,
      validityType: orderType === "LIMIT" ? validityType : undefined,
      validUntilTime: orderType === "LIMIT" && validityType === "TIME" ? validUntilTime : undefined,
      valueDate: valueDate.toISOString().split('T')[0],
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">FX FORWARD</h2>
        <p className="text-slate-200">미래 특정일에 거래하는 선물환 상품입니다.</p>
      </div>
      <div className="max-w-md mx-auto">
        <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
          {/* Step 1: 통화쌍 선택 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">선물환</span>
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

          {/* Step 2: Quote Request Display */}
          <div className="flex items-center mb-6">
            <div className="flex-1 text-center">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl shadow-inner">
                <div className="text-lg font-semibold text-gray-700 mb-2">선물환 견적 요청</div>
                <div className="text-sm text-gray-600 mb-3">
                  선물환 거래를 위해서는 CHOIICE FX에 견적을 요청해야 합니다.
                </div>
                
                {/* Direction Selection */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button 
                    variant="outline"
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      direction === "SELL" 
                        ? "bg-teal-400 border-2 border-teal-600 text-white shadow-inner ring-2 ring-teal-300" 
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    )}
                    onClick={() => setDirection("SELL")}
                  >
                    SELL {baseCurrency}
                  </Button>
                  <Button 
                    variant="outline"
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      direction === "BUY" 
                        ? "bg-teal-400 border-2 border-teal-600 text-white shadow-inner ring-2 ring-teal-300" 
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    )}
                    onClick={() => setDirection("BUY")}
                  >
                    BUY {baseCurrency}
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500">
                  관리자 승인 후 거래 가능한 환율이 제공됩니다.
                </div>
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
                    ? "bg-teal-400 border-teal-500 text-white shadow-inner" 
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                )}
                onClick={() => setOrderType("MARKET")}
              >
                시장가
              </Button>
              <Button 
                variant="outline"
                className={cn(
                  "rounded-xl transition-all duration-200",
                  orderType === "LIMIT" 
                    ? "bg-teal-400 border-teal-500 text-white shadow-inner" 
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                )}
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
                        ? "bg-teal-400 border-teal-500 text-white shadow-inner" 
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    )}
                    onClick={() => setValidityType("DAY")}
                  >
                    당일
                  </Button>
                  <Button 
                    variant="outline"
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      validityType === "TIME" 
                        ? "bg-teal-400 border-teal-500 text-white shadow-inner" 
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    )}
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
              <div className="text-sm text-gray-700 font-medium mb-2">만기일</div>
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
                    disabled={(date) => date <= addDays(new Date(), 2)} // 3일 후부터 선택 가능
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
                      ? "bg-teal-400 border-2 border-teal-600 text-white shadow-inner ring-2 ring-teal-300" 
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  )}
                  onClick={() => setAmountCurrency("BASE")}
                >
                  {baseCurrency} {direction === "BUY" ? "매수" : "매도"}
                </Button>
                <Button 
                  variant="outline"
                  className={cn(
                    "rounded-xl transition-all duration-200",
                    amountCurrency === "QUOTE" 
                      ? "bg-teal-400 border-2 border-teal-600 text-white shadow-inner ring-2 ring-teal-300" 
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  )}
                  onClick={() => setAmountCurrency("QUOTE")}
                >
                  {quoteCurrency} {direction === "BUY" ? "매도" : "매수"}
                </Button>
              </div>
              <Input
                type="number"
                placeholder="여기에 주문금액을 입력하세요"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-right text-lg bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Step 7: Trade Summary */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-2xl mb-6 shadow-inner">
            <div className="text-sm text-gray-700 mb-2">
              선물환 {baseCurrency} {direction}/{quoteCurrency} {direction === "BUY" ? "SELL" : "BUY"} 주문
            </div>
            <div className="text-sm text-gray-600 mb-1">
              {direction === "BUY" ? "BUY" : "SELL"}: {baseCurrency} {amountCurrency === "BASE" ? (amount || "0") : ((parseFloat(amount || "0") / (direction === "BUY" ? buyRate : sellRate)).toFixed(2))}
            </div>
            <div className="text-sm text-gray-600 mb-1">
              {direction === "BUY" ? "SELL" : "BUY"}: {quoteCurrency} {amountCurrency === "QUOTE" ? (amount || "0") : ((parseFloat(amount || "0") * (direction === "BUY" ? buyRate : sellRate)).toFixed(2))}
            </div>
            {orderType === "LIMIT" && (
              <div className="text-sm text-gray-600 mb-1">
                지정환율: {limitRate || "미지정"}
              </div>
            )}
            <div className="text-sm text-gray-600 mb-1">
              거래환율: 견적 승인 후 제공
            </div>
            <div className="text-sm text-gray-600 mb-1">
              결제일: {valueDate ? valueDate.toISOString().split('T')[0] : "미선택"}
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
            disabled={mutation.isPending || !amount}
            className="w-full py-4 text-lg font-semibold rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
          >
            {mutation.isPending ? "처리중..." : "견적 요청"}
          </Button>
        </Card>
      </div>
    </div>
  );
}