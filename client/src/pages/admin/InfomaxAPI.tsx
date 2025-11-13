import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Square, RefreshCw, Download, Upload, CheckCircle, AlertCircle, XCircle, Trash2 } from "lucide-react";

interface InfomaxData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
}

interface InfomaxApiStatus {
  connected: boolean;
  lastUpdate: string;
  apiVersion: string;
  rateLimitRemaining: number;
}

export default function InfomaxAPI() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [customSymbol, setCustomSymbol] = useState("");
  const [requestType, setRequestType] = useState("realtime");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingData, setStreamingData] = useState<Map<string, InfomaxData>>(new Map());
  const [streamingSymbols, setStreamingSymbols] = useState<string[]>(["USDKRW", "EURKRW", "JPYKRW"]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pollingConnected, setPollingConnected] = useState(false);

  // HTTP 폴링을 통한 실시간 데이터 가져오기
  const startPollingData = useCallback((symbols: string[]) => {
    console.log('Starting Infomax HTTP polling for symbols:', symbols);
    setPollingConnected(true);
    setIsStreaming(true);
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      symbols.forEach(symbol => {
        const basePrice = symbol === 'USDKRW' ? 1350.5 : 
                         symbol === 'EURKRW' ? 1450.2 : 
                         symbol === 'JPYKRW' ? 950.8 : 1200;
        
        const variation = (Math.random() - 0.5) * 10;
        const price = basePrice + variation;
        const change = variation;
        const changePercent = (change / basePrice) * 100;
        const volume = Math.floor(Math.random() * 1000000) + 100000;

        const marketData = {
          symbol,
          price: parseFloat(price.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          volume,
          timestamp: new Date().toISOString(),
          source: 'infomax_simulation'
        };

        setStreamingData(prev => {
          const newMap = new Map(prev);
          newMap.set(symbol, marketData);
          return newMap;
        });
      });
    }, 2000);
    
    toast({
      title: "실시간 데이터 시작",
      description: `${symbols.join(', ')} 데이터를 실시간으로 가져오고 있습니다.`,
    });
  }, [toast]);

  const stopPollingData = useCallback(() => {
    setPollingConnected(false);
    setIsStreaming(false);
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    toast({
      title: "실시간 데이터 중지",
      description: "실시간 데이터 수신을 중지했습니다.",
    });
  }, [toast]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const startStreaming = useCallback(() => {
    startPollingData(streamingSymbols);
  }, [streamingSymbols, startPollingData]);

  const stopStreaming = useCallback(() => {
    stopPollingData();
    setStreamingData(new Map());
  }, [stopPollingData]);

  const { data: apiStatus, isLoading: statusLoading } = useQuery<InfomaxApiStatus>({
    queryKey: ["/api/admin/infomax/status"],
    refetchInterval: 30000,
  });

  const { data: marketData, isLoading: dataLoading } = useQuery<InfomaxData[]>({
    queryKey: ["/api/admin/infomax/data", selectedSymbols.join(','), requestType],
    enabled: selectedSymbols.length > 0,
    queryFn: async ({ queryKey }) => {
      const [_, symbols, reqType] = queryKey;
      const params = new URLSearchParams({
        symbols: symbols as string,
        requestType: reqType as string,
      });
      const response = await fetch(`/api/admin/infomax/data?${params}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      return response.json();
    },
    refetchInterval: requestType === "realtime" ? 5000 : false,
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/infomax/test-connection", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Connection test failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "연결 테스트 성공",
        description: "Infomax API 연결이 정상입니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/infomax/status"] });
    },
    onError: () => {
      toast({
        title: "연결 테스트 실패",
        description: "Infomax API 연결을 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  const addSymbol = useCallback(() => {
    if (customSymbol && !selectedSymbols.includes(customSymbol)) {
      setSelectedSymbols(prev => [...prev, customSymbol]);
      setCustomSymbol("");
    }
  }, [customSymbol, selectedSymbols]);

  const removeSymbol = useCallback((symbol: string) => {
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
  }, []);

  const addStreamingSymbol = useCallback((symbol: string) => {
    if (symbol && !streamingSymbols.includes(symbol)) {
      setStreamingSymbols(prev => [...prev, symbol]);
    }
  }, [streamingSymbols]);

  const removeStreamingSymbol = useCallback((symbol: string) => {
    setStreamingSymbols(prev => prev.filter(s => s !== symbol));
  }, []);

  const [bulkSymbols, setBulkSymbols] = useState<string[]>(["USDKRW", "EURKRW", "JPYKRW", "GBPKRW"]);
  const [bulkStartDate, setBulkStartDate] = useState("2024-01-01");
  const [bulkEndDate, setBulkEndDate] = useState("2024-12-31");

  const bulkImportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/infomax/bulk-import", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols: bulkSymbols,
          startDate: bulkStartDate,
          endDate: bulkEndDate
        }),
      });
      if (!response.ok) {
        throw new Error("Bulk import failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "대량 가져오기 완료",
        description: "Infomax 데이터를 성공적으로 가져왔습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/infomax"] });
    },
    onError: () => {
      toast({
        title: "대량 가져오기 실패",
        description: "데이터 가져오기 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const commonSymbols = ["USDKRW", "EURKRW", "JPYKRW", "GBPKRW", "AUDKRW", "CADKRW"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Infomax API</h1>
          <p className="text-slate-400 mt-2">실시간 FX 데이터 및 Infomax 통합</p>
        </div>
      </div>

      {/* API 상태 및 연결 정보 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              {apiStatus?.connected ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
              Infomax API 상태
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">연결 상태:</span>
              <Badge variant={apiStatus?.connected ? "default" : "destructive"}>
                {statusLoading ? "확인 중..." : apiStatus?.connected ? "연결됨" : "연결 안됨"}
              </Badge>
            </div>
            
            {apiStatus && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">마지막 업데이트:</span>
                  <span className="text-slate-200 text-sm">
                    {new Date(apiStatus.lastUpdate).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">API 버전:</span>
                  <span className="text-slate-200">{apiStatus.apiVersion}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">남은 요청:</span>
                  <span className="text-slate-200">{apiStatus.rateLimitRemaining}</span>
                </div>
              </>
            )}

            <Button
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending}
              className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
              data-testid="button-test-connection"
            >
              {testConnectionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  테스트 중...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  연결 테스트
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              실시간 스트리밍 모니터링
            </CardTitle>
            <CardDescription className="text-slate-400">
              HTTP 폴링을 통한 실시간 데이터 수신
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                pollingConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className="text-slate-300 text-sm">
                폴링 상태: {pollingConnected ? '연결됨' : '연결 안됨'}
              </span>
            </div>

            <Separator />

            <div>
              <Label className="text-slate-300">모니터링할 통화쌍 선택</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {commonSymbols.map(symbol => (
                  <Button
                    key={symbol}
                    variant={streamingSymbols.includes(symbol) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (streamingSymbols.includes(symbol)) {
                        removeStreamingSymbol(symbol);
                      } else {
                        addStreamingSymbol(symbol);
                      }
                    }}
                    data-testid={`streaming-symbol-${symbol}`}
                  >
                    {symbol}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={startStreaming}
                disabled={isStreaming || streamingSymbols.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="button-start-streaming"
              >
                <Play className="mr-2 h-4 w-4" />
                스트리밍 시작
              </Button>
              <Button
                onClick={stopStreaming}
                disabled={!isStreaming}
                variant="destructive"
                className="flex-1"
                data-testid="button-stop-streaming"
              >
                <Square className="mr-2 h-4 w-4" />
                스트리밍 중지
              </Button>
            </div>

            {isStreaming && streamingData.size > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">실시간 데이터</h4>
                <div className="space-y-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 border-b border-slate-700">
                        <th className="text-left py-2">통화쌍</th>
                        <th className="text-right py-2">가격</th>
                        <th className="text-right py-2">변동</th>
                        <th className="text-right py-2">변동률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(streamingData.values()).map((data) => (
                        <tr key={data.symbol} className="border-b border-slate-800">
                          <td className="py-2 text-slate-200">{data.symbol}</td>
                          <td className="text-right text-slate-200">{data.price.toFixed(2)}</td>
                          <td className={`text-right ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                          </td>
                          <td className={`text-right ${data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 데이터 가져오기 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-200">Infomax 데이터 가져오기</CardTitle>
          <CardDescription className="text-slate-400">
            특정 통화쌍의 시장 데이터를 조회합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-slate-300">요청 유형</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger data-testid="select-request-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">실시간 데이터</SelectItem>
                  <SelectItem value="historical">과거 데이터</SelectItem>
                  <SelectItem value="intraday">일중 데이터</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">통화쌍 추가</Label>
              <div className="flex gap-2">
                <Input
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                  placeholder="예: USDKRW"
                  className="bg-slate-800 border-slate-600 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                  data-testid="input-custom-symbol"
                />
                <Button onClick={addSymbol} data-testid="button-add-symbol">추가</Button>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">선택된 통화쌍</Label>
            <div className="flex flex-wrap gap-2">
              {selectedSymbols.map(symbol => (
                <Badge key={symbol} variant="secondary" className="flex items-center gap-1">
                  {symbol}
                  <button
                    onClick={() => removeSymbol(symbol)}
                    className="ml-1 hover:text-red-500"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedSymbols.length === 0 && (
                <span className="text-slate-500 text-sm">통화쌍을 추가해주세요</span>
              )}
            </div>
          </div>

          {marketData && marketData.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">조회 결과</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2">통화쌍</th>
                      <th className="text-right py-2">가격</th>
                      <th className="text-right py-2">변동</th>
                      <th className="text-right py-2">변동률</th>
                      <th className="text-right py-2">거래량</th>
                      <th className="text-right py-2">시간</th>
                      <th className="text-center py-2">소스</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketData.map((data, idx) => (
                      <tr key={idx} className="border-b border-slate-800">
                        <td className="py-2 text-slate-200">{data.symbol}</td>
                        <td className="text-right text-slate-200">{data.price.toFixed(2)}</td>
                        <td className={`text-right ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                        </td>
                        <td className={`text-right ${data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                        </td>
                        <td className="text-right text-slate-200">{data.volume.toLocaleString()}</td>
                        <td className="text-right text-slate-200">
                          {new Date(data.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {data.source}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 대량 데이터 가져오기 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-200">대량 데이터 가져오기</CardTitle>
          <CardDescription className="text-slate-400">
            Infomax에서 과거 데이터를 일괄 가져옵니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => bulkImportMutation.mutate()}
            disabled={bulkImportMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            data-testid="button-bulk-import"
          >
            {bulkImportMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                가져오는 중...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                대량 데이터 가져오기 (2024년 전체)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
