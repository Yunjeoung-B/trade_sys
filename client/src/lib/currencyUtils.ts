// 통화별 반올림 규칙 적용 함수 (천 단위 콤마 포함)
export function formatCurrencyAmount(amount: number, currency: string): string {
  let formattedAmount: string;
  
  if (currency === "KRW") {
    // KRW는 원미만 절사 (소수점 제거)
    formattedAmount = Math.floor(amount).toString();
  } else if (currency === "USD") {
    // USD는 소수점 3째자리에서 반올림 (2자리까지 표시)
    formattedAmount = amount.toFixed(2);
  } else {
    // 기본값은 소수점 2자리
    formattedAmount = amount.toFixed(2);
  }
  
  // 천 단위 콤마 추가
  return addThousandSeparator(formattedAmount);
}

// 천 단위 콤마 추가 함수
export function addThousandSeparator(value: string): string {
  const parts = value.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // 천 단위마다 콤마 추가
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

// 콤마 제거 함수
export function removeThousandSeparator(value: string): string {
  return value.replace(/,/g, '');
}

// 입력값 포맷팅 함수 (실시간 입력 시 사용)
export function formatInputValue(value: string, currency: string): string {
  // 콤마 제거 후 숫자만 추출
  const cleanValue = removeThousandSeparator(value);
  const num = parseFloat(cleanValue);
  
  if (isNaN(num) || cleanValue === '') return '';
  
  if (currency === "KRW") {
    // KRW는 정수만 허용하고 콤마 추가
    const intValue = Math.floor(num);
    return addThousandSeparator(intValue.toString());
  } else {
    // USD 등은 소수점 허용하고 콤마 추가
    return addThousandSeparator(cleanValue);
  }
}

// 통화별 계산 함수 (반올림 규칙 적용)
export function calculateCurrencyAmount(amount: number, currency: string): number {
  if (currency === "KRW") {
    // KRW는 원미만 절사
    return Math.floor(amount);
  } else if (currency === "USD") {
    // USD는 소수점 3째자리에서 반올림
    return Math.round(amount * 100) / 100;
  }
  
  // 기본값은 소수점 2자리 반올림
  return Math.round(amount * 100) / 100;
}

// 통화 입력 검증 함수
export function validateCurrencyInput(value: string, currency: string): boolean {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return false;
  
  if (currency === "KRW") {
    // KRW는 정수만 허용
    return Number.isInteger(num);
  }
  
  return true;
}