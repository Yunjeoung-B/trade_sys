// Forward Rate Calculation Utilities
// Shared logic for ForwardRateCalculator and QuoteApprovals

export interface TenorData {
  tenor: string;
  days: number;
  swapPointNum: number;
}

export interface InterpolationResult {
  interpolatedSwapPoint: number;
  forwardRate: number;
  lowerTenor?: string;
  lowerDays?: number;
  lowerSwapPoint?: number;
  upperTenor?: string;
  upperDays?: number;
  upperSwapPoint?: number;
  error?: string;
}

// Date utilities
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getDaysBetween(start: Date, end: Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getSpotDate(baseDate: Date = new Date()): Date {
  // SPOT = T+2 (calendar days)
  return addDays(baseDate, 2);
}

export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate forward rate using linear interpolation on tenor swap points
 * @param targetDays Target settlement days from spot
 * @param spotRate Base spot rate
 * @param tenorData Array of tenor data with days and swap points
 * @param spotDate Reference spot date
 * @param settlementDate Target settlement date for validation
 * @returns Interpolation result with forward rate or error
 */
export function calculateForwardRate(
  targetDays: number,
  spotRate: number,
  tenorData: TenorData[],
  spotDate: Date,
  settlementDate: Date
): InterpolationResult {
  // Validate spot date
  if (settlementDate < spotDate) {
    return {
      interpolatedSwapPoint: 0,
      forwardRate: 0,
      error: `오류: 결제일이 Spot 이후여야 합니다 (Spot: ${formatDateForInput(spotDate)})`,
    };
  }

  // SPOT itself (target = 0)
  if (targetDays === 0) {
    return {
      interpolatedSwapPoint: 0,
      forwardRate: spotRate,
      lowerTenor: "Spot",
      lowerDays: 0,
      lowerSwapPoint: 0,
      upperTenor: "Spot",
      upperDays: 0,
      upperSwapPoint: 0,
    };
  }

  // Target before SPOT
  if (targetDays < 0) {
    return {
      interpolatedSwapPoint: 0,
      forwardRate: 0,
      error: "오류: Spot 이후(0일 이상)의 날짜만 계산 가능합니다.",
    };
  }

  // Filter and sort tenor data (include Spot as 0 days)
  const validTenors = tenorData
    .filter(t => t.tenor !== "ON" && t.tenor !== "TN")
    .sort((a, b) => a.days - b.days);

  if (validTenors.length < 2) {
    return {
      interpolatedSwapPoint: 0,
      forwardRate: 0,
      error: "오류: 최소 2개 이상의 테너 데이터가 필요합니다.",
    };
  }

  // Find bracketing tenors
  let lowerTenor = validTenors[0];
  let upperTenor = validTenors[validTenors.length - 1];

  for (let i = 0; i < validTenors.length - 1; i++) {
    if (targetDays >= validTenors[i].days && targetDays <= validTenors[i + 1].days) {
      lowerTenor = validTenors[i];
      upperTenor = validTenors[i + 1];
      break;
    }
  }

  // Handle edge cases
  if (targetDays < validTenors[0].days) {
    lowerTenor = validTenors[0];
    upperTenor = validTenors[1];
  } else if (targetDays > validTenors[validTenors.length - 1].days) {
    lowerTenor = validTenors[validTenors.length - 2];
    upperTenor = validTenors[validTenors.length - 1];
  }

  // Linear interpolation
  const interpolatedSwapPoint =
    lowerTenor.days === upperTenor.days
      ? lowerTenor.swapPointNum
      : lowerTenor.swapPointNum +
        ((upperTenor.swapPointNum - lowerTenor.swapPointNum) * (targetDays - lowerTenor.days)) /
          (upperTenor.days - lowerTenor.days);

  const forwardRate = spotRate + interpolatedSwapPoint / 100;

  return {
    interpolatedSwapPoint,
    forwardRate,
    lowerTenor: lowerTenor.tenor,
    lowerDays: lowerTenor.days,
    lowerSwapPoint: lowerTenor.swapPointNum,
    upperTenor: upperTenor.tenor,
    upperDays: upperTenor.days,
    upperSwapPoint: upperTenor.swapPointNum,
  };
}
