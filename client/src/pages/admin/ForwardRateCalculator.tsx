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
import type { CurrencyPair, SwapPoint, OnTnRate } from "@shared/schema";

interface TenorRow {
  tenor: string;
  startDate: string;
  settlementDate: string;
  daysFromSpot: number;
  swapPoint: string;
  bidPrice: string;
  askPrice: string;
}

// Standard tenors including ON/TN for complete swap point management
const standardTenors = ["ON", "TN", "Spot", "1M", "2M", "3M", "6M", "9M", "12M"];

// KR Holidays 2025-2026 (한국 기준 영업일)
const KR_HOLIDAYS = [
  "2025-01-01", // New Year
  "2025-01-29", // Lunar New Year Eve
  "2025-01-30", // Lunar New Year
  "2025-01-31", // Lunar New Year
  "2025-03-01", // Independence Movement Day
  "2025-04-10", // Parliamentary Election
  "2025-05-05", // Children's Day
  "2025-05-15", // Buddha's Birthday
  "2025-06-06", // Memorial Day
  "2025-08-15", // Liberation Day
  "2025-09-16", // Chuseok Eve
  "2025-09-17", // Chuseok
  "2025-09-18", // Chuseok
  "2025-10-03", // National Foundation Day
  "2025-10-09", // Hangul Day
  "2025-12-25", // Christmas
];

// US Holidays 2025-2026 (미국 기준 - US holiday면 익영업일로)
const US_HOLIDAYS = [
  "2025-01-01", // New Year's Day
  "2025-01-20", // MLK Jr. Day
  "2025-02-17", // Presidents' Day
  "2025-05-26", // Memorial Day
  "2025-06-19", // Juneteenth
  "2025-07-04", // Independence Day
  "2025-09-01", // Labor Day
  "2025-10-13", // Columbus Day
  "2025-11-11", // Veterans Day
  "2025-11-27", // Thanksgiving
  "2025-12-25", // Christmas
];

function isKRHoliday(dateStr: string): boolean {
  return KR_HOLIDAYS.includes(dateStr);
}

function isUSHoliday(dateStr: string): boolean {
  return US_HOLIDAYS.includes(dateStr);
}

function formatDateString(date: Date): string {
  // ✅ 로컬 기반 (UTC 변환 금지!)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get today as local midnight (fixes timezone issue)
function getTodayLocal(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// Helper functions for date calculations
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = days;
  
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    const dateStr = formatDateString(result);
    
    // Skip weekends and KR holidays (기본)
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isKRHoliday(dateStr)) {
      remaining--;
    }
  }
  
  // If final date is a US holiday, add 1 more business day (익영업일)
  const finalDateStr = formatDateString(result);
  if (isUSHoliday(finalDateStr)) {
    return addBusinessDays(result, 1); // Recursively add 1 more day
  }
  
  return result;
}

function getSpotDate(baseDate: Date = getTodayLocal()): Date {
  // SPOT = T+2 business days (KR holidays 기준, US holiday면 익영업일로)
  return addBusinessDays(baseDate, 2);
}

function getDaysBetween(start: Date, end: Date): number {
  // Normalize to midnight to avoid time zone issues
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate business days between two dates (KR holidays 기준)
function getBusinessDaysBetween(start: Date, end: Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  let businessDays = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    const dateStr = formatDateString(current);
    
    // Count if not weekend and not KR holiday
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isKRHoliday(dateStr)) {
      businessDays++;
    }
  }
  
  return businessDays;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateForInput(date: Date): string {
  // Use local timezone (브라우저 로컬 시간대 기준)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getEndOfMonth(date: Date): Date {
  // 다음 달의 첫날에서 1일 빼서 현재 달의 마지막날 구하기
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  result.setHours(0, 0, 0, 0);
  return result;
}

