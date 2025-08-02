import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CurrencyPair } from "@shared/schema";

export default function SpotTrading() {
  const [selectedPair, setSelectedPair] = useState("USD/KRW");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [amount, setAmount] = useState("");
  const [amountCurrency, setAmountCurrency] = useState<"BASE" | "QUOTE">("BASE"); // BASE = USD, QUOTE = KRW
  const [limitRate, setLimitRate] = useState("");
  const [validityType, setValidityType] = useState<"DAY" | "TIME">("DAY");
  const [validUntilTime, setValidUntilTime] = useState("15:30");
  const [valueDate, setValueDate] = useState<Date>(new Date());
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

  const selectedPairData = currencyPairs.find(p => p.symbol === selectedPair);
  const currentRate = marketRates.find((r: any) => r.currencyPairId === selectedPairData?.id);

  const buyRate = currentRate ? Number(currentRate.buyRate) : 1380.55;
  const sellRate = currentRate ? Number(currentRate.sellRate) : 1382.95;

  const handleTrade = () => {
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
      const today = new Date();
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
      amount: parseFloat(amount),
      amountCurrency,
      rate: tradeRate,
      settlementDate: valueDate,
      validUntil: validUntilDateTime,
      validityType,
      validUntilTime: validityType === "TIME" ? validUntilTime : undefined,
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">현물환</h2>
        <p className="text-slate-300">실시간 환율로 즉시 거래가 가능합니다.</p>
      </div>

      <div className="max-w-md mx-auto">
            <Card className="p-6 bg-white dark:bg-white text-gray-900">
              {/* Step 1: 통화쌍 선택 */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">현물환</span>
                <Select value={selectedPair} onValueChange={setSelectedPair}>
                  <SelectTrigger className="w-32 bg-slate-100 border-slate-300">
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

              {/* Step 2: Rate display */}
              <div className="flex items-center mb-6">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">SELL {baseCurrency}</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {sellRate.toFixed(2).split('.')[0]}.
                      <span className="text-lg">{sellRate.toFixed(2).split('.')[1]}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {(sellRate - 2).toFixed(2)} / {(sellRate + 2).toFixed(2)}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200"
                      onClick={() => setDirection("SELL")}
                    >
                      SELL선택
                    </Button>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">BUY {baseCurrency}</div>
                    <div className="text-2xl font-bold text-red-500">
                      {buyRate.toFixed(2).split('.')[0]}.
                      <span className="text-lg">{buyRate.toFixed(2).split('.')[1]}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {(buyRate - 2).toFixed(2)} / {(buyRate + 2).toFixed(2)}
                    </div>
                    <Button 
                      size="sm" 
                      className="mt-2 w-full"
                      style={{ backgroundColor: 'hsl(330, 100%, 71%)', color: 'white' }}
                      onClick={() => setDirection("BUY")}
                    >
                      BUY선택
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
                      "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200",
                      orderType === "MARKET" && "bg-blue-100 border-blue-300 text-blue-700"
                    )}
                    onClick={() => setOrderType("MARKET")}
                  >
                    시장가
                  </Button>
                  <Button 
                    variant="outline"
                    className={cn(
                      "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200",
                      orderType === "LIMIT" && "bg-red-100 border-red-300 text-red-700"
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
                      className="text-right text-lg bg-gray-50 border-gray-300 text-gray-900"
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
                          "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200",
                          validityType === "DAY" && "bg-blue-100 border-blue-300 text-blue-700"
                        )}
                        onClick={() => setValidityType("DAY")}
                      >
                        당일
                      </Button>
                      <Button 
                        variant="outline"
                        className={cn(
                          "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200",
                          validityType === "TIME" && "bg-orange-100 border-orange-300 text-orange-700"
                        )}
                        onClick={() => setValidityType("TIME")}
                      >
                        시간 지정
                      </Button>
                    </div>

                    {/* Time Selection (only show when TIME is selected) */}
                    {validityType === "TIME" && (
                      <Select value={validUntilTime} onValueChange={setValidUntilTime}>
                        <SelectTrigger className="w-full bg-gray-50 border-gray-300 text-gray-900">
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Step 5: Amount Currency Selection */}
              <div className="flex items-center mb-4">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    className={cn(
                      "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200",
                      amountCurrency === "BASE" && "bg-green-100 border-green-300 text-green-700"
                    )}
                    onClick={() => setAmountCurrency("BASE")}
                  >
                    {baseCurrency} 금액
                  </Button>
                  <Button 
                    variant="outline"
                    className={cn(
                      "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200",
                      amountCurrency === "QUOTE" && "bg-orange-100 border-orange-300 text-orange-700"
                    )}
                    onClick={() => setAmountCurrency("QUOTE")}
                  >
                    {quoteCurrency} 금액
                  </Button>
                </div>
              </div>

              {/* Step 6: Amount input */}
              <div className="flex items-center mb-6">
                <div className="flex-1">
                  <div className="text-sm text-gray-700 font-medium mb-2">주문금액</div>
                  <div className="text-right text-gray-500 text-sm mb-1">
                    {amountCurrency === "BASE" ? baseCurrency : quoteCurrency}
                  </div>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-right text-lg bg-gray-50 border-gray-300 text-gray-900"
                  />
                </div>
              </div>

              {/* Step 7: Trade Summary */}
              <div className="bg-gray-50 p-3 rounded-lg mb-6">
                <div className="text-sm text-gray-700 mb-2">
                  {orderType === "MARKET" ? "시장가" : "지정가"} {direction} 주문
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  거래금액: {amount || "0"} {amountCurrency === "BASE" ? baseCurrency : quoteCurrency}
                </div>
                {orderType === "LIMIT" && (
                  <div className="text-sm text-gray-600 mb-1">
                    지정환율: {limitRate || "미지정"}
                  </div>
                )}
                <div className="text-sm text-gray-600 mb-1">
                  적용환율: {orderType === "MARKET" 
                    ? (direction === "BUY" ? buyRate.toFixed(2) : sellRate.toFixed(2))
                    : (limitRate || "미지정")
                  }
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
                className="w-full mt-4 text-white py-3 text-lg font-semibold"
                style={{ backgroundColor: 'hsl(330, 100%, 71%)' }}
              >
                {mutation.isPending ? "처리중..." : "거래 실행"}
              </Button>
            </Card>
      </div>
    </div>
  );
}