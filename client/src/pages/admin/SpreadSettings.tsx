import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SpreadSetting {
  id: string;
  productType: string;
  currencyPairId: string;
  groupType?: string;
  groupValue?: string;
  baseSpread: string;
  tenorSpreads?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CurrencyPair {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
}

export default function SpreadSettings() {
  const [productType, setProductType] = useState("");
  const [currencyPairId, setCurrencyPairId] = useState("");
  const [groupType, setGroupType] = useState("");
  const [groupValue, setGroupValue] = useState("");
  const [baseSpread, setBaseSpread] = useState("10");
  const [tenorSpreads, setTenorSpreads] = useState<Record<string, string>>({
    "ON": "3",      // ON&TN 3전
    "TN": "3",      // ON&TN 3전
    "SPOT": "10",   // SPOT~1M 기본 10전
    "1W": "10",     // SPOT~1M 기본 10전
    "2W": "10",     // SPOT~1M 기본 10전
    "1M": "10",     // SPOT~1M 기본 10전
    "2M": "20",     // 2M 20전
    "3M": "25",     // 3M 25전
    "6M": "30",     // 6M 30전
    "9M": "40",     // 9M 40전
    "12M": "50"     // 12M 50전
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: spreadSettings, isLoading } = useQuery<SpreadSetting[]>({
    queryKey: ["/api/spread-settings"],
  });

  const { data: currencyPairs } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  const createSpreadMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/spread-settings", data),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "스프레드 설정이 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/spread-settings"] });
      resetForm();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "스프레드 설정 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateSpreadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/spread-settings/${id}`, data),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "스프레드 설정이 업데이트되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/spread-settings"] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "스프레드 설정 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setProductType("");
    setCurrencyPairId("");
    setGroupType("");
    setGroupValue("");
    setBaseSpread("10");
    setTenorSpreads({
      "ON": "3",
      "TN": "3",
      "SPOT": "10",
      "1W": "10",
      "2W": "10",
      "1M": "10",
      "2M": "20",
      "3M": "25",
      "6M": "30",
      "9M": "40",
      "12M": "50"
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const spreadData = {
      productType,
      currencyPairId,
      groupType: groupType || null,
      groupValue: groupValue || null,
      baseSpread: parseFloat(baseSpread),
      tenorSpreads: Object.keys(tenorSpreads).some(key => tenorSpreads[key]) 
        ? Object.fromEntries(
            Object.entries(tenorSpreads).filter(([_, value]) => value !== "")
          )
        : null,
      isActive: true,
    };

    createSpreadMutation.mutate(spreadData);
  };

  const handleTenorSpreadChange = (tenor: string, value: string) => {
    setTenorSpreads(prev => ({
      ...prev,
      [tenor]: value
    }));
  };

  const getPairSymbol = (pairId: string) => {
    const pair = currencyPairs?.find(p => p.id === pairId);
    return pair?.symbol || "";
  };

  const getGroupTypeText = (type?: string) => {
    switch (type) {
      case "major": return "Major Group";
      case "mid": return "Mid Group";
      case "sub": return "Sub Group";
      default: return "전체";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">스프레드 설정</h2>
            <p className="text-slate-300">통화쌍, 상품, 고객 그룹별 스프레드를 설정할 수 있습니다.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spread Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>스프레드 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>상품 유형</Label>
                    <Select value={productType} onValueChange={setProductType}>
                      <SelectTrigger>
                        <SelectValue placeholder="상품 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spot">Spot</SelectItem>
                        <SelectItem value="Forward">Forward</SelectItem>
                        <SelectItem value="Swap">Swap</SelectItem>
                        <SelectItem value="MAR">MAR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>통화쌍</Label>
                    <Select value={currencyPairId} onValueChange={setCurrencyPairId}>
                      <SelectTrigger>
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
                  
                  <div>
                    <Label>고객 그룹 유형</Label>
                    <Select value={groupType} onValueChange={setGroupType}>
                      <SelectTrigger>
                        <SelectValue placeholder="그룹 유형 선택 (선택사항)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="major">Major Group</SelectItem>
                        <SelectItem value="mid">Mid Group</SelectItem>
                        <SelectItem value="sub">Sub Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {groupType && (
                    <div>
                      <Label>그룹 값</Label>
                      <Input
                        value={groupValue}
                        onChange={(e) => setGroupValue(e.target.value)}
                        placeholder="그룹 식별자 입력"
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>기본 스프레드 (전)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={baseSpread}
                      onChange={(e) => setBaseSpread(e.target.value)}
                      placeholder="예: 10"
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      기본 스프레드 단위: 전 (1 pip = 100전)
                    </div>
                  </div>
                  
                  <div>
                    <Label>만기별 가산 스프레드 (기본값 설정됨)</Label>
                    <div className="text-xs text-gray-500 mb-2">
                      ON&TN: 3전, SPOT~1M: 10전, 2M: 20전, 3M: 25전, 6M: 30전, 9M: 40전, 12M: 50전
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(tenorSpreads).map(([tenor, value]) => (
                        <div key={tenor} className="flex space-x-2 items-center">
                          <Label className="w-12 text-sm font-medium">{tenor}:</Label>
                          <Input
                            type="number"
                            step="1"
                            value={value}
                            onChange={(e) => handleTenorSpreadChange(tenor, e.target.value)}
                            placeholder="전"
                            className="flex-1"
                          />
                          <span className="text-xs text-gray-500">전</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full gradient-bg hover:opacity-90"
                    disabled={createSpreadMutation.isPending || !productType || !currencyPairId || !baseSpread}
                  >
                    {createSpreadMutation.isPending ? "저장 중..." : "스프레드 저장"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            {/* Current Spreads */}
            <Card>
              <CardHeader>
                <CardTitle>현재 스프레드</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">로딩 중...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b">
                          <th className="text-left py-2">상품</th>
                          <th className="text-left py-2">통화쌍</th>
                          <th className="text-left py-2">그룹</th>
                          <th className="text-right py-2">스프레드</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spreadSettings?.map((setting) => (
                          <tr key={setting.id} className="border-b hover:bg-gray-50">
                            <td className="py-2">{setting.productType}</td>
                            <td className="py-2">{getPairSymbol(setting.currencyPairId)}</td>
                            <td className="py-2 text-xs">
                              {getGroupTypeText(setting.groupType)}
                              {setting.groupValue && `: ${setting.groupValue}`}
                            </td>
                            <td className="text-right">
                              {parseFloat(setting.baseSpread).toFixed(1)} pips
                            </td>
                          </tr>
                        )) || (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-500">
                              설정된 스프레드가 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
