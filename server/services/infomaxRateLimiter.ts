interface RateLimiterState {
  minuteWindowStartMs: number;
  minuteCount: number;
  dailyWindowStartMs: number;
  dailyBytes: number;
  lastApiError: string | null;
  lastCallAt: string | null;
}

const MINUTE_LIMIT = 60;
const DAILY_BYTE_LIMIT = 214748364; // 0.2GB in bytes

class InfomaxRateLimiter {
  private state: RateLimiterState;

  constructor() {
    const now = Date.now();
    const startOfDay = this.getStartOfDayMs();
    
    this.state = {
      minuteWindowStartMs: now,
      minuteCount: 0,
      dailyWindowStartMs: startOfDay,
      dailyBytes: 0,
      lastApiError: null,
      lastCallAt: null,
    };
  }

  private getStartOfDayMs(): number {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }

  private resetIfNeeded(): void {
    const now = Date.now();
    const startOfDay = this.getStartOfDayMs();

    if (now >= this.state.minuteWindowStartMs + 60000) {
      this.state.minuteWindowStartMs = now;
      this.state.minuteCount = 0;
    }

    if (now >= this.state.dailyWindowStartMs + 86400000) {
      this.state.dailyWindowStartMs = startOfDay;
      this.state.dailyBytes = 0;
    }
  }

  canProceed(): { allowed: boolean; reason?: string } {
    this.resetIfNeeded();

    if (this.state.minuteCount >= MINUTE_LIMIT) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${MINUTE_LIMIT} requests per minute`,
      };
    }

    if (this.state.dailyBytes >= DAILY_BYTE_LIMIT) {
      return {
        allowed: false,
        reason: `Daily data limit exceeded: 0.2GB per day`,
      };
    }

    return { allowed: true };
  }

  recordRequest(bytes: number): void {
    this.resetIfNeeded();
    this.state.minuteCount++;
    this.state.dailyBytes += bytes;
    this.state.lastCallAt = new Date().toISOString();
    this.state.lastApiError = null;
  }

  recordError(error: string): void {
    this.state.lastApiError = error;
  }

  getStatus() {
    this.resetIfNeeded();
    
    const remainingMinute = Math.max(0, MINUTE_LIMIT - this.state.minuteCount);
    const remainingDaily = Math.max(0, DAILY_BYTE_LIMIT - this.state.dailyBytes);

    return {
      remainingMinute,
      remainingDaily,
      remainingDailyMB: (remainingDaily / (1024 * 1024)).toFixed(2),
      usedMinute: this.state.minuteCount,
      usedDailyMB: (this.state.dailyBytes / (1024 * 1024)).toFixed(2),
      lastCallAt: this.state.lastCallAt,
      lastApiError: this.state.lastApiError,
    };
  }
}

export const infomaxRateLimiter = new InfomaxRateLimiter();
