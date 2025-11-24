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
 * Calculates days from TODAY's spot date and interpolates using stored data
 */
export async function getSwapPointForDate(
  currencyPairId: string,
  settlementDate: Date,
  storage: IStorage
): Promise<number | null> {
  // Calculate TODAY's spot date and target days
  const spotDate = getSpotDate();
  const targetDays = getDaysBetween(spotDate, settlementDate);

  // Get all swap points for this currency pair with settlement dates
  const allSwapPoints = await storage.getSwapPointsByCurrencyPair(currencyPairId);
  
  if (!allSwapPoints || allSwapPoints.length === 0) {
    return null;
  }

  // Calculate days for each stored swap point based on TODAY's spot date
  const pointsWithCurrentDays = allSwapPoints
    .filter(sp => sp.settlementDate !== null && sp.settlementDate !== undefined)
    .map(sp => ({
      ...sp,
      currentDays: getDaysBetween(spotDate, new Date(sp.settlementDate!))
    }))
    .sort((a, b) => a.currentDays - b.currentDays);

  if (pointsWithCurrentDays.length === 0) {
    return null;
  }

  // Find exact match first
  const exactMatch = pointsWithCurrentDays.find(sp => sp.currentDays === targetDays);
  if (exactMatch) {
    return parseFloat(exactMatch.swapPoint);
  }

  // Find bracketing points for interpolation using TODAY's calculated days
  let lower = null;
  let upper = null;

  for (const point of pointsWithCurrentDays) {
    if (point.currentDays <= targetDays) {
      lower = point;
    }
    
    if (point.currentDays >= targetDays && !upper) {
      upper = point;
      break;
    }
  }

  // If we have both bracketing points, interpolate by days
  if (lower && upper && lower.currentDays !== upper.currentDays) {
    const lowerSwap = parseFloat(lower.swapPoint);
    const upperSwap = parseFloat(upper.swapPoint);
    
    return linearInterpolate(
      targetDays,
      lower.currentDays,
      lowerSwap,
      upper.currentDays,
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
