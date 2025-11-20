import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Upload, Trash2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CurrencyPair } from "@shared/schema";

interface ForwardData {
  tenor: string;
  mid_price: number;
  days?: number;
  settlementDate?: string;
}

interface SwapPoint {
  id: string;
  currencyPairId: string;
  tenor?: string;
  settlementDate?: Date;
  days?: number;
  swapPoint: string;
  source: string;
  uploadedBy?: string;
  uploadedAt?: Date;
}

export default function FXSwapMonitoring() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCurrencyPair, setSelectedCurrencyPair] = useState<string>("");
  const [selectedCurrencyPairForHistory, setSelectedCurrencyPairForHistory] = useState<string>("");
  const [historyHours, setHistoryHours] = useState<number>(24);

  const { data: currencyPairs } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const { data: forwardData, isLoading: forwardLoading, refetch: refetchForward } = useQuery<any>({
    queryKey: ["/api/admin/infomax/forward"],
    refetchInterval: 10000,
  });

  const { data: swapPoints, refetch: refetchSwapPoints } = useQuery<SwapPoint[]>({
    queryKey: ["/api/swap-points", selectedCurrencyPair],
    queryFn: async () => {
      if (!selectedCurrencyPair) return [];
      const response = await fetch(`/api/swap-points?currencyPairId=${selectedCurrencyPair}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch swap points');
      return response.json();
    },
    enabled: !!selectedCurrencyPair,
  });

  const { data: swapPointHistory } = useQuery<SwapPoint[]>({
    queryKey: ["/api/admin/swap-points/history", selectedCurrencyPairForHistory, historyHours],
    enabled: !!selectedCurrencyPairForHistory,
  });

  // Set default currency pair when loaded
  useEffect(() => {
    if (currencyPairs && currencyPairs.length > 0 && !selectedCurrencyPair) {
      setSelectedCurrencyPair(currencyPairs[0].id);
    }
  }, [currencyPairs, selectedCurrencyPair]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "오류",
        description: "업로드할 파일을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCurrencyPair) {
      toast({
        title: "오류",
        description: "통화쌍을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('currencyPairId', selectedCurrencyPair);

      const response = await fetch('/api/admin/swap-points/upload-excel', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "업로드 성공",
          description: result.message,
        });
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        // Refresh swap points list
        queryClient.invalidateQueries({ queryKey: ["/api/swap-points", selectedCurrencyPair] });
      } else {
        toast({
          title: "업로드 실패",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "오류",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/admin/swap-points/${id}`);
      toast({
        title: "삭제 완료",
        description: "Swap Point가 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/swap-points", selectedCurrencyPair] });
    } catch (error) {
      toast({
        title: "오류",
        description: "삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const forwardResults = forwardData?.data?.results || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">FX Swap 가격 모니터링</h1>
            <p className="text-slate-300">
              Swap Point 데이터 관리 및 실시간 Forward 환율 조회
            </p>
          </div>
          <Button
            data-testid="button-refresh-rates"
            onClick={() => refetchForward()}
            variant="outline"
            className="bg-white/5 hover:bg-white/10 text-white border-white/20"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>

        <Separator className="bg-white/10" />

        {/* Forward Rates from Infomax */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
            <CardTitle className="text-white text-2xl">Infomax Forward 환율</CardTitle>
            <CardDescription className="text-slate-300">
              실시간 Forward/Swap 가격 데이터
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {forwardLoading ? (
              <div className="flex items-center justify-center p-12">
                <RefreshCw className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : forwardResults.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                Forward 데이터를 불러오는 중입니다...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {forwardResults.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6"
                    data-testid={`forward-item-${index}`}
                  >
                    <div className="text-blue-400 text-sm font-semibold mb-2">
                      Tenor: {item.tenor || `Day ${item.days || 'N/A'}`}
                    </div>
                    <div className="text-white text-3xl font-bold" data-testid={`mid-price-${index}`}>
                      {item.mid_price ? item.mid_price.toFixed(2) : 'N/A'}
                    </div>
                    <div className="text-blue-300 text-xs mt-2">
                      MID Price
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Excel Upload Section */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10">
            <CardTitle className="text-white text-2xl">Excel 데이터 업로드</CardTitle>
            <CardDescription className="text-slate-300">
              Swap Point 데이터가 포함된 Excel 파일 업로드
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">통화쌍 선택</Label>
                <Select value={selectedCurrencyPair} onValueChange={setSelectedCurrencyPair}>
                  <SelectTrigger className="mt-2 bg-slate-700/50 border-slate-600 text-white" data-testid="select-currency-pair">
                    <SelectValue placeholder="통화쌍을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyPairs?.map((pair) => (
                      <SelectItem key={pair.id} value={pair.id}>
                        {pair.baseCurrency}/{pair.quoteCurrency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Excel 파일 선택</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="mt-2 bg-slate-700/50 border-slate-600 text-white"
                  data-testid="input-file-upload"
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !selectedCurrencyPair}
                className="bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white"
                data-testid="button-upload-excel"
              >
                <Upload className="mr-2 h-4 w-4" />
                업로드
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Swap Points List */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-green-600/20 to-teal-600/20 border-b border-white/10">
            <CardTitle className="text-white text-2xl">저장된 Swap Points</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {swapPoints && swapPoints.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-600">
                <table className="w-full">
                  <thead>
                    <tr className="text-sm text-slate-400 border-b border-slate-600">
                      <th className="text-left py-3 px-4 text-white">Tenor</th>
                      <th className="text-left py-3 px-4 text-white">결제일</th>
                      <th className="text-right py-3 px-4 text-white">Days</th>
                      <th className="text-right py-3 px-4 text-white">Swap Point</th>
                      <th className="text-center py-3 px-4 text-white">Source</th>
                      <th className="text-center py-3 px-4 text-white">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {swapPoints.map((point) => (
                      <tr
                        key={point.id}
                        className="border-b border-slate-600 hover:bg-slate-700/30 text-white"
                        data-testid={`swap-point-${point.id}`}
                      >
                        <td className="py-3 px-4">{point.tenor || '-'}</td>
                        <td className="py-3 px-4">
                          {point.settlementDate
                            ? (() => {
                                const date = new Date(point.settlementDate);
                                return !isNaN(date.getTime()) ? date.toLocaleDateString('ko-KR') : '-';
                              })()
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">{point.days || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono">
                          {parseFloat(point.swapPoint).toFixed(4)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className="border-green-400/30 text-green-300">
                            {point.source}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(point.id)}
                            className="bg-red-500/80 hover:bg-red-500"
                            data-testid={`button-delete-${point.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                저장된 Swap Point가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historical Data Section */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-teal-400" />
                <CardTitle className="text-white text-xl">Swap Points 업로드 기록 (Historical Data)</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <Select value={historyHours.toString()} onValueChange={(val) => setHistoryHours(parseInt(val))}>
                  <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1시간</SelectItem>
                    <SelectItem value="6">6시간</SelectItem>
                    <SelectItem value="24">24시간</SelectItem>
                    <SelectItem value="72">3일</SelectItem>
                    <SelectItem value="168">7일</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCurrencyPairForHistory} onValueChange={setSelectedCurrencyPairForHistory}>
                  <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="통화쌍 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyPairs?.map((pair) => (
                      <SelectItem key={pair.id} value={pair.id}>
                        {pair.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCurrencyPairForHistory ? (
              <div className="text-center py-12 text-slate-400">
                통화쌍을 선택하여 Swap Points 업로드 기록을 조회하세요
              </div>
            ) : !swapPointHistory || swapPointHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                선택한 기간 동안의 업로드 기록이 없습니다
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">업로드 시간</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Tenor</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">결제일</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Days</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Swap Point</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">소스</th>
                    </tr>
                  </thead>
                  <tbody>
                    {swapPointHistory.map((point, index) => {
                      return (
                        <tr
                          key={point.id}
                          className={`border-b border-white/10 hover:bg-white/5 ${index === 0 ? 'bg-teal-500/10' : ''}`}
                        >
                          <td className="py-3 px-4 text-sm font-mono">
                            {point.uploadedAt ? new Date(point.uploadedAt).toLocaleString('ko-KR') : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-blue-300">
                            {point.tenor || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-purple-300">
                            {point.settlementDate
                              ? (() => {
                                  const date = new Date(point.settlementDate);
                                  return !isNaN(date.getTime()) ? date.toLocaleDateString('ko-KR') : '-';
                                })()
                              : '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-mono text-white">
                            {point.days || '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-mono text-yellow-300">
                            {parseFloat(point.swapPoint).toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                              {point.source}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
