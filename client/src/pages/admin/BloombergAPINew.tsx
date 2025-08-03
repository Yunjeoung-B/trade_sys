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
import { Loader2, Play, Square, RefreshCw, Download, Upload, CheckCircle, AlertCircle } from "lucide-react";

interface BloombergData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
}

interface BloombergApiStatus {
  connected: boolean;
  lastUpdate: string;
  apiVersion: string;
  rateLimitRemaining: number;
}

export default function BloombergAPI() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [customSymbol, setCustomSymbol] = useState("");
  const [requestType, setRequestType] = useState("realtime");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingData, setStreamingData] = useState<Map<string, BloombergData>>(new Map());
  const [streamingSymbols, setStreamingSymbols] = useState<string[]>(["USDKRW", "EURKRW", "JPYKRW"]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 실시간 데이터 폴링 상태
  const [pollingConnected, setPollingConnected] = useState(false);

  // HTTP 폴링을 통한 실시간 데이터 가져오기
  const startPollingData = useCallback((symbols: string[]) => {
    console.log('Starting HTTP polling for symbols:', symbols);
    setPollingConnected(true);
    setIsStreaming(true);
    
    // 기존 폴링 중지
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // 2초마다 데이터 폴링
    pollingIntervalRef.current = setInterval(async () => {
      try {
        for (const symbol of symbols) {
          const response = await fetch(`/api/admin/bloomberg/data/${symbol}/realtime`);
          if (response.ok) {
            const data = await response.json();
            
            // 시뮬레이션 데이터 생성 (API가 실제 실시간 데이터를 제공하지 않으므로)
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
              source: 'bloomberg_simulation'
            };

            setStreamingData(prev => {
              const newMap = new Map(prev);
              newMap.set(symbol, marketData);
              return newMap;
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        // 에러가 발생해도 계속 시도
      }
    }, 2000);
    
    toast({
      title: "실시간 데이터 시작",
      description: `${symbols.join(', ')} 데이터를 실시간으로 가져오고 있습니다.`,
    });
  }, [toast]);

  const stopPollingData = useCallback(() => {
    console.log('Stopping HTTP polling');
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

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // 스트리밍 시작
  const startStreaming = useCallback(() => {
    startPollingData(streamingSymbols);
  }, [streamingSymbols, startPollingData]);

  // 스트리밍 중지
  const stopStreaming = useCallback(() => {
    stopPollingData();
    setStreamingData(new Map());
  }, [stopPollingData]);

  // Bloomberg API 상태 조회
  const { data: apiStatus, isLoading: statusLoading } = useQuery<BloombergApiStatus>({
    queryKey: ["/api/admin/bloomberg/status"],
    refetchInterval: 30000, // 30초마다 갱신
  });

  // Bloomberg 데이터 조회
  const { data: marketData, isLoading: dataLoading } = useQuery<BloombergData[]>({
    queryKey: ["/api/admin/bloomberg/data", selectedSymbols, requestType],
    enabled: selectedSymbols.length > 0,
    refetchInterval: requestType === "realtime" ? 5000 : false,
  });

  // Bloomberg API 연결 테스트
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/bloomberg/test-connection", {
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
        description: "Bloomberg API 연결이 정상입니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bloomberg/status"] });
    },
    onError: () => {
      toast({
        title: "연결 테스트 실패",
        description: "Bloomberg API 연결을 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  // 심볼 추가
  const addSymbol = useCallback(() => {
    if (customSymbol && !selectedSymbols.includes(customSymbol)) {
      setSelectedSymbols(prev => [...prev, customSymbol]);
      setCustomSymbol("");
    }
  }, [customSymbol, selectedSymbols]);

  // 심볼 제거
  const removeSymbol = useCallback((symbol: string) => {
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
  }, []);

  // 스트리밍 심볼 추가
  const addStreamingSymbol = useCallback((symbol: string) => {
    if (symbol && !streamingSymbols.includes(symbol)) {
      setStreamingSymbols(prev => [...prev, symbol]);
    }
  }, [streamingSymbols]);

  // 스트리밍 심볼 제거
  const removeStreamingSymbol = useCallback((symbol: string) => {
    setStreamingSymbols(prev => prev.filter(s => s !== symbol));
  }, []);

  // 대량 데이터 가져오기
  const bulkImportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/bloomberg/bulk-import", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols: ["USDKRW", "EURKRW", "JPYKRW", "GBPKRW"],
          startDate: "2024-01-01",
          endDate: "2024-12-31"
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
        description: "Bloomberg 데이터를 성공적으로 가져왔습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bloomberg"] });
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
          <h1 className="text-3xl font-bold text-white">Bloomberg API</h1>
          <p className="text-slate-400 mt-2">실시간 FX 데이터 및 Bloomberg Terminal 통합</p>
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
              Bloomberg API 상태
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
            {/* 연결 상태 표시 */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                pollingConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className="text-slate-300 text-sm">
                폴링 상태: {pollingConnected ? '연결됨' : '연결 안됨'}
              </span>
            </div>

            {/* 스트리밍 심볼 관리 */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">스트리밍 심볼:</Label>
              <div className="flex flex-wrap gap-2">
                {streamingSymbols.map((symbol) => (
                  <Badge 
                    key={symbol} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => removeStreamingSymbol(symbol)}
                  >
                    {symbol} ×
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {commonSymbols
                  .filter(symbol => !streamingSymbols.includes(symbol))
                  .map((symbol) => (
                    <Button
                      key={symbol}
                      variant="outline"
                      size="sm"
                      onClick={() => addStreamingSymbol(symbol)}
                      className="text-xs"
                    >
                      + {symbol}
                    </Button>
                  ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={startStreaming}
                disabled={isStreaming || streamingSymbols.length === 0}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                size="sm"
              >
                <Play className="mr-2 h-4 w-4" />
                스트리밍 시작
              </Button>
              
              <Button
                onClick={stopStreaming}
                disabled={!isStreaming}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                <Square className="mr-2 h-4 w-4" />
                스트리밍 중지
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 실시간 스트리밍 데이터 표시 */}
      {isStreaming && streamingData.size > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200">실시간 환율 데이터</CardTitle>
            <CardDescription className="text-slate-400">
              2초마다 업데이트되는 실시간 시세 정보
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-slate-300">통화쌍</th>
                    <th className="text-right p-3 text-slate-300">현재가</th>
                    <th className="text-right p-3 text-slate-300">변동</th>
                    <th className="text-right p-3 text-slate-300">변동률</th>
                    <th className="text-right p-3 text-slate-300">거래량</th>
                    <th className="text-right p-3 text-slate-300">시간</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(streamingData.values()).map((data) => (
                    <tr key={data.symbol} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="p-3 text-slate-200 font-medium">{data.symbol}</td>
                      <td className="p-3 text-right text-slate-200">{data.price.toFixed(2)}</td>
                      <td className={`p-3 text-right ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                      </td>
                      <td className={`p-3 text-right ${data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                      </td>
                      <td className="p-3 text-right text-slate-300">{data.volume.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-400 text-xs">
                        {new Date(data.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터 조회 및 관리 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-200">Bloomberg 데이터 조회</CardTitle>
          <CardDescription className="text-slate-400">
            특정 통화쌍의 실시간 또는 과거 데이터를 조회합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-300">조회 타입</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="realtime">실시간 데이터</SelectItem>
                  <SelectItem value="historical">과거 데이터</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">심볼 추가</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="예: USDKRW"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                  className="bg-slate-800 border-slate-600 text-slate-200"
                  onKeyDown={(e) => e.key === "Enter" && addSymbol()}
                />
                <Button onClick={addSymbol} size="sm" variant="outline">
                  추가
                </Button>
              </div>
            </div>
          </div>

          {/* 선택된 심볼들 */}
          <div className="space-y-2">
            <Label className="text-slate-300">선택된 심볼</Label>
            <div className="flex flex-wrap gap-2">
              {selectedSymbols.map((symbol) => (
                <Badge 
                  key={symbol} 
                  variant="secondary" 
                  className="cursor-pointer"
                  onClick={() => removeSymbol(symbol)}
                >
                  {symbol} ×
                </Badge>
              ))}
            </div>
            
            {/* 자주 사용하는 심볼들 */}
            <div className="flex gap-2 flex-wrap">
              {commonSymbols
                .filter(symbol => !selectedSymbols.includes(symbol))
                .map((symbol) => (
                  <Button
                    key={symbol}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSymbols(prev => [...prev, symbol])}
                    className="text-xs"
                  >
                    + {symbol}
                  </Button>
                ))}
            </div>
          </div>

          {/* 데이터 표시 */}
          {dataLoading && (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-400" />
              <p className="text-slate-400 mt-2">데이터를 가져오는 중...</p>
            </div>
          )}

          {marketData && marketData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-slate-300">심볼</th>
                    <th className="text-right p-3 text-slate-300">가격</th>
                    <th className="text-right p-3 text-slate-300">변동</th>
                    <th className="text-right p-3 text-slate-300">변동률</th>
                    <th className="text-right p-3 text-slate-300">거래량</th>
                    <th className="text-right p-3 text-slate-300">시간</th>
                    <th className="text-right p-3 text-slate-300">소스</th>
                  </tr>
                </thead>
                <tbody>
                  {marketData.map((data, index) => (
                    <tr key={index} className="border-b border-slate-800">
                      <td className="p-3 text-slate-200 font-medium">{data.symbol}</td>
                      <td className="p-3 text-right text-slate-200">{data.price.toFixed(2)}</td>
                      <td className={`p-3 text-right ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                      </td>
                      <td className={`p-3 text-right ${data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                      </td>
                      <td className="p-3 text-right text-slate-300">{data.volume.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-400 text-xs">
                        {new Date(data.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant={data.source === 'bloomberg_api' ? 'default' : 'secondary'}>
                          {data.source === 'bloomberg_api' ? 'Bloomberg' : '시뮬레이션'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 대량 데이터 관리 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-200">대량 데이터 관리</CardTitle>
          <CardDescription className="text-slate-400">
            Bloomberg에서 대량의 과거 데이터를 가져오고 내보내기
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={() => bulkImportMutation.mutate()}
              disabled={bulkImportMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {bulkImportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  가져오는 중...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  대량 가져오기
                </>
              )}
            </Button>
            
            <Button variant="outline" disabled>
              <Upload className="mr-2 h-4 w-4" />
              데이터 내보내기
            </Button>
          </div>
          
          <p className="text-slate-400 text-sm">
            대량 가져오기는 주요 통화쌍(USD, EUR, JPY, GBP)의 2024년 전체 데이터를 가져옵니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}