function calculateSettlementDate(spotDate: Date, tenor: string): Date {
  const tenorUpper = tenor.toUpperCase();
  
  if (tenorUpper === "SPOT") return new Date(spotDate);
  if (tenorUpper === "ON") return addBusinessDays(getTodayLocal(), 1); // T+1
  if (tenorUpper === "TN") return new Date(spotDate); // SPOT date
  
  const monthMatch = tenorUpper.match(/^(\d+)M$/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1]);
    
    // ✅ EOM으로 settlement date 계산
    const baseDate = new Date(spotDate);
    baseDate.setMonth(baseDate.getMonth() + months);
    let result = getEndOfMonth(baseDate);
    
    // ✅ 주말이면 이전 금요일로
    while (result.getDay() === 0 || result.getDay() === 6) {
      result.setDate(result.getDate() - 1);
    }
    
    // ✅ Seoul & NY 휴일 체크 → 그 이전 영업일로
    let dateStr = formatDateString(result);
    while (isKRHoliday(dateStr) || isUSHoliday(dateStr)) {
      result.setDate(result.getDate() - 1);
      // 다시 주말이면 건너뛰기
      while (result.getDay() === 0 || result.getDay() === 6) {
        result.setDate(result.getDate() - 1);
      }
      dateStr = formatDateString(result);
    }
    
    return result;
  }
  
  return new Date(spotDate);
}

// Calculate start date for tenor (value date)
function calculateStartDate(spotDate: Date, tenor: string): Date {
  const tenorUpper = tenor.toUpperCase();
  
  if (tenorUpper === "ON") return getTodayLocal(); // Today
  if (tenorUpper === "TN") return addBusinessDays(getTodayLocal(), 1); // T+1
  
  // For all others (Spot, 1M~12M): start date is SPOT date
  return new Date(spotDate);
}

