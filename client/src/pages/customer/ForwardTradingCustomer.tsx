import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle, Clock } from "lucide-react";
import { format, addDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount, formatInputValue, removeThousandSeparator } from "@/lib/currencyUtils";
import type { CurrencyPair, QuoteRequest } from "@shared/schema";

export default function ForwardTradingCustomer() {
  const [selectedPair, setSelectedPair] = useState("USD/KRW");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  
  // Reset limit-specific fields when order type changes
  const handleOrderTypeChange = (newType: "MARKET" | "LIMIT") => {
    setOrderType(newType);
    if (newType === "MARKET") {
      setLimitRate("");
      setValidityType("DAY");
      setValidUntilTime("15:30");
    }
  };
  const [amount, setAmount] = useState("");
  const [amountCurrency, setAmountCurrency] = useState<"BASE" | "QUOTE">("BASE");
  const [limitRate, setLimitRate] = useState("");
  const [validityType, setValidityType] = useState<"DAY" | "TIME">("DAY");
  const [validUntilTime, setValidUntilTime] = useState("15:30");
  const [valueDate, setValueDate] = useState<Date>(addDays(new Date(), 7));
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [baseCurrency, quoteCurrency] = selectedPair.split('/');

  const { data: currencyPairs = [] } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  // Fetch approved quotes (QUOTE_READY)
  const { data: approvedQuotes = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests", "QUOTE_READY"],
    queryFn: () => fetch("/api/quote-requests?status=QUOTE_READY").then(res => res.json()),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const selectedPairData = currencyPairs.find(p => p.symbol === selectedPair);

  // Filter out expired quotes
  const activeQuotes = approvedQuotes.filter(q => {
    if (!q.expiresAt) return true;
    return new Date(q.expiresAt) > new Date();
  });

  // Get selected quote details
  const selectedQuote = activeQuotes.find(q => q.id === selectedQuoteId);

  const quoteRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      return apiRequest("POST", "/api/quote-requests", requestData);
    },
    onSuccess: () => {
      toast({
        title: "선물환 가격 요청 성공",
        description: "선물환 가격 요청이 제출되었습니다. 승인을 기다려주세요.",
      });
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
    },
    onError: (error: any) => {
      console.error("Quote request error:", error);
      toast({
        title: "요청 실패",
        description: error?.message || "가격 요청 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const tradeExecutionMutation = useMutation({
    mutationFn: async (tradeData: any) => {
      // First, refetch quotes to revalidate
      await queryClient.refetchQueries({ queryKey: ["/api/quote-requests", "QUOTE_READY"] });
      
      // Check if quote is still valid after refetch
      const quotes = queryClient.getQueryData<QuoteRequest[]>(["/api/quote-requests", "QUOTE_READY"]);
      const currentQuote = quotes?.find(q => q.id === selectedQuoteId);
      
      if (!currentQuote) {
        throw new Error("Quote no longer available");
      }
      
      if (currentQuote.status !== "QUOTE_READY") {
        throw new Error("Quote status has changed");
      }
      
      if (currentQuote.expiresAt && new Date(currentQuote.expiresAt) <= new Date()) {
        throw new Error("Quote has expired");
      }
      
      try {
        // First confirm the quote
        await apiRequest("POST", `/api/quote-requests/${selectedQuoteId}/confirm`);
        // Only create trade if confirm succeeded
        return await apiRequest("POST", "/api/trades", tradeData);
      } catch (error: any) {
        // If confirm fails, don't attempt to create trade
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "거래 체결 성공",
        description: "선물환 거래가 성공적으로 체결되었습니다.",
      });
      setSelectedQuoteId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
    },
    onError: (error: any) => {
      // Clear selected quote on error
      setSelectedQuoteId(null);
      
      // Refetch quotes to sync with backend (e.g., EXPIRED status)
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests", "QUOTE_READY"] });
      
      toast({
        title: "거래 실패",
        description: error?.message || "거래 체결 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleQuoteRequest = () => {
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

    quoteRequestMutation.mutate({
      productType: "Forward",
      currencyPairId: selectedPairData.id,
      direction,
      amount: parseFloat(removeThousandSeparator(amount)),
      amountCurrency,
      orderType,
      limitRate: orderType === "LIMIT" ? parseFloat(limitRate) : null,
      validityType: orderType === "LIMIT" ? validityType : null,
      validUntilTime: orderType === "LIMIT" && validityType === "TIME" ? validUntilTime : null,
      nearDate: valueDate.toISOString(),
      tenor: `${Math.ceil((valueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}D`,
    });
  };

  const handleExecuteTrade = () => {
    if (!selectedQuote) {
      toast({
        title: "견적 선택 오류",
        description: "실행할 견적을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Calculate maturity date from value date
    // If tenor exists in the quote, we can use it, otherwise use the near/far dates
    let maturityDate = null;
    if (selectedQuote.nearDate) {
      maturityDate = new Date(selectedQuote.nearDate);
    } else if (selectedQuote.tenor) {
      // Estimate maturity date from tenor (this is approximate)
      maturityDate = new Date();
      const tenorMatch = selectedQuote.tenor.match(/(\d+)([DWMY])/);
      if (tenorMatch) {
        const [, value, unit] = tenorMatch;
        const amount = parseInt(value);
        switch (unit) {
          case 'D': maturityDate.setDate(maturityDate.getDate() + amount); break;
          case 'W': maturityDate.setDate(maturityDate.getDate() + amount * 7); break;
          case 'M': maturityDate.setMonth(maturityDate.getMonth() + amount); break;
          case 'Y': maturityDate.setFullYear(maturityDate.getFullYear() + amount); break;
        }
      }
    }

    tradeExecutionMutation.mutate({
      productType: "Forward",
      currencyPairId: selectedQuote.currencyPairId,
      direction: selectedQuote.direction,
      amount: parseFloat(selectedQuote.amount),
      rate: parseFloat(selectedQuote.quotedRate!),
      quoteRequestId: selectedQuote.id,
      maturityDate: maturityDate ? maturityDate.toISOString() : null,
    });
  };

  // Get time remaining for quote expiry
  const getTimeRemaining = (expiresAt: string | Date) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins < 0) return "만료됨";
    return `${diffMins}분 ${diffSecs}초`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">선물환 거래 (FX FORWARD)</h2>
        <p className="text-slate-200">미래 특정일에 거래할 환율을 지금 확정합니다</p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Quote Request Form */}
        <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
          <h3 className="text-lg font-bold mb-4 text-gray-800">가격 요청</h3>
          
          {/* Step 1: 통화쌍 선택 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">선물환</span>
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-32 bg-gray-50 border-gray-200 rounded-xl shadow-sm" data-testid="select-currency-pair-trader">
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

          {/* Step 2: Direction Selection (No rates shown) */}
          <div className="mb-4">
            <div className="text-sm text-gray-700 font-medium mb-2">거래 방향</div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline"
                className={cn(
                  "rounded-xl transition-all duration-200",
                  direction === "SELL" 
                    ? "text-white shadow-inner" 
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                )}
                style={direction === "SELL" ? { 
                  backgroundColor: '#4169E1', 
                  borderColor: '#4169E1',
                  boxShadow: '0 0 15px rgba(65, 105, 225, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                } : {}}
                onClick={() => setDirection("SELL")}
                data-testid="button-trader-sell"
              >
                SELL {baseCurrency}
              </Button>
              <Button 
                variant="outline"
                className={cn(
                  "rounded-xl transition-all duration-200",
                  direction === "BUY" 
                    ? "text-white shadow-inner" 
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                )}
                style={direction === "BUY" ? { 
                  backgroundColor: '#FF6B6B', 
                  borderColor: '#FF6B6B',
                  boxShadow: '0 0 15px rgba(255, 107, 107, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                } : {}}
                onClick={() => setDirection("BUY")}
                data-testid="button-trader-buy"
              >
                BUY {baseCurrency}
              </Button>
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
                onClick={() => handleOrderTypeChange("MARKET")}
                data-testid="button-market-order"
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
                onClick={() => handleOrderTypeChange("LIMIT")}
                data-testid="button-limit-order"
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
                  data-testid="input-limit-rate"
                />
              </div>
            </div>
          )}

          {/* Step 3.6: Valid Until (only show for LIMIT orders) */}
          {orderType === "LIMIT" && (
            <div className="flex items-center mb-4">
              <div className="flex-1">
                <div className="text-sm text-gray-700 font-medium mb-2">주문유효기간</div>
                
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
                    data-testid="button-validity-day"
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
                    data-testid="button-validity-time"
                  >
                    시간 지정
                  </Button>
                </div>

                {validityType === "TIME" && (
                  <Select value={validUntilTime} onValueChange={setValidUntilTime}>
                    <SelectTrigger className="w-full bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200" data-testid="select-validity-time">
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
                      "w-full justify-start text-left font-normal bg-gray-50 border-gray-300 text-gray-900 rounded-xl",
                      !valueDate && "text-gray-500"
                    )}
                    data-testid="button-value-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {valueDate ? format(valueDate, "yyyy-MM-dd") : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={valueDate}
                    onSelect={(date) => date && setValueDate(date)}
                    disabled={(date) => date <= addDays(new Date(), 2)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Step 5: Amount Input */}
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
                  data-testid="button-trader-currency-base"
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
                  data-testid="button-trader-currency-quote"
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
                data-testid="input-trader-amount"
              />
            </div>
          </div>

          {/* 승인 안내 */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            선물환 거래는 관리자의 가격 승인 후 체결됩니다
          </div>

          {/* 가격 요청 버튼 */}
          <Button
            onClick={handleQuoteRequest}
            disabled={quoteRequestMutation.isPending || !amount || (orderType === "LIMIT" && !limitRate)}
            className="w-full py-6 text-xl font-bold rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            style={{ 
              backgroundColor: direction === "BUY" ? '#FF6B6B' : '#4169E1',
              boxShadow: direction === "BUY" 
                ? '0 0 20px rgba(255, 107, 107, 0.6)' 
                : '0 0 20px rgba(65, 105, 225, 0.6)'
            }}
            data-testid="button-trader-request-quote"
          >
            {quoteRequestMutation.isPending ? "처리 중..." : "가격 요청"}
          </Button>
        </Card>

        {/* Right Panel: Approved Quotes */}
        <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
          <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            승인된 견적 ({activeQuotes.length}건)
          </h3>

          {activeQuotes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">승인된 견적이 없습니다</p>
              <p className="text-xs mt-2">가격 요청 후 관리자 승인을 기다려주세요</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {activeQuotes.map((quote) => {
                const pair = currencyPairs.find(p => p.id === quote.currencyPairId);
                const isSelected = selectedQuoteId === quote.id;
                const isExpired = quote.expiresAt && new Date(quote.expiresAt) <= new Date();

                return (
                  <div
                    key={quote.id}
                    onClick={() => !isExpired && setSelectedQuoteId(quote.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer transition-all",
                      isSelected 
                        ? "border-green-500 bg-green-50 shadow-lg" 
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md",
                      isExpired && "opacity-50 cursor-not-allowed"
                    )}
                    data-testid={`quote-card-${quote.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-gray-800">{pair?.symbol || "N/A"}</div>
                        <div className="text-sm text-gray-600">
                          {quote.direction} {formatCurrencyAmount(parseFloat(quote.amount), "USD")}
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        quote.direction === "BUY" 
                          ? "bg-red-100 text-red-700" 
                          : "bg-blue-100 text-blue-700"
                      )}>
                        {quote.direction}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">승인 환율:</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {quote.quotedRate ? parseFloat(quote.quotedRate).toFixed(2) : "N/A"}
                      </span>
                    </div>

                    {quote.expiresAt && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">유효시간:</span>
                        <span className={cn(
                          "font-medium",
                          isExpired ? "text-red-600" : "text-green-600"
                        )}>
                          {getTimeRemaining(quote.expiresAt)}
                        </span>
                      </div>
                    )}

                    {quote.tenor && (
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-gray-500">만기:</span>
                        <span className="text-gray-700">{quote.tenor}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Execute Trade Button */}
          {selectedQuote && (
            <div className="mt-6">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-2xl mb-4 shadow-inner">
                <div className="text-sm text-gray-700 mb-2">거래 요약</div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>거래:</span>
                    <span className="font-medium">
                      {selectedQuote.direction} {formatCurrencyAmount(parseFloat(selectedQuote.amount), "USD")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>환율:</span>
                    <span className="font-medium">
                      {selectedQuote.quotedRate ? parseFloat(selectedQuote.quotedRate).toFixed(2) : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleExecuteTrade}
                disabled={tradeExecutionMutation.isPending}
                className="w-full py-6 text-xl font-bold rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 bg-green-600 hover:bg-green-700"
                data-testid="button-execute-trade"
              >
                {tradeExecutionMutation.isPending ? "체결 중..." : "거래 체결"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
