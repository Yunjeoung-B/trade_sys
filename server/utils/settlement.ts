/**
 * Settlement date calculation utilities for FX trading
 * Handles T+1, T+2, and tenor-based calculations
 */

export interface HolidayCalendar {
  holidays: Date[];
}

/**
 * Check if a date is a weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Check if a date is a holiday
 */
function isHoliday(date: Date, calendar?: HolidayCalendar): boolean {
  if (!calendar || !calendar.holidays) return false;
  
  const dateStr = date.toISOString().split('T')[0];
  return calendar.holidays.some(holiday => {
    const holidayStr = holiday.toISOString().split('T')[0];
    return holidayStr === dateStr;
  });
}

/**
 * Check if a date is a business day
 */
function isBusinessDay(date: Date, calendar?: HolidayCalendar): boolean {
  return !isWeekend(date) && !isHoliday(date, calendar);
}

/**
 * Add business days to a date
 */
export function addBusinessDays(
  baseDate: Date,
  daysToAdd: number,
  calendar?: HolidayCalendar
): Date {
  let currentDate = new Date(baseDate);
  let remainingDays = daysToAdd;

  while (remainingDays > 0) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (isBusinessDay(currentDate, calendar)) {
      remainingDays--;
    }
  }

  return currentDate;
}

/**
 * Calculate Spot date (T+2 business days)
 */
export function getSpotDate(
  baseDate: Date = new Date(),
  calendar?: HolidayCalendar
): Date {
  return addBusinessDays(baseDate, 2, calendar);
}

/**
 * Calculate a business date from base date with offset
 * @param baseDate - Starting date
 * @param offset - Number of business days to add
 * @param calendar - Optional holiday calendar
 */
export function getBusinessDate(
  baseDate: Date,
  offset: number,
  calendar?: HolidayCalendar
): Date {
  if (offset === 0) return new Date(baseDate);
  return addBusinessDays(baseDate, offset, calendar);
}

/**
 * Calculate the number of calendar days between two dates
 */
export function getDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Convert tenor to approximate days from spot
 * @param tenor - Tenor string like "ON", "TN", "1M", "2M", "3M", etc.
 * 
 * Days are calculated relative to Spot (T+2):
 * - ON (T+1) is 1 day before Spot → -1
 * - TN (T+2) is same as Spot → 0
 * - 1M, 2M, etc. are after Spot → positive values
 */
export function tenorToApproxDays(tenor: string): number {
  const tenorUpper = tenor.toUpperCase();
  
  // Special cases (relative to Spot date)
  if (tenorUpper === "SPOT") return 0;
  if (tenorUpper === "ON") return -1;  // T+1, one day before Spot (T+2)
  if (tenorUpper === "TN") return 0;   // T+2, same as Spot
  
  // Parse month tenors (1M, 2M, etc.)
  const monthMatch = tenorUpper.match(/^(\d+)M$/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1]);
    return months * 30; // Approximate
  }
  
  // Parse year tenors (1Y, 2Y, etc.)
  const yearMatch = tenorUpper.match(/^(\d+)Y$/);
  if (yearMatch) {
    const years = parseInt(yearMatch[1]);
    return years * 360; // Approximate
  }
  
  return 0;
}

/**
 * Convert tenor to actual settlement date from spot date
 * @param spotDate - Spot date (T+2)
 * @param tenor - Tenor string
 * @param calendar - Optional holiday calendar
 */
export function tenorToSettlementDate(
  spotDate: Date,
  tenor: string,
  calendar?: HolidayCalendar
): Date {
  const tenorUpper = tenor.toUpperCase();
  
  // Special cases - these are from TODAY, not from spot
  if (tenorUpper === "ON") {
    return addBusinessDays(new Date(), 1, calendar);
  }
  if (tenorUpper === "TN") {
    return addBusinessDays(new Date(), 2, calendar);
  }
  if (tenorUpper === "SPOT") {
    return new Date(spotDate);
  }
  
  // Month tenors - add months from spot date
  const monthMatch = tenorUpper.match(/^(\d+)M$/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1]);
    const result = new Date(spotDate);
    result.setMonth(result.getMonth() + months);
    
    // Adjust to business day if needed
    while (!isBusinessDay(result, calendar)) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  }
  
  // Year tenors
  const yearMatch = tenorUpper.match(/^(\d+)Y$/);
  if (yearMatch) {
    const years = parseInt(yearMatch[1]);
    const result = new Date(spotDate);
    result.setFullYear(result.getFullYear() + years);
    
    // Adjust to business day if needed
    while (!isBusinessDay(result, calendar)) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  }
  
  return new Date(spotDate);
}

/**
 * Add calendar days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Convert days from spot to settlement date
 * @param spotDate - Spot date (T+2)
 * @param daysFromSpot - Number of calendar days from spot
 */
export function daysToDate(spotDate: Date, daysFromSpot: number): Date {
  return addDays(spotDate, daysFromSpot);
}

/**
 * Calculate days from spot date for a given settlement date
 * @param spotDate - Spot date (T+2)
 * @param settlementDate - Target settlement date
 */
export function dateToDaysFromSpot(spotDate: Date, settlementDate: Date): number {
  return getDaysBetween(spotDate, settlementDate);
}

/**
 * Bidirectional converter between settlement date and days from spot
 */
export interface SettlementConversion {
  settlementDate: Date;
  daysFromSpot: number;
}

/**
 * Convert settlement date to days from spot, or vice versa
 */
export function convertSettlement(
  spotDate: Date,
  input: { settlementDate: Date } | { daysFromSpot: number }
): SettlementConversion {
  if ('settlementDate' in input) {
    return {
      settlementDate: input.settlementDate,
      daysFromSpot: dateToDaysFromSpot(spotDate, input.settlementDate),
    };
  } else {
    const settlementDate = daysToDate(spotDate, input.daysFromSpot);
    return {
      settlementDate,
      daysFromSpot: input.daysFromSpot,
    };
  }
}
