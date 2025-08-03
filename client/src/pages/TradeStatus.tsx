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
import { Clock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount } from "@/lib/currencyUtils";
import { useLocation } from "wouter";

interface TradeStatusItem {
  id: string;
  requestTime: Date;
  productType: string;
  currency: string;
  amount: number;
  maturityDate: Date;
  status: "REQUESTED" | "QUOTE_READY" | "CONFIRMED" | "EXPIRED";
  remainingTime?: string;
  quotedRate?: number;
  direction: "BUY" | "SELL";
}

// Mock data for demonstration
const mockTrades: TradeStatusItem[] = [
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
    direction: "BUY"
  }
];

export default function TradeStatus() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [trades, setTrades] = useState<TradeStatusItem[]>(mockTrades);
  


  // Update remaining time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTrades(prevTrades => 
        prevTrades.map(trade => {
          // Simulate countdown for QUOTE_READY status
          if (trade.status === "QUOTE_READY" && trade.remainingTime) {
            const [minutes, seconds] = trade.remainingTime.split(":").map(Number);
            const totalSeconds = minutes * 60 + seconds - 1;
            
            if (totalSeconds <= 0) {
              // Expire the trade
              return { ...trade, status: "EXPIRED" as const, remainingTime: undefined };
            }
            
            const newMinutes = Math.floor(totalSeconds / 60);
            const newSeconds = totalSeconds % 60;
            return { 
              ...trade, 
              remainingTime: `${newMinutes.toString().padStart(2, '0')}:${newSeconds.toString().padStart(2, '0')}` 
            };
          }
          return trade;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = (status: TradeStatusItem["status"]) => {
    switch (status) {
      case "REQUESTED":
        return {
          icon: "💬",
          label: "가격요청",
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
          label: "거래체결완료",
          color: "bg-blue-100 text-blue-800 border-blue-200", 
          buttonLabel: "상세보기",
          buttonDisabled: false
        };
      case "EXPIRED":
        return {
          icon: "⏰",
          label: "거래시한만료",
          color: "bg-gray-100 text-gray-800 border-gray-200",
          buttonLabel: "만료됨",
          buttonDisabled: true
        };
    }
  };

  const filterTrades = (status?: string) => {
    if (!status || status === "all") return trades;
    return trades.filter(trade => {
      switch (status) {
        case "requested": return trade.status === "REQUESTED";
        case "quote_ready": return trade.status === "QUOTE_READY";
        case "confirmed": return trade.status === "CONFIRMED";
        case "expired": return trade.status === "EXPIRED";
        default: return true;
      }
    });
  };

  const handleViewQuote = (trade: TradeStatusItem) => {
    if (trade.status === "QUOTE_READY") {
      // Navigate to the appropriate trading page with trade ID
      const page = trade.productType.toLowerCase();
      setLocation(`/${page}?tradeId=${trade.id}`);
    } else if (trade.status === "CONFIRMED") {
      // Show trade details
      console.log("Show trade details for:", trade.id);
    }
  };

  const handleRowDoubleClick = (trade: TradeStatusItem) => {
    const page = trade.productType.toLowerCase();
    setLocation(`/${page}?tradeId=${trade.id}`);
  };

  const getTabCount = (status: string) => {
    const filtered = filterTrades(status);
    return filtered.length;
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Trade Status
          </h1>
          <p className="text-slate-300">거래 요청 현황을 확인하고 관리하세요</p>
        </div>

        <Card className="backdrop-blur-sm bg-slate-800/50 border border-slate-700 shadow-xl rounded-3xl">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    전체보기
                    <Badge variant="secondary" className="text-xs">
                      {getTabCount("all")}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="requested" className="flex items-center gap-2">
                    가격요청
                    <Badge variant="secondary" className="text-xs">
                      {getTabCount("requested")}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="quote_ready" className="flex items-center gap-2">
                    가격확인가능
                    <Badge variant="secondary" className="text-xs">
                      {getTabCount("quote_ready")}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="confirmed" className="flex items-center gap-2">
                    거래체결완료
                    <Badge variant="secondary" className="text-xs">
                      {getTabCount("confirmed")}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="expired" className="flex items-center gap-2">
                    거래시한만료
                    <Badge variant="secondary" className="text-xs">
                      {getTabCount("expired")}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                {["all", "requested", "quote_ready", "confirmed", "expired"].map(tabValue => (
                  <TabsContent key={tabValue} value={tabValue}>
                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-600">
                            <TableHead className="text-center font-semibold text-white">요청시간</TableHead>
                            <TableHead className="text-center font-semibold text-white">상품</TableHead>
                            <TableHead className="text-center font-semibold text-white">통화</TableHead>
                            <TableHead className="text-center font-semibold text-white">거래금액</TableHead>
                            <TableHead className="text-center font-semibold text-white">만기일</TableHead>
                            <TableHead className="text-center font-semibold text-white">상태</TableHead>
                            <TableHead className="text-center font-semibold text-white">남은시간</TableHead>
                            <TableHead className="text-center font-semibold text-white">작업</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterTrades(tabValue).map((trade) => {
                            const statusConfig = getStatusConfig(trade.status);
                            return (
                              <TableRow 
                                key={trade.id} 
                                className="hover:bg-slate-700/50 cursor-pointer transition-colors border-slate-600 text-white"
                                onDoubleClick={() => handleRowDoubleClick(trade)}
                              >
                                <TableCell className="text-center">
                                  {format(trade.requestTime, "HH:mm:ss", { locale: ko })}
                                </TableCell>
                                <TableCell className="text-center font-medium">
                                  {trade.productType}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className={cn(
                                      "px-2 py-1 rounded-lg text-xs font-semibold",
                                      trade.direction === "BUY" 
                                        ? "bg-red-100 text-red-700" 
                                        : "bg-blue-100 text-blue-700"
                                    )}>
                                      {trade.direction}
                                    </span>
                                    <span>{trade.currency}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {formatCurrencyAmount(trade.amount, trade.currency)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {format(trade.maturityDate, "yyyy-MM-dd", { locale: ko })}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={cn("border", statusConfig.color)}>
                                    {statusConfig.icon} {statusConfig.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {trade.remainingTime ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <Clock className="w-4 h-4 text-orange-500" />
                                      <span className="font-mono text-orange-600 font-semibold">
                                        {trade.remainingTime}
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
                                    onClick={() => handleViewQuote(trade)}
                                    className={cn(
                                      "rounded-xl text-xs",
                                      !statusConfig.buttonDisabled && trade.status === "QUOTE_READY" && 
                                      "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                                    )}
                                  >
                                    {statusConfig.buttonLabel}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      
                      {filterTrades(tabValue).length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                          <div className="text-4xl mb-4">📊</div>
                          <p>해당 상태의 거래가 없습니다</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: "가격요청", count: getTabCount("requested"), color: "bg-yellow-500" },
              { label: "가격확인가능", count: getTabCount("quote_ready"), color: "bg-green-500" },
              { label: "거래체결완료", count: getTabCount("confirmed"), color: "bg-blue-500" },
              { label: "거래시한만료", count: getTabCount("expired"), color: "bg-gray-500" }
            ].map((stat, index) => (
              <Card key={index} className="backdrop-blur-sm bg-slate-800/50 border border-slate-700 shadow-lg rounded-2xl">
                <div className="p-4 text-center">
                  <div className={cn("w-3 h-3 rounded-full mx-auto mb-2", stat.color)}></div>
                  <div className="text-2xl font-bold text-white">{stat.count}</div>
                  <div className="text-sm text-slate-300">{stat.label}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
}