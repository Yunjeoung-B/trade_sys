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
import type { CurrencyPair, QuoteRequest } from "@shared/schema";

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

  // All Swap quotes combined
  const allSwapQuotes = [...swapPendingQuotes, ...swapApprovedQuotes, ...swapConfirmedQuotes];

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

  const handleRequest = () => {
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

    const amount = parseFloat(removeThousandSeparator(nearAmount));
    
    quoteRequestMutation.mutate({
      productType: "Swap",
      currencyPairId: selectedPairData.id,
      direction,
      nearDate,
      farDate,
      amount,
      amountCurrency: nearAmountCurrency,
      nearAmount: amount,
      farAmount: amount,
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

        {/* Right Panel: Swap Quote List */}
        <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
          <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
            스왑 거래 요청 ({allSwapQuotes.length}건)
          </h3>

          {allSwapQuotes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">진행 중인 스왑 거래가 없습니다</p>
              <p className="text-xs mt-2">스왑 거래를 요청하면 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {allSwapQuotes.map((quote) => {
                const pair = currencyPairs.find(p => p.id === quote.currencyPairId);
                if (!pair) return null;

                const isExpired = quote.expiresAt && new Date(quote.expiresAt) <= new Date();

                return (
                  <div
                    key={quote.id}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all",
                      quote.status === "CONFIRMED"
                        ? "border-green-300 bg-green-50"
                        : quote.status === "QUOTE_READY"
                          ? "border-blue-300 bg-blue-50"
                          : isExpired
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200 bg-gray-50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-gray-800">
                            {pair.symbol} {quote.direction === "BUY_SELL_USD" ? "Buy&Sell" : "Sell&Buy"}
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-bold",
                            quote.status === "CONFIRMED"
                              ? "bg-green-600 text-white"
                              : quote.status === "QUOTE_READY"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-500 text-white"
                          )}>
                            {quote.status === "CONFIRMED" ? "체결완료" : quote.status === "QUOTE_READY" ? "승인됨" : "요청중"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          주문번호: {quote.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Near Date:</span>
                        <span className="font-medium text-gray-800">
                          {quote.nearDate ? format(new Date(quote.nearDate), "yyyy-MM-dd") : "--"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Far Date:</span>
                        <span className="font-medium text-gray-800">
                          {quote.farDate ? format(new Date(quote.farDate), "yyyy-MM-dd") : "--"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Near Amount:</span>
                        <span className="font-medium text-gray-800">
                          {quote.amountCurrency || "USD"}{" "}
                          {formatCurrencyAmount(
                            parseFloat(quote.nearAmount || "0"),
                            quote.amountCurrency || "USD"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Far Amount:</span>
                        <span className="font-medium text-gray-800">
                          {quote.amountCurrency || "USD"}{" "}
                          {formatCurrencyAmount(
                            parseFloat(quote.farAmount || "0"),
                            quote.amountCurrency || "USD"
                          )}
                        </span>
                      </div>

                      {/* Show Swap Points for QUOTE_READY or CONFIRMED */}
                      {(quote.status === "QUOTE_READY" || quote.status === "CONFIRMED") && quote.quotedRate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{quote.status === "CONFIRMED" ? "체결 포인트:" : "스왑 포인트:"}</span>
                          <span className={cn(
                            "font-medium",
                            quote.status === "CONFIRMED" ? "text-green-600" : "text-blue-600"
                          )}>
                            {parseFloat(quote.quotedRate) >= 0 ? '+' : ''}{parseFloat(quote.quotedRate).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Execute Trade Button for QUOTE_READY */}
                    {quote.status === "QUOTE_READY" && !isExpired && (
                      <Button
                        onClick={() => handleTradeExecution(quote)}
                        disabled={tradeExecutionMutation.isPending}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid={`button-execute-trade-${quote.id}`}
                      >
                        {tradeExecutionMutation.isPending ? "처리 중..." : "거래 요청"}
                      </Button>
                    )}

                    {isExpired && quote.status === "QUOTE_READY" && (
                      <div className="text-xs text-red-600 font-medium mt-2">
                        유효기간 만료
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
