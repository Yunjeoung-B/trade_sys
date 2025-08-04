import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { WebSocket } from 'ws';

interface ExcelCellData {
  cellAddress: string;
  value: any;
  timestamp: string;
  sheetName: string;
  fileName: string;
}

class ExcelMonitor {
  private watchedFiles: Map<string, any> = new Map();
  private wsClients: Set<WebSocket> = new Set();
  private lastData: Map<string, any> = new Map();

  constructor() {
    this.setupWebSocket();
  }

  private setupWebSocket() {
    // WebSocket 서버는 main routes에서 설정됨
  }

  // 엑셀 파일 모니터링 시작
  startWatching(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`Excel file not found: ${filePath}`);
        return false;
      }

      // 이미 모니터링 중인 파일은 중지
      if (this.watchedFiles.has(filePath)) {
        this.stopWatching(filePath);
      }

      fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          this.onFileChanged(filePath);
        }
      });

      this.watchedFiles.set(filePath, true);
      
      // 초기 데이터 로드
      this.onFileChanged(filePath);
      
      console.log(`Started monitoring Excel file: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`Error starting Excel monitoring: ${error}`);
      return false;
    }
  }

  // 엑셀 파일 모니터링 중지
  stopWatching(filePath: string): boolean {
    if (this.watchedFiles.has(filePath)) {
      fs.unwatchFile(filePath);
      this.watchedFiles.delete(filePath);
      console.log(`Stopped monitoring Excel file: ${filePath}`);
      return true;
    }
    return false;
  }

  // 모든 모니터링 중지
  stopAllWatching() {
    const filePaths = Array.from(this.watchedFiles.keys());
    for (const filePath of filePaths) {
      this.stopWatching(filePath);
    }
  }

  // 파일 변경 감지 시 호출
  private onFileChanged(filePath: string) {
    try {
      const data = this.readExcelFile(filePath);
      const fileName = path.basename(filePath);
      
      // 데이터가 변경된 경우에만 브로드캐스트
      const dataKey = `${fileName}_data`;
      const currentDataString = JSON.stringify(data);
      
      if (this.lastData.get(dataKey) !== currentDataString) {
        this.lastData.set(dataKey, currentDataString);
        this.broadcastExcelData(fileName, data);
      }
    } catch (error) {
      console.error(`Error reading Excel file ${filePath}:`, error);
    }
  }

  // 엑셀 파일 읽기
  private readExcelFile(filePath: string): ExcelCellData[] {
    const workbook = XLSX.readFile(filePath);
    const result: ExcelCellData[] = [];
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString();

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      // 모든 셀 데이터 추출
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v !== undefined) {
            result.push({
              cellAddress,
              value: cell.v,
              timestamp,
              sheetName,
              fileName
            });
          }
        }
      }
    });

    return result;
  }

  // WebSocket 클라이언트에 데이터 브로드캐스트
  private broadcastExcelData(fileName: string, data: ExcelCellData[]) {
    const message = JSON.stringify({
      type: 'excel_update',
      fileName,
      data,
      timestamp: new Date().toISOString()
    });

    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    console.log(`Broadcasted Excel data update for ${fileName} to ${this.wsClients.size} clients`);
  }

  // WebSocket 클라이언트 추가
  addClient(client: WebSocket) {
    this.wsClients.add(client);
    
    client.on('close', () => {
      this.wsClients.delete(client);
    });

    client.on('error', (error) => {
      console.error('WebSocket client error:', error);
      this.wsClients.delete(client);
    });
  }

  // 현재 모니터링 중인 파일 목록
  getWatchedFiles(): string[] {
    return Array.from(this.watchedFiles.keys());
  }

  // 특정 파일의 최신 데이터 가져오기
  getCurrentData(filePath: string): ExcelCellData[] | null {
    try {
      if (fs.existsSync(filePath)) {
        return this.readExcelFile(filePath);
      }
    } catch (error) {
      console.error(`Error getting current data for ${filePath}:`, error);
    }
    return null;
  }

  // 특정 셀 값 가져오기
  getCellValue(filePath: string, sheetName: string, cellAddress: string): any {
    try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[sheetName];
      const cell = worksheet[cellAddress];
      return cell ? cell.v : null;
    } catch (error) {
      console.error(`Error getting cell value:`, error);
      return null;
    }
  }

  // 특정 범위의 데이터 가져오기
  getRangeData(filePath: string, sheetName: string, range: string): any[][] {
    try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        range: range,
        raw: false 
      });
      return data as any[][];
    } catch (error) {
      console.error(`Error getting range data:`, error);
      return [];
    }
  }
}

export const excelMonitor = new ExcelMonitor();