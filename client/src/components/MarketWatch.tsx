import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MarketRate {
  id: string;
  currencyPairId: string;
  buyRate: string;
  sellRate: string;
  timestamp: string;
}

interface CurrencyPair {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
}

export default function MarketWatch() {
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [changes, setChanges] = useState<Record<string, number>>({});

  const { data: currencyPairs } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const { data: marketRates } = useQuery<MarketRate[]>({
    queryKey: ["/api/market-rates"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (marketRates) {
      // Calculate changes
      const newChanges: Record<string, number> = {};
      marketRates.forEach((newRate) => {
        const oldRate = rates.find(r => r.currencyPairId === newRate.currencyPairId);
        if (oldRate) {
          const oldPrice = parseFloat(oldRate.buyRate);
          const newPrice = parseFloat(newRate.buyRate);
          newChanges[newRate.currencyPairId] = newPrice - oldPrice;
        }
      });
      setChanges(newChanges);
      setRates(marketRates);
    }
  }, [marketRates]);

  useEffect(() => {
    // WebSocket connection for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "market_rates") {
        // Update rates through WebSocket if needed
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const getPairSymbol = (pairId: string) => {
    const pair = currencyPairs?.find(p => p.id === pairId);
    return pair?.symbol || "";
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>마켓워치</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-sm text-gray-500 border-b">
                <th className="text-left py-2">통화쌍</th>
                <th className="text-right py-2">BUY</th>
                <th className="text-right py-2">SELL</th>
                <th className="text-right py-2">변동</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => {
                const change = changes[rate.currencyPairId] || 0;
                return (
                  <tr 
                    key={rate.id} 
                    className="market-row border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 font-medium">
                      {getPairSymbol(rate.currencyPairId)}
                    </td>
                    <td className="text-right price-up">
                      {parseFloat(rate.buyRate).toLocaleString('ko-KR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="text-right price-down">
                      {parseFloat(rate.sellRate).toLocaleString('ko-KR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className={`text-right ${getChangeColor(change)}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {(!rates || rates.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    마켓 데이터를 불러오는 중...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
