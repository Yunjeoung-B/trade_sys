import { trades, type Trade, type InsertTrade } from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export class TradeRepository {
  async createTrade(tradeData: InsertTrade): Promise<Trade> {
    // Generate trade number
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await db.select({ count: sql`count(*)` }).from(trades);
    const tradeNumber = `FX${timestamp}${String(Number(count[0].count) + 1).padStart(4, "0")}`;

    // Determine status based on orderType - force correct status regardless of client input
    let status: string;
    if (tradeData.orderType === "LIMIT") {
      status = "pending";
    } else if (tradeData.orderType === "MARKET" || !tradeData.orderType) {
      status = "active";
    } else {
      throw new Error(`Invalid orderType: ${tradeData.orderType}`);
    }

    const [trade] = await db
      .insert(trades)
      .values({
        id: nanoid(),
        ...tradeData,
        tradeNumber,
        status,
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

  async getUserPendingTrades(userId: string): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.status, "pending")))
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

  async cancelTrade(id: string, userId: string): Promise<Trade | undefined> {
    // Verify ownership before canceling
    const [existingTrade] = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)));

    if (!existingTrade) {
      return undefined;
    }

    // Only allow canceling pending status trades
    if (existingTrade.status !== "pending") {
      throw new Error("Only pending trades can be cancelled");
    }

    const [trade] = await db
      .update(trades)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(trades.id, id))
      .returning();
    return trade;
  }
}

export const tradeRepository = new TradeRepository();
