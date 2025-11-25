import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Clock, Target, TrendingUp, TrendingDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount } from "@/lib/currencyUtils";
import { useLocation } from "wouter";

interface QuoteRequestItem {
  id: string;
  requestTime: Date;
  productType: string;
  currency: string;
  amount: number;
  maturityDate: Date;
  status: "REQUESTED" | "QUOTE_READY" | "CONFIRMED" | "EXPIRED";
  remainingTime?: string;
  quotedRate?: number;
  expiresAt?: Date;
  direction: "BUY" | "SELL";
}

interface LimitOrderItem {
  id: string;
  orderTime: Date;
  productType: string;
  currency: string;
  amount: number;
  limitRate: number;
  currentRate?: number;
  validUntil: Date | string;
  status: "PENDING" | "FILLED" | "CANCELLED" | "EXPIRED";
  remainingTime?: string;
  direction: "BUY" | "SELL";
  validityType: "DAY" | "TIME";
}

const mockQuoteRequests: QuoteRequestItem[] = [
  {
    id: "1",
    requestTime: new Date("2025-08-02T10:23:12"),
    productType: "SWAP",
    currency: "USD",
    amount: 1000000,
    maturityDate: new Date("2025-08-16"),
    status: "REQUESTED",
    direction: "BUY"
  },
  {
    id: "2", 
    requestTime: new Date("2025-08-02T10:24:03"),
    productType: "SWAP",
    currency: "USD", 
    amount: 500000,
    maturityDate: new Date("2025-08-10"),
    status: "QUOTE_READY",
    remainingTime: "02:32",
    quotedRate: 1385.75,
    expiresAt: new Date("2025-08-02T12:54:03"),
    direction: "SELL"
  },
  {
    id: "3",
    requestTime: new Date("2025-08-02T10:21:01"), 
    productType: "SWAP",
    currency: "USD",
    amount: 2000000,
    maturityDate: new Date("2025-08-12"),
    status: "CONFIRMED",
    quotedRate: 1386.20,
    expiresAt: new Date("2025-08-02T13:21:01"),
    direction: "BUY"
  },
  {
    id: "4",
    requestTime: new Date("2025-08-02T09:45:30"),
    productType: "FORWARD", 
    currency: "EUR",
    amount: 750000,
    maturityDate: new Date("2025-09-15"),
    status: "EXPIRED",
    expiresAt: new Date("2025-08-02T10:45:30"),
    direction: "SELL"
  },
  {
    id: "5",
    requestTime: new Date("2025-08-02T11:15:22"),
    productType: "FORWARD",
    currency: "JPY", 
    amount: 100000000,
    maturityDate: new Date("2025-08-20"),
    status: "QUOTE_READY",
    remainingTime: "04:12",
    quotedRate: 9.24,
    expiresAt: new Date("2025-08-02T13:27:22"),
    direction: "BUY"
  }
];

const mockLimitOrders: LimitOrderItem[] = [
  {
    id: "L1",
    orderTime: new Date("2025-08-02T09:15:00"),
    productType: "SPOT",
    currency: "USD",
    amount: 500000,
    limitRate: 1380.00,
    currentRate: 1385.50,
    validUntil: "15:30",
    status: "PENDING",
    remainingTime: "06:15:00",
    direction: "BUY",
    validityType: "TIME"
  },
  {
    id: "L2",
    orderTime: new Date("2025-08-02T10:30:00"),
    productType: "SPOT",
    currency: "EUR",
    amount: 300000,
    limitRate: 1495.50,
    currentRate: 1498.20,
    validUntil: new Date("2025-08-02T18:00:00"),
    status: "PENDING",
    remainingTime: "07:30:00",
    direction: "SELL",
    validityType: "DAY"
  },
  {
    id: "L3",
    orderTime: new Date("2025-08-02T08:45:00"),
    productType: "SPOT",
    currency: "JPY",
    amount: 50000000,
    limitRate: 9.20,
    currentRate: 9.24,
    validUntil: new Date("2025-08-02T15:00:00"),
    status: "FILLED",
    direction: "BUY",
    validityType: "TIME"
  },
  {
    id: "L4",
    orderTime: new Date("2025-08-01T14:20:00"),
    productType: "SPOT",
    currency: "USD",
    amount: 1000000,
    limitRate: 1390.00,
    validUntil: new Date("2025-08-01T17:00:00"),
    status: "EXPIRED",
    direction: "SELL",
    validityType: "DAY"
  },
  {
    id: "L5",
    orderTime: new Date("2025-08-02T11:00:00"),
    productType: "SPOT",
    currency: "USD",
    amount: 750000,
    limitRate: 1383.00,
    currentRate: 1385.50,
    validUntil: "14:00",
    status: "CANCELLED",
    direction: "BUY",
    validityType: "TIME"
  }
];

