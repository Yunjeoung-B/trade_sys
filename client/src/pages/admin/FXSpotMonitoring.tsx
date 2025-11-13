import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowUp, ArrowDown, Minus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarketRate {
  id: string;
  currencyPairId: string;
  buyRate: string;
  sellRate: string;
  source: string;
  timestamp: string;
  updatedAt: string;
}

interface CurrencyPair {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  isActive: boolean;
}

export default function FXSpotMonitoring() {
  const { data: marketRates, isLoading, refetch } = useQuery<MarketRate[]>({
    queryKey: ["/api/market-rates"],
    refetchInterval: 5000,
  });

  const { data: currencyPairs } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const infomaxRates = marketRates?.filter(rate => rate.source === "infomax") || [];

  const getCurrencyPair = (currencyPairId: string) => {
    return currencyPairs?.find(pair => pair.id === currencyPairId);
  };

  const formatRate = (rate: string) => {
    return parseFloat(rate).toFixed(2);
  };

  const getSpread = (buyRate: string, sellRate: string) => {
    const spread = parseFloat(buyRate) - parseFloat(sellRate);
    return spread.toFixed(2);
  };

  const getMidRate = (buyRate: string, sellRate: string) => {
    const mid = (parseFloat(buyRate) + parseFloat(sellRate)) / 2;
    return mid.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">가격 모니터링 (FX SPOT)</h1>
            <p className="text-slate-300">
              실시간 환율로 즉시 거래가 가능합니다
            </p>
          </div>
          <Button
            data-testid="button-refresh-rates"
            onClick={() => refetch()}
            variant="outline"
            className="bg-white/5 hover:bg-white/10 text-white border-white/20"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>

        <Separator className="bg-white/10" />

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : infomaxRates.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
            <CardContent className="p-12 text-center">
              <div className="text-slate-400 text-lg">
                Infomax API 데이터를 가져오는 중입니다...
              </div>
              <div className="text-slate-500 text-sm mt-2">
                데이터가 표시되지 않는 경우 API 키가 올바르게 설정되었는지 확인하세요.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {infomaxRates.map((rate) => {
              const pair = getCurrencyPair(rate.currencyPairId);
              if (!pair) return null;

              const buyRate = parseFloat(rate.buyRate);
              const sellRate = parseFloat(rate.sellRate);
              const spread = buyRate - sellRate;
              const midRate = (buyRate + sellRate) / 2;
              const lastUpdate = new Date(rate.updatedAt);

              return (
                <Card
                  key={rate.id}
                  className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl overflow-hidden"
                  data-testid={`card-rate-${pair.symbol}`}
                >
                  <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white text-3xl font-bold">
                          {pair.symbol}
                        </CardTitle>
                        <CardDescription className="text-slate-300 text-lg mt-1">
                          {pair.baseCurrency} / {pair.quoteCurrency}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="default"
                          className="bg-green-500/20 text-green-300 border-green-500/30 px-4 py-2 text-sm"
                          data-testid="badge-source"
                        >
                          Infomax 실시간
                        </Badge>
                        <div className="text-slate-400 text-xs mt-2" data-testid="text-last-update">
                          마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* BUY Rate (고객 매수 - ASK) */}
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                        <div className="text-blue-400 text-sm font-semibold mb-2">
                          매수 환율 (BUY)
                        </div>
                        <div className="text-white text-4xl font-bold" data-testid="text-buy-rate">
                          {formatRate(rate.buyRate)}
                        </div>
                        <div className="text-blue-300 text-xs mt-2">
                          고객이 외화를 살 때 적용되는 환율
                        </div>
                      </div>

                      {/* SELL Rate (고객 매도 - BID) */}
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
                        <div className="text-purple-400 text-sm font-semibold mb-2">
                          매도 환율 (SELL)
                        </div>
                        <div className="text-white text-4xl font-bold" data-testid="text-sell-rate">
                          {formatRate(rate.sellRate)}
                        </div>
                        <div className="text-purple-300 text-xs mt-2">
                          고객이 외화를 팔 때 적용되는 환율
                        </div>
                      </div>

                      {/* Mid Rate & Spread */}
                      <div className="bg-slate-500/10 border border-slate-500/20 rounded-2xl p-6">
                        <div className="text-slate-400 text-sm font-semibold mb-2">
                          중간 환율
                        </div>
                        <div className="text-white text-4xl font-bold" data-testid="text-mid-rate">
                          {getMidRate(rate.buyRate, rate.sellRate)}
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-500/20">
                          <div className="text-slate-400 text-xs">스프레드:</div>
                          <div className="text-yellow-400 font-bold" data-testid="text-spread">
                            {getSpread(rate.buyRate, rate.sellRate)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 상세 정보 */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="text-slate-400">매수/매도 차이:</div>
                          <div className="text-white font-semibold">
                            {spread.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-slate-400">데이터 소스:</div>
                          <div className="text-green-400 font-semibold">Infomax</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-slate-400">업데이트 시간:</div>
                          <div className="text-white font-mono text-xs">
                            {lastUpdate.toLocaleString('ko-KR')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-slate-400">상태:</div>
                          <Badge
                            variant="default"
                            className="bg-green-500/20 text-green-300 border-green-500/30"
                          >
                            실시간
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 정보 카드 */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white text-xl">FX SPOT 거래 안내</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="text-blue-400 font-semibold mb-2">매수 환율 (BUY)</div>
                <div className="text-slate-300 text-sm">
                  고객이 외화를 매수할 때 적용되는 환율입니다. Infomax API의 ASK_PRICE가 사용됩니다.
                </div>
              </div>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div className="text-purple-400 font-semibold mb-2">매도 환율 (SELL)</div>
                <div className="text-slate-300 text-sm">
                  고객이 외화를 매도할 때 적용되는 환율입니다. Infomax API의 BID_PRICE가 사용됩니다.
                </div>
              </div>
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="text-yellow-400 font-semibold mb-2">자동 업데이트</div>
              <div className="text-slate-300 text-sm">
                환율은 10초마다 Infomax API에서 자동으로 가져옵니다. 실시간 데이터는 5초마다 화면에 반영됩니다.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
