import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

interface TenorData {
  tenor: string;
  settleDate: string;
  days: number;
  swapPoint: string;
}

const defaultTenors: TenorData[] = [
  { tenor: "Spot", settleDate: "", days: 0, swapPoint: "0" },
  { tenor: "ON", settleDate: "", days: 1, swapPoint: "0" },
  { tenor: "TN", settleDate: "", days: 2, swapPoint: "0" },
  { tenor: "1M", settleDate: "", days: 30, swapPoint: "0" },
  { tenor: "2M", settleDate: "", days: 60, swapPoint: "0" },
  { tenor: "3M", settleDate: "", days: 90, swapPoint: "0" },
  { tenor: "6M", settleDate: "", days: 180, swapPoint: "0" },
  { tenor: "9M", settleDate: "", days: 270, swapPoint: "0" },
  { tenor: "12M", settleDate: "", days: 360, swapPoint: "0" },
];

export default function ForwardRateCalculator() {
  const [spotRate, setSpotRate] = useState<string>("1350.00");
  const [tenors, setTenors] = useState<TenorData[]>(defaultTenors);
  const [targetDays, setTargetDays] = useState<string>("45");
  const [calculatedResult, setCalculatedResult] = useState<{
    days: number;
    interpolatedSwapPoint: number;
    forwardRate: number;
  } | null>(null);

  const updateTenor = (index: number, field: keyof TenorData, value: string | number) => {
    const newTenors = [...tenors];
    newTenors[index] = { ...newTenors[index], [field]: value };
    setTenors(newTenors);
  };

  const linearInterpolate = (
    days1: number,
    sp1: number,
    days2: number,
    sp2: number,
    targetDays: number
  ): number => {
    if (days1 === days2) return sp1;
    return sp1 + ((sp2 - sp1) * (targetDays - days1)) / (days2 - days1);
  };

  const calculateForwardRate = () => {
    const target = parseFloat(targetDays);
    const spot = parseFloat(spotRate);

    if (isNaN(target) || isNaN(spot)) {
      alert("유효한 숫자를 입력해주세요.");
      return;
    }

    // Filter out Spot and get valid tenors with swap points
    const validTenors = tenors
      .filter(t => t.tenor !== "Spot")
      .map(t => ({
        ...t,
        days: Number(t.days),
        swapPoint: parseFloat(t.swapPoint || "0"),
      }))
      .sort((a, b) => a.days - b.days);

    if (validTenors.length < 2) {
      alert("최소 2개 이상의 테너 데이터가 필요합니다.");
      return;
    }

    // Find the two tenors to interpolate between
    let lowerTenor = validTenors[0];
    let upperTenor = validTenors[validTenors.length - 1];

    for (let i = 0; i < validTenors.length - 1; i++) {
      if (target >= validTenors[i].days && target <= validTenors[i + 1].days) {
        lowerTenor = validTenors[i];
        upperTenor = validTenors[i + 1];
        break;
      }
    }

    // If target is outside range, use the closest bounds
    if (target < validTenors[0].days) {
      lowerTenor = validTenors[0];
      upperTenor = validTenors[1];
    } else if (target > validTenors[validTenors.length - 1].days) {
      lowerTenor = validTenors[validTenors.length - 2];
      upperTenor = validTenors[validTenors.length - 1];
    }

    const interpolatedSwapPoint = linearInterpolate(
      lowerTenor.days,
      lowerTenor.swapPoint,
      upperTenor.days,
      upperTenor.swapPoint,
      target
    );

    const forwardRate = spot + interpolatedSwapPoint / 100;

    setCalculatedResult({
      days: target,
      interpolatedSwapPoint,
      forwardRate,
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
              테너별 Swap Point를 입력하여 특정 날짜의 이론 선도환율을 계산합니다
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">기본 입력값</h2>

              {/* Spot Rate */}
              <div className="mb-6">
                <Label className="text-white mb-2 block">Spot Rate (현물환율)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={spotRate}
                  onChange={(e) => setSpotRate(e.target.value)}
                  className="bg-white/20 border-white/30 text-white rounded-2xl"
                  placeholder="1350.00"
                  data-testid="input-spot-rate"
                />
              </div>

              {/* Tenor Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-2">Tenor</th>
                      <th className="text-left py-2 px-2">Settle Date</th>
                      <th className="text-left py-2 px-2">Days</th>
                      <th className="text-left py-2 px-2">Swap Point (Mid)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenors.map((tenor, index) => (
                      <tr key={tenor.tenor} className="border-b border-white/10">
                        <td className="py-2 px-2 font-semibold">{tenor.tenor}</td>
                        <td className="py-2 px-2">
                          <Input
                            type="date"
                            value={tenor.settleDate}
                            onChange={(e) => updateTenor(index, "settleDate", e.target.value)}
                            className="bg-white/10 border-white/20 text-white text-sm rounded-xl"
                            disabled={tenor.tenor === "Spot"}
                            data-testid={`input-settle-date-${tenor.tenor}`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            value={tenor.days}
                            onChange={(e) => updateTenor(index, "days", parseInt(e.target.value) || 0)}
                            className="bg-white/10 border-white/20 text-white text-sm rounded-xl w-24"
                            disabled={tenor.tenor === "Spot"}
                            data-testid={`input-days-${tenor.tenor}`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={tenor.swapPoint}
                            onChange={(e) => updateTenor(index, "swapPoint", e.target.value)}
                            className="bg-white/10 border-white/20 text-white text-sm rounded-xl w-32"
                            disabled={tenor.tenor === "Spot"}
                            placeholder="0.00"
                            data-testid={`input-swap-point-${tenor.tenor}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Calculation Section */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">선도환율 계산</h2>

              <div className="mb-4">
                <Label className="text-white mb-2 block">Target Days (목표 일수)</Label>
                <Input
                  type="number"
                  value={targetDays}
                  onChange={(e) => setTargetDays(e.target.value)}
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
                  <li>• ON: Today → Tomorrow (1일)</li>
                  <li>• TN: Tomorrow → Spot (2일)</li>
                  <li>• 나머지: Spot 기준 일수</li>
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
