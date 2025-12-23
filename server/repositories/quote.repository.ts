import { quoteRequests, type QuoteRequest, type InsertQuoteRequest } from "@shared/schema";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export class QuoteRepository {
  async createQuoteRequest(requestData: InsertQuoteRequest): Promise<QuoteRequest> {
    const [request] = await db.insert(quoteRequests).values({
      id: nanoid(),
      ...requestData,
    }).returning();
    return request;
  }

  async getAllQuoteRequests(): Promise<QuoteRequest[]> {
    return await db
      .select()
      .from(quoteRequests)
      .orderBy(desc(quoteRequests.createdAt));
  }

  async getPendingQuoteRequests(): Promise<QuoteRequest[]> {
    return await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.status, "REQUESTED"))
      .orderBy(desc(quoteRequests.createdAt));
  }

  async getQuoteRequestsByStatus(status: string): Promise<QuoteRequest[]> {
    return await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.status, status))
      .orderBy(desc(quoteRequests.createdAt));
  }

  async approveQuoteRequest(id: string, adminId: string, quotedRate: number): Promise<QuoteRequest | undefined> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minute expiry

    const [request] = await db
      .update(quoteRequests)
      .set({
        status: "QUOTE_READY",
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
        status: "REJECTED",
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

  async getUserQuoteRequestsByStatus(userId: string, status: string): Promise<QuoteRequest[]> {
    return await db
      .select()
      .from(quoteRequests)
      .where(and(eq(quoteRequests.userId, userId), eq(quoteRequests.status, status)))
      .orderBy(desc(quoteRequests.createdAt));
  }

  async confirmQuoteRequest(id: string): Promise<QuoteRequest | undefined> {
    // First, get the quote to check if it's still valid
    const [existingQuote] = await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.id, id));

    if (!existingQuote) {
      return undefined;
    }

    // Check if quote is in QUOTE_READY status
    if (existingQuote.status !== "QUOTE_READY") {
      throw new Error("Quote is not in QUOTE_READY status");
    }

    // Check if quote has expired
    if (existingQuote.expiresAt && new Date(existingQuote.expiresAt) <= new Date()) {
      // Mark as EXPIRED instead of confirming
      await db
        .update(quoteRequests)
        .set({
          status: "EXPIRED",
          updatedAt: new Date(),
        })
        .where(eq(quoteRequests.id, id));
      throw new Error("Quote has expired");
    }

    // All checks passed, confirm the quote
    const [request] = await db
      .update(quoteRequests)
      .set({
        status: "CONFIRMED",
        updatedAt: new Date(),
      })
      .where(eq(quoteRequests.id, id))
      .returning();
    return request;
  }

  async cancelQuoteRequest(id: string, userId: string): Promise<QuoteRequest | undefined> {
    // Verify ownership before canceling
    const [existingQuote] = await db
      .select()
      .from(quoteRequests)
      .where(and(eq(quoteRequests.id, id), eq(quoteRequests.userId, userId)));

    if (!existingQuote) {
      return undefined;
    }

    // Only allow canceling REQUESTED status quotes
    if (existingQuote.status !== "REQUESTED") {
      throw new Error("Only pending quote requests can be cancelled");
    }

    const [request] = await db
      .update(quoteRequests)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(eq(quoteRequests.id, id))
      .returning();
    return request;
  }
}

export const quoteRepository = new QuoteRepository();
