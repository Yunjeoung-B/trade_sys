// 통화별 반올림 규칙 적용 함수
export function formatCurrencyAmount(amount: number, currency: string): string {
  if (currency === "KRW") {
    // KRW는 원미만 절사 (소수점 제거)
    return Math.floor(amount).toString();
  } else if (currency === "USD") {
    // USD는 소수점 3째자리에서 반올림 (2자리까지 표시)
    return amount.toFixed(2);
  }
  
  // 기본값은 소수점 2자리
  return amount.toFixed(2);
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