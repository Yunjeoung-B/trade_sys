import { currencyPairs, type CurrencyPair, type InsertCurrencyPair } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export class CurrencyPairRepository {
  async getCurrencyPairs(): Promise<CurrencyPair[]> {
    return await db.select().from(currencyPairs).where(eq(currencyPairs.isActive, true));
  }

  async getCurrencyPair(id: string): Promise<CurrencyPair | undefined> {
    const [pair] = await db.select().from(currencyPairs).where(eq(currencyPairs.id, id));
    return pair;
  }

  async getCurrencyPairBySymbol(symbol: string): Promise<CurrencyPair | undefined> {
    const [pair] = await db.select().from(currencyPairs).where(eq(currencyPairs.symbol, symbol));
    return pair;
  }

  async createCurrencyPair(pairData: InsertCurrencyPair): Promise<CurrencyPair> {
    const [pair] = await db.insert(currencyPairs).values({
      id: nanoid(),
      ...pairData,
    }).returning();
    return pair;
  }
}

export const currencyPairRepository = new CurrencyPairRepository();
