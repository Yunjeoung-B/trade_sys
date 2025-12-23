import {
  type User,
  type InsertUser,
  type CurrencyPair,
  type InsertCurrencyPair,
  type MarketRate,
  type InsertMarketRate,
  type SpreadSetting,
  type InsertSpreadSetting,
  type QuoteRequest,
  type InsertQuoteRequest,
  type Trade,
  type InsertTrade,
  type AutoApprovalSetting,
  type InsertAutoApprovalSetting,
  type SwapPoint,
  type InsertSwapPoint,
  type SwapPointsHistory,
  type InsertSwapPointsHistory,
  type OnTnRate,
  type InsertOnTnRate,
} from "@shared/schema";
import { userRepository } from "./repositories/user.repository";
import { currencyPairRepository } from "./repositories/currencyPair.repository";
import { marketRateRepository } from "./repositories/marketRate.repository";
import { spreadSettingRepository } from "./repositories/spreadSetting.repository";
import { quoteRepository } from "./repositories/quote.repository";
import { tradeRepository } from "./repositories/trade.repository";
import { autoApprovalRepository } from "./repositories/autoApproval.repository";
import { swapPointRepository } from "./repositories/swapPoint.repository";
import { desc } from "drizzle-orm";
import { marketRates } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  validateUserPassword(username: string, password: string): Promise<User | null>;

  // Currency pairs
  getCurrencyPairs(): Promise<CurrencyPair[]>;
  getCurrencyPair(id: string): Promise<CurrencyPair | undefined>;
  getCurrencyPairBySymbol(symbol: string): Promise<CurrencyPair | undefined>;
  createCurrencyPair(pair: InsertCurrencyPair): Promise<CurrencyPair>;

  // Market rates
  getLatestMarketRates(): Promise<MarketRate[]>;
  getLatestMarketRateForCurrencyPair(currencyPairId: string): Promise<MarketRate | undefined>;
  createMarketRate(rate: InsertMarketRate): Promise<MarketRate>;
  updateMarketRate(rate: InsertMarketRate): Promise<MarketRate>;
  getMarketRateHistory(currencyPairId: string, hours: number): Promise<MarketRate[]>;
  upsertLatestMarketRate(currencyPairId: string, buyRate: string, sellRate: string, source: string): Promise<MarketRate>;

  // Spread settings
  getSpreadSettings(): Promise<SpreadSetting[]>;
  createSpreadSetting(setting: InsertSpreadSetting): Promise<SpreadSetting>;
  updateSpreadSetting(id: string, updates: Partial<InsertSpreadSetting>): Promise<SpreadSetting | undefined>;
  deleteSpreadSetting(id: string): Promise<void>;
  getSpreadForUser(productType: string, currencyPairId: string, user: User, tenor?: string): Promise<number>;
  getCustomerRateForUser(productType: string, currencyPairId: string, user: User, tenor?: string): Promise<{ buyRate: number; sellRate: number; spread: number; baseRate: MarketRate | null } | null>;
  getCustomerRatesForUser(productType: string, user: User, tenor?: string): Promise<Array<{ currencyPairId: string; currencyPairSymbol: string; buyRate: number; sellRate: number; spread: number; baseRate: MarketRate | null }>>;

  // Quote requests
  createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest>;
  getAllQuoteRequests(): Promise<QuoteRequest[]>;
  getPendingQuoteRequests(): Promise<QuoteRequest[]>;
  getQuoteRequestsByStatus(status: string): Promise<QuoteRequest[]>;
  approveQuoteRequest(id: string, adminId: string, quotedRate: number): Promise<QuoteRequest | undefined>;
  rejectQuoteRequest(id: string, adminId: string): Promise<QuoteRequest | undefined>;
  getUserQuoteRequests(userId: string): Promise<QuoteRequest[]>;
  getUserQuoteRequestsByStatus(userId: string, status: string): Promise<QuoteRequest[]>;
  confirmQuoteRequest(id: string): Promise<QuoteRequest | undefined>;
  cancelQuoteRequest(id: string, userId: string): Promise<QuoteRequest | undefined>;

  // Trades
  createTrade(trade: InsertTrade): Promise<Trade>;
  getUserActiveTrades(userId: string): Promise<Trade[]>;
  getUserPendingTrades(userId: string): Promise<Trade[]>;
  getAllActiveTrades(): Promise<Trade[]>;
  updateTradeStatus(id: string, status: string): Promise<Trade | undefined>;
  cancelTrade(id: string, userId: string): Promise<Trade | undefined>;

  // Auto approval settings
  getAutoApprovalSetting(userId: string): Promise<AutoApprovalSetting | undefined>;
  upsertAutoApprovalSetting(setting: InsertAutoApprovalSetting): Promise<AutoApprovalSetting>;

  // Swap points
  getSwapPoints(currencyPairId?: string): Promise<SwapPoint[]>;
  createSwapPoint(swapPoint: InsertSwapPoint): Promise<SwapPoint>;
  deleteSwapPoint(id: string): Promise<void>;
  getSwapPointByTenor(currencyPairId: string, tenor: string): Promise<SwapPoint | undefined>;
  getSwapPointByDays(currencyPairId: string, days: number): Promise<SwapPoint | undefined>;
  getSwapPointsByCurrencyPair(currencyPairId: string): Promise<SwapPoint[]>;
  getSwapPointsHistory(currencyPairId: string, limit?: number): Promise<SwapPointsHistory[]>;
  createSwapPointsHistory(history: InsertSwapPointsHistory): Promise<SwapPointsHistory>;

  // ON/TN Rates
  getOnTnRates(currencyPairId: string): Promise<OnTnRate[]>;
  createOnTnRate(rate: InsertOnTnRate): Promise<OnTnRate>;
  deleteOnTnRate(id: string): Promise<void>;

  // Swap point history
  getSwapPointHistory(currencyPairId: string, hours: number): Promise<SwapPoint[]>;
}

