import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, Clock, X, ChevronDown, ChevronUp } from "lucide-react";
import { format, addDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount, formatInputValue, removeThousandSeparator } from "@/lib/currencyUtils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const [quoteStatusOpen, setQuoteStatusOpen] = useState(true);
  const [limitOrderOpen, setLimitOrderOpen] = useState(true);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [baseCurrency, quoteCurrency] = selectedPair.split('/');

  const { data: currencyPairs = [] } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  // Fetch approved quotes (QUOTE_READY)
  const { data: approvedQuotes = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests?status=QUOTE_READY"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch pending quote requests (REQUESTED)
  const { data: pendingQuotes = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests?status=REQUESTED"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch confirmed quotes (CONFIRMED)
  const { data: confirmedQuotes = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests?status=CONFIRMED"],
    refetchInterval: 5000,
  });

  const selectedPairData = currencyPairs.find(p => p.symbol === selectedPair);

  // Filter Forward quotes
  const forwardPendingQuotes = pendingQuotes.filter(q => q.productType === "Forward");
  const forwardApprovedQuotes = approvedQuotes.filter(q => q.productType === "Forward");
  const forwardConfirmedQuotes = confirmedQuotes.filter(q => q.productType === "Forward");

  // Separate pending quotes by order type
  const pendingLimitQuotes = forwardPendingQuotes.filter(q => q.orderType === "LIMIT");
  const marketPendingQuotes = forwardPendingQuotes.filter(q => q.orderType !== "LIMIT");

  // Get approved limit quotes
  const approvedLimitQuotes = forwardApprovedQuotes.filter(q => q.orderType === "LIMIT");

  // Combine all limit quotes (both REQUESTED and QUOTE_READY)
  const allLimitQuotes = [...pendingLimitQuotes, ...approvedLimitQuotes];

  // Market order quotes (REQUESTED, QUOTE_READY, CONFIRMED)
  const marketQuotes = {
    requested: marketPendingQuotes,
    quoteReady: forwardApprovedQuotes.filter(q => q.orderType !== "LIMIT"),
    confirmed: forwardConfirmedQuotes.filter(q => q.orderType !== "LIMIT"),
  };

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
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=REQUESTED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=QUOTE_READY"] });
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
      await queryClient.refetchQueries({ queryKey: ["/api/quote-requests?status=QUOTE_READY"] });
      
      // Check if quote is still valid after refetch
      const quotes = queryClient.getQueryData<QuoteRequest[]>(["/api/quote-requests?status=QUOTE_READY"]);
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
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=REQUESTED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=QUOTE_READY"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
    },
    onError: (error: any) => {
      // Clear selected quote on error
      setSelectedQuoteId(null);
      
      // Refetch quotes to sync with backend (e.g., EXPIRED status)
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=QUOTE_READY"] });
      
      toast({
        title: "거래 실패",
        description: error?.message || "거래 체결 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const cancelQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("POST", `/api/quote-requests/${quoteId}/cancel`, {});
    },
    onSuccess: () => {
      toast({
        title: "요청 취소 완료",
        description: "가격 요청이 취소되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=REQUESTED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=QUOTE_READY"] });
    },
    onError: () => {
      toast({
        title: "취소 실패",
        description: "요청 취소 중 오류가 발생했습니다.",
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

    // Show info dialog for MARKET orders
    if (orderType === "MARKET") {
      setShowInfoDialog(true);
      return;
    }

    // For LIMIT orders, proceed directly
    submitQuoteRequest();
  };

  const submitQuoteRequest = () => {
    if (!selectedPairData) return;

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

          {/* Step 2: Approved Rate Display & Direction Selection */}
          <div className="mb-4">
            {/* Rate display - show approved quoted rates by direction */}
            <div className="flex items-center mb-4">
              <div className="flex-1 grid grid-cols-2 gap-4">
                {/* SELL Rate */}
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">SELL {baseCurrency}</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {(() => {
                      const sellQuote = approvedLimitQuotes.find(
                        q => q.currencyPairId === selectedPairData?.id && q.direction === "SELL"
                      );
                      if (sellQuote && sellQuote.quotedRate) {
                        const rate = parseFloat(sellQuote.quotedRate);
                        return (
                          <>
                            {rate.toFixed(2).split('.')[0]}.
                            <span className="text-lg">{rate.toFixed(2).split('.')[1]}</span>
                          </>
                        );
                      }
                      return '--';
                    })()}
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
                    data-testid="button-trader-sell"
                  >
                    SELL
                  </Button>
                </div>

                {/* BUY Rate */}
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">BUY {baseCurrency}</div>
                  <div className="text-2xl font-bold text-red-600">
                    {(() => {
                      const buyQuote = approvedLimitQuotes.find(
                        q => q.currencyPairId === selectedPairData?.id && q.direction === "BUY"
                      );
                      if (buyQuote && buyQuote.quotedRate) {
                        const rate = parseFloat(buyQuote.quotedRate);
                        return (
                          <>
                            {rate.toFixed(2).split('.')[0]}.
                            <span className="text-lg">{rate.toFixed(2).split('.')[1]}</span>
                          </>
                        );
                      }
                      return '--';
                    })()}
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
                    data-testid="button-trader-buy"
                  >
                    BUY
                  </Button>
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
                    ? "당일 오후 4시까지 유효" 
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
                  {baseCurrency}
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
                  {quoteCurrency}
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
            {quoteRequestMutation.isPending 
              ? "처리 중..." 
              : orderType === "MARKET" ? "즉시 가격요청" : "지정가 주문으로 가격요청"
            }
          </Button>
        </Card>

        {/* Right Panel: Status Boards */}
        <div className="space-y-4">
          {/* Quote Status Board */}
          <Card className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
            <Collapsible open={quoteStatusOpen} onOpenChange={setQuoteStatusOpen}>
              <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-3xl">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  가격 요청 현황 ({marketQuotes.requested.length + marketQuotes.quoteReady.length + marketQuotes.confirmed.length}건)
                </h3>
                {quoteStatusOpen ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-6">
                  {/* Requested */}
                  {marketQuotes.requested.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                        가격요청 ({marketQuotes.requested.length}건)
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {marketQuotes.requested.map((quote) => {
                          const pair = currencyPairs.find(p => p.id === quote.currencyPairId);
                          if (!pair) return null;
                          const displayCurrency = quote.amountCurrency === "BASE" 
                            ? pair.baseCurrency 
                            : quote.amountCurrency === "QUOTE"
                              ? pair.quoteCurrency
                              : (quote.amountCurrency || "USD");
                          return (
                            <div key={quote.id} className="p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-800 text-sm">
                                    {pair.symbol} {quote.direction === "BUY" ? "매수" : "매도"}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {displayCurrency} {formatCurrencyAmount(parseFloat(quote.amount), displayCurrency)}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => cancelQuoteMutation.mutate(quote.id)}
                                  disabled={cancelQuoteMutation.isPending}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  data-testid={`button-cancel-quote-${quote.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quote Ready */}
                  {marketQuotes.quoteReady.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        가격확인가능 ({marketQuotes.quoteReady.length}건)
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {marketQuotes.quoteReady.map((quote) => {
                          const pair = currencyPairs.find(p => p.id === quote.currencyPairId);
                          if (!pair) return null;
                          const isExpired = quote.expiresAt && new Date(quote.expiresAt) <= new Date();
                          const displayCurrency = quote.amountCurrency === "BASE" 
                            ? pair.baseCurrency 
                            : quote.amountCurrency === "QUOTE"
                              ? pair.quoteCurrency
                              : (quote.amountCurrency || "USD");
                          return (
                            <div key={quote.id} className="p-3 rounded-xl bg-green-50 border border-green-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-800 text-sm">
                                    {pair.symbol} {quote.direction === "BUY" ? "매수" : "매도"}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {displayCurrency} {formatCurrencyAmount(parseFloat(quote.amount), displayCurrency)}
                                  </div>
                                  {quote.quotedRate && (
                                    <div className="text-sm font-bold text-green-600 mt-1">
                                      체결가: {parseFloat(quote.quotedRate).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedQuoteId(quote.id);
                                    handleExecuteTrade();
                                  }}
                                  disabled={isExpired || tradeExecutionMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  data-testid={`button-execute-quote-${quote.id}`}
                                >
                                  체결
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Confirmed */}
                  {marketQuotes.confirmed.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                        거래체결 완료 ({marketQuotes.confirmed.length}건)
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {marketQuotes.confirmed.map((quote) => {
                          const pair = currencyPairs.find(p => p.id === quote.currencyPairId);
                          if (!pair) return null;
                          const displayCurrency = quote.amountCurrency === "BASE" 
                            ? pair.baseCurrency 
                            : quote.amountCurrency === "QUOTE"
                              ? pair.quoteCurrency
                              : (quote.amountCurrency || "USD");
                          return (
                            <div key={quote.id} className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-800 text-sm">
                                    {pair.symbol} {quote.direction === "BUY" ? "매수" : "매도"}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {displayCurrency} {formatCurrencyAmount(parseFloat(quote.amount), displayCurrency)}
                                  </div>
                                  {quote.quotedRate && (
                                    <div className="text-sm font-bold text-blue-600 mt-1">
                                      체결가: {parseFloat(quote.quotedRate).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                                  완료
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {marketQuotes.requested.length === 0 && marketQuotes.quoteReady.length === 0 && marketQuotes.confirmed.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">가격 요청 내역이 없습니다</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Limit Order Status Board */}
          <Card className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
            <Collapsible open={limitOrderOpen} onOpenChange={setLimitOrderOpen}>
              <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-3xl">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-purple-600" />
                  지정가 주문 현황 ({allLimitQuotes.length}건)
                </h3>
                {limitOrderOpen ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-6">
                  {allLimitQuotes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">진행 중인 지정가 주문이 없습니다</p>
                      <p className="text-xs mt-2">지정가 주문을 등록하면 여기에 표시됩니다</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {allLimitQuotes.map((quote) => {
                        const pair = currencyPairs.find(p => p.id === quote.currencyPairId);
                        if (!pair) return null;

                        // Handle validity expiration
                        let validUntil: Date | null = null;
                        let isExpired = false;

                        if (quote.validUntilTime) {
                          if (quote.validUntilTime.includes('T') || quote.validUntilTime.includes('Z')) {
                            validUntil = new Date(quote.validUntilTime);
                            if (!isNaN(validUntil.getTime())) {
                              isExpired = validUntil <= new Date();
                            } else {
                              validUntil = null;
                            }
                          } else if (quote.validityType === "TIME") {
                            const parts = quote.validUntilTime.split(':');
                            if (parts.length === 2) {
                              const hours = parseInt(parts[0], 10);
                              const minutes = parseInt(parts[1], 10);
                              if (!isNaN(hours) && !isNaN(minutes)) {
                                const today = new Date();
                                validUntil = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0);
                                isExpired = validUntil <= new Date();
                              }
                            }
                          }
                        }

                        if (!validUntil && quote.validityType === "DAY") {
                          const today = new Date();
                          validUntil = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0, 0);
                          isExpired = validUntil <= new Date();
                        }

                        return (
                          <div
                            key={quote.id}
                            className={cn(
                              "p-4 rounded-xl border-2 transition-all",
                              isExpired 
                                ? "border-red-300 bg-red-50" 
                                : quote.status === "QUOTE_READY"
                                  ? "border-green-300 bg-green-50"
                                  : "border-blue-200 bg-blue-50"
                            )}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-semibold text-gray-800">
                                    {pair.symbol} {quote.direction === "BUY" ? "매수" : "매도"}
                                  </div>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-bold",
                                    quote.status === "QUOTE_READY" 
                                      ? "bg-green-600 text-white" 
                                      : "bg-gray-500 text-white"
                                  )}>
                                    {quote.status === "QUOTE_READY" ? "체결완료" : "체결전"}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  주문번호: {quote.id}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelQuoteMutation.mutate(quote.id)}
                                disabled={cancelQuoteMutation.isPending || isExpired || quote.status === "QUOTE_READY"}
                                className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                data-testid={`button-cancel-limit-quote-${quote.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">주문금액:</span>
                                <span className="font-medium text-gray-800">
                                  {quote.amountCurrency === "BASE" ? pair.baseCurrency : pair.quoteCurrency}{" "}
                                  {formatCurrencyAmount(
                                    parseFloat(quote.amount),
                                    quote.amountCurrency === "BASE" ? pair.baseCurrency : pair.quoteCurrency
                                  )}
                                </span>
                              </div>
                              {quote.limitRate && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">지정환율:</span>
                                  <span className="font-medium text-blue-600">
                                    {parseFloat(quote.limitRate).toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {(quote.validityType === "DAY" || (quote.validityType === "TIME" && validUntil)) && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">유효기간:</span>
                                  <span className={cn(
                                    "text-xs",
                                    isExpired ? "text-red-600 font-medium" : "text-gray-600"
                                  )}>
                                    {quote.validityType === "DAY" 
                                      ? "당일 오후 4시까지"
                                      : quote.validUntilTime && !quote.validUntilTime.includes('T') && !quote.validUntilTime.includes('Z')
                                        ? `당일 ${quote.validUntilTime}까지`
                                        : validUntil?.toLocaleString('ko-KR', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })
                                    }
                                  </span>
                                </div>
                              )}
                              {quote.nearDate && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">만기일:</span>
                                  <span className="text-gray-700">
                                    {format(new Date(quote.nearDate), "yyyy-MM-dd")}
                                  </span>
                                </div>
                              )}
                              {isExpired && (
                                <div className="text-xs text-red-600 font-medium mt-1">
                                  유효기간 만료
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </div>

      {/* Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">선물환 가격 요청</DialogTitle>
            <DialogDescription className="text-gray-800 space-y-3 pt-2 text-base">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-100 space-y-2">
                <p className="font-medium">• 선물환 거래를 위해서는 CHOIICE FX에 가격을 요청해야 합니다.</p>
                <p className="font-medium">• 요청 현황은 오른쪽 패널에서 확인 가능합니다.</p>
                <p className="font-medium">• 관리자 승인되면 가격 요청 건이 <span className="text-green-600 font-bold">"가격확인가능"</span> 보드로 이동합니다.</p>
                <p className="font-medium">• 승인 후 거래 가능한 환율이 표시됩니다.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowInfoDialog(false)}
              className="flex-1 bg-white hover:bg-gray-50"
              data-testid="button-cancel-quote-info"
            >
              취소
            </Button>
            <Button
              onClick={() => {
                setShowInfoDialog(false);
                submitQuoteRequest();
              }}
              disabled={quoteRequestMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              data-testid="button-confirm-quote-info"
            >
              {quoteRequestMutation.isPending ? "처리 중..." : "확인"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
