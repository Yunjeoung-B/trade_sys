import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface QuoteRequest {
  id: string;
  userId: string;
  productType: string;
  currencyPairId: string;
  direction: string;
  amount: string;
  tenor?: string;
  nearDate?: string;
  farDate?: string;
  nearRate?: string;
  status: string;
  createdAt: string;
  quotedRate?: string;
  expiresAt?: string;
}

interface CurrencyPair {
  id: string;
  symbol: string;
}

interface User {
  id: string;
  username: string;
}

export default function QuoteApprovals() {
  const [quotedRate, setQuotedRate] = useState<Record<string, string>>({});
  const [autoApprovalUserId, setAutoApprovalUserId] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [timeWindowMinutes, setTimeWindowMinutes] = useState("30");
  const [isEnabled, setIsEnabled] = useState(false);
  const [allowWeekends, setAllowWeekends] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quoteRequests } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: currencyPairs } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number }) =>
      apiRequest("POST", `/api/quote-requests/${id}/approve`, { quotedRate: rate }),
    onSuccess: () => {
      toast({
        title: "승인 완료",
        description: "호가 요청이 승인되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "호가 승인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/quote-requests/${id}/reject`),
    onSuccess: () => {
      toast({
        title: "거부 완료",
        description: "호가 요청이 거부되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "호가 거부 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const saveAutoApprovalMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/auto-approval", data),
    onSuccess: () => {
      toast({
        title: "설정 저장",
        description: "자동 승인 설정이 저장되었습니다.",
      });
      resetAutoApprovalForm();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "자동 승인 설정 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const resetAutoApprovalForm = () => {
    setAutoApprovalUserId("");
    setMaxAmount("");
    setTimeWindowMinutes("30");
    setIsEnabled(false);
    setAllowWeekends(false);
  };

  const handleApprove = (id: string) => {
    const rate = parseFloat(quotedRate[id]);
    if (!rate) {
      toast({
        title: "오류",
        description: "호가를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    approveMutation.mutate({ id, rate });
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id);
  };

  const handleQuotedRateChange = (id: string, value: string) => {
    setQuotedRate(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveAutoApproval = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!autoApprovalUserId || !maxAmount) {
      toast({
        title: "오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    saveAutoApprovalMutation.mutate({
      userId: autoApprovalUserId,
      maxAmount: parseFloat(maxAmount),
      timeWindowMinutes: parseInt(timeWindowMinutes),
      isEnabled,
      allowWeekends,
    });
  };

  const getPairSymbol = (pairId: string) => {
    const pair = currencyPairs?.find(p => p.id === pairId);
    return pair?.symbol || "";
  };

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user?.username || userId;
  };

  const pendingRequests = quoteRequests?.filter(req => req.status === "pending") || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">호가 승인 관리</h2>
        <p className="text-slate-300">Forward 및 Swap 거래의 호가 승인을 관리할 수 있습니다.</p>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  승인 대기 목록 ({pendingRequests.length}건)
                </CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    disabled={pendingRequests.length === 0}
                  >
                    전체 승인
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    disabled={pendingRequests.length === 0}
                  >
                    전체 거부
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-sm text-gray-500 border-b">
                        <th className="text-left py-3">요청 시간</th>
                        <th className="text-left py-3">고객 ID</th>
                        <th className="text-left py-3">상품</th>
                        <th className="text-left py-3">통화쌍</th>
                        <th className="text-right py-3">금액</th>
                        <th className="text-center py-3">만기</th>
                        <th className="text-center py-3">호가 입력</th>
                        <th className="text-center py-3">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((request) => (
                        <tr key={request.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 text-sm">
                            {new Date(request.createdAt).toLocaleString('ko-KR')}
                          </td>
                          <td className="py-3 font-medium">
                            {getUserName(request.userId)}
                          </td>
                          <td className="py-3">
                            <Badge variant="outline">{request.productType}</Badge>
                          </td>
                          <td className="py-3">{getPairSymbol(request.currencyPairId)}</td>
                          <td className="py-3 text-right">
                            {Number(request.amount).toLocaleString()} USD
                          </td>
                          <td className="py-3 text-center">
                            {request.tenor || (
                              request.nearDate && request.farDate 
                                ? `${new Date(request.nearDate).toLocaleDateString('ko-KR')} - ${new Date(request.farDate).toLocaleDateString('ko-KR')}`
                                : "-"
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="호가"
                              value={quotedRate[request.id] || ""}
                              onChange={(e) => handleQuotedRateChange(request.id, e.target.value)}
                              className="w-24 text-center"
                            />
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex space-x-2 justify-center">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(request.id)}
                                disabled={approveMutation.isPending || !quotedRate[request.id]}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(request.id)}
                                disabled={rejectMutation.isPending}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>승인 대기 중인 호가 요청이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Auto Approval Settings */}
          <Card>
            <CardHeader>
              <CardTitle>자동 승인 설정</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAutoApproval} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>고객 선택</Label>
                    <select
                      value={autoApprovalUserId}
                      onChange={(e) => setAutoApprovalUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="">고객을 선택하세요</option>
                      {users?.filter(user => user.id !== "admin").map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label>자동 승인 한도 (USD)</Label>
                    <Input
                      type="number"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="50000"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>승인 시간 (분)</Label>
                    <Input
                      type="number"
                      value={timeWindowMinutes}
                      onChange={(e) => setTimeWindowMinutes(e.target.value)}
                      placeholder="30"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoApproval"
                      checked={isEnabled}
                      onCheckedChange={(checked) => setIsEnabled(checked as boolean)}
                    />
                    <Label htmlFor="autoApproval">자동 승인 활성화</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="weekendApproval"
                      checked={allowWeekends}
                      onCheckedChange={(checked) => setAllowWeekends(checked as boolean)}
                    />
                    <Label htmlFor="weekendApproval">주말 자동 승인</Label>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full gradient-bg hover:opacity-90"
                    disabled={saveAutoApprovalMutation.isPending || !autoApprovalUserId || !maxAmount}
                  >
                    {saveAutoApprovalMutation.isPending ? "저장 중..." : "설정 저장"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
    </div>
  );
}
