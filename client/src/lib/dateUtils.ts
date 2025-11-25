/**
 * Timezone-aware date utilities (KST = UTC+9)
 * Used across trading pages and quote approvals
 */

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

/**
 * Check if date string is a KR holiday
 */
export function isKRHoliday(dateStr: string): boolean {
  return KR_HOLIDAYS.includes(dateStr);
}

/**
 * Check if date string is a US holiday
 */
export function isUSHoliday(dateStr: string): boolean {
  return US_HOLIDAYS.includes(dateStr);
}

/**
 * Format date string (YYYY-MM-DD format)
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get today as local midnight (fixes timezone issue)
 * Returns date with hours/minutes/seconds = 0
 */
export function getTodayLocal(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Format date for input element (local timezone based)
 * YYYY-MM-DD format using getFullYear/getMonth/getDate (not toISOString)
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add business days (KR holidays기준, US holiday면 익영업일로)
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = days;
  
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    const dateStr = formatDateString(result);
    
    // Skip weekends and KR holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isKRHoliday(dateStr)) {
      remaining--;
    }
  }
  
  // If final date is a US holiday, add 1 more business day (익영업일)
  const finalDateStr = formatDateString(result);
  if (isUSHoliday(finalDateStr)) {
    return addBusinessDays(result, 1);
  }
  
  return result;
}

/**
 * Get spot date (T+2 business days with US holiday adjustment)
 */
export function getSpotDate(baseDate: Date = getTodayLocal()): Date {
  return addBusinessDays(baseDate, 2);
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
 * Get calendar days between two dates
 */
export function getDaysBetween(start: Date, end: Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get business days between two dates (KR holidays 기준)
 */
export function getBusinessDaysBetween(start: Date, end: Date): number {
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
