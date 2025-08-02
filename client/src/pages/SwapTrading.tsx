import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
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
  const [swapType, setSwapType] = useState("외환스왑");
  const [nearDate, setNearDate] = useState<Date>(new Date());
  const [farDate, setFarDate] = useState<Date>(new Date());
  const [nearAmount, setNearAmount] = useState("");
  const [farAmount, setFarAmount] = useState("");
  const { toast } = useToast();
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
      setNearAmount("");
      setFarAmount("");
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
  const swapPoints = -7.45; // BUY&SELL USD 스프레드
  const buySellSpread = 2.55; // SELL&BUY USD 스프레드

  const handleSwapRequest = () => {
    if (!selectedPairData || !nearAmount) {
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
      direction: "BUY",
      amount: parseFloat(nearAmount),
      nearDate,
      farDate,
      nearRate: sellRate,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">외환스왑</h2>
            <p className="text-muted-foreground">두 개의 거래일에 서로 다른 방향으로 거래하는 스왑 상품입니다.</p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="p-6">
              {/* Step 1: 외환스왑 */}
              <div className="flex items-center mb-4">
                <div className="text-xs text-muted-foreground mr-3">1</div>
                <Select value={swapType} onValueChange={setSwapType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="외환스왑">외환스왑</SelectItem>
                  </SelectContent>
                </Select>
                <div className="ml-auto">
                  <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyPairs.map((pair) => (
                        <SelectItem key={pair.id} value={pair.symbol}>
                          🇺🇸 {pair.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground ml-4">
                  2
                </div>
              </div>

              {/* Step 3: Rate display - 스왑 포인트 */}
              <div className="flex items-center mb-6">
                <div className="text-xs text-muted-foreground mr-4">3</div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">BUY&SELL USD</div>
                    <div className="text-xl font-bold text-blue-600">
                      {sellRate.toFixed(2)}
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {swapPoints.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(sellRate + swapPoints).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">B&S선택</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">SELL&BUY USD</div>
                    <div className="text-xl font-bold text-red-500">
                      {buyRate.toFixed(2)}
                    </div>
                    <div className="text-lg font-bold text-red-500">
                      {buySellSpread.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(buyRate + buySellSpread).toFixed(2)}
                    </div>
                    <Button 
                      size="sm" 
                      className="mt-2 w-full text-white"
                      style={{ backgroundColor: 'hsl(330, 100%, 71%)' }}
                    >
                      S&B선택
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 4: 만기일 설정 */}
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4">
                  4
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">만기일</div>
                  <div className="text-lg font-medium text-right">33D</div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">NEAR</div>
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
                      <div className="text-sm text-gray-600 mb-1">FAR</div>
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

              {/* 스왑 포인트/잔존 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>스왓포인트/잔존</span>
                  <span>체소리</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">스왑 유입 (시간가)</div>
                <div className="flex justify-between">
                  <span>킬손 NEAR</span>
                  <span className="font-medium">{buyRate.toFixed(2)}</span>
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-xs ml-2">
                    5
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>킬손 FAR</span>
                  <span className="font-medium">{(buyRate + buySellSpread).toFixed(2)}</span>
                </div>
              </div>

              {/* Step 6: Amount inputs */}
              <div className="flex items-start mb-6">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4">
                  6
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">금액</div>
                  <div className="text-xs text-gray-500 mb-2">6KRW</div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">SELL USD</div>
                      <div className="text-sm text-gray-600 mb-1">NEAR</div>
                      <div className="flex items-center">
                        <span className="text-sm">BUY KRW</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={nearAmount}
                          onChange={(e) => setNearAmount(e.target.value)}
                          className="ml-auto w-20 text-right text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 mb-1">BUY USD</div>
                      <div className="text-sm text-gray-600 mb-1">FAR</div>
                      <div className="flex items-center">
                        <span className="text-sm">SELL KRW</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={farAmount}
                          onChange={(e) => setFarAmount(e.target.value)}
                          className="ml-auto w-20 text-right text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 7: Final step indicator */}
              <div className="flex justify-center mb-4">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  7
                </div>
              </div>

              <Button
                onClick={handleSwapRequest}
                disabled={mutation.isPending || !nearAmount}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-lg font-semibold"
              >
                {mutation.isPending ? "처리중..." : "스왑 견적 요청"}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}