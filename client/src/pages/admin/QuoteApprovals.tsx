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
  amountCurrency?: string;
  nearAmount?: string;
  farAmount?: string;
  nearAmountCurrency?: string;
  farAmountCurrency?: string;
  tenor?: string;
  nearDate?: string;
  farDate?: string;
  nearRate?: string;
  farRate?: string;
  status: string;
  createdAt: string;
  quotedRate?: string;
  expiresAt?: string;
}

interface CustomerRateInfo {
  baseRate: number;
  spread: number;
  customerRate: number;
}

interface CurrencyPair {
  id: string;
  symbol: string;
}

interface User {
  id: string;
  username: string;
  majorGroup?: string;
  midGroup?: string;
  subGroup?: string;
}

export default function QuoteApprovals() {
  const [quotedRate, setQuotedRate] = useState<Record<string, string>>({});
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [autoApprovalUserId, setAutoApprovalUserId] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [timeWindowMinutes, setTimeWindowMinutes] = useState("30");
  const [isEnabled, setIsEnabled] = useState(false);
  
  // Filtering and sorting states
  const [sortBy, setSortBy] = useState<"amount" | "time">("amount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterProductType, setFilterProductType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

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

  const pendingRequests = quoteRequests?.filter(req => req.status === "REQUESTED") || [];

  const { data: customerRates } = useQuery<Record<string, CustomerRateInfo>>({
    queryKey: ["/api/quote-requests/customer-rates"],
    enabled: (pendingRequests.length > 0),
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
      allowWeekends: false,
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

  const getUserGroups = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return {
      major: user?.majorGroup || "-",
      mid: user?.midGroup || "-",
      sub: user?.subGroup || "-",
    };
  };

  const toggleSelectQuote = (quoteId: string) => {
    setSelectedQuotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedQuotes.size === pendingRequests.length) {
      setSelectedQuotes(new Set());
    } else {
      setSelectedQuotes(new Set(pendingRequests.map(req => req.id)));
    }
  };

  const bulkApproveMutation = useMutation({
    mutationFn: async (quoteIds: string[]) => {
      const promises = quoteIds.map(id => {
        const rate = parseFloat(quotedRate[id]);
        if (!rate) throw new Error(`호가가 입력되지 않은 항목이 있습니다: ${id}`);
        return apiRequest("POST", `/api/quote-requests/${id}/approve`, { quotedRate: rate });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "일괄 승인 완료",
        description: `${selectedQuotes.size}건의 호가가 승인되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      setSelectedQuotes(new Set());
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "일괄 승인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (quoteIds: string[]) => {
      const promises = quoteIds.map(id =>
        apiRequest("POST", `/api/quote-requests/${id}/reject`)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "일괄 거부 완료",
        description: `${selectedQuotes.size}건의 호가가 거부되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      setSelectedQuotes(new Set());
    },
    onError: () => {
      toast({
        title: "오류",
        description: "일괄 거부 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleBulkApprove = () => {
    bulkApproveMutation.mutate(Array.from(selectedQuotes));
  };

  const handleBulkReject = () => {
    bulkRejectMutation.mutate(Array.from(selectedQuotes));
  };

  // Filter and sort pending requests
  const getFilteredAndSortedRequests = () => {
    let filtered = [...pendingRequests];
    
    // Apply product type filter
    if (filterProductType !== "all") {
      filtered = filtered.filter(req => req.productType === filterProductType);
    }
    
    // Apply date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter(req => new Date(req.createdAt) >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(req => new Date(req.createdAt) <= toDate);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "amount") {
        const amountA = a.productType === "Swap" 
          ? parseFloat(a.nearAmount || "0") + parseFloat(a.farAmount || "0")
          : parseFloat(a.amount);
        const amountB = b.productType === "Swap"
          ? parseFloat(b.nearAmount || "0") + parseFloat(b.farAmount || "0")
          : parseFloat(b.amount);
        return sortOrder === "desc" ? amountB - amountA : amountA - amountB;
      } else {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      }
    });
    
    return filtered;
  };

  const filteredRequests = getFilteredAndSortedRequests();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">호가 승인 관리</h2>
        <p className="text-slate-300">Forward 및 Swap 거래의 호가 승인을 관리할 수 있습니다.</p>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  승인 대기 목록 ({pendingRequests.length}건)
                  {selectedQuotes.size > 0 && (
                    <span className="ml-3 text-sm text-blue-600">
                      ({selectedQuotes.size}건 선택됨)
                    </span>
                  )}
                </CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    disabled={selectedQuotes.size === 0 || bulkApproveMutation.isPending}
                    onClick={handleBulkApprove}
                    data-testid="button-bulk-approve"
                  >
                    선택 승인 ({selectedQuotes.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    disabled={selectedQuotes.size === 0 || bulkRejectMutation.isPending}
                    onClick={handleBulkReject}
                    data-testid="button-bulk-reject"
                  >
                    선택 거부 ({selectedQuotes.size})
                  </Button>
                </div>
              </div>
              
              {/* Filters and Sorting */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 pb-4 border-b">
                <div>
                  <Label className="text-xs">정렬 기준</Label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "amount" | "time")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    data-testid="select-sort-by"
                  >
                    <option value="amount">금액순</option>
                    <option value="time">시간순</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">정렬 방향</Label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    data-testid="select-sort-order"
                  >
                    <option value="desc">높은순 / 최신순</option>
                    <option value="asc">낮은순 / 오래된순</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">상품 유형</Label>
                  <select
                    value={filterProductType}
                    onChange={(e) => setFilterProductType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    data-testid="select-filter-product"
                  >
                    <option value="all">전체</option>
                    <option value="Forward">Forward</option>
                    <option value="Swap">Swap</option>
                    <option value="Spot">Spot</option>
                    <option value="MAR">MAR</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">시작일</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="text-sm"
                    data-testid="input-date-from"
                  />
                </div>
                <div>
                  <Label className="text-xs">종료일</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="text-sm"
                    data-testid="input-date-to"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-sm text-gray-500 border-b">
                        <th className="text-center py-3 w-12">
                          <Checkbox
                            checked={selectedQuotes.size === pendingRequests.length && pendingRequests.length > 0}
                            onCheckedChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </th>
                        <th className="text-left py-3">요청 시간</th>
                        <th className="text-left py-3">고객 ID</th>
                        <th className="text-left py-3">그룹</th>
                        <th className="text-left py-3">상품</th>
                        <th className="text-left py-3">통화쌍</th>
                        <th className="text-center py-3">방향</th>
                        <th className="text-right py-3">금액 / 만기</th>
                        <th className="text-right py-3">적용 호가</th>
                        <th className="text-center py-3">호가 입력</th>
                        <th className="text-center py-3">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((request) => {
                        const groups = getUserGroups(request.userId);
                        const rateInfo = customerRates?.[request.id];
                        
                        return (
                          <tr key={request.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 text-center">
                              <Checkbox
                                checked={selectedQuotes.has(request.id)}
                                onCheckedChange={() => toggleSelectQuote(request.id)}
                                data-testid={`checkbox-quote-${request.id}`}
                              />
                            </td>
                            <td className="py-3 text-sm">
                              {new Date(request.createdAt).toLocaleString('ko-KR', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </td>
                            <td className="py-3 font-medium">
                              {getUserName(request.userId)}
                            </td>
                            <td className="py-3 text-xs">
                              <div>M: {groups.major}</div>
                              <div>I: {groups.mid}</div>
                              <div>S: {groups.sub}</div>
                            </td>
                            <td className="py-3">
                              <Badge variant="outline">{request.productType}</Badge>
                            </td>
                            <td className="py-3">{getPairSymbol(request.currencyPairId)}</td>
                            <td className="py-3 text-center">
                              <Badge variant={request.direction === "BUY" ? "default" : "secondary"}>
                                {request.direction}
                              </Badge>
                            </td>
                            <td className="py-3 text-right text-xs">
                              {request.productType === "Swap" ? (
                                <div>
                                  <div>Near: {Number(request.nearAmount || 0).toLocaleString()} {request.nearAmountCurrency || "USD"}</div>
                                  <div>Far: {Number(request.farAmount || 0).toLocaleString()} {request.farAmountCurrency || "USD"}</div>
                                  <div className="mt-1 text-gray-500">
                                    <div>{request.nearDate ? new Date(request.nearDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : "-"}</div>
                                    <div>{request.farDate ? new Date(request.farDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : "-"}</div>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div>{Number(request.amount).toLocaleString()} {request.amountCurrency || "USD"}</div>
                                  <div className="text-gray-500">
                                    {request.tenor || (request.nearDate ? new Date(request.nearDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : "-")}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 text-right text-xs">
                              {rateInfo ? (
                                <div>
                                  <div className="font-semibold text-blue-600">
                                    {rateInfo.customerRate.toFixed(2)}
                                  </div>
                                  <div className="text-gray-500">
                                    Base: {rateInfo.baseRate.toFixed(2)}
                                  </div>
                                  <div className="text-orange-600">
                                    Spread: {rateInfo.spread.toFixed(2)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 text-center">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="호가 수정"
                                value={quotedRate[request.id] || ""}
                                onChange={(e) => handleQuotedRateChange(request.id, e.target.value)}
                                className="w-28 text-center text-sm"
                                data-testid={`input-quote-${request.id}`}
                              />
                            </td>
                            <td className="py-3 text-center">
                              <div className="flex space-x-2 justify-center">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={approveMutation.isPending || !quotedRate[request.id]}
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  data-testid={`button-approve-${request.id}`}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(request.id)}
                                  disabled={rejectMutation.isPending}
                                  data-testid={`button-reject-${request.id}`}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
