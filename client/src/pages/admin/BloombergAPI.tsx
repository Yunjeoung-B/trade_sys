import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Download, Database, BarChart3 } from "lucide-react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
                        <td className="py-2 text-right text-slate-300">{new Date(item.timestamp).toLocaleTimeString()}</td>
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
    </div>
  );
}