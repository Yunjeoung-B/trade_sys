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
    <div className="min-h-screen bg-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">외환스왑</h2>
            <p className="text-slate-300">Near Leg와 Far Leg 두 개의 거래일에 BUY/SELL 방향으로 거래하는 스왑 상품입니다.</p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="p-6 bg-white dark:bg-white text-gray-900">
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
                      className="mt-2 w-full"
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
                    <Button 
                      size="sm" 
                      className="mt-2 w-full text-white"
                      style={{ backgroundColor: 'hsl(330, 100%, 71%)' }}
                      onClick={() => setDirection("BUY")}
                    >
                      BUY선택
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
                    className="text-right text-lg"
                  />
                </div>
              </div>

              {/* Step 5: Submit button */}
              <div className="flex items-center">
                <Button 
                  onClick={handleSwapRequest}
                  disabled={mutation.isPending}
                  className="w-full text-white"
                  style={{ backgroundColor: 'hsl(330, 100%, 71%)' }}
                  size="lg"
                >
                  {mutation.isPending ? "처리 중..." : "견적 요청"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}