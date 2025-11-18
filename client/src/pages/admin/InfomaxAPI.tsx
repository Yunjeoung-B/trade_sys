import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, XCircle, RefreshCw } from "lucide-react";
import type { InfomaxApiStatus } from "@shared/schema";

export default function InfomaxAPI() {
  const { toast } = useToast();

  const { data: apiStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<InfomaxApiStatus>({
    queryKey: ["/api/admin/infomax/status"],
    refetchInterval: 30000,
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/infomax/test-connection", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok && response.status !== 429) {
        throw new Error(data.error || "Connection test failed");
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "연결 테스트 성공",
          description: "Infomax API 연결이 정상입니다.",
        });
      } else if (data.simulationMode) {
        toast({
          title: "시뮬레이션 모드",
          description: data.error || "실제 API를 사용할 수 없어 시뮬레이션 모드로 작동합니다.",
          variant: "default",
        });
      } else {
        toast({
          title: "연결 테스트 실패",
          description: data.error || "Infomax API 연결을 확인해주세요.",
          variant: "destructive",
        });
      }
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "연결 테스트 실패",
        description: error instanceof Error ? error.message : "Infomax API 연결을 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  const getConnectionStatus = () => {
    if (!apiStatus) return { icon: AlertCircle, color: "text-yellow-500", label: "확인 중" };
    if (!apiStatus.apiKeyConfigured) return { icon: XCircle, color: "text-red-500", label: "API 키 미설정" };
    if (apiStatus.lastApiError) return { icon: AlertCircle, color: "text-yellow-500", label: "오류 발생" };
    if (apiStatus.connected) return { icon: CheckCircle, color: "text-green-500", label: "연결됨" };
    return { icon: XCircle, color: "text-red-500", label: "연결 안됨" };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">Infomax API 관리</h1>
          <p className="text-slate-300">
            Infomax FX 시장 데이터 API 연결 상태 및 사용량을 확인합니다.
          </p>
        </div>

        <Separator className="bg-white/10" />

        {/* API 상태 카드 */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-2xl">API 연결 상태</CardTitle>
                <CardDescription className="text-slate-300">
                  실시간 API 연결 및 사용량 정보
                </CardDescription>
              </div>
              <Button
                data-testid="button-refresh-status"
                onClick={() => refetchStatus()}
                variant="outline"
                size="sm"
                disabled={statusLoading}
                className="bg-white/5 hover:bg-white/10 text-white border-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {statusLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : (
              <>
                {/* 연결 상태 */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-6 w-6 ${status.color}`} />
                    <div>
                      <div className="text-white font-semibold">연결 상태</div>
                      <div className="text-sm text-slate-300">{status.label}</div>
                    </div>
                  </div>
                  <Badge 
                    variant={apiStatus?.connected ? "default" : "destructive"}
                    className="px-4 py-1"
                    data-testid="badge-connection-status"
                  >
                    {apiStatus?.apiKeyConfigured ? "API 키 설정됨" : "API 키 필요"}
                  </Badge>
                </div>

                {/* Rate Limit 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="text-sm text-slate-400 mb-2">분당 요청 제한 (60회/분)</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white" data-testid="text-remaining-minute">
                        {apiStatus?.remainingMinute ?? '-'}
                      </span>
                      <span className="text-slate-400">/ 60</span>
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      사용: {apiStatus?.usedMinute ?? 0}회
                    </div>
                    <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                        style={{ width: `${((apiStatus?.usedMinute ?? 0) / 60) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="text-sm text-slate-400 mb-2">일일 데이터 제한 (0.2GB/일)</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white" data-testid="text-remaining-daily">
                        {apiStatus?.remainingDailyMB ?? '-'}
                      </span>
                      <span className="text-slate-400">MB</span>
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      사용: {apiStatus?.usedDailyMB ?? 0} MB
                    </div>
                    <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all"
                        style={{ width: `${(parseFloat(apiStatus?.usedDailyMB ?? '0') / 204.8) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 마지막 호출 및 오류 정보 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-slate-400">마지막 API 호출</span>
                    <span className="text-white font-mono text-sm" data-testid="text-last-call">
                      {apiStatus?.lastCallAt 
                        ? new Date(apiStatus.lastCallAt).toLocaleString('ko-KR')
                        : '없음'
                      }
                    </span>
                  </div>

                  {apiStatus?.lastApiError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-red-400 font-semibold text-sm">마지막 오류</div>
                          <div className="text-red-300 text-sm mt-1" data-testid="text-last-error">
                            {typeof apiStatus.lastApiError === 'string' 
                              ? apiStatus.lastApiError 
                              : JSON.stringify(apiStatus.lastApiError)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 연결 테스트 버튼 */}
                <div className="pt-4">
                  <Button
                    data-testid="button-test-connection"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testConnectionMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 rounded-xl shadow-lg transition-all duration-200"
                  >
                    {testConnectionMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        연결 테스트 중...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5" />
                        연결 테스트
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* API 정보 카드 */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white text-2xl">API 정보</CardTitle>
            <CardDescription className="text-slate-300">
              Infomax API 사용 제한 및 엔드포인트
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-sm text-slate-400 mb-1">Rate Limit</div>
                <div className="text-white font-semibold">60 requests / minute</div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-sm text-slate-400 mb-1">Daily Limit</div>
                <div className="text-white font-semibold">0.2 GB / day</div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl md:col-span-2">
                <div className="text-sm text-slate-400 mb-1">API Endpoint</div>
                <div className="text-white font-mono text-sm break-all">
                  https://infomaxy.einfomax.co.kr/api/fx/code
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <strong className="text-blue-200">참고:</strong> API 키는 환경 변수 INFOMAX_API_KEY에 설정해야 합니다.
                  Rate limit을 초과하면 1분 후 자동으로 리셋됩니다.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
