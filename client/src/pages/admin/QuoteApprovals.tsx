import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { calculateForwardRate, getDaysBetween, type TenorData } from "@/lib/forwardRateUtils";
import { getTodayLocal, formatDateForInput, getSpotDate } from "@/lib/dateUtils";
import type { SwapPoint } from "@shared/schema";

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

interface SettlementDetails {
  quoteId: string;
  productType: string;
  nearDate?: string;
  farDate?: string;
  nearSwapPoint: number | null;
  farSwapPoint: number | null;
  swapPointDifference: number | null;
  spread: number | null;
  nearForwardRate?: number;
  farForwardRate?: number;
  nearForwardRateError?: string;
  farForwardRateError?: string;
  nearDays?: number;
  farDays?: number;
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
  
  // Forward rate calculation state (KST timezone aware)
  const [spotDate, setSpotDate] = useState<Date>(getSpotDate(getTodayLocal()));
  const [swapPointsByCurrency, setSwapPointsByCurrency] = useState<Record<string, SwapPoint[]>>({});

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
  
  // Load swap points for each currency pair
  useEffect(() => {
    if (!currencyPairs || currencyPairs.length === 0) return;
    
    const loadSwapPoints = async () => {
      const swapPointsMap: Record<string, SwapPoint[]> = {};
      
      for (const pair of currencyPairs) {
        try {
          const response = await fetch(`/api/swap-points/${pair.id}`);
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              swapPointsMap[pair.id] = data;
            } else {
              console.warn(`Invalid content type for swap points ${pair.id}:`, contentType);
            }
          } else {
            console.warn(`Failed to load swap points for ${pair.id}: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error loading swap points for ${pair.id}:`, error);
        }
      }
      
      setSwapPointsByCurrency(swapPointsMap);
    };
    
    loadSwapPoints();
  }, [currencyPairs]);

  const pendingRequests = quoteRequests?.filter(req => req.status === "REQUESTED") || [];

  const { data: customerRates } = useQuery<Record<string, CustomerRateInfo>>({
    queryKey: ["/api/quote-requests/customer-rates"],
    enabled: (pendingRequests.length > 0),
  });

  // Store expanded rows and settlement details for on-demand loading
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Record<string, SettlementDetails>>({});

  const toggleExpanded = async (requestId: string) => {
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
      
      // Load settlement details only when expanded
      if (!expandedDetails[requestId]) {
        try {
          const response = await fetch(`/api/quote-requests/${requestId}/settlement-details`);
          if (response.ok) {
            let data = await response.json();
            
            // Calculate forward rates for Near and Far dates
            const request = quoteRequests?.find(r => r.id === requestId);
            if (request && swapPointsByCurrency[request.currencyPairId]) {
              const swapPoints = swapPointsByCurrency[request.currencyPairId];
              const baseRate = parseFloat(request.quotedRate || "1350"); // Default spot rate
              
              // Build tenor data from swap points
              const tenorData: TenorData[] = [
                { tenor: "Spot", days: 0, swapPointNum: 0 },
                ...swapPoints
                  .filter(sp => sp.tenor)
                  .map(sp => ({
                    tenor: sp.tenor!,
                    days: sp.days || 0,
                    swapPointNum: Number(sp.swapPoint) || 0,
                  })),
              ];
              
              // Calculate near date forward rate
              if (data.nearDate) {
                const nearSettlementDate = new Date(data.nearDate);
                const nearDays = getDaysBetween(spotDate, nearSettlementDate);
                const nearResult = calculateForwardRate(nearDays, baseRate, tenorData, spotDate, nearSettlementDate);
                
                data.nearDays = nearDays;
                data.nearForwardRate = nearResult.forwardRate;
                data.nearForwardRateError = nearResult.error;
              }
              
              // Calculate far date forward rate
              if (data.farDate) {
                const farSettlementDate = new Date(data.farDate);
                const farDays = getDaysBetween(spotDate, farSettlementDate);
                const farResult = calculateForwardRate(farDays, baseRate, tenorData, spotDate, farSettlementDate);
                
                data.farDays = farDays;
                data.farForwardRate = farResult.forwardRate;
                data.farForwardRateError = farResult.error;
              }
            }
            
            setExpandedDetails(prev => ({ ...prev, [requestId]: data }));
          }
        } catch (error) {
          console.error(`Error fetching settlement details for ${requestId}:`, error);
        }
      }
    }
    
    setExpandedRows(newExpanded);
  };

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

  const getBaseCurrencyFromPair = (pairId: string) => {
    const pair = currencyPairs?.find(p => p.id === pairId);
    if (!pair) return "USD";
    const [baseCurrency] = pair.symbol.split('/');
    return baseCurrency || "USD";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">호가 승인 관리</h1>
          <p className="text-slate-300">Forward 및 Swap 거래의 호가 승인을 관리할 수 있습니다.</p>
        </div>
          
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="flex items-center text-white text-2xl">
                <Clock className="w-6 h-6 mr-3" />
                승인 대기 목록 ({pendingRequests.length}건)
                {selectedQuotes.size > 0 && (
                  <span className="ml-3 text-lg text-teal-300">
                    ({selectedQuotes.size}건 선택됨)
                  </span>
                )}
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30"
                  disabled={selectedQuotes.size === 0 || bulkApproveMutation.isPending}
                  onClick={handleBulkApprove}
                  data-testid="button-bulk-approve"
                >
                  선택 승인 ({selectedQuotes.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
                  disabled={selectedQuotes.size === 0 || bulkRejectMutation.isPending}
                  onClick={handleBulkReject}
                  data-testid="button-bulk-reject"
                >
                  선택 거부 ({selectedQuotes.size})
                </Button>
              </div>
              </div>
              
            {/* Filters and Sorting */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 pb-4 border-b border-white/10">
              <div>
                <Label className="text-xs text-slate-300">정렬 기준</Label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "amount" | "time")}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg text-sm"
                  data-testid="select-sort-by"
                >
                  <option value="amount">금액순</option>
                  <option value="time">시간순</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-300">정렬 방향</Label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg text-sm"
                  data-testid="select-sort-order"
                >
                  <option value="desc">높은순 / 최신순</option>
                  <option value="asc">낮은순 / 오래된순</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-300">상품 유형</Label>
                <select
                  value={filterProductType}
                  onChange={(e) => setFilterProductType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg text-sm"
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
                <Label className="text-xs text-slate-300">시작일</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="text-sm bg-slate-700/50 border-slate-600 text-white"
                  data-testid="input-date-from"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300">종료일</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="text-sm bg-slate-700/50 border-slate-600 text-white"
                  data-testid="input-date-to"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
              {filteredRequests.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-600">
                <table className="w-full">
                  <thead>
                    <tr className="text-sm text-slate-400 border-b border-slate-600">
                      <th className="text-center py-3 w-12">
                        <Checkbox
                          checked={selectedQuotes.size === pendingRequests.length && pendingRequests.length > 0}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
                      <th className="text-left py-3 text-white">요청 시간</th>
                      <th className="text-left py-3 text-white">고객 ID</th>
                      <th className="text-left py-3 text-white">그룹</th>
                      <th className="text-left py-3 text-white">상품</th>
                      <th className="text-left py-3 text-white">통화쌍</th>
                      <th className="text-center py-3 text-white">방향</th>
                      <th className="text-right py-3 text-white">금액 / 만기</th>
                      <th className="text-right py-3 text-white">적용 호가</th>
                      <th className="text-center py-3 text-white">호가 입력</th>
                      <th className="text-center py-3 text-white">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const groups = getUserGroups(request.userId);
                      const rateInfo = customerRates?.[request.id];
                      
                      return (
                        <React.Fragment key={request.id}> 
                          <tr className="border-b border-slate-600 hover:bg-slate-700/30 text-white">
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
                          <td className="py-3 text-xs text-slate-300">
                            <div>M: {groups.major}</div>
                            <div>I: {groups.mid}</div>
                            <div>S: {groups.sub}</div>
                          </td>
                          <td className="py-3">
                            <Badge variant="outline" className="border-blue-400/30 text-blue-300">{request.productType}</Badge>
                          </td>
                          <td className="py-3">{getPairSymbol(request.currencyPairId)}</td>
                          <td className="py-3 text-center">
                            <Badge variant={request.direction === "BUY" ? "default" : "secondary"} className={request.direction === "BUY" ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-blue-500/20 text-blue-300 border-blue-500/30"}>
                              {request.direction}
                            </Badge>
                          </td>
                          <td className="py-3 text-right text-xs">
                          {request.productType === "Swap" ? (
                            <div>
                              <div>Near: {Number(request.nearAmount || 0).toLocaleString()} {request.nearAmountCurrency || "USD"}</div>
                              <div>Far: {Number(request.farAmount || 0).toLocaleString()} {request.farAmountCurrency || "USD"}</div>
                              <div className="mt-1 text-slate-400">
                                <div>결제: {request.nearDate ? request.nearDate.split('T')[0] : "-"}</div>
                                <div>만기: {request.farDate ? request.farDate.split('T')[0] : "-"}</div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold">{getBaseCurrencyFromPair(request.currencyPairId)} {Number(request.amount).toLocaleString()}</div>
                              <div className="text-slate-400 mt-1">
                                {expandedDetails[request.id]?.nearDays !== undefined && request.nearDate
                                  ? `${expandedDetails[request.id].nearDays}D (${request.nearDate.split('T')[0]})`
                                  : (request.tenor && request.nearDate 
                                    ? `${request.tenor} (${request.nearDate.split('T')[0]})`
                                    : (request.nearDate ? request.nearDate.split('T')[0] : "-")
                                  )
                                }
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-right text-xs">
                          <div className="space-y-2">
                            {rateInfo ? (
                              <>
                                <div className="font-semibold text-blue-300">
                                  {rateInfo.customerRate.toFixed(2)}
                                </div>
                                <div className="text-slate-400 text-xs">
                                  Base: {rateInfo.baseRate.toFixed(2)}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                            {(request.productType === "Swap" || request.productType === "Forward") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleExpanded(request.id)}
                                className="text-xs mt-1 h-6"
                              >
                                {expandedRows.has(request.id) ? "숨기기" : "상세보기"}
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="호가 수정"
                            value={quotedRate[request.id] || ""}
                            onChange={(e) => handleQuotedRateChange(request.id, e.target.value)}
                            className="w-28 text-center text-sm bg-slate-700/50 border-slate-600 text-white"
                            data-testid={`input-quote-${request.id}`}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex space-x-2 justify-center">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              disabled={approveMutation.isPending || !quotedRate[request.id]}
                              className="bg-green-500/80 hover:bg-green-500 text-white"
                              data-testid={`button-approve-${request.id}`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(request.id)}
                              disabled={rejectMutation.isPending}
                              className="bg-red-500/80 hover:bg-red-500"
                              data-testid={`button-reject-${request.id}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(request.id) && expandedDetails[request.id] && (
                        <tr className="bg-slate-800/50 border-t border-white/10">
                          <td colSpan={10} className="py-4 px-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {expandedDetails[request.id].nearSwapPoint !== null && (
                                <div className="space-y-1">
                                  <p className="text-slate-400 text-xs">결제 Swap Point</p>
                                  <p className="text-teal-300 font-semibold">{expandedDetails[request.id].nearSwapPoint!.toFixed(4)}</p>
                                </div>
                              )}
                              {expandedDetails[request.id].nearForwardRateError ? (
                                <div className="space-y-1 border border-red-500/30 rounded p-2 bg-red-500/10">
                                  <p className="text-slate-400 text-xs">결제 선도환율</p>
                                  <div className="flex items-center gap-1 text-red-400 text-xs">
                                    <AlertCircle className="w-3 h-3" />
                                    <p>{expandedDetails[request.id].nearForwardRateError}</p>
                                  </div>
                                </div>
                              ) : expandedDetails[request.id].nearForwardRate !== undefined && (
                                <div className="space-y-1">
                                  <p className="text-slate-400 text-xs">결제 선도환율</p>
                                  <p className="text-blue-300 font-semibold">{expandedDetails[request.id].nearForwardRate!.toFixed(4)}</p>
                                </div>
                              )}
                              {expandedDetails[request.id].farSwapPoint !== null && (
                                <div className="space-y-1">
                                  <p className="text-slate-400 text-xs">만기 Swap Point</p>
                                  <p className="text-teal-300 font-semibold">{expandedDetails[request.id].farSwapPoint!.toFixed(4)}</p>
                                </div>
                              )}
                              {expandedDetails[request.id].farForwardRateError ? (
                                <div className="space-y-1 border border-red-500/30 rounded p-2 bg-red-500/10">
                                  <p className="text-slate-400 text-xs">만기 선도환율</p>
                                  <div className="flex items-center gap-1 text-red-400 text-xs">
                                    <AlertCircle className="w-3 h-3" />
                                    <p>{expandedDetails[request.id].farForwardRateError}</p>
                                  </div>
                                </div>
                              ) : expandedDetails[request.id].farForwardRate !== undefined && (
                                <div className="space-y-1">
                                  <p className="text-slate-400 text-xs">만기 선도환율</p>
                                  <p className="text-blue-300 font-semibold">{expandedDetails[request.id].farForwardRate!.toFixed(4)}</p>
                                </div>
                              )}
                              {expandedDetails[request.id].swapPointDifference !== null && (
                                <div className="space-y-1">
                                  <p className="text-slate-400 text-xs">Swap Point 차액</p>
                                  <p className="text-teal-300 font-semibold">{expandedDetails[request.id].swapPointDifference!.toFixed(4)}</p>
                                </div>
                              )}
                              {expandedDetails[request.id].spread !== null && (
                                <div className="space-y-1">
                                  <p className="text-slate-400 text-xs">스프레드</p>
                                  <p className="text-orange-400 font-semibold">{expandedDetails[request.id].spread!.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>승인 대기 중인 호가 요청이 없습니다.</p>
            </div>
          )}
          </CardContent>
        </Card>
          
        {/* Auto Approval Settings */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10">
            <CardTitle className="text-white text-2xl">자동 승인 설정</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSaveAutoApproval} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-300">고객 선택</Label>
                  <select
                    value={autoApprovalUserId}
                    onChange={(e) => setAutoApprovalUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                  <Label className="text-slate-300">자동 승인 한도 (USD)</Label>
                  <Input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="50000"
                    className="bg-slate-700/50 border-slate-600 text-white"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-slate-300">승인 시간 (분)</Label>
                  <Input
                    type="number"
                    value={timeWindowMinutes}
                    onChange={(e) => setTimeWindowMinutes(e.target.value)}
                    placeholder="30"
                    className="bg-slate-700/50 border-slate-600 text-white"
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
                  <Label htmlFor="autoApproval" className="text-slate-300">자동 승인 활성화</Label>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white"
                  disabled={saveAutoApprovalMutation.isPending || !autoApprovalUserId || !maxAmount}
                >
                  {saveAutoApprovalMutation.isPending ? "저장 중..." : "설정 저장"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
