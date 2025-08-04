const XLSX = require('xlsx');

// 테스트 데이터
const data = [
  ['Symbol', 'Price', 'Change', 'Volume', 'Time'],  // Row 1
  ['USDKRW', 1350.5, 2.5, 1000000, '2025-01-01'],  // Row 2
  ['EURKRW', 1450.2, -1.2, 500000, '2025-01-01'],  // Row 3
  ['JPYKRW', 950.8, 0.8, 750000, '2025-01-01'],    // Row 4
  ['Test Value', 123.45, 5.67, 200000, '2025-01-01'] // Row 5 - I5는 123.45
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

// 파일 저장
XLSX.writeFile(workbook, './test_data.xlsx');
console.log('테스트 엑셀 파일 생성 완료: test_data.xlsx');

// 셀 값 확인
const wb = XLSX.readFile('./test_data.xlsx');
const ws = wb.Sheets['Sheet1'];

console.log('셀 값 확인:');
console.log('A5:', ws['A5'] ? ws['A5'].v : 'null');
console.log('B5:', ws['B5'] ? ws['B5'].v : 'null');
console.log('I5:', ws['I5'] ? ws['I5'].v : 'null');
console.log('E5:', ws['E5'] ? ws['E5'].v : 'null');

// 워크시트 범위 확인
console.log('워크시트 범위:', ws['!ref']);
