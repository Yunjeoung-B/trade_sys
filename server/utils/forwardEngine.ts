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
  // IMPORTANT: Filter out ON and TN (pre-SPOT settlement dates)
  // Per requirement: ON/TN are not reflected in SPOT-based calculations
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
    .filter(p => p.calculatedDays >= 0) // Filter out ON/TN (negative days, pre-SPOT)
    .sort((a, b) => a.calculatedDays - b.calculatedDays);

  console.log(`[SwapPoint Debug] Sorted points by days: ${pointsWithDays.map(p => `${p.calculatedDays}days(${p.swapPoint})`).join(', ')}`);

  if (pointsWithDays.length === 0) {
    console.log(`[SwapPoint Debug] No points after processing`);
    return null;
  }

  // Find bracketing points for interpolation (same logic as ForwardRateCalculator)
  let lower = null;
  let upper = null;

  // For SPOT-based settlement dates (targetDays >= 0), don't use TN/ON
  // Instead treat it as 0 days with 0 swap point
  const useSpotAsLower = targetDays >= 0;

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

  // If targeting SPOT-based date (>= 0 days), ignore TN/ON and use 0 as lower
  if (useSpotAsLower && lower && lower.calculatedDays < 0) {
    lower = null; // Ignore negative days points
  }
  
  // If we only have one side, find the next point for interpolation
  if (lower && !upper && lower.calculatedDays < targetDays) {
    const nextIndex = pointsWithDays.indexOf(lower) + 1;
    if (nextIndex < pointsWithDays.length) {
      upper = pointsWithDays[nextIndex];
    }
  }
  
  if (!lower && upper && upper.calculatedDays > targetDays) {
    // For SPOT-based date, use 0 as virtual lower point
    if (useSpotAsLower && upper.calculatedDays >= 0) {
      lower = { ...upper, calculatedDays: 0, swapPoint: 0 } as any;
    } else {
      const prevIndex = pointsWithDays.indexOf(upper) - 1;
      if (prevIndex >= 0) {
        lower = pointsWithDays[prevIndex];
      }
    }
  }

  // SPOT itself (0 days): swap point = 0
  if (targetDays === 0) {
    console.log(`[SwapPoint Debug] RESULT: SPOT date (0 days) = 0`);
    return 0;
  }

  // Handle SPOT-before dates with special logic
  if (targetDays < 0) {
    // For SPOT-before settlement dates, use simple rule:
    // T+1 (ON, -1 days from SPOT): swap = -TN
    // T (TODAY, -2 days from SPOT): swap = -(ON + TN)
    // Between: interpolation
    
    const onPoint = pointsWithDays.find(p => p.calculatedDays === -1);
    const tnPoint = pointsWithDays.find(p => p.calculatedDays === 0);
    
    if (onPoint && tnPoint) {
      const onSwap = parseFloat(onPoint.swapPoint);
      const tnSwap = parseFloat(tnPoint.swapPoint);
      
      if (targetDays === -1) {
        // T+1 (ON): -TN
        const result = -tnSwap;
        console.log(`[SwapPoint Debug] SPOT-before T+1: -TN = ${result}`);
        return result;
      } else if (targetDays === -2) {
        // T (TODAY): -(ON + TN)
        const result = -(onSwap + tnSwap);
        console.log(`[SwapPoint Debug] SPOT-before T: -(ON + TN) = ${result}`);
        return result;
      } else if (targetDays > -2 && targetDays < -1) {
        // Between TODAY and ON: interpolate
        const lowerSwap = -(onSwap + tnSwap); // TODAY
        const upperSwap = -tnSwap; // ON
        const daysFromToday = targetDays + 2; // TODAY = 0
        
        const result = lowerSwap + (upperSwap - lowerSwap) * daysFromToday / 1;
        console.log(`[SwapPoint Debug] SPOT-before interpolation: (${targetDays}+2)/1 * (${upperSwap}-(${lowerSwap})) + ${lowerSwap} = ${result}`);
        return result;
      } else if (targetDays < -2) {
        // Before TODAY: use TODAY swap
        const result = -(onSwap + tnSwap);
        console.log(`[SwapPoint Debug] SPOT-before (before TODAY): -(ON + TN) = ${result}`);
        return result;
      }
    }
  }

  console.log(`[SwapPoint Debug] Lower bracket: ${lower ? `${lower.calculatedDays}days(${lower.swapPoint})` : 'none'}`);
  console.log(`[SwapPoint Debug] Upper bracket: ${upper ? `${upper.calculatedDays}days(${upper.swapPoint})` : 'none'}`);

  // Perform linear interpolation (same as ForwardRateCalculator) for SPOT-after dates
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

  // Handle insufficient bracket cases
  if (lower && !upper && lower.calculatedDays < targetDays) {
    // Target date exceeds the highest available data point
    const maxDays = pointsWithDays[pointsWithDays.length - 1].calculatedDays;
    console.log(`[SwapPoint Debug] ERROR: Target date (${targetDays} days) exceeds maximum available data (${maxDays} days)`);
    throw new Error(`Settlement date exceeds maximum available swap point data. Maximum: ${maxDays} days, Requested: ${targetDays} days`);
  }
  
  if (upper && !lower) {
    // Only upper bracket available - use it as-is (SPOT-based, lower = 0)
    console.log(`[SwapPoint Debug] RESULT: Only upper bracket available = ${upper.swapPoint}`);
    return parseFloat(upper.swapPoint);
  }

  if (lower) {
    // Should not reach here, but fallback to lower if only that exists
    console.log(`[SwapPoint Debug] RESULT: Only lower bracket available = ${lower.swapPoint}`);
    return parseFloat(lower.swapPoint);
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
