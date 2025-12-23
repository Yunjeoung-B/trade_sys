import {
  swapPoints,
  swapPointsHistory,
  onTnRates,
  type SwapPoint,
  type InsertSwapPoint,
  type SwapPointsHistory,
  type InsertSwapPointsHistory,
  type OnTnRate,
  type InsertOnTnRate
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export class SwapPointRepository {
  async getSwapPoints(currencyPairId?: string): Promise<SwapPoint[]> {
    if (currencyPairId) {
      return await db
        .select()
        .from(swapPoints)
        .where(eq(swapPoints.currencyPairId, currencyPairId))
        .orderBy(desc(swapPoints.days));
    }
    return await db.select().from(swapPoints).orderBy(desc(swapPoints.days));
  }

  async createSwapPoint(swapPointData: InsertSwapPoint): Promise<SwapPoint> {
    const [swapPoint] = await db
      .insert(swapPoints)
      .values({
        id: nanoid(),
        ...swapPointData,
      })
      .returning();
    return swapPoint;
  }

  async deleteSwapPoint(id: string): Promise<void> {
    await db.delete(swapPoints).where(eq(swapPoints.id, id));
  }

  async getSwapPointByTenor(currencyPairId: string, tenor: string): Promise<SwapPoint | undefined> {
    const [swapPoint] = await db
      .select()
      .from(swapPoints)
      .where(and(eq(swapPoints.currencyPairId, currencyPairId), eq(swapPoints.tenor, tenor)));
    return swapPoint;
  }

  async getSwapPointByDays(currencyPairId: string, days: number): Promise<SwapPoint | undefined> {
    const [swapPoint] = await db
      .select()
      .from(swapPoints)
      .where(and(eq(swapPoints.currencyPairId, currencyPairId), eq(swapPoints.days, days)));
    return swapPoint;
  }

  async getSwapPointsByCurrencyPair(currencyPairId: string): Promise<SwapPoint[]> {
    return await db
      .select()
      .from(swapPoints)
      .where(eq(swapPoints.currencyPairId, currencyPairId))
      .orderBy(swapPoints.days);
  }

  async getSwapPointsHistory(currencyPairId: string, limit: number = 100): Promise<SwapPointsHistory[]> {
    return await db
      .select()
      .from(swapPointsHistory)
      .where(eq(swapPointsHistory.currencyPairId, currencyPairId))
      .orderBy(desc(swapPointsHistory.changedAt))
      .limit(limit);
  }

  async getSwapPointHistory(currencyPairId: string, hours: number): Promise<SwapPoint[]> {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);

    return await db
      .select()
      .from(swapPoints)
      .where(
        and(
          eq(swapPoints.currencyPairId, currencyPairId),
          sql`${swapPoints.uploadedAt} >= ${hoursAgo}`
        )
      )
      .orderBy(desc(swapPoints.uploadedAt));
  }

  async createSwapPointsHistory(history: InsertSwapPointsHistory): Promise<SwapPointsHistory> {
    const [record] = await db
      .insert(swapPointsHistory)
      .values({
        id: nanoid(),
        ...history,
      })
      .returning();
    return record;
  }

  // ON/TN Rates methods
  async getOnTnRates(currencyPairId: string): Promise<OnTnRate[]> {
    return await db
      .select()
      .from(onTnRates)
      .where(eq(onTnRates.currencyPairId, currencyPairId));
  }

  async createOnTnRate(rate: InsertOnTnRate): Promise<OnTnRate> {
    const [record] = await db
      .insert(onTnRates)
      .values({
        id: nanoid(),
        ...rate,
      })
      .returning();
    return record;
  }

  async deleteOnTnRate(id: string): Promise<void> {
    await db.delete(onTnRates).where(eq(onTnRates.id, id));
  }
}

export const swapPointRepository = new SwapPointRepository();