export default function TradeStatus() {
  const [, setLocation] = useLocation();
  const [mainTab, setMainTab] = useState<"quote" | "limit">("quote");
  const [quoteTab, setQuoteTab] = useState("requested");
  const [limitTab, setLimitTab] = useState("pending");
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequestItem[]>(mockQuoteRequests);
  const [limitOrders, setLimitOrders] = useState<LimitOrderItem[]>(mockLimitOrders);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteRequests(prev => 
        prev.map(item => {
          if (item.status === "QUOTE_READY" && item.remainingTime) {
            const [minutes, seconds] = item.remainingTime.split(":").map(Number);
            const totalSeconds = minutes * 60 + seconds - 1;
            
            if (totalSeconds <= 0) {
              return { ...item, status: "EXPIRED" as const, remainingTime: undefined };
            }
            
            const newMinutes = Math.floor(totalSeconds / 60);
            const newSeconds = totalSeconds % 60;
            return { 
              ...item, 
              remainingTime: `${newMinutes.toString().padStart(2, '0')}:${newSeconds.toString().padStart(2, '0')}` 
            };
          }
          return item;
        })
      );

      setLimitOrders(prev =>
        prev.map(order => {
          if (order.status === "PENDING" && order.remainingTime) {
            const parts = order.remainingTime.split(":");
            let totalSeconds = 0;
            
            if (parts.length === 3) {
              const [hours, minutes, seconds] = parts.map(Number);
              totalSeconds = hours * 3600 + minutes * 60 + seconds - 1;
            } else {
              const [minutes, seconds] = parts.map(Number);
              totalSeconds = minutes * 60 + seconds - 1;
            }
            
            if (totalSeconds <= 0) {
              return { ...order, status: "EXPIRED" as const, remainingTime: undefined };
            }
            
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            const timeStr = hours > 0 
              ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
              : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            return { ...order, remainingTime: timeStr };
          }
          return order;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getQuoteStatusConfig = (status: QuoteRequestItem["status"]) => {
    switch (status) {
      case "REQUESTED":
        return {
          icon: "⏳",
          label: "대기중",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          buttonLabel: "🔒",
          buttonDisabled: true
        };
      case "QUOTE_READY":
        return {
          icon: "✅",
          label: "가격확인가능", 
          color: "bg-green-100 text-green-800 border-green-200",
          buttonLabel: "🔍 가격 보기",
          buttonDisabled: false
        };
      case "CONFIRMED":
        return {
          icon: "💼",
          label: "체결완료",
          color: "bg-blue-100 text-blue-800 border-blue-200", 
          buttonLabel: "상세보기",
          buttonDisabled: false
        };
      case "EXPIRED":
        return {
          icon: "⏰",
          label: "만료됨",
          color: "bg-gray-100 text-gray-800 border-gray-200",
          buttonLabel: "만료됨",
          buttonDisabled: true
        };
    }
  };

  const getLimitStatusConfig = (status: LimitOrderItem["status"]) => {
    switch (status) {
      case "PENDING":
        return {
          icon: "⏳",
          label: "대기중",
          color: "bg-blue-100 text-blue-800 border-blue-200",
          buttonLabel: "취소",
          buttonDisabled: false
        };
      case "FILLED":
        return {
          icon: "✅",
          label: "체결완료",
          color: "bg-green-100 text-green-800 border-green-200",
          buttonLabel: "상세보기",
          buttonDisabled: false
        };
      case "CANCELLED":
        return {
          icon: "❌",
          label: "취소됨",
          color: "bg-gray-100 text-gray-800 border-gray-200",
          buttonLabel: "취소됨",
          buttonDisabled: true
        };
      case "EXPIRED":
        return {
          icon: "⏰",
          label: "만료됨",
          color: "bg-red-100 text-red-800 border-red-200",
          buttonLabel: "만료됨",
          buttonDisabled: true
        };
    }
  };

  const filterQuoteRequests = (status: string) => {
    return quoteRequests.filter(item => {
      switch (status) {
        case "requested": return item.status === "REQUESTED";
        case "quote_ready": return item.status === "QUOTE_READY";
        case "confirmed": return item.status === "CONFIRMED";
        case "expired": return item.status === "EXPIRED";
        default: return true;
      }
    });
  };

  const filterLimitOrders = (status: string) => {
    return limitOrders.filter(order => {
      switch (status) {
        case "pending": return order.status === "PENDING";
        case "filled": return order.status === "FILLED";
        case "cancelled": return order.status === "CANCELLED";
        case "expired": return order.status === "EXPIRED";
        default: return true;
      }
    });
  };

  const handleViewQuote = (item: QuoteRequestItem) => {
    if (item.status === "QUOTE_READY") {
      const page = item.productType.toLowerCase();
      setLocation(`/${page}?tradeId=${item.id}`);
    } else if (item.status === "CONFIRMED") {
      console.log("Show trade details for:", item.id);
    }
  };

  const handleCancelOrder = (order: LimitOrderItem) => {
    if (order.status === "PENDING") {
      setLimitOrders(prev => 
        prev.map(o => o.id === order.id ? { ...o, status: "CANCELLED" as const, remainingTime: undefined } : o)
      );
    }
  };

  const getQuoteTabCount = (status: string) => filterQuoteRequests(status).length;
  const getLimitTabCount = (status: string) => filterLimitOrders(status).length;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            거래 현황
          </h1>
          <p className="text-slate-300">시장가 주문 및 지정가 주문 현황을 확인하고 관리하세요</p>
        </div>

        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "quote" | "limit")}>
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-800/50">
            <TabsTrigger value="quote" className="flex items-center gap-2 data-[state=active]:bg-teal-600" data-testid="tab-quote-requests">
              💬 시장가 주문
              <Badge variant="secondary" className="text-xs">
                {quoteRequests.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="limit" className="flex items-center gap-2 data-[state=active]:bg-purple-600" data-testid="tab-limit-orders">
              🎯 지정가 주문
              <Badge variant="secondary" className="text-xs">
                {limitOrders.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quote">
            <Card className="backdrop-blur-sm bg-slate-800/50 border border-slate-700 shadow-xl rounded-3xl">
              <div className="p-6">
                <Tabs value={quoteTab} onValueChange={setQuoteTab}>
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="requested" className="flex items-center gap-2" data-testid="quote-tab-requested">
                      대기중
                      <Badge variant="secondary" className="text-xs">
                        {getQuoteTabCount("requested")}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="quote_ready" className="flex items-center gap-2" data-testid="quote-tab-ready">
                      가격확인가능
                      <Badge variant="secondary" className="text-xs">
                        {getQuoteTabCount("quote_ready")}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="expired" className="flex items-center gap-2" data-testid="quote-tab-expired">
                      만료됨
                      <Badge variant="secondary" className="text-xs">
                        {getQuoteTabCount("expired")}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="confirmed" className="flex items-center gap-2" data-testid="quote-tab-confirmed">
                      체결완료
                      <Badge variant="secondary" className="text-xs">
                        {getQuoteTabCount("confirmed")}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  {["requested", "quote_ready", "expired", "confirmed"].map(tabValue => (
                    <TabsContent key={tabValue} value={tabValue}>
                      <div className="rounded-2xl border border-slate-600 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-600">
                              <TableHead className="text-center font-semibold text-white">요청시간</TableHead>
                              <TableHead className="text-center font-semibold text-white">상품</TableHead>
                              <TableHead className="text-center font-semibold text-white">통화</TableHead>
                              <TableHead className="text-center font-semibold text-white">거래금액</TableHead>
                              <TableHead className="text-center font-semibold text-white">만기일</TableHead>
                              <TableHead className="text-center font-semibold text-white">가격만기</TableHead>
                              <TableHead className="text-center font-semibold text-white">상태</TableHead>
                              <TableHead className="text-center font-semibold text-white">남은시간</TableHead>
                              <TableHead className="text-center font-semibold text-white">작업</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filterQuoteRequests(tabValue).map((item) => {
                              const statusConfig = getQuoteStatusConfig(item.status);
                              return (
                                <TableRow 
                                  key={item.id} 
                                  className="hover:bg-slate-700/50 cursor-pointer transition-colors border-slate-600 text-white"
                                  data-testid={`quote-row-${item.id}`}
                                >
                                  <TableCell className="text-center">
                                    {format(item.requestTime, "HH:mm:ss", { locale: ko })}
                                  </TableCell>
                                  <TableCell className="text-center font-medium">
                                    {item.productType}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className={cn(
                                        "px-2 py-1 rounded-lg text-xs font-semibold",
                                        item.direction === "BUY" 
                                          ? "bg-red-100 text-red-700" 
                                          : "bg-blue-100 text-blue-700"
                                      )}>
                                        {item.direction}
                                      </span>
                                      <span>{item.currency}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {formatCurrencyAmount(item.amount, item.currency)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {format(item.maturityDate, "yyyy-MM-dd", { locale: ko })}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {item.expiresAt ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <Clock className="w-4 h-4 text-purple-500" />
                                        <span className="text-sm font-semibold text-purple-400">
                                          {format(item.expiresAt, "HH:mm", { locale: ko })}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={cn("border", statusConfig.color)}>
                                      {statusConfig.icon} {statusConfig.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {item.remainingTime ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <Clock className="w-4 h-4 text-orange-500" />
                                        <span className="font-mono text-orange-600 font-semibold">
                                          {item.remainingTime}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      size="sm"
                                      variant={statusConfig.buttonDisabled ? "outline" : "default"}
                                      disabled={statusConfig.buttonDisabled}
                                      onClick={() => handleViewQuote(item)}
                                      className={cn(
                                        "rounded-xl text-xs text-white",
                                        !statusConfig.buttonDisabled && item.status === "QUOTE_READY" && 
                                        "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
                                        statusConfig.buttonDisabled && "border-slate-500 text-slate-300"
                                      )}
                                      data-testid={`quote-button-${item.id}`}
                                    >
                                      {statusConfig.buttonLabel}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        
                        {filterQuoteRequests(tabValue).length === 0 && (
                          <div className="text-center py-12 text-slate-400">
                            <div className="text-4xl mb-4">📊</div>
                            <p>해당 상태의 시장가 주문이 없습니다</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="limit">
            <Card className="backdrop-blur-sm bg-slate-800/50 border border-slate-700 shadow-xl rounded-3xl">
              <div className="p-6">
                <Tabs value={limitTab} onValueChange={setLimitTab}>
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="pending" className="flex items-center gap-2" data-testid="limit-tab-pending">
                      대기중
                      <Badge variant="secondary" className="text-xs">
                        {getLimitTabCount("pending")}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="cancelled" className="flex items-center gap-2" data-testid="limit-tab-cancelled">
                      취소됨
                      <Badge variant="secondary" className="text-xs">
                        {getLimitTabCount("cancelled")}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="expired" className="flex items-center gap-2" data-testid="limit-tab-expired">
                      만료됨
                      <Badge variant="secondary" className="text-xs">
                        {getLimitTabCount("expired")}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="filled" className="flex items-center gap-2" data-testid="limit-tab-filled">
                      체결완료
                      <Badge variant="secondary" className="text-xs">
                        {getLimitTabCount("filled")}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  {["pending", "cancelled", "expired", "filled"].map(tabValue => (
                    <TabsContent key={tabValue} value={tabValue}>
                      <div className="rounded-2xl border border-slate-600 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-600">
                              <TableHead className="text-center font-semibold text-white">주문시간</TableHead>
                              <TableHead className="text-center font-semibold text-white">상품</TableHead>
                              <TableHead className="text-center font-semibold text-white">통화</TableHead>
                              <TableHead className="text-center font-semibold text-white">거래금액</TableHead>
                              <TableHead className="text-center font-semibold text-white">목표가격</TableHead>
                              <TableHead className="text-center font-semibold text-white">현재가격</TableHead>
                              <TableHead className="text-center font-semibold text-white">유효기간</TableHead>
                              <TableHead className="text-center font-semibold text-white">상태</TableHead>
                              <TableHead className="text-center font-semibold text-white">작업</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filterLimitOrders(tabValue).map((order) => {
                              const statusConfig = getLimitStatusConfig(order.status);
                              const isPriceFavorable = order.currentRate && (
                                (order.direction === "BUY" && order.currentRate <= order.limitRate) ||
                                (order.direction === "SELL" && order.currentRate >= order.limitRate)
                              );
                              
                              return (
                                <TableRow 
                                  key={order.id} 
                                  className="hover:bg-slate-700/50 cursor-pointer transition-colors border-slate-600 text-white"
                                  data-testid={`limit-row-${order.id}`}
                                >
                                  <TableCell className="text-center">
                                    {format(order.orderTime, "HH:mm:ss", { locale: ko })}
                                  </TableCell>
                                  <TableCell className="text-center font-medium">
                                    {order.productType}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className={cn(
                                        "px-2 py-1 rounded-lg text-xs font-semibold",
                                        order.direction === "BUY" 
                                          ? "bg-red-100 text-red-700" 
                                          : "bg-blue-100 text-blue-700"
                                      )}>
                                        {order.direction}
                                      </span>
                                      <span>{order.currency}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {formatCurrencyAmount(order.amount, order.currency)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Target className="w-4 h-4 text-purple-500" />
                                      <span className="font-semibold text-purple-400">
                                        {order.limitRate.toFixed(2)}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {order.currentRate ? (
                                      <div className="flex items-center justify-center gap-1">
                                        {isPriceFavorable ? (
                                          <TrendingDown className="w-4 h-4 text-green-500" />
                                        ) : (
                                          <TrendingUp className="w-4 h-4 text-orange-500" />
                                        )}
                                        <span className={cn(
                                          "font-semibold",
                                          isPriceFavorable ? "text-green-400" : "text-orange-400"
                                        )}>
                                          {order.currentRate.toFixed(2)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-sm text-slate-300">
                                        {typeof order.validUntil === 'string' 
                                          ? order.validUntil 
                                          : format(order.validUntil, "HH:mm", { locale: ko })}
                                      </span>
                                      {order.remainingTime && order.status === "PENDING" && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-orange-500" />
                                          <span className="font-mono text-xs text-orange-600 font-semibold">
                                            {order.remainingTime}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={cn("border", statusConfig.color)}>
                                      {statusConfig.icon} {statusConfig.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      size="sm"
                                      variant={statusConfig.buttonDisabled ? "outline" : "destructive"}
                                      disabled={statusConfig.buttonDisabled}
                                      onClick={() => handleCancelOrder(order)}
                                      className={cn(
                                        "rounded-xl text-xs",
                                        !statusConfig.buttonDisabled && order.status === "PENDING" && 
                                        "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
                                        statusConfig.buttonDisabled && "border-slate-500 text-slate-300"
                                      )}
                                      data-testid={`limit-button-${order.id}`}
                                    >
                                      {order.status === "PENDING" && <X className="w-3 h-3 mr-1" />}
                                      {statusConfig.buttonLabel}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        
                        {filterLimitOrders(tabValue).length === 0 && (
                          <div className="text-center py-12 text-slate-400">
                            <div className="text-4xl mb-4">🎯</div>
                            <p>해당 상태의 지정가 주문이 없습니다</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
