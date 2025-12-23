import { autoApprovalSettings, type AutoApprovalSetting, type InsertAutoApprovalSetting } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export class AutoApprovalRepository {
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
        id: nanoid(),
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

export const autoApprovalRepository = new AutoApprovalRepository();
