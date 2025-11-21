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
 */
export async function getSwapPointForDate(
  currencyPairId: string,
  settlementDate: Date,
  storage: IStorage
): Promise<number | null> {
  const spotDate = getSpotDate();
  const targetDays = getDaysBetween(spotDate, settlementDate);

  // Get all swap points for this currency pair, ordered by days
  const allSwapPoints = await storage.getSwapPointsByCurrencyPair(currencyPairId);
  
  if (!allSwapPoints || allSwapPoints.length === 0) {
    return null;
  }

  // Sort by days ascending
  const sortedPoints = allSwapPoints
    .filter(sp => sp.days !== null)
    .sort((a, b) => (a.days || 0) - (b.days || 0));

  if (sortedPoints.length === 0) {
    return null;
  }

  // Find exact match first
  const exactMatch = sortedPoints.find(sp => sp.days === targetDays);
  if (exactMatch) {
    return parseFloat(exactMatch.swapPoint);
  }

  // Find bracketing points for interpolation
  let lower = null;
  let upper = null;

  for (const point of sortedPoints) {
    const days = point.days || 0;
    
    if (days <= targetDays) {
      lower = point;
    }
    
    if (days >= targetDays && !upper) {
      upper = point;
      break;
    }
  }

  // If we have both bracketing points, interpolate
  if (lower && upper && lower.days !== upper.days) {
    const lowerSwap = parseFloat(lower.swapPoint);
    const upperSwap = parseFloat(upper.swapPoint);
    
    return linearInterpolate(
      targetDays,
      lower.days || 0,
      lowerSwap,
      upper.days || 0,
      upperSwap
    );
  }

  // If we only have lower point (extrapolate not recommended, return null)
  if (lower && !upper) {
    return null; // Cannot extrapolate beyond available data
  }

  // If we only have upper point (before first tenor)
  if (!lower && upper) {
    return null; // Cannot extrapolate before first tenor
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
