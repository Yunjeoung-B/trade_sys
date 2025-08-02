import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
import { formatCurrencyAmount, formatInputValue, removeThousandSeparator } from "@/lib/currencyUtils";
import type { CurrencyPair } from "@shared/schema";


export default function SwapTrading() {
  const [selectedPair, setSelectedPair] = useState("USD/KRW");
  const [direction, setDirection] = useState<"BUY_SELL_USD" | "SELL_BUY_USD">("BUY_SELL_USD");
  const [nearDate, setNearDate] = useState<Date>(new Date());
  const [farDate, setFarDate] = useState<Date>(new Date());
  const [nearAmount, setNearAmount] = useState("");
  const [farAmount, setFarAmount] = useState("");
  const [nearAmountCurrency, setNearAmountCurrency] = useState<"USD" | "KRW">("USD");
  const [farAmountCurrency, setFarAmountCurrency] = useState<"USD" | "KRW">("USD");
  // 관리자 가격 제공 시뮬레이션
  const [adminPriceProvided, setAdminPriceProvided] = useState(false);
  const { toast } = useToast();

  // 관리자 가격 제공 시 고정값들 설정
  const fixedNearAmount = "100,000";
  const fixedFarAmount = "100,000"; 
  const fixedNearDate = new Date("2024-08-15");
  const fixedFarDate = new Date("2024-09-15");

  // Extract base and quote currencies from selected pair
  const [baseCurrency, quoteCurrency] = selectedPair.split('/');
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
        title: "스왑 가격 요청 성공",
        description: "외환스왑 가격 요청이 제출되었습니다. 승인을 기다려주세요.",
      });
      setNearAmount("");
      setFarAmount("");
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

  const selectedPairData = currencyPairs.find(p => p.symbol === selectedPair);
  const currentRate = marketRates.find((r: any) => r.currencyPairId === selectedPairData?.id);

  const buyRate = currentRate ? Number(currentRate.buyRate) : 1392.00;
  const sellRate = currentRate ? Number(currentRate.sellRate) : 1390.40;
  
  // 관리자 제공 가격 (시뮬레이션)
  const swapPoints = adminPriceProvided ? 14 : null;
  const nearRate = adminPriceProvided ? 1390.85 : null;
  const farRate = adminPriceProvided ? (nearRate ? nearRate + swapPoints : null) : null;

  const handleSwapRequest = () => {
    if (!selectedPairData || !nearAmount || !farAmount) {
      toast({
        title: "입력 오류",
        description: "통화쌍과 NEAR/FAR 거래금액을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      productType: "Swap",
      currencyPairId: selectedPairData.id,
      direction,
      nearAmount: parseFloat(removeThousandSeparator(nearAmount)),
      farAmount: parseFloat(removeThousandSeparator(farAmount)),
      nearDate,
      farDate,
      nearRate: direction === "BUY_SELL_USD" ? buyRate : sellRate,
    });
  };

  return (
    <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">FX SWAP</h2>
            <p className="text-slate-200">Near Leg와 Far Leg 두 개의 거래일에 BUY/SELL 방향으로 거래하는 스왑 상품입니다.</p>
          </div>
          <div className="max-w-md mx-auto">
            <Card className="p-8 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-0 text-gray-900">
              {/* Step 1: 통화쌍 선택 */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">외환스왑</span>
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

              {/* Step 2: Quote Request Display OR Admin Price Display */}
              <div className="flex items-center mb-6">
                <div className="flex-1 text-center">
                  {!adminPriceProvided ? (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl shadow-inner">
                      <div className="text-lg font-semibold text-gray-700 mb-2">SWAP 가격 요청</div>
                      <div className="text-sm text-gray-600 mb-3">
                        SWAP 거래를 위해서는 CHOIICE FX에 가격을 요청해야 합니다.
                      </div>
                      
                      {/* Direction Selection */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <Button 
                          variant="outline"
                          className={cn(
                            "rounded-xl transition-all duration-200 text-xs px-2 py-3",
                            direction === "BUY_SELL_USD" 
                              ? "bg-teal-400 border-2 border-teal-600 text-white shadow-inner ring-2 ring-teal-300" 
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          )}
                          onClick={() => setDirection("BUY_SELL_USD")}
                        >
                          BUY&SELL USD
                        </Button>
                        <Button 
                          variant="outline"
                          className={cn(
                            "rounded-xl transition-all duration-200 text-xs px-2 py-3",
                            direction === "SELL_BUY_USD" 
                              ? "bg-teal-400 border-2 border-teal-600 text-white shadow-inner ring-2 ring-teal-300" 
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          )}
                          onClick={() => setDirection("SELL_BUY_USD")}
                        >
                          SELL&BUY USD
                        </Button>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        관리자 승인 후 거래 가능한 환율이 제공됩니다.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Show selected direction - BUY&SELL on left, SELL&BUY on right */}
                      {direction === "BUY_SELL_USD" ? (
                        <>
                          <div className="bg-teal-400 text-white p-4 rounded-2xl">
                            <div className="border-2 border-white rounded-lg px-3 py-1 mb-3 text-center">
                              <div className="text-lg font-bold">BUY&SELL USD</div>
                            </div>
                            <div className="text-2xl font-bold">1,390.40</div>
                            <div className="text-4xl font-bold my-2">14</div>
                            <div className="text-lg">1,382.95</div>
                            <div className="bg-teal-600 px-3 py-1 rounded-lg text-sm mt-2">매수 1.0%</div>
                          </div>
                          <div></div> {/* Empty space for the second column */}
                        </>
                      ) : (
                        <>
                          <div></div> {/* Empty space for the first column */}
                          <div className="bg-red-400 text-white p-4 rounded-2xl">
                            <div className="border-2 border-white rounded-lg px-3 py-1 mb-3 text-center">
                              <div className="text-lg font-bold">SELL&BUY USD</div>
                            </div>
                            <div className="text-2xl font-bold">1,392.00</div>
                            <div className="text-4xl font-bold my-2">14</div>
                            <div className="text-lg">1,394.55</div>
                            <div className="bg-red-600 px-3 py-1 rounded-lg text-sm mt-2">매도 1.0%</div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: 만기일 설정 */}
              {!adminPriceProvided && (
                <div className="flex items-center mb-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-2">만기일</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Near Leg</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal text-xs bg-white border-gray-300 text-gray-900",
                                !nearDate && "text-gray-500"
                              )}
                            >
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {nearDate ? format(nearDate, "yyyy MM dd") : "선택"}
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
                        <div className="text-sm text-gray-600 mb-1">Far Leg</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal text-xs bg-white border-gray-300 text-gray-900",
                                !farDate && "text-gray-500"
                              )}
                            >
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {farDate ? format(farDate, "yyyy MM dd") : "선택"}
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
                  </div>
                </div>
              )}

              {/* Step 4: Amount input - NEAR and FAR */}
              {!adminPriceProvided && (
                <div className="flex items-center mb-6">
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 font-medium mb-2">스왑포인트/환율</div>
                    <div className="text-xs text-gray-500 mb-3">관리자 승인 후 재조회</div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">NEAR</div>
                        <div className="grid grid-cols-2 gap-1 mb-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            className={cn(
                              "rounded-xl transition-all duration-200 text-xs",
                              nearAmountCurrency === "USD" 
                                ? "bg-teal-400 border-2 border-teal-600 text-white shadow-inner ring-2 ring-teal-300" 
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                            )}
                            onClick={() => setNearAmountCurrency("USD")}
                          >
                            USD
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            className={cn(
                              "rounded-xl transition-all duration-200 text-xs",
                              nearAmountCurrency === "KRW" 
                                ? "bg-teal-400 border-2 border-teal-600 text-white shadow-inner ring-2 ring-teal-300" 
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                            )}
                            onClick={() => setNearAmountCurrency("KRW")}
                          >
                            KRW
                          </Button>
                        </div>
                        <Input
                          type="text"
                          placeholder="NEAR 금액 입력"
                          value={nearAmount}
                          onChange={(e) => {
                            const formattedValue = formatInputValue(e.target.value, nearAmountCurrency);
                            setNearAmount(formattedValue);
                          }}
                          className="text-right text-lg bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {direction === "BUY_SELL_USD" ? "SELL USD" : "BUY USD"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {direction === "BUY_SELL_USD" ? "BUY KRW" : "SELL KRW"}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600 mb-2">FAR</div>
                        <div className="grid grid-cols-2 gap-1 mb-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            className={cn(
                              "rounded-xl transition-all duration-200 text-xs",
                              farAmountCurrency === "USD" 
                                ? "bg-teal-400 border-2 border-teal-600 text-white shadow-inner ring-2 ring-teal-300" 
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                            )}
                            onClick={() => setFarAmountCurrency("USD")}
                          >
                            USD
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            className={cn(
                              "rounded-xl transition-all duration-200 text-xs",
                              farAmountCurrency === "KRW" 
                                ? "bg-teal-400 border-2 border-teal-600 text-white shadow-inner ring-2 ring-teal-300" 
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                            )}
                            onClick={() => setFarAmountCurrency("KRW")}
                          >
                            KRW
                          </Button>
                        </div>
                        <Input
                          type="text"
                          placeholder="FAR 금액 입력"
                          value={farAmount}
                          onChange={(e) => {
                            const formattedValue = formatInputValue(e.target.value, farAmountCurrency);
                            setFarAmount(formattedValue);
                          }}
                          className="text-right text-lg bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {direction === "BUY_SELL_USD" ? "BUY USD" : "SELL USD"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {direction === "BUY_SELL_USD" ? "SELL KRW" : "BUY KRW"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Card */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-2xl mb-6 shadow-inner">
                <div className="text-sm text-gray-700 mb-2">외환스왑 {direction === "BUY_SELL_USD" ? "BUY&SELL USD" : "SELL&BUY USD"} 거래</div>
                
                {adminPriceProvided ? (
                  <>
                    {/* 관리자 가격 제공 후 고정된 정보 표시 */}
                    {direction === "BUY_SELL_USD" ? (
                      <>
                        <div className="text-sm text-gray-600 mb-1">
                          NEAR SELL: USD {formatCurrencyAmount(parseFloat(removeThousandSeparator(fixedNearAmount)), "USD")}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          NEAR BUY: KRW {formatCurrencyAmount(parseFloat(removeThousandSeparator(fixedNearAmount)) * nearRate!, "KRW")}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          NEAR 거래환율: {nearRate?.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          NEAR 결제일: {format(fixedNearDate, "yyyy-MM-dd")}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          FAR BUY: USD {formatCurrencyAmount(parseFloat(removeThousandSeparator(fixedFarAmount)), "USD")}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          FAR SELL: KRW {formatCurrencyAmount(parseFloat(removeThousandSeparator(fixedFarAmount)) * farRate!, "KRW")}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          FAR 거래환율: {farRate?.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          FAR 결제일: {format(fixedFarDate, "yyyy-MM-dd")}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-gray-600 mb-1">
                          NEAR BUY: USD {formatCurrencyAmount(parseFloat(removeThousandSeparator(fixedNearAmount)), "USD")}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          NEAR SELL: KRW {formatCurrencyAmount(parseFloat(removeThousandSeparator(fixedNearAmount)) * nearRate!, "KRW")}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          NEAR 거래환율: {nearRate?.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          NEAR 결제일: {format(fixedNearDate, "yyyy-MM-dd")}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          FAR SELL: USD {formatCurrencyAmount(parseFloat(removeThousandSeparator(fixedFarAmount)), "USD")}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          FAR BUY: KRW {formatCurrencyAmount(parseFloat(removeThousandSeparator(fixedFarAmount)) * farRate!, "KRW")}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          FAR 거래환율: {farRate?.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          FAR 결제일: {format(fixedFarDate, "yyyy-MM-dd")}
                        </div>
                      </>
                    )}
                    <div className="text-sm text-blue-600 font-medium mt-2 pt-2 border-t border-gray-200">
                      스왑포인트: {swapPoints} 포인트 ({direction === "BUY_SELL_USD" ? "유리" : "불리"})
                    </div>
                  </>
                ) : (
                  <>
                    {/* 가격 요청 전 상태 */}
                    <div className="text-sm text-gray-600 mb-1">
                      NEAR SELL: USD {nearAmountCurrency === "USD" && nearAmount ? 
                        formatCurrencyAmount(parseFloat(removeThousandSeparator(nearAmount)), "USD") : "미입력"}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      NEAR BUY: KRW {nearAmountCurrency === "KRW" && nearAmount ? 
                        formatCurrencyAmount(parseFloat(removeThousandSeparator(nearAmount)), "KRW") : "미입력"}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      NEAR 거래환율: 관리자 가격 제공 후 확정
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      NEAR 결제일: {nearDate ? format(nearDate, "yyyy-MM-dd") : "미선택"}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      FAR BUY: USD {farAmountCurrency === "USD" && farAmount ? 
                        formatCurrencyAmount(parseFloat(removeThousandSeparator(farAmount)), "USD") : "미입력"}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      FAR SELL: KRW {farAmountCurrency === "KRW" && farAmount ? 
                        formatCurrencyAmount(parseFloat(removeThousandSeparator(farAmount)), "KRW") : "미입력"}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      FAR 거래환율: 관리자 가격 제공 후 확정
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      FAR 결제일: {farDate ? format(farDate, "yyyy-MM-dd") : "미선택"}
                    </div>
                  </>
                )}
              </div>

              {/* Step 5: Submit button */}
              <div className="space-y-3">
                {!adminPriceProvided ? (
                  <>
                    <Button 
                      onClick={handleSwapRequest}
                      disabled={mutation.isPending}
                      className="w-full py-4 text-lg font-semibold rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                      style={{
                        backgroundColor: '#14B8A6',
                        boxShadow: '0 0 15px rgba(20, 184, 166, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                      }}
                    >
                      {mutation.isPending ? "처리 중..." : "가격 요청"}
                    </Button>
                    <Button 
                      onClick={() => setAdminPriceProvided(true)}
                      variant="outline"
                      className="w-full py-2 text-sm rounded-xl border-dashed border-gray-400 text-gray-600 hover:bg-gray-50"
                    >
                      [데모] 관리자 가격 제공 시뮬레이션
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={() => {
                        toast({
                          title: "외환스왑 거래 체결",
                          description: "스왑 거래가 성공적으로 체결되었습니다.",
                        });
                      }}
                      className="w-full py-4 text-lg font-semibold rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      style={{ 
                        backgroundColor: direction === "BUY_SELL_USD" ? '#FF6B6B' : '#4169E1',
                        boxShadow: direction === "BUY_SELL_USD" 
                          ? '0 0 15px rgba(255, 107, 107, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)' 
                          : '0 0 15px rgba(65, 105, 225, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                      }}
                    >
                      거래 체결
                    </Button>
                    <Button 
                      onClick={() => setAdminPriceProvided(false)}
                      variant="outline"
                      className="w-full py-2 text-sm rounded-xl border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      가격 요청 상태로 돌아가기
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </div>
    </div>
  );
}