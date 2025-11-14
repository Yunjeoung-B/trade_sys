import { infomaxService } from './infomaxService';
import { DatabaseStorage } from '../storage';

const POLL_INTERVAL_MS = 10000; // 10 seconds (6 req/min to stay under 60/min limit)
const MAX_BACKOFF_MS = 60000; // 1 minute max backoff

class InfomaxPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private currentInterval: number = POLL_INTERVAL_MS;
  private storage: DatabaseStorage;
  private consecutiveErrors: number = 0;

  constructor() {
    this.storage = new DatabaseStorage();
  }

  async start() {
    if (this.isRunning) {
      console.log('Infomax poller is already running');
      return;
    }

    console.log('Starting Infomax poller...');
    this.isRunning = true;
    this.currentInterval = POLL_INTERVAL_MS;
    
    await this.poll();
    
    this.intervalId = setInterval(() => {
      this.poll();
    }, this.currentInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Infomax poller stopped');
  }

  private async poll() {
    try {
      // Get yesterday's date in YYYYMMDD format (KST)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');
      
      const result = await infomaxService.fetchTickData(dateStr, 'SMB');

      console.log('[Infomax Poller] API Response:', {
        success: result.success,
        simulationMode: result.simulationMode,
        error: result.error,
        dataType: result.data ? typeof result.data : 'undefined',
        isArray: Array.isArray(result.data),
        dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
        sampleData: result.data ? JSON.stringify(result.data).substring(0, 200) : 'no data'
      });

      if (!result.success || result.simulationMode) {
        this.handleError(`API returned error or simulation mode: ${result.error || 'unknown'}`);
        return;
      }

      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        console.log('No tick data received from Infomax API - data is empty or not an array');
        return;
      }

      // Use standard USD/KRW format for consistency with frontend
      let currencyPair = await this.storage.getCurrencyPairBySymbol('USD/KRW');
      if (!currencyPair) {
        currencyPair = await this.storage.createCurrencyPair({
          symbol: 'USD/KRW',
          baseCurrency: 'USD',
          quoteCurrency: 'KRW',
          isActive: true,
        });
      }

      // Find the tick with the highest time_seq (most recent)
      const latestTick = result.data.reduce((latest: any, current: any) => {
        return (current.time_seq > latest.time_seq) ? current : latest;
      }, result.data[0]);
      
      console.log(`[Infomax Poller] Latest tick: time_seq=${latestTick.time_seq}, time=${latestTick.time}, BUY=${latestTick.ask_price}, SELL=${latestTick.bid_price}`);
      
      if (latestTick.ask_price && latestTick.bid_price) {
        await this.storage.upsertLatestMarketRate(
          currencyPair.id,
          latestTick.ask_price.toString(),
          latestTick.bid_price.toString(),
          'infomax'
        );

        this.consecutiveErrors = 0;
        
        if (this.currentInterval !== POLL_INTERVAL_MS) {
          this.currentInterval = POLL_INTERVAL_MS;
          console.log(`Resetting to normal ${POLL_INTERVAL_MS}ms interval`);
          
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = setInterval(() => {
              this.poll();
            }, this.currentInterval);
          }
        }

        console.log(`Updated Infomax rate: BUY=${latestTick.ask_price}, SELL=${latestTick.bid_price}`);
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private handleError(error: string) {
    this.consecutiveErrors++;
    console.error(`Infomax poller error (${this.consecutiveErrors}):`, error);

    if (this.consecutiveErrors >= 3) {
      this.currentInterval = Math.min(
        this.currentInterval * 2,
        MAX_BACKOFF_MS
      );
      console.log(`Backing off to ${this.currentInterval}ms interval`);
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
          this.poll();
        }, this.currentInterval);
      }
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentInterval: this.currentInterval,
      consecutiveErrors: this.consecutiveErrors,
    };
  }
}

export const infomaxPoller = new InfomaxPoller();
