import {
  users,
  currencyPairs,
  marketRates,
  spreadSettings,
  quoteRequests,
  trades,
  autoApprovalSettings,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

// UUID generation utility
function generateId(): string {
  return nanoid();
}

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
  createCurrencyPair(pair: InsertCurrencyPair): Promise<CurrencyPair>;

  // Market rates
  getLatestMarketRates(): Promise<MarketRate[]>;
  updateMarketRate(rate: InsertMarketRate): Promise<MarketRate>;
  getMarketRateHistory(currencyPairId: string, hours: number): Promise<MarketRate[]>;

  // Spread settings
  getSpreadSettings(): Promise<SpreadSetting[]>;
  createSpreadSetting(setting: InsertSpreadSetting): Promise<SpreadSetting>;
  updateSpreadSetting(id: string, updates: Partial<InsertSpreadSetting>): Promise<SpreadSetting | undefined>;
  getSpreadForUser(productType: string, currencyPairId: string, user: User): Promise<number>;

  // Quote requests
  createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest>;
  getPendingQuoteRequests(): Promise<QuoteRequest[]>;
  approveQuoteRequest(id: string, adminId: string, quotedRate: number): Promise<QuoteRequest | undefined>;
  rejectQuoteRequest(id: string, adminId: string): Promise<QuoteRequest | undefined>;
  getUserQuoteRequests(userId: string): Promise<QuoteRequest[]>;

  // Trades
  createTrade(trade: InsertTrade): Promise<Trade>;
  getUserActiveTrades(userId: string): Promise<Trade[]>;
  getAllActiveTrades(): Promise<Trade[]>;
  updateTradeStatus(id: string, status: string): Promise<Trade | undefined>;

  // Auto approval settings
  getAutoApprovalSetting(userId: string): Promise<AutoApprovalSetting | undefined>;
  upsertAutoApprovalSetting(setting: InsertAutoApprovalSetting): Promise<AutoApprovalSetting>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        id: generateId(),
        ...userData,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
  }

  async validateUserPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Currency pairs
  async getCurrencyPairs(): Promise<CurrencyPair[]> {
    return await db.select().from(currencyPairs).where(eq(currencyPairs.isActive, true));
  }

  async getCurrencyPair(id: string): Promise<CurrencyPair | undefined> {
    const [pair] = await db.select().from(currencyPairs).where(eq(currencyPairs.id, id));
    return pair;
  }

  async createCurrencyPair(pairData: InsertCurrencyPair): Promise<CurrencyPair> {
    const [pair] = await db.insert(currencyPairs).values({
      id: generateId(),
      ...pairData,
    }).returning();
    return pair;
  }

  // Market rates
  async getLatestMarketRates(): Promise<MarketRate[]> {
    return await db
      .select()
      .from(marketRates)
      .orderBy(desc(marketRates.timestamp))
      .limit(10);
  }

  async updateMarketRate(rateData: InsertMarketRate): Promise<MarketRate> {
    const [rate] = await db.insert(marketRates).values({
      id: generateId(),
      ...rateData,
    }).returning();
    return rate;
  }

  async getMarketRateHistory(currencyPairId: string, hours: number): Promise<MarketRate[]> {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);

    return await db
      .select()
      .from(marketRates)
      .where(
        and(
          eq(marketRates.currencyPairId, currencyPairId),
          sql`${marketRates.timestamp} >= ${hoursAgo}`
        )
      )
      .orderBy(marketRates.timestamp);
  }

  // Spread settings
  async getSpreadSettings(): Promise<SpreadSetting[]> {
    return await db.select().from(spreadSettings).where(eq(spreadSettings.isActive, true));
  }

  async createSpreadSetting(settingData: InsertSpreadSetting): Promise<SpreadSetting> {
    const [setting] = await db.insert(spreadSettings).values({
      id: generateId(),
      ...settingData,
    }).returning();
    return setting;
  }

  async updateSpreadSetting(id: string, updates: Partial<InsertSpreadSetting>): Promise<SpreadSetting | undefined> {
    const [setting] = await db
      .update(spreadSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(spreadSettings.id, id))
      .returning();
    return setting;
  }

  async getSpreadForUser(productType: string, currencyPairId: string, user: User): Promise<number> {
    // Get most specific spread setting for user
    const settings = await db
      .select()
      .from(spreadSettings)
      .where(
        and(
          eq(spreadSettings.productType, productType),
          eq(spreadSettings.currencyPairId, currencyPairId),
          eq(spreadSettings.isActive, true)
        )
      );

    // Find best matching spread (most specific group match)
    let bestSpread = 2.0; // default
    for (const setting of settings) {
      if (!setting.groupType) {
        bestSpread = Number(setting.baseSpread);
      } else if (setting.groupType === "major" && setting.groupValue === user.majorGroup) {
        bestSpread = Number(setting.baseSpread);
      } else if (setting.groupType === "mid" && setting.groupValue === user.midGroup) {
        bestSpread = Number(setting.baseSpread);
      } else if (setting.groupType === "sub" && setting.groupValue === user.subGroup) {
        bestSpread = Number(setting.baseSpread);
        break; // Most specific, use this
      }
    }

    return bestSpread;
  }

  // Quote requests
  async createQuoteRequest(requestData: InsertQuoteRequest): Promise<QuoteRequest> {
    const [request] = await db.insert(quoteRequests).values({
      id: generateId(),
      ...requestData,
    }).returning();
    return request;
  }

  async getPendingQuoteRequests(): Promise<QuoteRequest[]> {
    return await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.status, "pending"))
      .orderBy(desc(quoteRequests.createdAt));
  }

  async approveQuoteRequest(id: string, adminId: string, quotedRate: number): Promise<QuoteRequest | undefined> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minute expiry

    const [request] = await db
      .update(quoteRequests)
      .set({
        status: "approved",
        approvedBy: adminId,
        approvedAt: new Date(),
        quotedRate: quotedRate.toString(),
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(quoteRequests.id, id))
      .returning();
    return request;
  }

  async rejectQuoteRequest(id: string, adminId: string): Promise<QuoteRequest | undefined> {
    const [request] = await db
      .update(quoteRequests)
      .set({
        status: "rejected",
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(quoteRequests.id, id))
      .returning();
    return request;
  }

  async getUserQuoteRequests(userId: string): Promise<QuoteRequest[]> {
    return await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.userId, userId))
      .orderBy(desc(quoteRequests.createdAt));
  }

  // Trades
  async createTrade(tradeData: InsertTrade): Promise<Trade> {
    // Generate trade number
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await db.select({ count: sql`count(*)` }).from(trades);
    const tradeNumber = `FX${timestamp}${String(Number(count[0].count) + 1).padStart(4, "0")}`;

    const [trade] = await db
      .insert(trades)
      .values({
        id: generateId(),
        ...tradeData,
        tradeNumber,
      })
      .returning();
    return trade;
  }

  async getUserActiveTrades(userId: string): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.status, "active")))
      .orderBy(desc(trades.createdAt));
  }

  async getAllActiveTrades(): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.status, "active"))
      .orderBy(desc(trades.createdAt));
  }

  async updateTradeStatus(id: string, status: string): Promise<Trade | undefined> {
    const [trade] = await db
      .update(trades)
      .set({ status, updatedAt: new Date() })
      .where(eq(trades.id, id))
      .returning();
    return trade;
  }

  // Auto approval settings
  async getAutoApprovalSetting(userId: string): Promise<AutoApprovalSetting | undefined> {
    const [setting] = await db
      .select()
      .from(autoApprovalSettings)
      .where(eq(autoApprovalSettings.userId, userId));
    return setting;
  }

  async upsertAutoApprovalSetting(settingData: InsertAutoApprovalSetting): Promise<AutoApprovalSetting> {
    const [setting] = await db
      .insert(autoApprovalSettings)
      .values({
        id: generateId(),
        ...settingData,
      })
      .onConflictDoUpdate({
        target: autoApprovalSettings.userId,
        set: {
          ...settingData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }
}

export const storage = new DatabaseStorage();