function calculateDaysFromSpot(spotDate: Date, tenor: string): number {
  const tenorUpper = tenor.toUpperCase();
  
  if (tenorUpper === "SPOT") return 0;
  
  // ON: 오늘과 익영업일의 실제 calendar days 차이
  if (tenorUpper === "ON") {
    const onDate = addBusinessDays(getTodayLocal(), 1);
    return getDaysBetween(getTodayLocal(), onDate);
  }
  
  // TN: ON의 만기일과 Spot의 실제 calendar days 차이
  if (tenorUpper === "TN") {
    const onDate = addBusinessDays(getTodayLocal(), 1);
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
  const [spotDate, setSpotDate] = useState<Date>(() => {
    const calculatedSpotDate = getSpotDate(getTodayLocal());
    // Store spot date in localStorage for use in QuoteApprovals
    localStorage.setItem('forwardCalc_spotDate', calculatedSpotDate.toISOString());
    return calculatedSpotDate;
  });
  const [tenorRows, setTenorRows] = useState<TenorRow[]>([]);
  const [targetSettlementDate, setTargetSettlementDate] = useState<string>("");
  const [targetDays, setTargetDays] = useState<string>("");
  const [calculatedResult, setCalculatedResult] = useState<{
    days: number;
    interpolatedSwapPoint: number;
    forwardRate: number;
    lowerTenor?: string;
    lowerDays?: number;
    lowerSwapPoint?: number;
    upperTenor?: string;
    upperDays?: number;
    upperSwapPoint?: number;
  } | null>(null);

  // 현물환율 계산용
  const [spotRateCalcDate, setSpotRateCalcDate] = useState<string>("");
  const [spotRateCalcResult, setSpotRateCalcResult] = useState<{
    date: string;
    days: number;
    swapPoint: number;
    forwardRate: number;
    calculation: string;
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

  const { data: onTnRates = [] } = useQuery<OnTnRate[]>({
    queryKey: ["/api/on-tn-rates", selectedPairId],
    enabled: !!selectedPairId,
  });

  // DEBUG: ON/TN rates 로드 모니터링
  useEffect(() => {
    console.log("[ON/TN Rates] selectedPairId:", selectedPairId);
    console.log("[ON/TN Rates] data:", onTnRates);
    console.log("[ON/TN Rates] length:", onTnRates.length);
  }, [onTnRates, selectedPairId]);

  const saveMutation = useMutation({
    mutationFn: async (row: TenorRow) => {
      if (!row.swapPoint || isNaN(parseFloat(row.swapPoint))) {
        throw new Error("Swap Point 값을 입력해주세요.");
      }
      
      // ON/TN은 별도의 on-tn-rates 엔드포인트로 저장
      const isOnTn = ["ON", "TN"].includes(row.tenor);
      const endpoint = isOnTn ? "/api/on-tn-rates" : "/api/swap-points";
      
      const data = {
        currencyPairId: selectedPairId,
        tenor: row.tenor,
        startDate: row.startDate ? new Date(row.startDate) : null,
        settlementDate: row.settlementDate ? new Date(row.settlementDate) : null,
        days: row.daysFromSpot,
        swapPoint: parseFloat(row.swapPoint),
        bidPrice: row.bidPrice ? parseFloat(row.bidPrice) : null,
        askPrice: row.askPrice ? parseFloat(row.askPrice) : null,
        source: "manual",
      };
      
      const response = await apiRequest("POST", endpoint, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "저장 실패");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/swap-points", selectedPairId] });
      queryClient.invalidateQueries({ queryKey: ["/api/on-tn-rates", selectedPairId] });
      const tenor = data.tenor || "Swap Point";
      toast({
        title: "저장 완료",
        description: `${tenor}가 저장되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "저장 실패",
        description: error.message || "저장에 실패했습니다.",
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
    const newSpotDate = getSpotDate(getTodayLocal());
    setSpotDate(newSpotDate);
    
    // Try to restore from localStorage first
    const savedRows = localStorage.getItem('forwardCalc_tenorRows');
    let initialRows: TenorRow[];
    
    if (savedRows) {
      try {
        const parsed = JSON.parse(savedRows);
        console.log(`[Initialize] localStorage에서 tenorRows 복구:`, parsed.map((r: TenorRow) => `${r.tenor}=${r.swapPoint}`));
        
        // Merge with standardTenors to ensure ON/TN are included
        initialRows = standardTenors.map(tenor => {
          const existing = parsed.find((r: TenorRow) => r.tenor === tenor);
          
          // Always recalculate startDate/settlementDate based on new spotDate
          const settlementDate = calculateSettlementDate(newSpotDate, tenor);
          const startDate = calculateStartDate(newSpotDate, tenor);
          const daysFromSpot = calculateDaysFromSpot(newSpotDate, tenor);
          
          if (existing) {
            // Keep existing swap point data but update dates
            return {
              tenor,
              startDate: formatDateForInput(startDate),
              settlementDate: tenor === "Spot" ? formatDateForInput(newSpotDate) : formatDateForInput(settlementDate),
              daysFromSpot,
              swapPoint: existing.swapPoint || "0",
              bidPrice: existing.bidPrice || "",
              askPrice: existing.askPrice || "",
            };
          }
          
          // Add missing tenor with new dates
          return {
            tenor,
            startDate: formatDateForInput(startDate),
            settlementDate: tenor === "Spot" ? formatDateForInput(newSpotDate) : formatDateForInput(settlementDate),
            daysFromSpot,
            swapPoint: "0",
            bidPrice: "",
            askPrice: "",
          };
        });
      } catch (e) {
        console.log(`[Initialize] localStorage 파싱 실패, 기본값 생성`);
        initialRows = standardTenors.map(tenor => {
          const settlementDate = calculateSettlementDate(newSpotDate, tenor);
          const startDate = calculateStartDate(newSpotDate, tenor);
          const daysFromSpot = calculateDaysFromSpot(newSpotDate, tenor);
          
          return {
            tenor,
            startDate: formatDateForInput(startDate),
            settlementDate: tenor === "Spot" ? formatDateForInput(newSpotDate) : formatDateForInput(settlementDate),
            daysFromSpot,
            swapPoint: "0",
            bidPrice: "",
            askPrice: "",
          };
        });
      }
    } else {
      console.log(`[Initialize] localStorage에 저장된 데이터 없음, 기본값 생성`);
      initialRows = standardTenors.map(tenor => {
        const settlementDate = calculateSettlementDate(newSpotDate, tenor);
        const startDate = calculateStartDate(newSpotDate, tenor);
        const daysFromSpot = calculateDaysFromSpot(newSpotDate, tenor);
        
        return {
          tenor,
          startDate: formatDateForInput(startDate),
          settlementDate: tenor === "Spot" ? formatDateForInput(newSpotDate) : formatDateForInput(settlementDate),
          daysFromSpot,
          swapPoint: "0",
          bidPrice: "",
          askPrice: "",
        };
      });
    }
    
    setTenorRows(initialRows);
  }, []);

  useEffect(() => {
    if (swapPoints.length > 0 && tenorRows.length > 0) {
      console.log(`[SwapPoints Load] DB에서 받은 swapPoints: `, swapPoints.map(sp => `${sp.tenor}=${sp.swapPoint}`));
      
      const updatedRows = tenorRows.map(row => {
        const existingPoint = swapPoints.find(sp => sp.tenor === row.tenor);
        if (existingPoint) {
          console.log(`[SwapPoints Load] ${row.tenor} 업데이트: ${existingPoint.swapPoint}`);
          return {
            ...row,
            swapPoint: existingPoint.swapPoint.toString() || "0",
            bidPrice: existingPoint.bidPrice || "",
            askPrice: existingPoint.askPrice || "",
          };
        }
        return row;
      });
      console.log(`[SwapPoints Load] 최종 tenorRows:`, updatedRows.map(r => `${r.tenor}=${r.swapPoint}`));
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
    } else if (field === "startDate") {
      row.startDate = value;
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

    // SPOT itself (target = 0): swap point = 0
    if (target === 0) {
      setCalculatedResult({
        days: 0,
        interpolatedSwapPoint: 0,
        forwardRate: spot,
      });
      return;
    }

    // Target이 음수면 Spot 미만이므로 계산 불가
    if (target < 0) {
      toast({
        title: "범위 초과",
        description: "Spot 이후(0일 이상)의 날짜만 계산 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    // tenorRows의 daysFromSpot 기반 보간 (ForwardRateCalculator 표준 방식)
    // IMPORTANT: Spot(0일) 포함, ON/TN(음수 days) 제외
    const validTenors = tenorRows
      .filter(t => t.tenor !== "ON" && t.tenor !== "TN")  // Spot은 포함!
      .map(t => ({
        ...t,
        days: t.tenor === "Spot" ? 0 : t.daysFromSpot,
        swapPointNum: t.tenor === "Spot" ? 0 : parseFloat(t.swapPoint || "0"),
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

    // Find bracketing tenors
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

    // Linear interpolation for SPOT-after dates
    const interpolatedSwapPoint =
      lowerTenor.days === upperTenor.days
        ? lowerTenor.swapPointNum
        : lowerTenor.swapPointNum +
          ((upperTenor.swapPointNum - lowerTenor.swapPointNum) * (target - lowerTenor.days)) /
            (upperTenor.days - lowerTenor.days);

    const forwardRate = spot + interpolatedSwapPoint / 100;

    // DEBUG: 계산식 출력
    console.log(`[ForwardRate 계산] ====== START ======`);
    console.log(`[계산] Spot Rate: ${spot}`);
    console.log(`[계산] Target Days: ${target}`);
    console.log(`[계산] Lower Tenor: ${lowerTenor.tenor} (${lowerTenor.days}일, swapPoint=${lowerTenor.swapPointNum})`);
    console.log(`[계산] Upper Tenor: ${upperTenor.tenor} (${upperTenor.days}일, swapPoint=${upperTenor.swapPointNum})`);
    
    const formula = `${lowerTenor.swapPointNum} + ((${upperTenor.swapPointNum} - ${lowerTenor.swapPointNum}) * (${target} - ${lowerTenor.days})) / (${upperTenor.days} - ${lowerTenor.days})`;
    console.log(`[계산식] interpolatedSwapPoint = ${formula}`);
    console.log(`[계산식] = ${lowerTenor.swapPointNum} + (${upperTenor.swapPointNum - lowerTenor.swapPointNum} * ${target - lowerTenor.days}) / ${upperTenor.days - lowerTenor.days}`);
    console.log(`[계산식] = ${lowerTenor.swapPointNum} + ${(upperTenor.swapPointNum - lowerTenor.swapPointNum) * (target - lowerTenor.days)} / ${upperTenor.days - lowerTenor.days}`);
    console.log(`[계산] Interpolated Swap Point: ${interpolatedSwapPoint}`);
    console.log(`[계산] Forward Rate = ${spot} + ${interpolatedSwapPoint}/100 = ${forwardRate}`);
    console.log(`[ForwardRate 계산] ====== END ======`);

    setCalculatedResult({
      days: target,
      interpolatedSwapPoint,
      forwardRate,
      lowerTenor: lowerTenor.tenor,
      lowerDays: lowerTenor.days,
      lowerSwapPoint: lowerTenor.swapPointNum,
      upperTenor: upperTenor.tenor,
      upperDays: upperTenor.days,
      upperSwapPoint: upperTenor.swapPointNum,
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
    const today = getTodayLocal();
    const newSpotDate = getSpotDate(today);
    
    setSpotDate(newSpotDate);
    
    const updatedRows = tenorRows.map(row => {
      const settlementDate = calculateSettlementDate(newSpotDate, row.tenor);
      const startDate = calculateStartDate(newSpotDate, row.tenor);
      const daysFromSpot = calculateDaysFromSpot(newSpotDate, row.tenor);
      
      return {
        ...row,
        startDate: formatDateForInput(startDate),
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

  // 현물환율 계산 함수
  const calculateSpotRateSwapPoint = () => {
    // DEBUG
    console.log("[현물환율 계산] onTnRates:", onTnRates);
    console.log("[현물환율 계산] selectedPairId:", selectedPairId);
    
    if (!spotRateCalcDate) {
      toast({
        title: "날짜 입력 필요",
        description: "날짜를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const today = getTodayLocal();
    const calcDate = new Date(spotRateCalcDate);
    const spot = new Date(spotDate);

    // 범위 체크: Today ~ Spot Date만 허용
    if (calcDate < today || calcDate > spot) {
      toast({
        title: "범위 오류",
        description: `날짜는 ${formatDateForInput(today)} ~ ${formatDateForInput(spot)} 사이여야 합니다.`,
        variant: "destructive",
      });
      return;
    }

    // ON/TN rates 찾기
    const onRate = onTnRates.find(r => r.tenor === "ON");
    const tnRate = onTnRates.find(r => r.tenor === "TN");

    // DEBUG
    console.log("[현물환율 계산] onRate:", onRate);
    console.log("[현물환율 계산] tnRate:", tnRate);

    if (!onRate || !tnRate) {
      toast({
        title: "데이터 부족",
        description: "ON/TN 데이터가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const onSwapPoint = parseFloat(onRate.swapPoint);
    const tnSwapPoint = parseFloat(tnRate.swapPoint);
    const onDays = onRate.settlementDate ? getDaysBetween(today, new Date(onRate.settlementDate)) : 1;
    const tnDays = tnRate.settlementDate ? getDaysBetween(new Date(onRate.settlementDate), new Date(tnRate.settlementDate)) : 1;

    const daysFromToday = getDaysBetween(today, calcDate);

    // Calculate swap point using linear interpolation
    // Today = -(ON + TN) at days=(ON+TN)days
    // Spot = 0 at days=0
    let swapPoint: number;
    let calculation: string;

    if (daysFromToday === 0) {
      // Today
      swapPoint = -(onSwapPoint + tnSwapPoint);
      calculation = `Today: -(ON + TN) = -(${onSwapPoint} + ${tnSwapPoint}) = ${swapPoint}`;
    } else if (daysFromToday === tnDays) {
      // TN date (Spot - 1 business day)
      swapPoint = -tnSwapPoint;
      calculation = `TN Date: -TN = -${tnSwapPoint} = ${swapPoint}`;
    } else if (daysFromToday === onDays + tnDays) {
      // Spot date
      swapPoint = 0;
      calculation = `Spot Date: 0`;
    } else {
      // Interpolation between Today and Spot
      const totalDays = onDays + tnDays;
      const startSwapPoint = -(onSwapPoint + tnSwapPoint); // Today
      const endSwapPoint = 0; // Spot
      swapPoint = startSwapPoint + ((endSwapPoint - startSwapPoint) * daysFromToday) / totalDays;
      calculation = `보간: ${startSwapPoint} + ((${endSwapPoint} - ${startSwapPoint}) * ${daysFromToday}) / ${totalDays} = ${swapPoint.toFixed(6)}`;
    }

    const spotRateNum = parseFloat(spotRate);
    const forwardRate = spotRateNum + swapPoint / 100;

    setSpotRateCalcResult({
      date: spotRateCalcDate,
      days: daysFromToday,
      swapPoint: parseFloat(swapPoint.toFixed(6)),
      forwardRate: parseFloat(forwardRate.toFixed(4)),
      calculation,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              이론가환율 (Forward Rate Calculator)
            </h1>
            <p className="text-blue-200">
              ON/TN/Spot/선물 스왑포인트를 관리하고 이론 선도환율을 계산합니다
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
                      <th className="text-left py-2 px-2">Start Date</th>
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
                            value={row.startDate}
                            onChange={(e) => updateTenorField(index, "startDate", e.target.value)}
                            className="bg-white/10 border-white/20 text-white text-xs rounded-xl"
                            disabled={["Spot", "ON", "TN"].includes(row.tenor)}
                            data-testid={`input-start-date-${row.tenor}`}
                          />
                        </td>
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

                  {calculatedResult.lowerTenor && (
                    <div className="bg-white/5 rounded-xl p-3 space-y-2 text-xs">
                      <p className="text-white font-semibold">보간 범위</p>
                      <div className="flex justify-between">
                        <div>
                          <p className="text-blue-300">Lower: {calculatedResult.lowerTenor}</p>
                          <p className="text-blue-200">{calculatedResult.lowerDays}일 (SP: {calculatedResult.lowerSwapPoint})</p>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-300">Upper: {calculatedResult.upperTenor}</p>
                          <p className="text-blue-200">{calculatedResult.upperDays}일 (SP: {calculatedResult.upperSwapPoint})</p>
                        </div>
                      </div>
                    </div>
                  )}

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

          {/* 현물환율 계산 패널 */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 rounded-3xl p-6 sticky top-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Calculator className="h-6 w-6 text-teal-400" />
                현물환율 계산
              </h2>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block text-sm">계산 날짜</Label>
                  <div className="text-xs text-blue-200 mb-2">
                    {formatDateForInput(new Date())} ~ {formatDateForInput(spotDate)}
                  </div>
                  <Input
                    type="date"
                    value={spotRateCalcDate}
                    onChange={(e) => setSpotRateCalcDate(e.target.value)}
                    min={formatDateForInput(new Date())}
                    max={formatDateForInput(spotDate)}
                    className="bg-white/20 border-white/30 text-white rounded-2xl"
                    data-testid="input-spot-rate-calc-date"
                  />
                </div>

                <Button
                  onClick={calculateSpotRateSwapPoint}
                  disabled={!onTnRates.length || !spotRateCalcDate}
                  className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white rounded-2xl"
                  data-testid="button-calc-spot-rate"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  계산
                </Button>

                {spotRateCalcResult && (
                  <div className="bg-white/20 rounded-2xl p-4 space-y-3 border border-teal-400/30">
                    <h3 className="font-semibold text-teal-300 mb-3">📊 계산 결과</h3>
                    
                    <div className="bg-white/5 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-200 text-sm">날짜:</span>
                        <span className="text-white font-mono">{spotRateCalcResult.date}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-blue-200 text-sm">Days:</span>
                        <span className="text-white font-mono">{spotRateCalcResult.days}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-blue-200 text-sm">Swap Point:</span>
                        <span className="text-white font-mono">{spotRateCalcResult.swapPoint.toFixed(6)}</span>
                      </div>
                    </div>

                    <div className="border-t border-white/20 pt-3">
                      <p className="text-blue-200 text-xs mb-1">Forward Rate</p>
                      <p className="text-teal-300 font-mono text-xl font-bold" data-testid="result-spot-rate">
                        {spotRateCalcResult.forwardRate.toFixed(4)}
                      </p>
                    </div>

                    <div className="bg-blue-900/40 rounded-xl p-2">
                      <p className="text-xs text-blue-300 font-mono break-all">
                        {spotRateCalcResult.calculation}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-3 bg-blue-900/30 rounded-2xl">
                  <h4 className="text-xs font-semibold text-white mb-2">📖 계산 방식</h4>
                  <ul className="text-xs text-blue-200 space-y-1">
                    <li>• Today (T+0): -(ON + TN)</li>
                    <li>• TN Date: -TN</li>
                    <li>• Spot (T+2): 0</li>
                    <li>• 중간: 선형 보간</li>
                  </ul>
                </div>

                {!onTnRates.length && (
                  <div className="p-3 bg-orange-900/30 rounded-xl border border-orange-400/30">
                    <p className="text-xs text-orange-300">
                      ⚠️ ON/TN 데이터가 없습니다. 왼쪽에서 추가해주세요.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
