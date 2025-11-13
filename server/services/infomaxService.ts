import { infomaxRateLimiter } from './infomaxRateLimiter';

const INFOMAX_API_BASE = 'https://infomaxy.einfomax.co.kr';
const INFOMAX_API_ENDPOINT = '/api/fx/code';

interface InfomaxApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  simulationMode?: boolean;
  responseSize?: number;
}

class InfomaxService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.INFOMAX_API_KEY;
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  async testConnection(): Promise<InfomaxApiResponse> {
    const limitCheck = infomaxRateLimiter.canProceed();
    
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: limitCheck.reason,
        simulationMode: true,
      };
    }

    if (!this.hasApiKey()) {
      infomaxRateLimiter.recordError('API key not configured');
      return {
        success: false,
        error: 'INFOMAX_API_KEY environment variable not set',
        simulationMode: true,
      };
    }

    try {
      const url = `${INFOMAX_API_BASE}${INFOMAX_API_ENDPOINT}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();
      const responseSize = Buffer.byteLength(responseText, 'utf8');

      if (!response.ok) {
        const errorMsg = `API returned ${response.status}: ${response.statusText}`;
        infomaxRateLimiter.recordRequest(responseSize);
        infomaxRateLimiter.recordError(errorMsg);
        
        return {
          success: false,
          error: errorMsg,
          simulationMode: true,
          responseSize,
        };
      }

      infomaxRateLimiter.recordRequest(responseSize);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }

      return {
        success: true,
        data,
        simulationMode: false,
        responseSize,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      infomaxRateLimiter.recordRequest(0);
      infomaxRateLimiter.recordError(errorMsg);
      
      return {
        success: false,
        error: errorMsg,
        simulationMode: true,
      };
    }
  }

  getStatus() {
    const limiterStatus = infomaxRateLimiter.getStatus();
    
    return {
      connected: this.hasApiKey(),
      apiKeyConfigured: this.hasApiKey(),
      ...limiterStatus,
    };
  }
}

export const infomaxService = new InfomaxService();
