import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Filter, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount } from "@/lib/currencyUtils";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/hooks/use-toast";

interface TradeRequest {
  id: string;
  requestTime: Date;
  clientId: string;
  productType: string;
  currency: string;
  nearDate?: Date;
  nearAmount?: number;
  farDate?: Date;
  farAmount?: number;
  status: "REQUESTED" | "QUOTE_READY" | "CONFIRMED" | "EXPIRED";
  hedgeCompleted: boolean;
  nearSpread?: number;
  farSpread?: number;
  direction: "BUY" | "SELL";
  amount: number;
}

// Mock data for demonstration
const mockTradeRequests: TradeRequest[] = [
  {
    id: "1",
    requestTime: new Date("2025-08-02T10:23:12"),
    clientId: "userA",
    productType: "SWAP",
    currency: "USD",
    nearDate: new Date("2025-08-02"),
    nearAmount: 1000000,
    farDate: new Date("2025-08-16"),
    farAmount: -1000000,
    status: "QUOTE_READY",
    hedgeCompleted: true,
    nearSpread: 2.1,
    farSpread: 3.0,
    direction: "BUY",
    amount: 1000000
  },
  {
    id: "2",
    requestTime: new Date("2025-08-02T10:25:00"),
    clientId: "userB",
    productType: "FORWARD",
    currency: "USD",
    farDate: new Date("2025-08-20"),
    farAmount: 2000000,
    status: "CONFIRMED",
    hedgeCompleted: false,
    nearSpread: 2.5,
    direction: "BUY",
    amount: 2000000
  },
  {
    id: "3",
    requestTime: new Date("2025-08-02T09:45:30"),
    clientId: "userC",
    productType: "SWAP",
    currency: "EUR",
    nearDate: new Date("2025-08-02"),
    nearAmount: -750000,
    farDate: new Date("2025-09-15"),
    farAmount: 750000,
    status: "REQUESTED",
    hedgeCompleted: false,
    nearSpread: 1.8,
    farSpread: 2.7,
    direction: "SELL",
    amount: 750000
  },
  {
    id: "4",
    requestTime: new Date("2025-08-02T11:15:22"),
    clientId: "userD",
    productType: "FORWARD",
    currency: "JPY",
    farDate: new Date("2025-08-30"),
    farAmount: -100000000,
    status: "EXPIRED",
    hedgeCompleted: true,
    nearSpread: 3.2,
    direction: "SELL",
    amount: 100000000
  }
];

