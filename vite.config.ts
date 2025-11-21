import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const port = Number(process.env.PORT) || 5173;
const replSlug = process.env.REPL_SLUG;
const replOwner = process.env.REPL_OWNER;
const isReplit =
  typeof replSlug !== "undefined" && typeof replOwner !== "undefined";

export default defineConfig(async () => {
  const plugins: any[] = [react(), runtimeErrorOverlay()];

  // Replit 개발 환경일 때만 cartographer 플러그인을 로드
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
        "@": path.resolve(import.meta.url, "..", "client", "src"),
        "@shared": path.resolve(import.meta.url, "..", "shared"),
        "@assets": path.resolve(import.meta.url, "..", "attached_assets"),
      },
    },
    root: path.resolve(import.meta.url, "..", "client"),
    build: {
      outDir: path.resolve(import.meta.url, "..", "dist/public"),
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
