import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CurrencyPair, SwapPoint } from "@shared/schema";

interface TenorRow {
  tenor: string;
  settlementDate: string;
  daysFromSpot: number;
  swapPoint: string;
  bidPrice: string;
  askPrice: string;
}

const standardTenors = ["Spot", "ON", "TN", "1M", "2M", "3M", "6M", "9M", "12M"];

// Helper functions for date calculations
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = days;
  
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining--;
    }
  }
  
  return result;
}

function getSpotDate(baseDate: Date = new Date()): Date {
  return addBusinessDays(baseDate, 2);
}

function getDaysBetween(start: Date, end: Date): number {
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

function calculateSettlementDate(spotDate: Date, tenor: string): Date {
  const tenorUpper = tenor.toUpperCase();
  
  if (tenorUpper === "SPOT") return new Date(spotDate);
  if (tenorUpper === "ON") return addBusinessDays(new Date(), 1); // 익영업일 (T+1)
  if (tenorUpper === "TN") return new Date(spotDate); // TN은 Spot 기준일로 고정
  
  const monthMatch = tenorUpper.match(/^(\d+)M$/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1]);
    const result = new Date(spotDate);
    result.setMonth(result.getMonth() + months);
    
    while (result.getDay() === 0 || result.getDay() === 6) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  }
  
  return new Date(spotDate);
}

function calculateDaysFromSpot(spotDate: Date, tenor: string): number {
  const tenorUpper = tenor.toUpperCase();
  
  if (tenorUpper === "SPOT") return 0;
  
  // ON: 오늘과 익영업일의 실제 calendar days 차이
  if (tenorUpper === "ON") {
    const onDate = addBusinessDays(new Date(), 1);
    return getDaysBetween(new Date(), onDate);
  }
  
  // TN: ON의 만기일과 Spot의 실제 calendar days 차이
  if (tenorUpper === "TN") {
    const onDate = addBusinessDays(new Date(), 1);
    return getDaysBetween(onDate, spotDate);
  }
  
  const monthMatch = tenorUpper.match(/^(\d+)M$/);
  if (monthMatch) {
    const settlementDate = calculateSettlementDate(spotDate, tenor);
    return getDaysBetween(spotDate, settlementDate);
  }
  
  return 0;
}

