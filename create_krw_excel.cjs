const XLSX = require('xlsx');

// KRW FXcurve_Realtime 시트 데이터 생성
const data = [
  ['Tenor', 'Rate', 'BidRate', 'AskRate', 'LastUpdate', 'Source', 'Status', 'Volume', 'USD/KRW'],
  ['ON', 3.25, 3.24, 3.26, '2025-01-04 12:30:00', 'Bloomberg', 'Active', 1000000, 1305.50],
  ['1W', 3.30, 3.29, 3.31, '2025-01-04 12:30:00', 'Bloomberg', 'Active', 2000000, 1306.20],
  ['1M', 3.45, 3.44, 3.46, '2025-01-04 12:30:00', 'Bloomberg', 'Active', 5000000, 1307.80],
  ['3M', 3.65, 3.64, 3.66, '2025-01-04 12:30:00', 'Bloomberg', 'Active', 8000000, 1308.95], // I5 = 1308.95
  ['6M', 3.85, 3.84, 3.86, '2025-01-04 12:30:00', 'Bloomberg', 'Active', 12000000, 1310.45],
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(workbook, worksheet, 'KRW FXcurve_Realtime');

// 파일 저장
XLSX.writeFile(workbook, './FX_TOT_BLGVER_V2_sample.xlsx');
console.log('KRW FXcurve_Realtime 샘플 파일 생성 완료: FX_TOT_BLGVER_V2_sample.xlsx');

// I5 셀 값 확인
const wb = XLSX.readFile('./FX_TOT_BLGVER_V2_sample.xlsx');
const ws = wb.Sheets['KRW FXcurve_Realtime'];
console.log('I5 셀 값:', ws['I5'] ? ws['I5'].v : 'null');
console.log('워크시트 범위:', ws['!ref']);
