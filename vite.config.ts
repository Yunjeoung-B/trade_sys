import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 5173;
const replSlug = process.env.REPL_SLUG;
const replOwner = process.env.REPL_OWNER;
const isReplit =
  typeof replSlug !== "undefined" && typeof replOwner !== "undefined";

export default defineConfig(async () => {
  const plugins: any[] = [react(), runtimeErrorOverlay()];

  if (process.env.NODE_ENV !== "production" && isReplit) {
    try {
      const m = await import("@replit/vite-plugin-cartographer");
      if (m && typeof m.cartographer === "function") {
        plugins.push(m.cartographer());
      }
    } catch (e) {
      console.warn("Failed to load cartographer plugin:", e);
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      host: true,
      port,
      hmr: {
        protocol: isReplit ? "wss" : "ws",
        host: isReplit ? `${replSlug}.${replOwner}.repl.co` : "localhost",
        port,
        clientPort: port,
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
