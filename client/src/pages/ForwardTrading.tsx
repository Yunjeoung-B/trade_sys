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

export default function ForwardTrading() {
  const [selectedPair, setSelectedPair] = useState("USD/KRW");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
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

  const buyRate = currentRate ? Number(currentRate.buyRate) : 1394.55;
  const sellRate = currentRate ? Number(currentRate.sellRate) : 1382.95;

  const handleQuoteRequest = () => {
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
      amount: parseFloat(amount),
      tenor: "1M",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">선물환</h2>
            <p className="text-muted-foreground">미래 날짜의 환율을 미리 확정하는 거래입니다.</p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="p-6 bg-white dark:bg-white text-gray-900">
              {/* Step 1: 선물환 */}
              <div className="flex items-center mb-4">
                <span className="text-sm text-gray-600">선물환</span>
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

              </div>

              {/* Step 3: Rate display */}
              <div className="flex items-center mb-6">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">SELL {baseCurrency}</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {sellRate.toFixed(0)}.
                      <span className="text-lg">{sellRate.toFixed(2).split('.')[1] || '95'}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {(sellRate - 2).toFixed(2)} / {(sellRate + 2).toFixed(2)}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn("mt-2 w-full", direction === "SELL" && "border-blue-500 bg-blue-50")}
                      onClick={() => setDirection("SELL")}
                    >
                      SELL선택
                    </Button>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">BUY {baseCurrency}</div>
                    <div className="text-2xl font-bold text-red-500">
                      {buyRate.toFixed(0)}.
                      <span className="text-lg">{buyRate.toFixed(2).split('.')[1] || '55'}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {(buyRate - 2).toFixed(2)} / {(buyRate + 2).toFixed(2)}
                    </div>
                    <Button 
                      size="sm" 
                      className={cn(
                        "mt-2 w-full",
                        direction === "BUY" 
                          ? "text-white" 
                          : "text-white"
                      )}
                      style={{ backgroundColor: 'hsl(330, 100%, 71%)' }}
                      onClick={() => setDirection("BUY")}
                    >
                      BUY선택
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 4: Order type buttons */}
              <div className="flex items-center mb-4">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Button 
                    variant="default"
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    시장가
                  </Button>
                  <span className="text-sm text-gray-400 self-center text-center">지정가</span>
                </div>
              </div>

              {/* Step 5: Value date */}
              <div className="flex items-center mb-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">만기일</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !valueDate && "text-muted-foreground"
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

              {/* Step 6: Amount section */}
              <div className="flex items-start mb-6">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">주문완료</div>
                  <div className="text-right text-gray-400 text-sm mb-1">{sellCurrency}</div>
                  <div className="text-sm text-gray-600 mb-2">금액</div>
                  <div className="text-sm text-gray-600 mb-1">{direction} {buyCurrency}</div>
                  <div className="flex items-center mb-2">
                    <span className="text-lg font-semibold text-green-600">+1M</span>
                    <span className="ml-auto text-lg font-semibold text-green-600">+0.1M</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">원화전환</div>
                  <div className="text-xs text-gray-500 mb-2">USD KRW</div>
                  <div className="flex items-center">
                    <span className="text-sm">SELL {sellCurrency} ℹ️</span>
                    <span className="ml-auto text-lg">0 {sellCurrency}</span>
                  </div>
                  
                  <Input
                    type="number"
                    placeholder="거래금액을 입력하세요"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-3 text-right text-lg"
                  />
                </div>
              </div>

              {/* Step 7: Final step indicator */}
              <div className="flex justify-center mb-4">
              </div>

              <Button
                onClick={handleQuoteRequest}
                disabled={mutation.isPending || !amount}
                className="w-full text-white py-3 text-lg font-semibold"
                style={{ backgroundColor: 'hsl(330, 100%, 71%)' }}
              >
                {mutation.isPending ? "처리중..." : "견적 요청"}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}