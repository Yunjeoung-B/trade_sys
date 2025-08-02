import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Chart from "@/components/Chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CurrencyPair {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
}

export default function ExchangeRates() {
  const [selectedPairId, setSelectedPairId] = useState<string>("");

  const { data: currencyPairs } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  // Set default selected pair when data loads
  if (currencyPairs && currencyPairs.length > 0 && !selectedPairId) {
    setSelectedPairId(currencyPairs[0].id);
  }

  const selectedPair = currencyPairs?.find(pair => pair.id === selectedPairId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">환율조회</h2>
            <p className="text-gray-600">실시간 환율 정보와 차트를 확인할 수 있습니다.</p>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>통화 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currencyPairs?.map((pair) => (
                    <Button
                      key={pair.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-left px-4 py-3 rounded-lg transition-colors",
                        "hover:bg-teal-50 hover:text-teal-600",
                        selectedPairId === pair.id && "bg-teal-50 text-teal-600"
                      )}
                      onClick={() => setSelectedPairId(pair.id)}
                    >
                      {pair.symbol}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <div className="xl:col-span-3">
              <Chart 
                currencyPairId={selectedPairId} 
                symbol={selectedPair?.symbol}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