export default function TradeManagement() {
  const [activeTab, setActiveTab] = useState("all");
  const [hedgeFilter, setHedgeFilter] = useState("all");
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [trades, setTrades] = useState<TradeRequest[]>(mockTradeRequests);
  const [selectedTrade, setSelectedTrade] = useState<TradeRequest | null>(null);
  const [editingSpreads, setEditingSpreads] = useState({
    nearSpread: "",
    farSpread: ""
  });
  const { toast } = useToast();
  
  // Debug logs
  console.log("TradeManagement rendering:", {
    tradesCount: trades.length,
    activeTab,
    hedgeFilter,
    confirmedOnly
  });

  const getStatusConfig = (status: TradeRequest["status"]) => {
    switch (status) {
      case "REQUESTED":
        return {
          icon: "💬",
          label: "가격요청",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200"
        };
      case "QUOTE_READY":
        return {
          icon: "✅",
          label: "가격확인가능",
          color: "bg-green-100 text-green-800 border-green-200"
        };
      case "CONFIRMED":
        return {
          icon: "💼",
          label: "체결완료",
          color: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case "EXPIRED":
        return {
          icon: "⏰",
          label: "거래시한만료",
          color: "bg-gray-100 text-gray-800 border-gray-200"
        };
    }
  };

  const filterTrades = () => {
    let filtered = trades;

    // Status filter
    if (activeTab !== "all") {
      filtered = filtered.filter(trade => {
        switch (activeTab) {
          case "requested": return trade.status === "REQUESTED";
          case "quote_ready": return trade.status === "QUOTE_READY";
          case "confirmed": return trade.status === "CONFIRMED";
          case "expired": return trade.status === "EXPIRED";
          default: return true;
        }
      });
    }

    // Hedge filter
    if (hedgeFilter !== "all") {
      filtered = filtered.filter(trade => 
        hedgeFilter === "completed" ? trade.hedgeCompleted : !trade.hedgeCompleted
      );
    }

    // Confirmed only filter
    if (confirmedOnly) {
      filtered = filtered.filter(trade => trade.status === "CONFIRMED");
    }

    return filtered;
  };

  const handleSpreadEdit = (trade: TradeRequest) => {
    setSelectedTrade(trade);
    setEditingSpreads({
      nearSpread: trade.nearSpread?.toString() || "",
      farSpread: trade.farSpread?.toString() || ""
    });
  };

  const handleSpreadSave = () => {
    if (!selectedTrade) return;

    setTrades(prevTrades =>
      prevTrades.map(trade =>
        trade.id === selectedTrade.id
          ? {
              ...trade,
              nearSpread: editingSpreads.nearSpread ? parseFloat(editingSpreads.nearSpread) : undefined,
              farSpread: editingSpreads.farSpread ? parseFloat(editingSpreads.farSpread) : undefined
            }
          : trade
      )
    );

    toast({
      title: "스프레드 수정 완료",
      description: `${selectedTrade.clientId}의 ${selectedTrade.productType} 거래 스프레드가 수정되었습니다.`,
    });

    setSelectedTrade(null);
  };

  const getTabCount = (status: string) => {
    let filtered = trades;
    
    if (status !== "all") {
      filtered = filtered.filter(trade => {
        switch (status) {
          case "requested": return trade.status === "REQUESTED";
          case "quote_ready": return trade.status === "QUOTE_READY";  
          case "confirmed": return trade.status === "CONFIRMED";
          case "expired": return trade.status === "EXPIRED";
          default: return true;
        }
      });
    }
    
    return filtered.length;
  };

  const formatAmount = (amount: number, currency: string, isPositive?: boolean) => {
    const sign = isPositive !== undefined ? (isPositive ? "+" : "-") : (amount >= 0 ? "+" : "-");
    return `${sign}${formatCurrencyAmount(Math.abs(amount), currency)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Sidebar />
      
      <div className="lg:ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Trade Management
            </h1>
            <p className="text-gray-600">관리자 전용 거래 요청 관리 및 스프레드 조정</p>
          </div>

          {/* Filters */}
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg rounded-2xl mb-6">
            <div className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Label className="text-sm font-medium">헤지 상태:</Label>
                  <Select value={hedgeFilter} onValueChange={setHedgeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="completed">헤지완료</SelectItem>
                      <SelectItem value="incomplete">헤지미완료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  variant={confirmedOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConfirmedOnly(!confirmedOnly)}
                  className="rounded-xl"
                >
                  체결된 거래만 보기
                </Button>
              </div>
            </div>
          </Card>

          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    전체보기
                    <Badge variant="secondary" className="text-xs">
                      {trades.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="requested" className="flex items-center gap-2">
                    가격요청
                    <Badge variant="secondary" className="text-xs">
                      {trades.filter(t => t.status === "REQUESTED").length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="quote_ready" className="flex items-center gap-2">
                    가격확인가능
                    <Badge variant="secondary" className="text-xs">
                      {trades.filter(t => t.status === "QUOTE_READY").length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="confirmed" className="flex items-center gap-2">
                    체결완료
                    <Badge variant="secondary" className="text-xs">
                      {trades.filter(t => t.status === "CONFIRMED").length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="expired" className="flex items-center gap-2">
                    거래시한만료
                    <Badge variant="secondary" className="text-xs">
                      {trades.filter(t => t.status === "EXPIRED").length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                {["all", "requested", "quote_ready", "confirmed", "expired"].map(tabValue => (
                  <TabsContent key={tabValue} value={tabValue}>
                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50">
                            <TableHead className="text-center font-semibold">요청시간</TableHead>
                            <TableHead className="text-center font-semibold">고객ID</TableHead>
                            <TableHead className="text-center font-semibold">상품</TableHead>
                            <TableHead className="text-center font-semibold">통화</TableHead>
                            <TableHead className="text-center font-semibold">NEAR결제일</TableHead>
                            <TableHead className="text-center font-semibold">NEAR금액</TableHead>
                            <TableHead className="text-center font-semibold">FAR결제일</TableHead>
                            <TableHead className="text-center font-semibold">FAR금액</TableHead>
                            <TableHead className="text-center font-semibold">상태</TableHead>
                            <TableHead className="text-center font-semibold">헤지</TableHead>
                            <TableHead className="text-center font-semibold">스프레드 조정</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterTrades().map((trade) => {
                            const statusConfig = getStatusConfig(trade.status);
                            return (
                              <TableRow 
                                key={trade.id} 
                                className="hover:bg-gray-50/50 transition-colors"
                              >
                                <TableCell className="text-center text-sm">
                                  {format(trade.requestTime, "HH:mm:ss", { locale: ko })}
                                </TableCell>
                                <TableCell className="text-center font-medium">
                                  {trade.clientId}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {trade.productType}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center font-medium">
                                  {trade.currency}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {trade.nearDate ? format(trade.nearDate, "yyyy-MM-dd", { locale: ko }) : "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {trade.nearAmount ? (
                                    <span className={cn(
                                      "font-medium",
                                      trade.nearAmount > 0 ? "text-red-600" : "text-blue-600"
                                    )}>
                                      {formatAmount(trade.nearAmount, trade.currency)}
                                    </span>
                                  ) : "-"}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {trade.farDate ? format(trade.farDate, "yyyy-MM-dd", { locale: ko }) : "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {trade.farAmount ? (
                                    <span className={cn(
                                      "font-medium",
                                      trade.farAmount > 0 ? "text-red-600" : "text-blue-600"
                                    )}>
                                      {formatAmount(trade.farAmount, trade.currency)}
                                    </span>
                                  ) : (
                                    trade.productType === "FORWARD" && trade.amount ? (
                                      <span className={cn(
                                        "font-medium",
                                        trade.direction === "BUY" ? "text-red-600" : "text-blue-600"
                                      )}>
                                        {formatAmount(trade.amount, trade.currency, trade.direction === "BUY")}
                                      </span>
                                    ) : "-"
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={cn("border text-xs", statusConfig.color)}>
                                    {statusConfig.icon} {statusConfig.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {trade.hedgeCompleted ? (
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                      ✅ 헤지완료
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                                      ❌ 헤지미완료
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleSpreadEdit(trade)}
                                        className="rounded-xl text-xs"
                                      >
                                        <Edit className="w-3 h-3 mr-1" />
                                        수정
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                      <DialogHeader>
                                        <DialogTitle>스프레드 수정</DialogTitle>
                                        <p className="text-sm text-gray-600">
                                          {trade.clientId}의 {trade.productType} {trade.currency} 거래
                                        </p>
                                      </DialogHeader>
                                      <div className="grid gap-4 py-4">
                                        {trade.productType === "SWAP" && (
                                          <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="near-spread" className="text-right">
                                              NEAR 스프레드
                                            </Label>
                                            <Input
                                              id="near-spread"
                                              type="number"
                                              step="0.1"
                                              value={editingSpreads.nearSpread}
                                              onChange={(e) => setEditingSpreads(prev => ({
                                                ...prev,
                                                nearSpread: e.target.value
                                              }))}
                                              className="col-span-3"
                                              placeholder="2.1"
                                            />
                                          </div>
                                        )}
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="far-spread" className="text-right">
                                            {trade.productType === "SWAP" ? "FAR" : ""} 스프레드
                                          </Label>
                                          <Input
                                            id="far-spread"
                                            type="number"
                                            step="0.1"
                                            value={editingSpreads.farSpread}
                                            onChange={(e) => setEditingSpreads(prev => ({
                                              ...prev,
                                              farSpread: e.target.value
                                            }))}
                                            className="col-span-3"
                                            placeholder="3.0"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setSelectedTrade(null)}>
                                          취소
                                        </Button>
                                        <Button onClick={handleSpreadSave}>
                                          저장
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      
                      {filterTrades().length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <div className="text-4xl mb-4">📊</div>
                          <p>해당 조건의 거래 요청이 없습니다</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { 
                label: "전체 거래", 
                count: trades.length, 
                color: "bg-blue-500",
                icon: "📊"
              },
              { 
                label: "헤지완료", 
                count: trades.filter(t => t.hedgeCompleted).length, 
                color: "bg-green-500",
                icon: "✅"
              },
              { 
                label: "체결완료", 
                count: trades.filter(t => t.status === "CONFIRMED").length, 
                color: "bg-purple-500",
                icon: "💼"
              },
              { 
                label: "만료된 거래", 
                count: trades.filter(t => t.status === "EXPIRED").length, 
                color: "bg-gray-500",
                icon: "⏰"
              }
            ].map((stat, index) => (
              <Card key={index} className="backdrop-blur-sm bg-white/60 border-0 shadow-lg rounded-2xl">
                <div className="p-4 text-center">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-gray-800">{stat.count}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                  <div className={cn("w-full h-1 rounded-full mt-2", stat.color)}></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}