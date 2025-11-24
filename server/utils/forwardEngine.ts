import { IStorage } from "../storage";
import { getSpotDate, getDaysBetween } from "./settlement";

/**
 * Linear interpolation between two points
 */
function linearInterpolate(
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  if (x2 === x1) return y1;
  return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
}

/**
 * Calculate days from spot date for a tenor (using ForwardRateCalculator logic)
 * This ensures consistent calculation across UI and backend
 */
function calculateTenorDays(spotDate: Date, tenor: string): number {
  const tenorUpper = tenor.toUpperCase();
  
  if (tenorUpper === "SPOT") return 0;
  
  // ON: today to next business day
  if (tenorUpper === "ON") {
    // Simplified: ON = 1 day from today (calendar days)
    return 1;
  }
  
  // TN: Spot date
  if (tenorUpper === "TN") {
    return getDaysBetween(new Date(), spotDate);
  }
  
  // Month tenors (1M, 3M, etc)
  const monthMatch = tenorUpper.match(/^(\d+)M$/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1]);
    const futureDate = new Date(spotDate);
    futureDate.setMonth(futureDate.getMonth() + months);
    
    // Skip weekends
    while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
      futureDate.setDate(futureDate.getDate() + 1);
    }
    
    return getDaysBetween(spotDate, futureDate);
  }
  
  return 0;
}

/**
 * Get swap point for a specific settlement date using linear interpolation
 * Uses tenor-based days calculation (consistent with ForwardRateCalculator)
 */
export async function getSwapPointForDate(
  currencyPairId: string,
  settlementDate: Date,
  storage: IStorage,
  tenor?: string
): Promise<number | null> {
  // Get the base spot date (T+2)
  const spotDate = getSpotDate();
  const targetDays = getDaysBetween(spotDate, settlementDate);

  // Get all swap points for this currency pair
  const allSwapPoints = await storage.getSwapPointsByCurrencyPair(currencyPairId);
  
  if (!allSwapPoints || allSwapPoints.length === 0) {
    return null;
  }

  // Group by settlementDate and keep only the latest for each date
  const pointsByDate = new Map<string, typeof allSwapPoints[0]>();
  
  for (const sp of allSwapPoints) {
    if (!sp.settlementDate) continue;
    
    const dateKey = new Date(sp.settlementDate).toISOString().split('T')[0];
    const existing = pointsByDate.get(dateKey);
    
    if (!existing || new Date(sp.updatedAt || sp.createdAt || 0) > new Date(existing.updatedAt || existing.createdAt || 0)) {
      pointsByDate.set(dateKey, sp);
    }
  }
  
  // Convert to array with calculated days (using tenor if available, or settlement date)
  const pointsWithDays = Array.from(pointsByDate.values())
    .map(sp => {
      // Use tenor-based days if tenor is available in swap point, otherwise calculate from settlement date
      let calculatedDays = sp.tenor 
        ? calculateTenorDays(spotDate, sp.tenor)
        : getDaysBetween(spotDate, new Date(sp.settlementDate!));
      
      return {
        ...sp,
        calculatedDays,
      };
    })
    .sort((a, b) => a.calculatedDays - b.calculatedDays);

  if (pointsWithDays.length === 0) {
    return null;
  }

  // Find bracketing points for interpolation (same logic as ForwardRateCalculator)
  let lower = null;
  let upper = null;

  // First, look for exact match or bracketing range
  for (let i = 0; i < pointsWithDays.length; i++) {
    const point = pointsWithDays[i];
    
    if (point.calculatedDays === targetDays) {
      // Exact match - but still interpolate if possible for consistency
      lower = point;
      upper = point;
      break;
    }
    
    if (point.calculatedDays < targetDays) {
      lower = point;
    }
    
    if (point.calculatedDays >= targetDays && !upper) {
      upper = point;
      if (lower) break; // We have both now
    }
  }

  // If we only have one side, find the next point for interpolation
  if (lower && !upper && lower.calculatedDays < targetDays) {
    const nextIndex = pointsWithDays.indexOf(lower) + 1;
    if (nextIndex < pointsWithDays.length) {
      upper = pointsWithDays[nextIndex];
    }
  }
  
  if (!lower && upper && upper.calculatedDays > targetDays) {
    const prevIndex = pointsWithDays.indexOf(upper) - 1;
    if (prevIndex >= 0) {
      lower = pointsWithDays[prevIndex];
    }
  }

  // Perform linear interpolation (same as ForwardRateCalculator)
  if (lower && upper) {
    const lowerSwap = parseFloat(lower.swapPoint);
    const upperSwap = parseFloat(upper.swapPoint);
    const lowerDays = lower.calculatedDays;
    const upperDays = upper.calculatedDays;
    
    if (lowerDays === upperDays) {
      // Exact match or same days
      return lowerSwap;
    }
    
    // Linear interpolation formula (same as UI)
    return linearInterpolate(
      targetDays,
      lowerDays,
      lowerSwap,
      upperDays,
      upperSwap
    );
  }

  // Fallback to single point if only one available
  if (lower) {
    return parseFloat(lower.swapPoint);
  }
  if (upper) {
    return parseFloat(upper.swapPoint);
  }

  return null;
}

/**
 * Calculate theoretical forward rate
 * Formula: Forward Rate = Spot Rate + (Swap Point / 100)
 */
export function calculateTheoreticalRate(
  spotRate: number,
  swapPoint: number
): number {
  return spotRate + swapPoint / 100;
}

/**
 * Get applicable spread for a quote request
 * Uses existing getSpreadForUser function which handles group hierarchy
 * 
 * For Forward: Apply spread on settlement date
 * For Swap: Apply spread only on far leg settlement date
 */
export async function getApplicableSpread(
  userId: string,
  currencyPairId: string,
  productType: string,
  tenor: string | undefined,
  storage: IStorage
): Promise<number> {
  // Get user to find their group hierarchy
  const user = await storage.getUser(userId);
  if (!user) {
    return 0;
  }

  // Use existing spread calculation function
  return await storage.getSpreadForUser(productType, currencyPairId, user, tenor);
}
