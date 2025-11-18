import * as XLSX from 'xlsx';
import { InsertSwapPoint } from '../../shared/schema';

export interface ParsedSwapPoint {
  tenor?: string;
  settlementDate?: Date;
  days?: number;
  swapPoint: string;
}

/**
 * Parses an Excel file containing swap point data
 * Expected columns: tenor, settlement_date, days, swap_point
 * @param fileBuffer - Buffer containing the Excel file data
 * @param currencyPairId - Currency pair ID to associate with the swap points
 * @param uploadedBy - User ID who uploaded the file
 * @returns Array of parsed swap points ready for database insertion
 */
export function parseSwapPointsExcel(
  fileBuffer: Buffer,
  currencyPairId: string,
  uploadedBy: string
): Partial<InsertSwapPoint>[] {
  try {
    // Read the Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }
    
    // Parse and validate each row (strict - any error aborts the entire upload)
    const swapPoints: Partial<InsertSwapPoint>[] = [];
    
    for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex];
      const rowNumber = rowIndex + 2; // +2 for header row and 1-based indexing
      
      // Support various column naming conventions
      const tenor = row.tenor || row.Tenor || row.TENOR;
      const settlementDate = row.settlement_date || row.settlementDate || row.SettlementDate || row.SETTLEMENT_DATE;
      const days = row.days || row.Days || row.DAYS;
      const swapPoint = row.swap_point || row.swapPoint || row.SwapPoint || row.SWAP_POINT;
      
      // Validate that at least swap_point is provided
      if (swapPoint === undefined || swapPoint === null) {
        throw new Error(`Row ${rowNumber}: Missing required swap_point value`);
      }
      
      // Convert swap point to number and validate (strict)
      const numericSwapPoint = typeof swapPoint === 'number' ? swapPoint : parseFloat(String(swapPoint));
      if (isNaN(numericSwapPoint)) {
        throw new Error(`Row ${rowNumber}: Invalid swap_point value "${swapPoint}" - must be a valid number`);
      }
      
      const point: Partial<InsertSwapPoint> = {
        currencyPairId,
        swapPoint: numericSwapPoint.toString(),
        source: 'EXCEL_UPLOAD',
        uploadedBy,
      };
      
      // Add tenor if provided
      if (tenor) {
        point.tenor = String(tenor);
      }
      
      // Add settlement date if provided (store as Date for DB, will be serialized)
      if (settlementDate) {
        const date = parseExcelDate(settlementDate);
        if (date) {
          point.settlementDate = date;
        }
      }
      
      // Add days if provided (strict validation)
      if (days !== undefined && days !== null) {
        const numericDays = typeof days === 'number' ? days : parseInt(String(days), 10);
        if (isNaN(numericDays)) {
          throw new Error(`Row ${rowNumber}: Invalid days value "${days}" - must be a valid integer`);
        }
        point.days = numericDays;
      }
      
      swapPoints.push(point);
    }
    
    if (swapPoints.length === 0) {
      throw new Error('No valid swap points found in Excel file');
    }
    
    return swapPoints;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file: ' + (error as Error).message);
  }
}

/**
 * Parses a date value that might be in various formats
 * @param value - Date value from Excel
 * @returns Parsed Date object or null
 */
function parseExcelDate(value: any): Date | null {
  try {
    // If it's already a Date
    if (value instanceof Date) {
      return value;
    }
    
    // If it's a number (Excel serial date)
    if (typeof value === 'number') {
      // Excel dates are days since 1900-01-01 (with a bug: 1900 is incorrectly treated as leap year)
      const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date;
    }
    
    // If it's a string
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date:', value, error);
    return null;
  }
}

/**
 * Validates swap points data structure
 * @param swapPoints - Array of swap points to validate
 * @returns True if valid, throws error otherwise
 */
export function validateSwapPoints(swapPoints: Partial<InsertSwapPoint>[]): boolean {
  if (!Array.isArray(swapPoints) || swapPoints.length === 0) {
    throw new Error('Swap points array is empty or invalid');
  }
  
  for (const point of swapPoints) {
    if (!point.currencyPairId) {
      throw new Error('Currency pair ID is required');
    }
    
    if (!point.swapPoint) {
      throw new Error('Swap point value is required');
    }
    
    // At least one of tenor, settlementDate, or days should be provided
    if (!point.tenor && !point.settlementDate && !point.days) {
      throw new Error('At least one of tenor, settlementDate, or days must be provided');
    }
  }
  
  return true;
}
