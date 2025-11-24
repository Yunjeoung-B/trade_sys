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
 * Get swap point for a specific settlement date using linear interpolation
 * Uses settlement date for consistency (not affected by changing spot date)
 */
export async function getSwapPointForDate(
  currencyPairId: string,
  settlementDate: Date,
  storage: IStorage
): Promise<number | null> {
  // Get all swap points for this currency pair with settlement dates
  const allSwapPoints = await storage.getSwapPointsByCurrencyPair(currencyPairId);
  
  if (!allSwapPoints || allSwapPoints.length === 0) {
    return null;
  }

  // Filter points with settlement dates and sort by settlement date
  const validPoints = allSwapPoints
    .filter(sp => sp.settlementDate !== null)
    .sort((a, b) => {
      const dateA = new Date(a.settlementDate!).getTime();
      const dateB = new Date(b.settlementDate!).getTime();
      return dateA - dateB;
    });

  if (validPoints.length === 0) {
    return null;
  }

  const targetTime = new Date(settlementDate).getTime();

  // Find exact match first (exact settlement date)
  const exactMatch = validPoints.find(sp => {
    const pointTime = new Date(sp.settlementDate!).getTime();
    return Math.abs(pointTime - targetTime) < 1000; // Within 1 second
  });
  
  if (exactMatch) {
    return parseFloat(exactMatch.swapPoint);
  }

  // Find bracketing points for interpolation
  let lower = null;
  let upper = null;

  for (const point of validPoints) {
    const pointTime = new Date(point.settlementDate!).getTime();
    
    if (pointTime <= targetTime) {
      lower = point;
    }
    
    if (pointTime >= targetTime && !upper) {
      upper = point;
      break;
    }
  }

  // If we have both bracketing points, interpolate by settlement date
  if (lower && upper && lower.settlementDate !== upper.settlementDate) {
    const lowerSwap = parseFloat(lower.swapPoint);
    const upperSwap = parseFloat(upper.swapPoint);
    
    const lowerTime = new Date(lower.settlementDate!).getTime();
    const upperTime = new Date(upper.settlementDate!).getTime();
    
    return linearInterpolate(
      targetTime,
      lowerTime,
      lowerSwap,
      upperTime,
      upperSwap
    );
  }

  // If we only have lower point (extrapolate not recommended, return null)
  if (lower && !upper) {
    return null;
  }

  // If we only have upper point (before first tenor)
  if (!lower && upper) {
    return null;
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
