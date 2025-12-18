import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { infomaxPoller } from "./services/infomaxPoller";
import { verifyTimezone } from "./utils/dateUtils";

// ✅ 전체 시스템을 KST (UTC+9)로 설정
process.env.TZ = "Asia/Seoul";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize app
let isInitialized = false;

async function initializeApp() {
  if (isInitialized) return app;

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  isInitialized = true;

  // Only start server if not in Vercel (Vercel handles the server)
  if (process.env.VERCEL !== "1") {
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, () => {
      log(`serving on port ${port}`);
      
      // ✅ 타임존 확인
      verifyTimezone();
      
      // ❌ Infomax 폴러 자동 시작 비활성화 (수동으로만 호출)
      // infomaxPoller.start();
      // log('Infomax poller started');
    });

    process.on('SIGTERM', () => {
      log('SIGTERM received, stopping Infomax poller');
      infomaxPoller.stop();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      log('SIGINT received, stopping Infomax poller');
      infomaxPoller.stop();
      process.exit(0);
    });
  }

  return app;
}

// Auto-initialize for non-Vercel environments
if (process.env.VERCEL !== "1") {
  initializeApp();
}

// Export app and handler for Vercel
export { app };
export default app;
