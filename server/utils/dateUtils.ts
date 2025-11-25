/**
 * Backend timezone-aware date utilities (KST = UTC+9)
 * Used to ensure consistent timezone handling across server
 */

/**
 * Get today's date at midnight in KST
 * Ensures all date comparisons use consistent timezone
 */
export function getTodayLocal(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Format date as YYYY-MM-DD string (local timezone based)
 * Uses local getFullYear/getMonth/getDate (NOT toISOString)
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current timestamp in ISO format (for database storage)
 * Stored as UTC in database, but interpreted as KST in application
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Verify timezone is set correctly
 */
export function verifyTimezone(): void {
  const now = new Date();
  const todayLocal = getTodayLocal();
  const offset = now.getTimezoneOffset(); // Minutes west of UTC (negative for east)
  
  // KST should have -540 offset (UTC+9 = -9*60 = -540)
  const isKST = offset === -540;
  
  console.log(`[Timezone] Current offset: ${offset} minutes (${-offset / 60} hours ahead of UTC)`);
  console.log(`[Timezone] Is KST? ${isKST}`);
  console.log(`[Timezone] Now: ${now.toISOString()}`);
  console.log(`[Timezone] Today (local): ${formatDateForInput(todayLocal)}`);
}
