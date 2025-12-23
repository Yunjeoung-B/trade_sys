import { marketRates, type MarketRate, type InsertMarketRate } from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export class MarketRateRepository {
  async getLatestMarketRates(): Promise<MarketRate[]> {
    return await db
      .select()
      .from(marketRates)
      .orderBy(desc(marketRates.timestamp))
      .limit(10);
  }

  async getLatestMarketRateForCurrencyPair(currencyPairId: string): Promise<MarketRate | undefined> {
    const [rate] = await db
      .select()
      .from(marketRates)
      .where(eq(marketRates.currencyPairId, currencyPairId))
      .orderBy(desc(marketRates.timestamp))
      .limit(1);
    return rate;
  }

  async createMarketRate(rateData: InsertMarketRate): Promise<MarketRate> {
    const [rate] = await db.insert(marketRates).values({
      id: nanoid(),
      ...rateData,
    }).returning();
    return rate;
  }

  async updateMarketRate(rateData: InsertMarketRate): Promise<MarketRate> {
    const [rate] = await db.insert(marketRates).values({
      id: nanoid(),
      ...rateData,
    }).returning();
    return rate;
  }

  async upsertLatestMarketRate(
    currencyPairId: string,
    buyRate: string,
    sellRate: string,
    source: string
  ): Promise<MarketRate> {
    const existing = await db
      .select()
      .from(marketRates)
      .where(
        and(
          eq(marketRates.currencyPairId, currencyPairId),
          eq(marketRates.source, source)
        )
      )
      .orderBy(desc(marketRates.timestamp))
      .limit(1);

    if (existing.length > 0) {
      const [rate] = await db
        .update(marketRates)
        .set({
          buyRate,
          sellRate,
          updatedAt: new Date(),
        })
        .where(eq(marketRates.id, existing[0].id))
        .returning();
      return rate;
    } else {
      return this.createMarketRate({
        currencyPairId,
        buyRate,
        sellRate,
        source,
      });
    }
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
}

export const marketRateRepository = new MarketRateRepository();
