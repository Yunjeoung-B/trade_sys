// Linear interpolation utility for swap points

export interface SwapPointData {
  days: number;
  swapPoint: number;
}

/**
 * Performs linear interpolation to calculate swap points for a target settlement date
 * @param knownPoints - Array of known swap point data sorted by days
 * @param targetDays - Target number of days from spot
 * @returns Interpolated swap point value
 */
export function linearInterpolate(knownPoints: SwapPointData[], targetDays: number): number {
  if (knownPoints.length === 0) {
    throw new Error('No known points provided for interpolation');
  }

  // Sort points by days
  const sorted = [...knownPoints].sort((a, b) => a.days - b.days);

  // If target is before first point, use first point value
  if (targetDays <= sorted[0].days) {
    return sorted[0].swapPoint;
  }

  // If target is after last point, use last point value
  if (targetDays >= sorted[sorted.length - 1].days) {
    return sorted[sorted.length - 1].swapPoint;
  }

  // Find the two points to interpolate between
  for (let i = 0; i < sorted.length - 1; i++) {
    const point1 = sorted[i];
    const point2 = sorted[i + 1];

    if (targetDays >= point1.days && targetDays <= point2.days) {
      // Linear interpolation formula: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
      const ratio = (targetDays - point1.days) / (point2.days - point1.days);
      const interpolatedValue = point1.swapPoint + ratio * (point2.swapPoint - point1.swapPoint);
      return interpolatedValue;
    }
  }

  // Fallback (should not reach here)
  return sorted[0].swapPoint;
}

/**
 * Calculates the number of business days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of business days
 */
export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calculates the number of calendar days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of calendar days
 */
export function calculateCalendarDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Gets the interpolated swap point for a specific settlement date
 * @param knownPoints - Array of known swap point data
 * @param settlementDate - Target settlement date
 * @param spotDate - Spot date (default: today + 2 business days)
 * @returns Interpolated swap point
 */
export function getSwapPointForDate(
  knownPoints: SwapPointData[],
  settlementDate: Date,
  spotDate: Date = getSpotDate()
): number {
  const days = calculateCalendarDays(spotDate, settlementDate);
  return linearInterpolate(knownPoints, days);
}

/**
 * Gets the spot date (T+2 business days from today)
 * @param baseDate - Base date (default: today)
 * @returns Spot date
 */
export function getSpotDate(baseDate: Date = new Date()): Date {
  const spot = new Date(baseDate);
  let businessDaysAdded = 0;
  
  while (businessDaysAdded < 2) {
    spot.setDate(spot.getDate() + 1);
    const dayOfWeek = spot.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysAdded++;
    }
  }
  
  return spot;
}
