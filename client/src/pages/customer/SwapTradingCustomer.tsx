import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, ChevronDown, ChevronUp, X } from "lucide-react";
import { format, addDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount, formatInputValue, removeThousandSeparator } from "@/lib/currencyUtils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CurrencyPair, QuoteRequest } from "@shared/schema";

export default function SwapTradingCustomer() {
  const [selectedPair, setSelectedPair] = useState("USD/KRW");
  const [direction, setDirection] = useState<"BUY_SELL_USD" | "SELL_BUY_USD">("BUY_SELL_USD");
  const [nearDate, setNearDate] = useState<Date>(addDays(new Date(), 1));
  const [farDate, setFarDate] = useState<Date>(addDays(new Date(), 30));
  const [nearAmount, setNearAmount] = useState("");
  const [nearAmountCurrency, setNearAmountCurrency] = useState<"USD" | "KRW">("USD");
  const [separateAmounts, setSeparateAmounts] = useState(false);
  const [farAmount, setFarAmount] = useState("");
  const [farAmountCurrency, setFarAmountCurrency] = useState<"USD" | "KRW">("USD");
  const [quoteStatusOpen, setQuoteStatusOpen] = useState(true);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [dialogType, setDialogType] = useState<"intro" | "quote_request">("intro");
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { toast} = useToast();
  const queryClient = useQueryClient();

  // Show info dialog on first visit
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("swap-trading-intro-seen");
    if (!hasSeenIntro) {
      setDialogType("intro");
      setShowInfoDialog(true);
    }
  }, []);

  const [baseCurrency, quoteCurrency] = selectedPair.split('/');

  const { data: currencyPairs = [] } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const selectedPairData = currencyPairs.find(p => p.symbol === selectedPair);

  // Fetch pending quote requests (REQUESTED)
  const { data: pendingQuotes = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests?status=REQUESTED"],
    refetchInterval: 5000,
  });

  // Fetch approved quotes (QUOTE_READY)
  const { data: approvedQuotes = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests?status=QUOTE_READY"],
    refetchInterval: 5000,
  });

  // Fetch confirmed quotes (CONFIRMED)
  const { data: confirmedQuotes = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests?status=CONFIRMED"],
    refetchInterval: 5000,
  });

  // Filter Swap quotes
  const swapPendingQuotes = pendingQuotes.filter(q => q.productType === "Swap");
  const swapApprovedQuotes = approvedQuotes.filter(q => q.productType === "Swap");
  const swapConfirmedQuotes = confirmedQuotes.filter(q => q.productType === "Swap");

  // All Swap quotes combined with deduplication
  const allSwapQuotesArray = [...swapPendingQuotes, ...swapApprovedQuotes, ...swapConfirmedQuotes];
  const quoteMap = new Map();
  allSwapQuotesArray.forEach(quote => {
    quoteMap.set(quote.id, quote);
  });
  const allSwapQuotes = Array.from(quoteMap.values());

  const quoteRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      return apiRequest("POST", "/api/quote-requests", requestData);
    },
    onSuccess: () => {
      toast({
        title: "스왑 가격 요청 성공",
        description: "외환스왑 가격 요청이 제출되었습니다. 승인을 기다려주세요.",
      });
      setNearAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=REQUESTED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=QUOTE_READY"] });
    },
    onError: () => {
      toast({
        title: "요청 실패",
        description: "가격 요청 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const tradeExecutionMutation = useMutation({
    mutationFn: async ({ quoteId, tradeData }: { quoteId: string; tradeData: any }) => {
      // Revalidate quote status
      await queryClient.refetchQueries({ queryKey: ["/api/quote-requests?status=QUOTE_READY"] });
      
      const quotes = queryClient.getQueryData<QuoteRequest[]>(["/api/quote-requests?status=QUOTE_READY"]);
      const currentQuote = quotes?.find(q => q.id === quoteId);
      
      if (!currentQuote) {
        throw new Error("Quote no longer available");
      }
      
      if (currentQuote.status !== "QUOTE_READY") {
        throw new Error("Quote status has changed");
      }
      
      if (currentQuote.expiresAt && new Date(currentQuote.expiresAt) <= new Date()) {
        throw new Error("Quote has expired");
      }
      
      // Confirm quote and create trade
      await apiRequest("POST", `/api/quote-requests/${quoteId}/confirm`);
      return await apiRequest("POST", "/api/trades", tradeData);
    },
    onSuccess: () => {
      toast({
        title: "거래 체결 성공",
        description: "스왑 거래가 성공적으로 체결되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=REQUESTED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=QUOTE_READY"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests?status=CONFIRMED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
    },
    onError: (error: any) => {
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
    // Prevent duplicate submission
    if (quoteRequestMutation.isPending) {
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

    // Check if separate amounts mode requires far amount
    if (separateAmounts && !farAmount) {
      toast({
        title: "입력 오류",
        description: "Far Amount를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Show info dialog before submitting
    setDialogType("quote_request");
    setShowInfoDialog(true);
  };

  const submitQuoteRequest = () => {
    if (!selectedPairData) return;

    const nearAmountNum = parseFloat(removeThousandSeparator(nearAmount));
    const farAmountNum = separateAmounts 
      ? parseFloat(removeThousandSeparator(farAmount))
      : nearAmountNum;
    
    const nearCurrency = nearAmountCurrency;
    const farCurrency = separateAmounts ? farAmountCurrency : nearAmountCurrency;
    
    quoteRequestMutation.mutate({
      productType: "Swap",
      currencyPairId: selectedPairData.id,
      direction,
      nearDate: format(nearDate, "yyyy-MM-dd"),
      farDate: format(farDate, "yyyy-MM-dd"),
      amount: nearAmountNum,
      amountCurrency: nearCurrency,
      nearAmount: nearAmountNum,
      nearAmountCurrency: nearCurrency,
      farAmount: farAmountNum,
      farAmountCurrency: farCurrency,
    });
  };

  const handleTradeExecution = (quote: QuoteRequest) => {
    if (!selectedPairData) return;

    tradeExecutionMutation.mutate({
      quoteId: quote.id,
      tradeData: {
        productType: "Swap",
        currencyPairId: quote.currencyPairId,
        direction: quote.direction,
        amount: quote.nearAmount || "0",
        amountCurrency: quote.amountCurrency || "USD",
        rate: quote.quotedRate || "0",
        valueDate: quote.farDate,
        quoteRequestId: quote.id,
      },
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">스왑 거래 (FX SWAP)</h2>
        <p className="text-slate-200">두 개의 반대 방향 거래를 동시에 체결합니다</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Panel: Quote Request Form */}
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
                  <SelectItem key={pair.id} value={pair.symbol} data-testid={`select-item-${pair.symbol}`}>
                    {pair.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 방향 선택 */}
          <div className="mb-6">
            <div className="text-sm text-gray-700 font-medium mb-2">거래 방향</div>
            <div className="grid grid-cols-2 gap-4">
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
                <div className="text-sm text-gray-600 mb-1">{selectedPair.split('/')[0]} Buy & Sell</div>
                <div className="text-xs text-gray-500">현물매수/선물매도</div>
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
                <div className="text-sm text-gray-600 mb-1">{selectedPair.split('/')[0]} Sell & Buy</div>
                <div className="text-xs text-gray-500">현물매도/선물매수</div>
              </div>
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
                
                {!separateAmounts ? (
                  <>
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
                  </>
                ) : (
                  <>
                    {/* Near Amount */}
                    <div className="mb-4 p-4 bg-blue-50/50 rounded-xl">
                      <div className="text-sm text-gray-600 font-medium mb-2">Near Amount</div>
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
                          data-testid="button-near-currency-usd"
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
                          data-testid="button-near-currency-krw"
                        >
                          KRW
                        </Button>
                      </div>
                      <Input
                        type="text"
                        placeholder="Near Amount 입력"
                        value={nearAmount}
                        onChange={(e) => setNearAmount(formatInputValue(e.target.value, nearAmountCurrency))}
                        className="text-right text-lg bg-white border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200"
                        data-testid="input-near-amount"
                      />
                    </div>

                    {/* Far Amount */}
                    <div className="p-4 bg-purple-50/50 rounded-xl">
                      <div className="text-sm text-gray-600 font-medium mb-2">Far Amount</div>
                      <div className="flex-1 grid grid-cols-2 gap-2 mb-2">
                        <Button
                          variant="outline"
                          className={cn(
                            "rounded-xl transition-all duration-200",
                            farAmountCurrency === "USD" 
                              ? "text-white shadow-inner" 
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          )}
                          style={farAmountCurrency === "USD" ? {
                            backgroundColor: '#a855f7',
                            borderColor: '#a855f7',
                            boxShadow: '0 0 15px rgba(168, 85, 247, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                          } : {}}
                          onClick={() => setFarAmountCurrency("USD")}
                          data-testid="button-far-currency-usd"
                        >
                          USD
                        </Button>
                        <Button
                          variant="outline"
                          className={cn(
                            "rounded-xl transition-all duration-200",
                            farAmountCurrency === "KRW" 
                              ? "text-white shadow-inner" 
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          )}
                          style={farAmountCurrency === "KRW" ? {
                            backgroundColor: '#a855f7',
                            borderColor: '#a855f7',
                            boxShadow: '0 0 15px rgba(168, 85, 247, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                          } : {}}
                          onClick={() => setFarAmountCurrency("KRW")}
                          data-testid="button-far-currency-krw"
                        >
                          KRW
                        </Button>
                      </div>
                      <Input
                        type="text"
                        placeholder="Far Amount 입력"
                        value={farAmount}
                        onChange={(e) => setFarAmount(formatInputValue(e.target.value, farAmountCurrency))}
                        className="text-right text-lg bg-white border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-purple-200"
                        data-testid="input-far-amount"
                      />
                    </div>
                  </>
                )}

                {/* Toggle Button for Separate Amounts */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setSeparateAmounts(!separateAmounts);
                    if (!separateAmounts) {
                      setFarAmount(nearAmount);
                      setFarAmountCurrency(nearAmountCurrency);
                    }
                  }}
                  className="w-full mt-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-gray-700 hover:from-blue-100 hover:to-purple-100"
                  data-testid="button-toggle-separate-amounts"
                >
                  {separateAmounts ? "📝 단일 금액 입력으로 전환" : "🔄 Near/Far 금액 분리 입력"}
                </Button>
              </div>

              {/* 거래 내역 요약 */}
              {nearAmount && (
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
                    {!separateAmounts ? (
                      <div className="flex justify-between">
                        <span>거래금액:</span>
                        <span className="font-medium">
                          {nearAmountCurrency} {formatCurrencyAmount(parseFloat(removeThousandSeparator(nearAmount)), nearAmountCurrency)}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Near Amount:</span>
                          <span className="font-medium">
                            {nearAmountCurrency} {formatCurrencyAmount(parseFloat(removeThousandSeparator(nearAmount)), nearAmountCurrency)}
                          </span>
                        </div>
                        {farAmount && (
                          <div className="flex justify-between">
                            <span>Far Amount:</span>
                            <span className="font-medium">
                              {farAmountCurrency} {formatCurrencyAmount(parseFloat(removeThousandSeparator(farAmount)), farAmountCurrency)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 승인 안내 */}
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                스왑 거래는 관리자 승인 후 체결됩니다
              </div>

              {/* 가격 요청 버튼 */}
              <Button
                onClick={handleQuoteRequest}
                disabled={quoteRequestMutation.isPending || !nearAmount}
                className="w-full py-6 text-xl font-bold rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                style={{ 
                  backgroundColor: direction === "BUY_SELL_USD" ? '#4169E1' : '#FF6B6B',
                  boxShadow: direction === "BUY_SELL_USD" 
                    ? '0 0 20px rgba(65, 105, 225, 0.6)' 
                    : '0 0 20px rgba(255, 107, 107, 0.6)'
                }}
                data-testid="button-request-quote-trader"
              >
                {quoteRequestMutation.isPending ? "처리 중..." : "가격 요청"}
              </Button>
            </Card>

        {/* Right Panel: Quote Status Board */}
        <Card className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
          <Collapsible open={quoteStatusOpen} onOpenChange={setQuoteStatusOpen}>
            <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-3xl">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                가격 요청 현황 ({allSwapQuotes.length}건)
              </h3>
              {quoteStatusOpen ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6">
                {/* Requested */}
                {swapPendingQuotes.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                      가격요청 ({swapPendingQuotes.length}건)
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {swapPendingQuotes.map((quote) => {
                        const pair = currencyPairs.find(p => p.id === quote.currencyPairId);
                        if (!pair) return null;
                        return (
                          <div key={quote.id} className="p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-800 text-sm mb-1">
                                  {pair.symbol} {quote.direction === "BUY_SELL_USD" ? "Buy&Sell" : "Sell&Buy"}
                                </div>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div>Near: {quote.nearAmountCurrency || "USD"} {formatCurrencyAmount(parseFloat(quote.nearAmount || "0"), quote.nearAmountCurrency || "USD")}</div>
                                  <div>Near Date: {quote.nearDate ? format(new Date(quote.nearDate), "yyyy-MM-dd") : "--"}</div>
                                  <div>Far: {quote.farAmountCurrency || "USD"} {formatCurrencyAmount(parseFloat(quote.farAmount || "0"), quote.farAmountCurrency || "USD")}</div>
                                  <div>Far Date: {quote.farDate ? format(new Date(quote.farDate), "yyyy-MM-dd") : "--"}</div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelQuoteMutation.mutate(quote.id)}
                                disabled={cancelQuoteMutation.isPending}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-cancel-swap-quote-${quote.id}`}
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
                {swapApprovedQuotes.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                      가격확인가능 ({swapApprovedQuotes.length}건)
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {swapApprovedQuotes.map((quote) => {
                        const pair = currencyPairs.find(p => p.id === quote.currencyPairId);
                        if (!pair) return null;
                        const isExpired = quote.expiresAt && new Date(quote.expiresAt) <= new Date();
                        return (
                          <div key={quote.id} className="p-3 rounded-xl bg-green-50 border border-green-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-800 text-sm mb-1">
                                  {pair.symbol} {quote.direction === "BUY_SELL_USD" ? "Buy&Sell" : "Sell&Buy"}
                                </div>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div>Near: {quote.nearAmountCurrency || "USD"} {formatCurrencyAmount(parseFloat(quote.nearAmount || "0"), quote.nearAmountCurrency || "USD")}</div>
                                  <div>Near Date: {quote.nearDate ? format(new Date(quote.nearDate), "yyyy-MM-dd") : "--"}</div>
                                  <div>Far: {quote.farAmountCurrency || "USD"} {formatCurrencyAmount(parseFloat(quote.farAmount || "0"), quote.farAmountCurrency || "USD")}</div>
                                  <div>Far Date: {quote.farDate ? format(new Date(quote.farDate), "yyyy-MM-dd") : "--"}</div>
                                </div>
                                {quote.quotedRate && (
                                  <div className="text-sm font-bold text-green-600 mt-1">
                                    스왑 포인트: {parseFloat(quote.quotedRate) >= 0 ? '+' : ''}{parseFloat(quote.quotedRate).toFixed(1)}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleTradeExecution(quote)}
                                disabled={isExpired || tradeExecutionMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                data-testid={`button-execute-swap-quote-${quote.id}`}
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
                {swapConfirmedQuotes.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                      거래체결 완료 ({swapConfirmedQuotes.length}건)
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {swapConfirmedQuotes.map((quote) => {
                        const pair = currencyPairs.find(p => p.id === quote.currencyPairId);
                        if (!pair) return null;
                        return (
                          <div key={quote.id} className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-800 text-sm mb-1">
                                  {pair.symbol} {quote.direction === "BUY_SELL_USD" ? "Buy&Sell" : "Sell&Buy"}
                                </div>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div>Near: {quote.nearAmountCurrency || "USD"} {formatCurrencyAmount(parseFloat(quote.nearAmount || "0"), quote.nearAmountCurrency || "USD")}</div>
                                  <div>Near Date: {quote.nearDate ? format(new Date(quote.nearDate), "yyyy-MM-dd") : "--"}</div>
                                  <div>Far: {quote.farAmountCurrency || "USD"} {formatCurrencyAmount(parseFloat(quote.farAmount || "0"), quote.farAmountCurrency || "USD")}</div>
                                  <div>Far Date: {quote.farDate ? format(new Date(quote.farDate), "yyyy-MM-dd") : "--"}</div>
                                </div>
                                {quote.quotedRate && (
                                  <div className="text-sm font-bold text-blue-600 mt-1">
                                    체결 포인트: {parseFloat(quote.quotedRate) >= 0 ? '+' : ''}{parseFloat(quote.quotedRate).toFixed(1)}
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

                {allSwapQuotes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">진행 중인 스왑 거래가 없습니다</p>
                    <p className="text-xs mt-2">스왑 거래를 요청하면 여기에 표시됩니다</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="sm:max-w-xl bg-white border border-gray-200 shadow-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">
              Important Notes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  스왑 거래를 위해서는 CHOICE FX에 가격을 요청해야 합니다.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  요청 현황은 오른쪽 패널에서 확인 가능합니다.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  관리자 승인되면 가격 요청 건이 <span className="text-teal-600 font-semibold">"가격확인가능"</span> 보드로 이동합니다.
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  승인 후 거래 가능한 스왑 포인트가 표시됩니다.
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-4 px-1">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="border-gray-400 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
              data-testid="checkbox-dont-show-again"
            />
            <label
              htmlFor="dont-show-again"
              className="text-sm text-gray-600 cursor-pointer select-none"
            >
              다시 보지 않기
            </label>
          </div>
          <div className="flex gap-3 mt-5">
            <Button
              onClick={() => {
                if (dontShowAgain) {
                  localStorage.setItem("swap-trading-intro-seen", "true");
                }
                setShowInfoDialog(false);
                setDontShowAgain(false);
              }}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-all duration-200"
              data-testid="button-cancel-quote-info"
            >
              취소
            </Button>
            <Button
              onClick={() => {
                localStorage.setItem("swap-trading-intro-seen", "true");
                setShowInfoDialog(false);
                setDontShowAgain(false);
                // Only submit quote request if this is a quote request dialog, not intro
                if (dialogType === "quote_request") {
                  submitQuoteRequest();
                }
              }}
              disabled={dialogType === "quote_request" && quoteRequestMutation.isPending}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition-all duration-200 disabled:opacity-50"
              data-testid="button-confirm-quote-info"
            >
              {dialogType === "quote_request" && quoteRequestMutation.isPending ? "처리 중..." : "확인"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
