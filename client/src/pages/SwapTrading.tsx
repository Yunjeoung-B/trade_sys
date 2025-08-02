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
import type { CurrencyPair } from "@shared/schema";

export default function SwapTrading() {
  const [selectedPair, setSelectedPair] = useState("USD/KRW");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [nearDate, setNearDate] = useState<Date>(new Date());
  const [farDate, setFarDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState("");
  const { toast } = useToast();

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
        title: "스왑 견적 요청 성공",
        description: "외환스왑 견적 요청이 제출되었습니다. 승인을 기다려주세요.",
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

  const buyRate = currentRate ? Number(currentRate.buyRate) : 1392.00;
  const sellRate = currentRate ? Number(currentRate.sellRate) : 1390.40;

  const handleSwapRequest = () => {
    if (!selectedPairData || !amount) {
      toast({
        title: "입력 오류",
        description: "통화쌍과 거래금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      productType: "Swap",
      currencyPairId: selectedPairData.id,
      direction,
      amount: parseFloat(amount),
      nearDate,
      farDate,
      nearRate: direction === "BUY" ? buyRate : sellRate,
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
              <div className="flex items-center mb-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">외환스왑</div>
                  <div className="grid grid-cols-1 gap-2">
                    {currencyPairs.map((pair) => (
                      <Button 
                        key={pair.id}
                        variant="outline"
                        className={cn(
                          "rounded-xl transition-all duration-200",
                          selectedPair === pair.symbol 
                            ? "bg-teal-400 border-teal-500 text-white shadow-inner" 
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        )}
                        onClick={() => setSelectedPair(pair.symbol)}
                      >
                        {pair.symbol}
                      </Button>
                    ))}
                  </div>
                </div>
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "mt-2 w-full rounded-xl transition-all duration-200",
                        direction === "SELL" 
                          ? "bg-teal-400 border-teal-500 text-white shadow-inner" 
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                      onClick={() => setDirection("SELL")}
                    >
                      SELL
                    </Button>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">BUY {baseCurrency}</div>
                    <div className="text-2xl font-bold text-red-500">
                      {buyRate.toFixed(2).split('.')[0]}.
                      <span className="text-lg">{buyRate.toFixed(2).split('.')[1]}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "mt-2 w-full rounded-xl transition-all duration-200",
                        direction === "BUY" 
                          ? "bg-pink-400 border-pink-500 text-white shadow-inner" 
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                      onClick={() => setDirection("BUY")}
                    >
                      BUY
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3: 만기일 설정 */}
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
                              "w-full justify-start text-left font-normal text-xs",
                              !nearDate && "text-muted-foreground"
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
                              "w-full justify-start text-left font-normal text-xs",
                              !farDate && "text-muted-foreground"
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

              {/* Step 4: Amount input */}
              <div className="flex items-center mb-6">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">금액</div>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-right text-lg bg-gray-50/50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-2xl mb-6 shadow-inner">
                <div className="text-sm text-gray-700 mb-2">Swap {direction} 거래</div>
                <div className="text-sm text-gray-600 mb-1">
                  거래금액: {amount || "0"} {baseCurrency}
                </div>
                <div className="text-sm text-gray-600">
                  Near Leg: {nearDate ? format(nearDate, "yyyy-MM-dd") : "미선택"}
                </div>
                <div className="text-sm text-gray-600">
                  Far Leg: {farDate ? format(farDate, "yyyy-MM-dd") : "미선택"}
                </div>
              </div>

              {/* Step 5: Submit button */}
              <Button 
                onClick={handleSwapRequest}
                disabled={mutation.isPending}
                className="w-full py-4 text-lg font-semibold rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {mutation.isPending ? "처리 중..." : "견적 요청"}
              </Button>
            </Card>
      </div>
    </div>
  );
}