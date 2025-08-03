import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Download, Database, BarChart3, Play, Pause, Activity } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket 연결
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/bloomberg-ws`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("Bloomberg WebSocket connected");
        setIsStreaming(false); // 연결됐지만 아직 스트리밍은 시작하지 않음
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'realtime_data' && message.data) {
            const data = message.data;
            setStreamingData(prev => {
              const newMap = new Map(prev);
              newMap.set(data.symbol, data);
              return newMap;
            });
          }
        } catch (error) {
          console.error('Bloomberg WebSocket message parse error:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("Bloomberg WebSocket disconnected");
        setIsStreaming(false);
        
        // 3초 후 재연결 시도
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error("Bloomberg WebSocket error:", error);
      };

    } catch (error) {
      console.error("Bloomberg WebSocket connection error:", error);
    }
  }, []);

  // 컴포넌트 마운트 시 WebSocket 연결
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // 스트리밍 시작
  const startStreaming = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start_stream',
        symbols: streamingSymbols
      }));
      setIsStreaming(true);
      
      toast({
        title: "실시간 스트리밍 시작",
        description: `${streamingSymbols.join(', ')} 데이터를 실시간으로 수신합니다.`,
      });
    } else {
      toast({
        title: "연결 오류",
        description: "WebSocket 연결이 필요합니다.",
        variant: "destructive",
      });
    }
  }, [streamingSymbols, toast]);

  // 스트리밍 중지
  const stopStreaming = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_stream'
      }));
    }
    setIsStreaming(false);
    setStreamingData(new Map());
    
    toast({
      title: "실시간 스트리밍 중지",
      description: "데이터 수신이 중지되었습니다.",
    });
  }, [toast]);

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
        title: "연결 성공",
        description: "Bloomberg API 연결이 정상적으로 작동합니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bloomberg/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "연결 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 시장 데이터를 DB에 저장
  const saveDataMutation = useMutation({
    mutationFn: async (data: BloombergData[]) => {
      const response = await fetch("/api/admin/bloomberg/save-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ data }),
      });
      if (!response.ok) {
        throw new Error("Save failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "데이터 저장 완료",
        description: "Bloomberg 데이터가 데이터베이스에 저장되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 대량 데이터 가져오기
  const bulkImportMutation = useMutation({
    mutationFn: async (params: { symbols: string[]; startDate: string; endDate: string }) => {
      const response = await fetch("/api/admin/bloomberg/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        throw new Error("Bulk import failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "대량 가져오기 완료",
        description: "과거 데이터 가져오기가 완료되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bloomberg/data"] });
    },
    onError: (error: Error) => {
      toast({
        title: "가져오기 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const commonSymbols = [
    "USDKRW",
    "EURKRW", 
    "JPYKRW",
    "GBPKRW",
    "AUDKRW",
    "CNYUSD",
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "AUDUSD"
  ];

  const addSymbol = () => {
    if (customSymbol && !selectedSymbols.includes(customSymbol)) {
      setSelectedSymbols([...selectedSymbols, customSymbol]);
      setCustomSymbol("");
    }
  };

  const removeSymbol = (symbol: string) => {
    setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Bloomberg API 연동</h1>
        <Button 
          onClick={() => testConnectionMutation.mutate()}
          disabled={testConnectionMutation.isPending}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {testConnectionMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          연결 테스트
        </Button>
      </div>

      {/* API 상태 카드 */}
      <Card className="bg-slate-800/50 border-slate-600 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="w-5 h-5" />
            Bloomberg API 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-slate-300">연결 상태</Label>
                <div className="mt-1">
                  <Badge variant={apiStatus?.connected ? "default" : "destructive"}>
                    {apiStatus?.connected ? "연결됨" : "연결 안됨"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-slate-300">API 버전</Label>
                <p className="text-white mt-1">{apiStatus?.apiVersion || "N/A"}</p>
              </div>
              <div>
                <Label className="text-slate-300">마지막 업데이트</Label>
                <p className="text-white mt-1">{apiStatus?.lastUpdate || "N/A"}</p>
              </div>
              <div>
                <Label className="text-slate-300">API 호출 한도</Label>
                <p className="text-white mt-1">{apiStatus?.rateLimitRemaining || "N/A"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 심볼 선택 카드 */}
      <Card className="bg-slate-800/50 border-slate-600 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white">통화쌍 선택</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-300">일반 통화쌍</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
              {commonSymbols.map(symbol => (
                <Button
                  key={symbol}
                  variant={selectedSymbols.includes(symbol) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (selectedSymbols.includes(symbol)) {
                      removeSymbol(symbol);
                    } else {
                      setSelectedSymbols([...selectedSymbols, symbol]);
                    }
                  }}
                  className={selectedSymbols.includes(symbol) 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "border-slate-600 text-slate-300 hover:bg-slate-700"
                  }
                >
                  {symbol}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-slate-300">사용자 정의 심볼</Label>
              <Input
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                placeholder="예: USDCAD"
                className="bg-slate-700 border-slate-600 text-white mt-1"
                onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={addSymbol}
                disabled={!customSymbol}
                className="bg-green-600 hover:bg-green-700"
              >
                추가
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-slate-300">요청 타입</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="realtime">실시간 데이터</SelectItem>
                <SelectItem value="historical">과거 데이터</SelectItem>
                <SelectItem value="intraday">일중 데이터</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedSymbols.length > 0 && (
            <div>
              <Label className="text-slate-300">선택된 심볼</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSymbols.map(symbol => (
                  <Badge 
                    key={symbol} 
                    variant="secondary"
                    className="bg-slate-700 text-white hover:bg-slate-600 cursor-pointer"
                    onClick={() => removeSymbol(symbol)}
                  >
                    {symbol} ✕
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 시장 데이터 카드 */}
      {selectedSymbols.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-600 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                시장 데이터
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/bloomberg/data"] })}
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
                <Button
                  onClick={() => marketData && saveDataMutation.mutate(marketData)}
                  disabled={!marketData || saveDataMutation.isPending}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saveDataMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  DB 저장
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="ml-2 text-slate-300">데이터 로딩 중...</span>
              </div>
            ) : marketData && marketData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-2 text-slate-300">심볼</th>
                      <th className="text-right py-2 text-slate-300">가격</th>
                      <th className="text-right py-2 text-slate-300">변동</th>
                      <th className="text-right py-2 text-slate-300">변동률</th>
                      <th className="text-right py-2 text-slate-300">거래량</th>
                      <th className="text-right py-2 text-slate-300">시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketData.map((item: BloombergData, index: number) => (
                      <tr key={index} className="border-b border-slate-700">
                        <td className="py-2 text-white font-medium">{item.symbol}</td>
                        <td className="py-2 text-right text-white">{item.price.toFixed(4)}</td>
                        <td className={`py-2 text-right ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(4)}
                        </td>
                        <td className={`py-2 text-right ${item.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </td>
                        <td className="py-2 text-right text-slate-300">{item.volume.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-300">
                          {new Date(item.timestamp).toLocaleTimeString()}
                          {item.source === "bloomberg_simulation" && (
                            <span className="ml-1 text-xs text-yellow-400">(시뮬레이션)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                선택된 심볼에 대한 데이터가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 대량 데이터 가져오기 카드 */}
      <Card className="bg-slate-800/50 border-slate-600 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white">대량 데이터 가져오기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium mb-2">Bloomberg API 연동 상태</h4>
            <p className="text-slate-300 text-sm">
              • Bloomberg Terminal이 설치되어 있고 로그인되어 있어야 합니다<br/>
              • blpapi Python 라이브러리가 설치되어 있어야 합니다<br/>
              • 현재는 시뮬레이션 모드로 동작합니다
            </p>
          </div>
          <p className="text-slate-300 text-sm">
            과거 데이터를 대량으로 가져와서 데이터베이스에 저장할 수 있습니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-300">시작 날짜</Label>
              <Input
                type="date"
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">종료 날짜</Label>
              <Input
                type="date"
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  if (selectedSymbols.length > 0) {
                    bulkImportMutation.mutate({
                      symbols: selectedSymbols,
                      startDate: '2024-01-01',
                      endDate: '2024-12-31'
                    });
                  }
                }}
                disabled={selectedSymbols.length === 0 || bulkImportMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {bulkImportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                가져오기 시작
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* 실시간 스트리밍 모니터링 */}
      <Card className="bg-slate-800/50 border-slate-600 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            실시간 스트리밍 모니터링
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label className="text-slate-300">모니터링 통화쌍</Label>
              <div className="flex flex-wrap gap-2">
                {streamingSymbols.map(symbol => (
                  <Badge key={symbol} variant="outline" className="border-blue-600 text-blue-400">
                    {symbol}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={startStreaming}
                disabled={isStreaming || wsRef.current?.readyState !== WebSocket.OPEN}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                스트리밍 시작
              </Button>
              
              <Button
                onClick={stopStreaming}
                disabled={!isStreaming}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                <Pause className="w-4 h-4 mr-2" />
                스트리밍 중지
              </Button>
            </div>
          </div>

          {/* 연결 상태 표시 */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              wsRef.current?.readyState === WebSocket.OPEN ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className="text-slate-300 text-sm">
              WebSocket: {wsRef.current?.readyState === WebSocket.OPEN ? '연결됨' : '연결 안됨'}
            </span>
            {isStreaming && (
              <>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <span className="text-blue-400 text-sm">실시간 데이터 수신 중</span>
              </>
            )}
          </div>

          {/* 실시간 데이터 테이블 */}
          {streamingData.size > 0 && (
            <div className="mt-6">
              <h4 className="text-white font-medium mb-3">실시간 환율 데이터</h4>
              <div className="bg-slate-900/50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-300 font-medium">통화쌍</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-medium">현재가</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-medium">변동</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-medium">변동률</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-medium">거래량</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-medium">시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(streamingData.values()).map((item) => (
                      <tr key={item.symbol} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-medium text-white">{item.symbol}</td>
                        <td className="px-4 py-3 text-right text-white font-mono">
                          {item.price.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${
                          item.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${
                          item.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300 font-mono">
                          {item.volume.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300 text-sm">
                          {new Date(item.timestamp).toLocaleTimeString()}
                          {item.source === "bloomberg_simulation" && (
                            <span className="ml-1 text-xs text-yellow-400">(시뮬레이션)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 스트리밍이 활성화되었지만 데이터가 없는 경우 */}
          {isStreaming && streamingData.size === 0 && (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 mx-auto text-blue-400 animate-pulse mb-2" />
              <p className="text-slate-300">실시간 데이터를 기다리는 중...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}