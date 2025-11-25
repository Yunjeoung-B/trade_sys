import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount } from "@/lib/currencyUtils";

interface QuoteRequest {
  id: string;
  userId: string;
  productType: string;
  currencyPairId: string;
  direction: "BUY" | "SELL";
  amount: string;
  tenor?: string;
  nearDate?: string;
  farDate?: string;
  nearAmount?: string;
  farAmount?: string;
  quotedRate?: string;
  status: "REQUESTED" | "QUOTE_READY" | "CONFIRMED" | "EXPIRED";
  createdAt: string;
  expiresAt?: string;
}

interface CurrencyPair {
  id: string;
  baseCode: string;
  quoteCode: string;
}

export default function TradeManagement() {
  const [filterDate, setFilterDate] = useState<string>("");
  const [currencyPairs, setCurrencyPairs] = useState<Map<string, CurrencyPair>>(new Map());

  // Fetch currency pairs for display
  const { data: currencyPairsList } = useQuery({
    queryKey: ["/api/currency-pairs"],
  });

  useEffect(() => {
    if (currencyPairsList && Array.isArray(currencyPairsList)) {
      const map = new Map();
      (currencyPairsList as CurrencyPair[]).forEach((pair: CurrencyPair) => {
        map.set(pair.id, pair);
      });
      setCurrencyPairs(map);
    }
  }, [currencyPairsList]);

  // Fetch completed trades (CONFIRMED status only)
  const { data: allTrades = [], isLoading } = useQuery({
    queryKey: ["/api/quote-requests", "CONFIRMED"],
    queryFn: async () => {
      const res = await fetch("/api/quote-requests?status=CONFIRMED");
      if (!res.ok) throw new Error("Failed to fetch trades");
      return res.json();
    },
  });

  // Filter by date if provided
  const filteredTrades = filterDate
    ? allTrades.filter((trade: QuoteRequest) => {
        const tradeDate = format(parseISO(trade.createdAt), "yyyy-MM-dd");
        return tradeDate === filterDate;
      })
    : allTrades;

  const getCurrencyPairDisplay = (currencyPairId: string) => {
    const pair = currencyPairs.get(currencyPairId);
    return pair ? `${pair.baseCode}/${pair.quoteCode}` : currencyPairId;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return {
          label: "체결완료",
          color: "bg-green-100 text-green-800 border-green-200",
        };
      default:
        return {
          label: status,
          color: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  const formatAmount = (amount: string | number) => {
    return formatCurrencyAmount(Math.abs(Number(amount)), "USD");
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            거래 관리
          </h1>
          <p className="text-gray-600">체결완료된 거래 내역 조회</p>
        </div>

        {/* Filters */}
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg rounded-2xl mb-6">
          <div className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Label className="text-sm font-medium">거래일:</Label>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="rounded-lg"
                />
              </div>
              {filterDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterDate("")}
                  className="rounded-lg"
                >
                  초기화
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Trades Table */}
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
          <div className="p-6">
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="text-center font-semibold">거래시간</TableHead>
                    <TableHead className="text-center font-semibold">고객</TableHead>
                    <TableHead className="text-center font-semibold">상품</TableHead>
                    <TableHead className="text-center font-semibold">통화</TableHead>
                    <TableHead className="text-center font-semibold">방향</TableHead>
                    <TableHead className="text-center font-semibold">금액</TableHead>
                    <TableHead className="text-center font-semibold">호가</TableHead>
                    <TableHead className="text-center font-semibold">기간</TableHead>
                    <TableHead className="text-center font-semibold">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : filteredTrades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-4">📊</div>
                        <p>해당 조건의 체결 거래가 없습니다</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrades.map((trade: QuoteRequest) => {
                      const statusConfig = getStatusConfig(trade.status);
                      const tradeTime = format(parseISO(trade.createdAt), "HH:mm:ss");
                      const tradeDate = format(parseISO(trade.createdAt), "yyyy-MM-dd");
                      const tenor = trade.tenor || "-";
                      
                      return (
                        <TableRow 
                          key={trade.id} 
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <TableCell className="text-center text-sm font-medium">
                            <div className="text-gray-900">{tradeTime}</div>
                            <div className="text-xs text-gray-500">{tradeDate}</div>
                          </TableCell>
                          <TableCell className="text-center font-medium text-sm">
                            {trade.userId}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {trade.productType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium text-sm">
                            {getCurrencyPairDisplay(trade.currencyPairId)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn(
                              "text-xs font-semibold",
                              trade.direction === "BUY"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-blue-100 text-blue-700 border-blue-200"
                            )}>
                              {trade.direction === "BUY" ? "매입" : "매출"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium text-sm">
                            {formatAmount(trade.amount)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm font-medium">
                            {trade.quotedRate ? parseFloat(trade.quotedRate).toFixed(4) : "-"}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {tenor}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn("border text-xs", statusConfig.color)}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[
            { 
              label: "전체 체결", 
              count: allTrades.length, 
              color: "bg-blue-500",
              icon: "📊"
            },
            { 
              label: "오늘 체결", 
              count: allTrades.filter((t: QuoteRequest) => {
                const today = format(new Date(), "yyyy-MM-dd");
                const tradeDate = format(parseISO(t.createdAt), "yyyy-MM-dd");
                return tradeDate === today;
              }).length, 
              color: "bg-green-500",
              icon: "✅"
            },
            { 
              label: "필터링된 거래", 
              count: filteredTrades.length, 
              color: "bg-purple-500",
              icon: "🔍"
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
  );
}