export default function ForwardRateCalculator() {
  const { toast } = useToast();
  const [selectedPairId, setSelectedPairId] = useState<string>(() => {
    // Load from localStorage or use empty string
    return localStorage.getItem('forwardCalc_selectedPairId') || "";
  });
  const [spotRate, setSpotRate] = useState<string>("1350.00");
  const [lastSavedSpotRate, setLastSavedSpotRate] = useState<string>("");
  const [spotDate, setSpotDate] = useState<Date>(getSpotDate());
  const [tenorRows, setTenorRows] = useState<TenorRow[]>([]);
  const [targetSettlementDate, setTargetSettlementDate] = useState<string>("");
  const [targetDays, setTargetDays] = useState<string>("");
  const [calculatedResult, setCalculatedResult] = useState<{
    days: number;
    interpolatedSwapPoint: number;
    forwardRate: number;
  } | null>(null);

  const { data: currencyPairs = [] } = useQuery<CurrencyPair[]>({
    queryKey: ["/api/currency-pairs"],
  });

  // Auto-select first currency pair if none selected
  useEffect(() => {
    if (!selectedPairId && currencyPairs.length > 0) {
      const firstPairId = currencyPairs[0].id;
      setSelectedPairId(firstPairId);
      localStorage.setItem('forwardCalc_selectedPairId', firstPairId);
    }
  }, [currencyPairs, selectedPairId]);

  // Save selectedPairId to localStorage whenever it changes, and restore lastSavedSpotRate
  useEffect(() => {
    if (selectedPairId) {
      localStorage.setItem('forwardCalc_selectedPairId', selectedPairId);
      // Load the saved spot rate for this currency pair
      const saved = localStorage.getItem(`forwardCalc_lastSavedSpotRate_${selectedPairId}`);
      setLastSavedSpotRate(saved || "");
    }
  }, [selectedPairId]);

  const { data: swapPoints = [], isLoading: loadingSwapPoints } = useQuery<SwapPoint[]>({
    queryKey: ["/api/swap-points", selectedPairId],
    enabled: !!selectedPairId,
  });

  const saveMutation = useMutation({
    mutationFn: async (row: TenorRow) => {
      if (!row.swapPoint || isNaN(parseFloat(row.swapPoint))) {
        throw new Error("Swap Point 값을 입력해주세요.");
      }
      
      const data = {
        currencyPairId: selectedPairId,
        tenor: row.tenor,
        settlementDate: row.settlementDate ? new Date(row.settlementDate) : null,
        days: row.daysFromSpot,
        swapPoint: parseFloat(row.swapPoint),
        bidPrice: row.bidPrice ? parseFloat(row.bidPrice) : null,
        askPrice: row.askPrice ? parseFloat(row.askPrice) : null,
        source: "manual",
      };
      
      const response = await apiRequest("POST", "/api/swap-points", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "저장 실패");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/swap-points", selectedPairId] });
      toast({
        title: "저장 완료",
        description: "Swap Point가 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "저장 실패",
        description: error.message || "Swap Point 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const saveSpotMutation = useMutation({
    mutationFn: async () => {
      const rate = parseFloat(spotRate);
      if (isNaN(rate)) {
        throw new Error("유효한 Spot Rate를 입력해주세요.");
      }
      
      const data = {
        currencyPairId: selectedPairId,
        buyRate: rate,
        sellRate: rate,
        source: "manual",
      };
      
      // Return the rate so it can be used in onSuccess
      await apiRequest("POST", "/api/market-rates/manual", data);
      return rate; // Return the rate value
    },
    onSuccess: (savedRate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/market-rates"] });
      // Save the last saved spot rate to localStorage with currency pair ID
      const rateString = savedRate.toString();
      setLastSavedSpotRate(rateString);
      localStorage.setItem(`forwardCalc_lastSavedSpotRate_${selectedPairId}`, rateString);
      toast({
        title: "저장 완료 ✓",
        description: `Spot Rate ${rateString}이(가) 저장되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const newSpotDate = getSpotDate();
    setSpotDate(newSpotDate);
    
    // localStorage에서 저장된 tenorRows 복원
    const savedRows = localStorage.getItem('forwardCalc_tenorRows');
    
    const initialRows: TenorRow[] = standardTenors.map(tenor => {
      const settlementDate = calculateSettlementDate(newSpotDate, tenor);
      const daysFromSpot = calculateDaysFromSpot(newSpotDate, tenor);
      
      return {
        tenor,
        settlementDate: tenor === "Spot" ? formatDateForInput(newSpotDate) : formatDateForInput(settlementDate),
        daysFromSpot,
        swapPoint: "0",
        bidPrice: "",
        askPrice: "",
      };
    });
    
    // 저장된 값이 있으면 복원, 없으면 새로 생성
    if (savedRows) {
      try {
        const restored = JSON.parse(savedRows);
        setTenorRows(restored);
      } catch {
        setTenorRows(initialRows);
      }
    } else {
      setTenorRows(initialRows);
    }
  }, []);

  useEffect(() => {
    if (swapPoints.length > 0 && tenorRows.length > 0) {
      const updatedRows = tenorRows.map(row => {
        const existingPoint = swapPoints.find(sp => sp.tenor === row.tenor);
        if (existingPoint) {
          return {
            ...row,
            swapPoint: existingPoint.swapPoint || "0",
            bidPrice: existingPoint.bidPrice || "",
            askPrice: existingPoint.askPrice || "",
          };
        }
        return row;
      });
      setTenorRows(updatedRows);
      // DB에서 받은 데이터를 localStorage에 저장
      localStorage.setItem('forwardCalc_tenorRows', JSON.stringify(updatedRows));
    }
  }, [swapPoints]);

  // tenorRows 변경 시 localStorage 저장
  useEffect(() => {
    if (tenorRows.length > 0) {
      localStorage.setItem('forwardCalc_tenorRows', JSON.stringify(tenorRows));
    }
  }, [tenorRows]);

  const updateTenorField = (index: number, field: keyof TenorRow, value: string) => {
    const newRows = [...tenorRows];
    const row = newRows[index];
    
    if (field === "settlementDate") {
      row.settlementDate = value;
      if (value) {
        const days = getDaysBetween(spotDate, new Date(value));
        row.daysFromSpot = days;
      }
    } else if (field === "daysFromSpot") {
      const days = parseInt(value) || 0;
      row.daysFromSpot = days;
      const newDate = addDays(spotDate, days);
      row.settlementDate = formatDateForInput(newDate);
    } else {
      row[field] = value;
    }
    
    setTenorRows(newRows);
  };

  const handleTargetDateChange = (date: string) => {
    setTargetSettlementDate(date);
    if (date) {
      const days = getDaysBetween(spotDate, new Date(date));
      setTargetDays(days.toString());
    }
  };

  const handleTargetDaysChange = (days: string) => {
    setTargetDays(days);
    if (days) {
      const daysNum = parseInt(days) || 0;
      const targetDate = addDays(spotDate, daysNum);
      setTargetSettlementDate(formatDateForInput(targetDate));
    }
  };

  const calculateForwardRate = () => {
    const target = parseFloat(targetDays);
    const spot = parseFloat(spotRate);

    if (isNaN(target) || isNaN(spot)) {
      toast({
        title: "입력 오류",
        description: "유효한 숫자를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const validTenors = tenorRows
      .filter(t => t.tenor !== "Spot")
      .map(t => ({
        ...t,
        days: t.daysFromSpot,
        swapPointNum: parseFloat(t.swapPoint || "0"),
      }))
      .sort((a, b) => a.days - b.days);

    if (validTenors.length < 2) {
      toast({
        title: "데이터 부족",
        description: "최소 2개 이상의 테너 데이터가 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    let lowerTenor = validTenors[0];
    let upperTenor = validTenors[validTenors.length - 1];

    for (let i = 0; i < validTenors.length - 1; i++) {
      if (target >= validTenors[i].days && target <= validTenors[i + 1].days) {
        lowerTenor = validTenors[i];
        upperTenor = validTenors[i + 1];
        break;
      }
    }

    if (target < validTenors[0].days) {
      lowerTenor = validTenors[0];
      upperTenor = validTenors[1];
    } else if (target > validTenors[validTenors.length - 1].days) {
      lowerTenor = validTenors[validTenors.length - 2];
      upperTenor = validTenors[validTenors.length - 1];
    }

    const interpolatedSwapPoint =
      lowerTenor.days === upperTenor.days
        ? lowerTenor.swapPointNum
        : lowerTenor.swapPointNum +
          ((upperTenor.swapPointNum - lowerTenor.swapPointNum) * (target - lowerTenor.days)) /
            (upperTenor.days - lowerTenor.days);

    const forwardRate = spot + interpolatedSwapPoint / 100;

    setCalculatedResult({
      days: target,
      interpolatedSwapPoint,
      forwardRate,
    });
  };

  const handleSaveRow = (index: number) => {
    if (!selectedPairId) {
      toast({
        title: "통화쌍 선택 필요",
        description: "먼저 통화쌍을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    const row = tenorRows[index];
    
    if (!row.settlementDate || row.settlementDate.trim() === '') {
      toast({
        title: "필수 입력 누락",
        description: "Settlement Date를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (!row.swapPoint || row.swapPoint.trim() === '' || isNaN(parseFloat(row.swapPoint))) {
      toast({
        title: "필수 입력 누락",
        description: "Swap Point (Mid) 값을 올바르게 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate(row);
  };

  const handleRefreshSpotDate = () => {
    const newSpotDate = getSpotDate();
    setSpotDate(newSpotDate);
    
    const updatedRows = tenorRows.map(row => {
      const settlementDate = calculateSettlementDate(newSpotDate, row.tenor);
      const daysFromSpot = calculateDaysFromSpot(newSpotDate, row.tenor);
      
      return {
        ...row,
        settlementDate: row.tenor === "Spot" ? formatDateForInput(newSpotDate) : formatDateForInput(settlementDate),
        daysFromSpot,
      };
    });
    
    setTenorRows(updatedRows);
    
    toast({
      title: "Spot 기준일 갱신",
      description: `새로운 Spot Date: ${formatDateForInput(newSpotDate)}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              선도환율 계산기 (Forward Rate Calculator)
            </h1>
            <p className="text-blue-200">
              Swap Point를 관리하고 특정 결제일의 이론 선도환율을 계산합니다
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 rounded-3xl p-6">
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white mb-2 block">통화쌍 선택</Label>
                    <Select value={selectedPairId} onValueChange={setSelectedPairId}>
                      <SelectTrigger className="bg-white/20 border-white/30 text-white rounded-2xl" data-testid="select-currency-pair">
                        <SelectValue placeholder="통화쌍 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyPairs.map(pair => (
                          <SelectItem key={pair.id} value={pair.id}>
                            {pair.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-white mb-2 block">Spot Rate (현물환율)</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={spotRate}
                        onChange={(e) => setSpotRate(e.target.value)}
                        className="bg-white/20 border-white/30 text-white rounded-2xl flex-1"
                        placeholder="1350.00"
                        data-testid="input-spot-rate"
                      />
                      <Button
                        onClick={() => saveSpotMutation.mutate()}
                        disabled={!selectedPairId || saveSpotMutation.isPending}
                        variant="outline"
                        className="bg-teal-600 hover:bg-teal-700 text-white border-0 rounded-2xl"
                        data-testid="button-save-spot"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        저장
                      </Button>
                    </div>
                    {lastSavedSpotRate && (
                      <p className="text-xs text-teal-200" data-testid="text-last-saved-spot">
                        마지막 저장값: {lastSavedSpotRate}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4 p-4 bg-blue-900/30 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-200">Spot 기준일 (T+2)</p>
                  <p className="text-xl font-bold text-teal-300" data-testid="text-spot-date">
                    {formatDateForInput(spotDate)}
                  </p>
                </div>
                <Button
                  onClick={handleRefreshSpotDate}
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  data-testid="button-refresh-spot-date"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  갱신
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-white text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-2">Tenor</th>
                      <th className="text-left py-2 px-2">Settlement Date</th>
                      <th className="text-left py-2 px-2">Days (from Spot)</th>
                      <th className="text-left py-2 px-2">Swap Point</th>
                      <th className="text-left py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenorRows.map((row, index) => (
                      <tr key={row.tenor} className="border-b border-white/10">
                        <td className="py-2 px-2 font-semibold">{row.tenor}</td>
                        <td className="py-2 px-2">
                          <Input
                            type="date"
                            value={row.settlementDate}
                            onChange={(e) => updateTenorField(index, "settlementDate", e.target.value)}
                            className="bg-white/10 border-white/20 text-white text-xs rounded-xl"
                            disabled={row.tenor === "Spot"}
                            data-testid={`input-settle-date-${row.tenor}`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            value={row.daysFromSpot}
                            onChange={(e) => updateTenorField(index, "daysFromSpot", e.target.value)}
                            className="bg-white/10 border-white/20 text-white text-xs rounded-xl w-20"
                            disabled={row.tenor === "Spot"}
                            data-testid={`input-days-${row.tenor}`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={row.swapPoint}
                            onChange={(e) => updateTenorField(index, "swapPoint", e.target.value)}
                            className="bg-white/10 border-white/20 text-white text-xs rounded-xl w-24"
                            disabled={row.tenor === "Spot"}
                            placeholder="0.00"
                            data-testid={`input-swap-point-${row.tenor}`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          {row.tenor !== "Spot" && (
                            <Button
                              onClick={() => handleSaveRow(index)}
                              size="sm"
                              variant="ghost"
                              className="text-teal-300 hover:text-teal-200 hover:bg-white/10"
                              disabled={saveMutation.isPending}
                              data-testid={`button-save-${row.tenor}`}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">선도환율 계산</h2>

              <div className="mb-4">
                <Label className="text-white mb-2 block">Target Settlement Date</Label>
                <Input
                  type="date"
                  value={targetSettlementDate}
                  onChange={(e) => handleTargetDateChange(e.target.value)}
                  className="bg-white/20 border-white/30 text-white rounded-2xl"
                  data-testid="input-target-date"
                />
              </div>

              <div className="mb-4">
                <Label className="text-white mb-2 block">Target Days (from Spot)</Label>
                <Input
                  type="number"
                  value={targetDays}
                  onChange={(e) => handleTargetDaysChange(e.target.value)}
                  className="bg-white/20 border-white/30 text-white rounded-2xl"
                  placeholder="45"
                  data-testid="input-target-days"
                />
                <p className="text-xs text-blue-200 mt-1">
                  예: 45일 (약 1.5개월)
                </p>
              </div>

              <Button
                onClick={calculateForwardRate}
                className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white rounded-2xl py-6 mb-4"
                data-testid="button-calculate"
              >
                <Calculator className="mr-2 h-5 w-5" />
                계산하기
              </Button>

              {calculatedResult && (
                <div className="bg-white/20 rounded-2xl p-4 space-y-3">
                  <h3 className="font-semibold text-white mb-3 text-lg">계산 결과</h3>
                  
                  <div>
                    <p className="text-blue-200 text-sm">Target Days</p>
                    <p className="text-white font-mono text-lg" data-testid="result-days">
                      {calculatedResult.days} 일
                    </p>
                  </div>

                  <div>
                    <p className="text-blue-200 text-sm">보간된 Swap Point</p>
                    <p className="text-white font-mono text-lg" data-testid="result-swap-point">
                      {calculatedResult.interpolatedSwapPoint.toFixed(4)}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/20">
                    <p className="text-blue-200 text-sm">Forward Rate (선도환율)</p>
                    <p className="text-teal-300 font-mono text-2xl font-bold" data-testid="result-forward-rate">
                      {calculatedResult.forwardRate.toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-200 mt-1">
                      = Spot ({spotRate}) + Swap Point ({calculatedResult.interpolatedSwapPoint.toFixed(4)}/100)
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-900/30 rounded-2xl">
                <h4 className="text-sm font-semibold text-white mb-2">📘 계산 방법</h4>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>• Spot: T+2 (오늘로부터 2영업일)</li>
                  <li>• ON: T+1 (오늘로부터 1영업일)</li>
                  <li>• TN: T+2 (Spot과 동일)</li>
                  <li>• 1M~12M: Spot + 해당 개월 수</li>
                  <li>• 선형보간으로 중간값 계산</li>
                  <li>• Forward = Spot + Swap Point/100</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