/**
 * Storage implementation using repository pattern
 */
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return userRepository.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return userRepository.getUserByUsername(username);
  }

  async createUser(user: InsertUser): Promise<User> {
    return userRepository.createUser(user);
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    return userRepository.updateUser(id, updates);
  }

  async getAllUsers(): Promise<User[]> {
    return userRepository.getAllUsers();
  }

  async validateUserPassword(username: string, password: string): Promise<User | null> {
    return userRepository.validateUserPassword(username, password);
  }

  // Currency pairs
  async getCurrencyPairs(): Promise<CurrencyPair[]> {
    return currencyPairRepository.getCurrencyPairs();
  }

  async getCurrencyPair(id: string): Promise<CurrencyPair | undefined> {
    return currencyPairRepository.getCurrencyPair(id);
  }

  async getCurrencyPairBySymbol(symbol: string): Promise<CurrencyPair | undefined> {
    return currencyPairRepository.getCurrencyPairBySymbol(symbol);
  }

  async createCurrencyPair(pair: InsertCurrencyPair): Promise<CurrencyPair> {
    return currencyPairRepository.createCurrencyPair(pair);
  }

  // Market rates
  async getLatestMarketRates(): Promise<MarketRate[]> {
    return marketRateRepository.getLatestMarketRates();
  }

  async getLatestMarketRateForCurrencyPair(currencyPairId: string): Promise<MarketRate | undefined> {
    return marketRateRepository.getLatestMarketRateForCurrencyPair(currencyPairId);
  }

  async createMarketRate(rate: InsertMarketRate): Promise<MarketRate> {
    return marketRateRepository.createMarketRate(rate);
  }

  async updateMarketRate(rate: InsertMarketRate): Promise<MarketRate> {
    return marketRateRepository.updateMarketRate(rate);
  }

  async getMarketRateHistory(currencyPairId: string, hours: number): Promise<MarketRate[]> {
    return marketRateRepository.getMarketRateHistory(currencyPairId, hours);
  }

  async upsertLatestMarketRate(currencyPairId: string, buyRate: string, sellRate: string, source: string): Promise<MarketRate> {
    return marketRateRepository.upsertLatestMarketRate(currencyPairId, buyRate, sellRate, source);
  }

  // Spread settings
  async getSpreadSettings(): Promise<SpreadSetting[]> {
    return spreadSettingRepository.getSpreadSettings();
  }

  async createSpreadSetting(setting: InsertSpreadSetting): Promise<SpreadSetting> {
    return spreadSettingRepository.createSpreadSetting(setting);
  }

  async updateSpreadSetting(id: string, updates: Partial<InsertSpreadSetting>): Promise<SpreadSetting | undefined> {
    return spreadSettingRepository.updateSpreadSetting(id, updates);
  }

  async deleteSpreadSetting(id: string): Promise<void> {
    return spreadSettingRepository.deleteSpreadSetting(id);
  }

  async getSpreadForUser(productType: string, currencyPairId: string, user: User, tenor?: string): Promise<number> {
    return spreadSettingRepository.getSpreadForUser(productType, currencyPairId, user, tenor);
  }

  async getCustomerRateForUser(
    productType: string,
    currencyPairId: string,
    user: User,
    tenor?: string
  ): Promise<{ buyRate: number; sellRate: number; spread: number; baseRate: MarketRate | null } | null> {
    const marketRate = await db
      .select()
      .from(marketRates)
      .where(
        and(
          eq(marketRates.currencyPairId, currencyPairId),
          eq(marketRates.source, 'infomax')
        )
      )
      .orderBy(desc(marketRates.updatedAt))
      .limit(1);

    if (!marketRate || marketRate.length === 0) {
      return null;
    }

    const baseRate = marketRate[0];
    const spreadBps = await this.getSpreadForUser(productType, currencyPairId, user, tenor);
    const spreadRate = spreadBps / 100;
    const customerBuyRate = Number(baseRate.buyRate) + spreadRate;
    const customerSellRate = Number(baseRate.sellRate) - spreadRate;

    return {
      buyRate: customerBuyRate,
      sellRate: customerSellRate,
      spread: spreadBps,
      baseRate: baseRate,
    };
  }

  async getCustomerRatesForUser(
    productType: string,
    user: User,
    tenor?: string
  ): Promise<Array<{ currencyPairId: string; currencyPairSymbol: string; buyRate: number; sellRate: number; spread: number; baseRate: MarketRate | null }>> {
    const pairs = await this.getCurrencyPairs();

    const ratePromises = pairs.map(async (pair) => {
      const customerRate = await this.getCustomerRateForUser(productType, pair.id, user, tenor);

      return {
        currencyPairId: pair.id,
        currencyPairSymbol: pair.symbol,
        buyRate: customerRate?.buyRate || 0,
        sellRate: customerRate?.sellRate || 0,
        spread: customerRate?.spread || 0,
        baseRate: customerRate?.baseRate || null,
      };
    });

    return Promise.all(ratePromises);
  }

  // Quote requests
  async createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest> {
    return quoteRepository.createQuoteRequest(request);
  }

  async getAllQuoteRequests(): Promise<QuoteRequest[]> {
    return quoteRepository.getAllQuoteRequests();
  }

  async getPendingQuoteRequests(): Promise<QuoteRequest[]> {
    return quoteRepository.getPendingQuoteRequests();
  }

  async getQuoteRequestsByStatus(status: string): Promise<QuoteRequest[]> {
    return quoteRepository.getQuoteRequestsByStatus(status);
  }

  async approveQuoteRequest(id: string, adminId: string, quotedRate: number): Promise<QuoteRequest | undefined> {
    return quoteRepository.approveQuoteRequest(id, adminId, quotedRate);
  }

  async rejectQuoteRequest(id: string, adminId: string): Promise<QuoteRequest | undefined> {
    return quoteRepository.rejectQuoteRequest(id, adminId);
  }

  async getUserQuoteRequests(userId: string): Promise<QuoteRequest[]> {
    return quoteRepository.getUserQuoteRequests(userId);
  }

  async getUserQuoteRequestsByStatus(userId: string, status: string): Promise<QuoteRequest[]> {
    return quoteRepository.getUserQuoteRequestsByStatus(userId, status);
  }

  async confirmQuoteRequest(id: string): Promise<QuoteRequest | undefined> {
    return quoteRepository.confirmQuoteRequest(id);
  }

  async cancelQuoteRequest(id: string, userId: string): Promise<QuoteRequest | undefined> {
    return quoteRepository.cancelQuoteRequest(id, userId);
  }

  // Trades
  async createTrade(trade: InsertTrade): Promise<Trade> {
    return tradeRepository.createTrade(trade);
  }

  async getUserActiveTrades(userId: string): Promise<Trade[]> {
    return tradeRepository.getUserActiveTrades(userId);
  }

  async getUserPendingTrades(userId: string): Promise<Trade[]> {
    return tradeRepository.getUserPendingTrades(userId);
  }

  async getAllActiveTrades(): Promise<Trade[]> {
    return tradeRepository.getAllActiveTrades();
  }

  async updateTradeStatus(id: string, status: string): Promise<Trade | undefined> {
    return tradeRepository.updateTradeStatus(id, status);
  }

  async cancelTrade(id: string, userId: string): Promise<Trade | undefined> {
    return tradeRepository.cancelTrade(id, userId);
  }

  // Auto approval settings
  async getAutoApprovalSetting(userId: string): Promise<AutoApprovalSetting | undefined> {
    return autoApprovalRepository.getAutoApprovalSetting(userId);
  }

  async upsertAutoApprovalSetting(setting: InsertAutoApprovalSetting): Promise<AutoApprovalSetting> {
    return autoApprovalRepository.upsertAutoApprovalSetting(setting);
  }

  // Swap points
  async getSwapPoints(currencyPairId?: string): Promise<SwapPoint[]> {
    return swapPointRepository.getSwapPoints(currencyPairId);
  }

  async createSwapPoint(swapPoint: InsertSwapPoint): Promise<SwapPoint> {
    return swapPointRepository.createSwapPoint(swapPoint);
  }

  async deleteSwapPoint(id: string): Promise<void> {
    return swapPointRepository.deleteSwapPoint(id);
  }

  async getSwapPointByTenor(currencyPairId: string, tenor: string): Promise<SwapPoint | undefined> {
    return swapPointRepository.getSwapPointByTenor(currencyPairId, tenor);
  }

  async getSwapPointByDays(currencyPairId: string, days: number): Promise<SwapPoint | undefined> {
    return swapPointRepository.getSwapPointByDays(currencyPairId, days);
  }

  async getSwapPointsByCurrencyPair(currencyPairId: string): Promise<SwapPoint[]> {
    return swapPointRepository.getSwapPointsByCurrencyPair(currencyPairId);
  }

  async getSwapPointsHistory(currencyPairId: string, limit: number = 100): Promise<SwapPointsHistory[]> {
    return swapPointRepository.getSwapPointsHistory(currencyPairId, limit);
  }

  async createSwapPointsHistory(history: InsertSwapPointsHistory): Promise<SwapPointsHistory> {
    return swapPointRepository.createSwapPointsHistory(history);
  }

  async getSwapPointHistory(currencyPairId: string, hours: number): Promise<SwapPoint[]> {
    return swapPointRepository.getSwapPointHistory(currencyPairId, hours);
  }

  // ON/TN Rates
  async getOnTnRates(currencyPairId: string): Promise<OnTnRate[]> {
    return swapPointRepository.getOnTnRates(currencyPairId);
  }

  async createOnTnRate(rate: InsertOnTnRate): Promise<OnTnRate> {
    return swapPointRepository.createOnTnRate(rate);
  }

  async deleteOnTnRate(id: string): Promise<void> {
    return swapPointRepository.deleteOnTnRate(id);
  }
}

export const storage = new DatabaseStorage();
