import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import type { CurrencyPair } from "@shared/schema";

export default function ExchangeRates() {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const { data: currencyPairs = [], refetch: refetchPairs } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const { data: marketRates = [], refetch: refetchRates } = useQuery<any[]>({
    queryKey: ["/api/market-rates"],
    refetchInterval: 5000, // 5초마다 자동 업데이트
  });

  // 자동 업데이트 시간 표시
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    refetchPairs();
    refetchRates();
    setLastUpdate(new Date());
  };

  // 환율 변동 방향 계산 (실제로는 이전 값과 비교 필요)
  const getTrendIcon = (current: number, previous: number = current - 0.1) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">환율조회</h2>
            <p className="text-slate-300">실시간 환율 정보를 확인하세요.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-slate-300">
              <Clock className="w-4 h-4 mr-2" />
              <span>마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="border-slate-600 text-slate-300">
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
          </div>
        </div>
      </div>

          {/* 주요 환율 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {marketRates.slice(0, 4).map((rate: any, index) => {
              const pair = currencyPairs.find(p => p.id === rate.currencyPairId);
              if (!pair) return null;
              
              const buyRate = Number(rate.buyRate);
              const sellRate = Number(rate.sellRate);
              const midRate = (buyRate + sellRate) / 2;
              
              return (
                <Card key={rate.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg text-white">{pair.symbol}</span>
                      {getTrendIcon(midRate)}
                    </div>
                    <div className="text-2xl font-bold text-teal-400 mb-1">
                      {midRate.toFixed(2)}
                    </div>
                    <div className="text-sm text-slate-400">
                      스프레드: {(buyRate - sellRate).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 상세 환율 정보 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {currencyPairs.map((pair) => {
              const rate = marketRates.find((r: any) => r.currencyPairId === pair.id);
              const buyRate = rate ? Number(rate.buyRate) : 0;
              const sellRate = rate ? Number(rate.sellRate) : 0;
              const spread = buyRate - sellRate;
              const spreadPercent = sellRate > 0 ? (spread / sellRate) * 100 : 0;
              const midRate = (buyRate + sellRate) / 2;

              // 상태 결정
              const getStatusBadge = () => {
                if (!rate) return <Badge variant="destructive">오프라인</Badge>;
                if (spreadPercent > 1) return <Badge variant="destructive">높은 스프레드</Badge>;
                if (spreadPercent > 0.5) return <Badge variant="secondary">보통</Badge>;
                return <Badge className="bg-green-500 text-white">활성</Badge>;
              };

              return (
                <Card key={pair.id} className="bg-slate-800 border-slate-700 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white">
                        <div className="flex items-center space-x-2">
                          <span>{pair.symbol}</span>
                          {getTrendIcon(midRate)}
                        </div>
                      </CardTitle>
                      {getStatusBadge()}
                    </div>
                    <div className="text-sm text-slate-400">
                      {pair.baseCurrency} → {pair.quoteCurrency}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 환율 정보 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-red-900/20 rounded-lg border border-red-800">
                        <div className="text-sm text-slate-400 mb-1">매수가 (BUY)</div>
                        <div className="text-xl font-bold text-red-400">{buyRate.toFixed(2)}</div>
                      </div>
                      <div className="text-center p-3 bg-blue-900/20 rounded-lg border border-blue-800">
                        <div className="text-sm text-slate-400 mb-1">매도가 (SELL)</div>
                        <div className="text-xl font-bold text-blue-400">{sellRate.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* 중간값 및 스프레드 */}
                    <div className="p-3 bg-slate-700 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">중간가</span>
                        <span className="font-semibold text-lg text-white">{midRate.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">스프레드</span>
                        <div className="text-right">
                          <div className="font-semibold text-white">{spread.toFixed(2)}</div>
                          <div className="text-xs text-slate-400">({spreadPercent.toFixed(3)}%)</div>
                        </div>
                      </div>
                    </div>

                    {/* 업데이트 정보 */}
                    <div className="text-xs text-slate-400 text-center pt-2 border-t border-slate-700">
                      {rate ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Activity className="w-3 h-3" />
                          <span>업데이트: {new Date(rate.updatedAt).toLocaleString('ko-KR')}</span>
                        </div>
                      ) : (
                        <span className="text-red-400">데이터 없음</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

      {/* 하단 정보 */}
      <div className="mt-8 p-4 bg-blue-900/20 rounded-lg border border-blue-800">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-white">환율 정보</span>
            <span className="text-slate-400">• 5초마다 자동 업데이트</span>
            <span className="text-slate-400">• 실시간 시세 반영</span>
          </div>
          <div className="text-slate-400">
            총 {currencyPairs.length}개 통화쌍
          </div>
        </div>
      </div>
    </div>
  );
}
