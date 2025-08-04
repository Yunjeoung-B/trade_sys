import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// 거래 데이터를 엑셀로 내보내기
export function exportTradesToExcel(trades: any[], filename: string = 'trades') {
  const worksheet = XLSX.utils.json_to_sheet(trades.map(trade => ({
    '거래ID': trade.id,
    '거래시간': new Date(trade.createdAt).toLocaleString('ko-KR'),
    '상품유형': trade.productType,
    '통화쌍': trade.currencyPair,
    '방향': trade.direction === 'BUY' ? '매수' : '매도',
    '거래금액': trade.amount?.toLocaleString(),
    '환율': trade.rate,
    '상태': getTradeStatusText(trade.status),
    '고객ID': trade.userId,
    '정산일': trade.settlementDate ? new Date(trade.settlementDate).toLocaleDateString('ko-KR') : '',
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '거래내역');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 환율 데이터를 엑셀로 내보내기
export function exportRatesToExcel(rates: any[], filename: string = 'rates') {
  const worksheet = XLSX.utils.json_to_sheet(rates.map(rate => ({
    '통화쌍': rate.currencyPair,
    '기준환율': rate.baseRate,
    '매수환율': rate.buyRate,
    '매도환율': rate.sellRate,
    '스프레드': rate.spread,
    '업데이트시간': new Date(rate.updatedAt).toLocaleString('ko-KR'),
    '출처': rate.source === 'bloomberg_simulation' ? 'Bloomberg (시뮬레이션)' : rate.source,
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '환율정보');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Bloomberg 실시간 데이터를 엑셀로 내보내기
export function exportBloombergDataToExcel(marketData: Map<string, any>, filename: string = 'bloomberg_data') {
  const dataArray = Array.from(marketData.values()).map(data => ({
    '통화': data.symbol,
    '현재가': data.price,
    '변동': data.change,
    '변동율(%)': data.changePercent,
    '거래량': data.volume?.toLocaleString(),
    '업데이트시간': new Date(data.timestamp).toLocaleString('ko-KR'),
    '데이터출처': data.source === 'bloomberg_simulation' ? 'Bloomberg (시뮬레이션)' : 'Bloomberg Terminal',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataArray);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bloomberg 실시간 데이터');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 엑셀 파일에서 거래 데이터 가져오기
export function importTradesFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // 엑셀 데이터를 거래 객체로 변환
        const trades = jsonData.map((row: any) => ({
          productType: row['상품유형'] || row['Product Type'],
          currencyPair: row['통화쌍'] || row['Currency Pair'],
          direction: (row['방향'] === '매수' || row['Direction'] === 'BUY') ? 'BUY' : 'SELL',
          amount: parseFloat(row['거래금액']?.toString().replace(/,/g, '') || row['Amount']?.toString().replace(/,/g, '') || '0'),
          rate: parseFloat(row['환율'] || row['Rate'] || '0'),
          settlementDate: row['정산일'] || row['Settlement Date'],
          userId: row['고객ID'] || row['Client ID'],
        }));
        
        resolve(trades);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsArrayBuffer(file);
  });
}

// 스프레드 설정을 엑셀로 내보내기
export function exportSpreadSettingsToExcel(spreads: any[], filename: string = 'spread_settings') {
  const worksheet = XLSX.utils.json_to_sheet(spreads.map(spread => ({
    '통화쌍': spread.currencyPair,
    '상품유형': spread.productType,
    '사용자그룹': `${spread.majorGroup || ''}-${spread.midGroup || ''}-${spread.subGroup || ''}`.replace(/^-+|-+$/g, ''),
    '기본스프레드': spread.baseSpread,
    '생성일': new Date(spread.createdAt).toLocaleDateString('ko-KR'),
    '활성상태': spread.isActive ? '활성' : '비활성',
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '스프레드설정');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 거래 상태 텍스트 변환
function getTradeStatusText(status: string): string {
  const statusMap: { [key: string]: string } = {
    'PENDING': '대기중',
    'APPROVED': '승인됨',
    'REJECTED': '거부됨',
    'EXECUTED': '체결됨',
    'SETTLED': '정산완료',
    'CANCELLED': '취소됨',
  };
  return statusMap[status] || status;
}

// 템플릿 파일 생성
export function downloadTradeTemplate() {
  const templateData = [
    {
      '상품유형': 'SPOT',
      '통화쌍': 'USDKRW',
      '방향': '매수',
      '거래금액': 1000000,
      '환율': 1350.50,
      '정산일': '2025-08-05',
      '고객ID': 'client001',
    },
    {
      '상품유형': 'FORWARD',
      '통화쌍': 'EURKRW',
      '방향': '매도',
      '거래금액': 500000,
      '환율': 1450.20,
      '정산일': '2025-08-15',
      '고객ID': 'client002',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '거래데이터템플릿');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, `거래데이터_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`);
}