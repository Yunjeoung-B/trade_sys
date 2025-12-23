import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

/**
 * 기본 사용자 생성 (애플리케이션 시작 시 자동 실행)
 */
export async function seedDefaultUsers() {
  try {
    // 1. Admin 사용자 확인/생성
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"));

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("password", 10);
      await db.insert(users).values({
        id: nanoid(),
        username: "admin",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        email: "admin@trade-sys.com",
        role: "admin",
        majorGroup: "internal",
        midGroup: "management",
        subGroup: "admin-001",
        isActive: true,
      });
      console.log("✅ 기본 관리자 계정 생성 완료: admin / password");
    }

    // 2. Client 사용자 확인/생성
    const [existingClient] = await db
      .select()
      .from(users)
      .where(eq(users.username, "client"));

    if (!existingClient) {
      const hashedPassword = await bcrypt.hash("password", 10);
      await db.insert(users).values({
        id: nanoid(),
        username: "client",
        password: hashedPassword,
        firstName: "Client",
        lastName: "User",
        email: "client@trade-sys.com",
        role: "client",
        majorGroup: "external",
        midGroup: "corporate",
        subGroup: "client-001",
        isActive: true,
      });
      console.log("✅ 기본 고객 계정 생성 완료: client / password");
    }

    console.log("✅ 기본 사용자 확인 완료");
  } catch (error) {
    console.error("❌ 기본 사용자 생성 중 오류:", error);
    // 에러가 나도 애플리케이션은 계속 실행
  }
}
