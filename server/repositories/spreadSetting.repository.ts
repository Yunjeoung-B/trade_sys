import { spreadSettings, type SpreadSetting, type InsertSpreadSetting, type User } from "@shared/schema";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export class SpreadSettingRepository {
  async getSpreadSettings(): Promise<SpreadSetting[]> {
    return await db.select().from(spreadSettings).where(eq(spreadSettings.isActive, true));
  }

  async createSpreadSetting(settingData: InsertSpreadSetting): Promise<SpreadSetting> {
    const [setting] = await db.insert(spreadSettings).values({
      id: nanoid(),
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

  async deleteSpreadSetting(id: string): Promise<void> {
    await db.delete(spreadSettings).where(eq(spreadSettings.id, id));
  }

  async getSpreadForUser(productType: string, currencyPairId: string, user: User, tenor?: string): Promise<number> {
    // Get all matching spread settings for this product and currency pair
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

    // Find best matching spread using explicit priority
    // Priority: sub (3) > mid (2) > major (1) > default (0)
    let bestMatch: { priority: number; setting: typeof settings[0] | null } = { priority: -1, setting: null };

    for (const setting of settings) {
      let priority = 0;
      let isMatch = false;

      if (!setting.groupType || !setting.groupValue) {
        // Default spread for everyone
        priority = 0;
        isMatch = true;
      } else if (setting.groupType === "sub" && setting.groupValue === user.subGroup) {
        priority = 3;
        isMatch = true;
      } else if (setting.groupType === "mid" && setting.groupValue === user.midGroup) {
        priority = 2;
        isMatch = true;
      } else if (setting.groupType === "major" && setting.groupValue === user.majorGroup) {
        priority = 1;
        isMatch = true;
      }

      // Update if this match has higher priority
      if (isMatch && priority > bestMatch.priority) {
        bestMatch = { priority, setting };
      }
    }

    // If no match found, return default spread
    if (!bestMatch.setting) {
      return 10.0; // default 10 bps
    }

    // If tenor is provided and tenorSpreads exists, try to find tenor-specific spread
    if (tenor && bestMatch.setting.tenorSpreads) {
      const tenorSpreadsObj = bestMatch.setting.tenorSpreads as Record<string, number>;

      // Normalize tenor key (e.g., "1w" -> "1W", "spot" -> "SPOT")
      const normalizedTenor = tenor.toUpperCase();

      // Check if tenor-specific spread exists
      if (tenorSpreadsObj[normalizedTenor] !== undefined) {
        return Number(tenorSpreadsObj[normalizedTenor]);
      }
    }

    // Fall back to base spread
    return Number(bestMatch.setting.baseSpread);
  }
}

export const spreadSettingRepository = new SpreadSettingRepository();
