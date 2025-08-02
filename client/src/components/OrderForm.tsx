import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OrderFormProps {
  productType: "Spot" | "Forward" | "Swap" | "MAR";
  title: string;
  requiresApproval?: boolean;
  showTimeRestriction?: boolean;
}

interface CurrencyPair {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
}

export default function OrderForm({ 
  productType, 
  title, 
  requiresApproval = false,
  showTimeRestriction = false 
}: OrderFormProps) {
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [currencyPairId, setCurrencyPairId] = useState("");
  const [amount, setAmount] = useState("");
  const [tenor, setTenor] = useState("");
  const [nearDate, setNearDate] = useState("");
  const [farDate, setFarDate] = useState("");
  const [nearRate, setNearRate] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currencyPairs } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => {
      if (requiresApproval) {
        return apiRequest("POST", "/api/quote-requests", orderData);
      } else {
        return apiRequest("POST", "/api/trades", orderData);
      }
    },
    onSuccess: () => {
      toast({
        title: requiresApproval ? "호가 요청 완료" : "주문 완료",
        description: requiresApproval 
          ? "호가 요청이 접수되었습니다. 승인을 기다려주세요."
          : "주문이 성공적으로 접수되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "주문 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setAmount("");
    setTenor("");
    setNearDate("");
    setFarDate("");
    setNearRate("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (showTimeRestriction) {
      const now = new Date();
      if (now.getHours() >= 9) {
        toast({
          title: "주문 마감",
          description: "MAR 거래는 오전 9시 이전에만 주문 가능합니다.",
          variant: "destructive",
        });
        return;
      }
    }

    const orderData: any = {
      productType,
      currencyPairId,
      direction,
      amount: parseFloat(amount),
    };

    if (productType === "Forward" || productType === "Swap") {
      orderData.tenor = tenor;
    }

    if (productType === "Swap") {
      orderData.nearDate = nearDate;
      orderData.farDate = farDate;
      orderData.nearRate = parseFloat(nearRate);
    }

    createOrderMutation.mutate(orderData);
  };

  const isTimeRestricted = showTimeRestriction && new Date().getHours() >= 9;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {showTimeRestriction && (
            <Badge variant={isTimeRestricted ? "destructive" : "default"}>
              {isTimeRestricted ? "주문 마감" : "주문 가능"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>통화쌍</Label>
            <Select value={currencyPairId} onValueChange={setCurrencyPairId}>
              <SelectTrigger>
                <SelectValue placeholder="통화쌍을 선택하세요" />
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

          <div>
            <Label>거래 방향</Label>
            <div className="flex space-x-2 mt-2">
              <Button
                type="button"
                variant={direction === "BUY" ? "default" : "outline"}
                className={direction === "BUY" ? "bg-green-500 hover:bg-green-600" : ""}
                onClick={() => setDirection("BUY")}
              >
                BUY
              </Button>
              <Button
                type="button"
                variant={direction === "SELL" ? "default" : "outline"}
                className={direction === "SELL" ? "bg-red-500 hover:bg-red-600" : ""}
                onClick={() => setDirection("SELL")}
              >
                SELL
              </Button>
            </div>
          </div>

          {(productType === "Forward" || productType === "Swap") && (
            <div>
              <Label>만기일 (Tenor)</Label>
              <Select value={tenor} onValueChange={setTenor}>
                <SelectTrigger>
                  <SelectValue placeholder="만기일을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1M">1개월</SelectItem>
                  <SelectItem value="3M">3개월</SelectItem>
                  <SelectItem value="6M">6개월</SelectItem>
                  <SelectItem value="1Y">1년</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {productType === "Swap" && (
            <>
              <div>
                <Label>NEAR 거래일</Label>
                <Input
                  type="date"
                  value={nearDate}
                  onChange={(e) => setNearDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label>FAR 거래일</Label>
                <Input
                  type="date"
                  value={farDate}
                  onChange={(e) => setFarDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label>NEAR 환율 입력</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={nearRate}
                  onChange={(e) => setNearRate(e.target.value)}
                  placeholder="NEAR 환율"
                />
              </div>
            </>
          )}

          <div>
            <Label>거래 금액</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="금액 입력"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full gradient-bg hover:opacity-90"
            disabled={createOrderMutation.isPending || isTimeRestricted || !currencyPairId || !amount}
          >
            {createOrderMutation.isPending
              ? "처리 중..."
              : requiresApproval
              ? "호가 요청"
              : isTimeRestricted
              ? "주문 마감 (오전 9시 이후)"
              : "주문 실행"
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
