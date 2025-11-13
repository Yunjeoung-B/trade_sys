import { infomaxRateLimiter } from './infomaxRateLimiter';

const INFOMAX_API_BASE = 'https://infomaxy.einfomax.co.kr';
const INFOMAX_API_ENDPOINT = '/api/usdkrw/tick';

interface InfomaxApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  simulationMode?: boolean;
  responseSize?: number;
}

interface InfomaxTickParams {
  date?: string;
  broker?: string;
  data?: string;
}

class InfomaxService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.INFOMAX_API_KEY;
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  async testConnection(params?: InfomaxTickParams): Promise<InfomaxApiResponse> {
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
      const queryParams = new URLSearchParams();
      if (params?.date) queryParams.append('date', params.date);
      if (params?.broker) queryParams.append('broker', params.broker);
      if (params?.data) queryParams.append('data', params.data);
      
      const url = `${INFOMAX_API_BASE}${INFOMAX_API_ENDPOINT}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
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
        
        if (data.success === false) {
          infomaxRateLimiter.recordError(data.message || 'API returned error');
          return {
            success: false,
            error: data.message || 'API returned error',
            simulationMode: false,
            responseSize,
          };
        }
        
        return {
          success: true,
          data: data.results || data,
          simulationMode: false,
          responseSize,
        };
      } catch {
        return {
          success: true,
          data: responseText,
          simulationMode: false,
          responseSize,
        };
      }
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
