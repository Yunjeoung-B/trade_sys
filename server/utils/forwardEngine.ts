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
 * @param referenceSpotDate - Optional spot date reference (typically from ForwardRateCalculator)
 *                           If provided, uses this instead of recalculating T+2
 */
export async function getSwapPointForDate(
  currencyPairId: string,
  settlementDate: Date,
  storage: IStorage,
  tenor?: string,
  referenceSpotDate?: Date
): Promise<number | null> {
  // Use provided spot date or calculate T+2 from today
  const spotDate = referenceSpotDate || getSpotDate();
  const targetDays = getDaysBetween(spotDate, settlementDate);

  console.log(`[SwapPoint Debug] ====== START CALCULATION ======`);
  console.log(`[SwapPoint Debug] Settlement Date: ${new Date(settlementDate).toISOString().split('T')[0]}`);
  console.log(`[SwapPoint Debug] Spot Date: ${spotDate.toISOString().split('T')[0]} ${referenceSpotDate ? '(reference)' : '(current T+2)'}`);
  console.log(`[SwapPoint Debug] Target Days (Date-based): ${targetDays}`);
  console.log(`[SwapPoint Debug] Tenor: ${tenor || 'none'}`);

  // Get all swap points for this currency pair
  const allSwapPoints = await storage.getSwapPointsByCurrencyPair(currencyPairId);
  
  if (!allSwapPoints || allSwapPoints.length === 0) {
    console.log(`[SwapPoint Debug] No swap points found in database`);
    return null;
  }

  console.log(`[SwapPoint Debug] Total swap points in DB: ${allSwapPoints.length}`);

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
  
  // Convert to array with calculated days (always SPOT-based, using settlement date)
  const pointsWithDays = Array.from(pointsByDate.values())
    .map(sp => {
      // Calculate days from SPOT to settlement date (all calculations Spot-based)
      const calculatedDays = getDaysBetween(spotDate, new Date(sp.settlementDate!));
      
      console.log(`[SwapPoint Debug] Data Point: tenor=${sp.tenor}, date=${sp.settlementDate}, swapPoint=${sp.swapPoint}, calculatedDays=${calculatedDays}`);
      
      return {
        ...sp,
        calculatedDays,
      };
    })
    .sort((a, b) => a.calculatedDays - b.calculatedDays);

  console.log(`[SwapPoint Debug] Sorted points by days: ${pointsWithDays.map(p => `${p.calculatedDays}days(${p.swapPoint})`).join(', ')}`);

  if (pointsWithDays.length === 0) {
    console.log(`[SwapPoint Debug] No points after processing`);
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

  console.log(`[SwapPoint Debug] Lower bracket: ${lower ? `${lower.calculatedDays}days(${lower.swapPoint})` : 'none'}`);
  console.log(`[SwapPoint Debug] Upper bracket: ${upper ? `${upper.calculatedDays}days(${upper.swapPoint})` : 'none'}`);

  // Perform linear interpolation (same as ForwardRateCalculator)
  if (lower && upper) {
    const lowerSwap = parseFloat(lower.swapPoint);
    const upperSwap = parseFloat(upper.swapPoint);
    const lowerDays = lower.calculatedDays;
    const upperDays = upper.calculatedDays;
    
    if (lowerDays === upperDays) {
      // Exact match or same days
      console.log(`[SwapPoint Debug] RESULT: Exact match at ${lowerDays} days = ${lowerSwap}`);
      return lowerSwap;
    }
    
    // Linear interpolation formula (same as UI)
    const result = linearInterpolate(
      targetDays,
      lowerDays,
      lowerSwap,
      upperDays,
      upperSwap
    );
    
    console.log(`[SwapPoint Debug] Interpolation formula: (${targetDays}-${lowerDays})/(${upperDays}-${lowerDays}) * (${upperSwap}-${lowerSwap}) + ${lowerSwap} = ${result}`);
    console.log(`[SwapPoint Debug] RESULT: Interpolated = ${result}`);
    
    return result;
  }

  // Fallback to single point if only one available
  if (lower) {
    console.log(`[SwapPoint Debug] RESULT: Only lower bracket available = ${lower.swapPoint}`);
    return parseFloat(lower.swapPoint);
  }
  if (upper) {
    console.log(`[SwapPoint Debug] RESULT: Only upper bracket available = ${upper.swapPoint}`);
    return parseFloat(upper.swapPoint);
  }

  console.log(`[SwapPoint Debug] RESULT: No interpolation possible, returning null`);
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
