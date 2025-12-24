import { storage } from "./storage";
import { log } from "./vite";

/**
 * Initialize default admin account if no admin exists
 * This ensures the system always has at least one admin account
 */
export async function initializeAdminAccount() {
  try {
    // Check if any admin user exists
    const users = await storage.getAllUsers();
    const adminExists = users.some(user => user.role === "admin");

    if (!adminExists) {
      log("No admin account found. Creating default admin...");

      const defaultAdminUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
      const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

      // Create default admin account
      await storage.createUser({
        username: defaultAdminUsername,
        password: defaultAdminPassword,
        role: "admin",
        isActive: true,
        firstName: "System",
        lastName: "Administrator",
      });

      log(`✅ Default admin account created: ${defaultAdminUsername}`);
      log(`⚠️  IMPORTANT: Change the default password immediately!`);
      log(`   Username: ${defaultAdminUsername}`);
      log(`   Password: ${defaultAdminPassword}`);
    } else {
      log("✅ Admin account exists");
    }
  } catch (error) {
    console.error("Failed to initialize admin account:", error);
    // Don't throw - let the app continue even if this fails
  }
}
