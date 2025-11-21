import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { excelMonitor } from "./excelMonitor";
import * as path from "path";
import * as fs from "fs";
import multer from "multer";
import { parseSwapPointsExcel, validateSwapPoints } from "./utils/excelParser";
import {
  insertUserSchema,
  insertCurrencyPairSchema,
  insertMarketRateSchema,
  insertSpreadSettingSchema,
  insertQuoteRequestSchema,
  insertTradeSchema,
  insertAutoApprovalSettingSchema,
  insertSwapPointSchema,
} from "@shared/schema";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPg from "connect-pg-simple";
import { 
  getSwapPointForDate, 
  calculateTheoreticalRate, 
  getApplicableSpread 
} from "./utils/forwardEngine";

const execAsync = promisify(exec);

// Multer configuration for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// Bloomberg streaming process
let bloombergStreamProcess: any = null;
const bloombergClients = new Set<WebSocket>();

// Session configuration
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Replit 개발 환경에서는 false로 설정
      maxAge: sessionTtl,
    },
  });
}

// Authentication middleware
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session and passport setup
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.validateUserPassword(username, password);
        if (user) {
          return done(null, user);
        } else {
          return done(null, false, { message: "Invalid credentials" });
        }
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        done(null, user);
      } else {
        done(null, false);
      }
    } catch (error) {
      console.error("Deserialize user error:", error);
      done(null, false);
    }
  });

  // Authentication routes
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        return res.json({ user: { id: user.id, username: user.username, role: user.role } });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout error" });
      }
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, (req: any, res) => {
    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      majorGroup: user.majorGroup,
      midGroup: user.midGroup,
      subGroup: user.subGroup,
    });
  });

  // Currency pairs
  app.get("/api/currency-pairs", isAuthenticated, async (req, res) => {
    try {
      const pairs = await storage.getCurrencyPairs();
      res.json(pairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch currency pairs" });
    }
  });

  app.post("/api/currency-pairs", isAdmin, async (req, res) => {
    try {
      const pairData = insertCurrencyPairSchema.parse(req.body);
      const pair = await storage.createCurrencyPair(pairData);
      res.json(pair);
    } catch (error) {
      res.status(400).json({ message: "Invalid currency pair data" });
    }
  });

  // Market rates
  app.get("/api/market-rates", isAuthenticated, async (req, res) => {
    try {
      const rates = await storage.getLatestMarketRates();
      res.json(rates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market rates" });
    }
  });

  app.get("/api/market-rates/history/:pairId", isAuthenticated, async (req, res) => {
    try {
      const { pairId } = req.params;
      const hours = parseInt(req.query.hours as string) || 24;
      const history = await storage.getMarketRateHistory(pairId, hours);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rate history" });
    }
  });

  app.post("/api/market-rates", isAdmin, async (req, res) => {
    try {
      const rateData = insertMarketRateSchema.parse(req.body);
      const rate = await storage.updateMarketRate(rateData);
      res.json(rate);
    } catch (error) {
      res.status(400).json({ message: "Invalid rate data" });
    }
  });

  // Save manual spot rate (for Forward Rate Calculator)
  app.post("/api/market-rates/manual", isAdmin, async (req, res) => {
    try {
      const { currencyPairId, buyRate, sellRate, source } = req.body;
      
      if (!currencyPairId || !buyRate || !sellRate) {
        return res.status(400).json({ message: "Currency pair ID, buy rate, and sell rate are required" });
      }
      
      const rateData = {
        currencyPairId,
        buyRate: buyRate.toString(),
        sellRate: sellRate.toString(),
        source: source || "manual",
      };
      
      const rate = await storage.updateMarketRate(rateData);
      res.json(rate);
    } catch (error: any) {
      console.error("Manual market rate save error:", error);
      res.status(400).json({ message: error.message || "Failed to save manual rate" });
    }
  });

  // Customer rates with spread applied (for client users)
  // Bulk API - get all currency pairs' customer rates for a product type
  app.get("/api/customer-rates/:productType", isAuthenticated, async (req, res) => {
    try {
      const { productType } = req.params;
      const { tenor } = req.query;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate product type
      const validProductTypes = ["Spot", "Forward", "Swap", "MAR"];
      if (!validProductTypes.includes(productType)) {
        return res.status(400).json({ message: "Invalid product type" });
      }

      const rates = await storage.getCustomerRatesForUser(productType, user, tenor as string | undefined);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching bulk customer rates:", error);
      res.status(500).json({ message: "Failed to fetch customer rates" });
    }
  });

  // Single currency pair API
  app.get("/api/customer-rates/:productType/:currencyPairId", isAuthenticated, async (req, res) => {
    try {
      const { productType, currencyPairId } = req.params;
      const { tenor } = req.query;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const rate = await storage.getCustomerRateForUser(productType, currencyPairId, user, tenor as string | undefined);

      if (!rate) {
        return res.status(404).json({ message: "No market rate available" });
      }

      res.json(rate);
    } catch (error) {
      console.error("Error fetching customer rate:", error);
      res.status(500).json({ message: "Failed to fetch customer rate" });
    }
  });

  // Spread settings
  app.get("/api/spread-settings", isAdmin, async (req, res) => {
    try {
      const settings = await storage.getSpreadSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spread settings" });
    }
  });

  app.post("/api/spread-settings", isAdmin, async (req, res) => {
    try {
      const settingData = insertSpreadSettingSchema.parse(req.body);
      const setting = await storage.createSpreadSetting(settingData);
      res.json(setting);
    } catch (error) {
      console.error("Spread setting validation error:", error);
      res.status(400).json({ 
        message: "Invalid spread setting data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/spread-settings/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertSpreadSettingSchema.partial().parse(req.body);
      const setting = await storage.updateSpreadSetting(id, updates);
      if (!setting) {
        return res.status(404).json({ message: "Spread setting not found" });
      }
      res.json(setting);
    } catch (error) {
      res.status(400).json({ message: "Invalid spread setting data" });
    }
  });

  app.delete("/api/spread-settings/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSpreadSetting(id);
      res.json({ message: "Spread setting deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete spread setting" });
    }
  });

  // Quote preview - calculate theoretical rates before requesting quote
  app.post("/api/quotes/preview", isAuthenticated, async (req: any, res) => {
    try {
      const { currencyPairId, productType, settlementDate, nearDate, farDate, direction, tenor } = req.body;

      if (!currencyPairId || !productType) {
        return res.status(400).json({ message: "Currency pair and product type are required" });
      }

      // Get current spot rate
      const marketRates = await storage.getLatestMarketRates();
      const marketRate = marketRates.find(r => r.currencyPairId === currencyPairId);
      
      if (!marketRate) {
        return res.status(404).json({ message: "Market rate not found for currency pair" });
      }

      const spotRate = parseFloat(marketRate.buyRate); // Use buy rate as base

      if (productType === "FORWARD") {
        if (!settlementDate) {
          return res.status(400).json({ message: "Settlement date is required for Forward" });
        }

        // Get swap point for settlement date
        const swapPoint = await getSwapPointForDate(
          currencyPairId,
          new Date(settlementDate),
          storage
        );

        if (swapPoint === null) {
          return res.status(404).json({ 
            message: "Swap points not available for this settlement date. Please contact admin." 
          });
        }

        // Calculate theoretical rate
        const theoreticalRate = calculateTheoreticalRate(spotRate, swapPoint);

        // Get applicable spread (tenor from request or default)
        const spread = await getApplicableSpread(
          req.user.id,
          currencyPairId,
          productType,
          tenor,
          storage
        );

        // Apply spread to theoretical rate
        const customerRate = theoreticalRate + (spread / 100);

        res.json({
          productType: "FORWARD",
          spotRate,
          swapPoint,
          theoreticalRate,
          spread,
          customerRate,
          settlementDate,
          direction,
          tenor,
        });

      } else if (productType === "SWAP") {
        if (!nearDate || !farDate) {
          return res.status(400).json({ message: "Near and far dates are required for Swap" });
        }

        // Get swap points for both legs
        const nearSwapPoint = await getSwapPointForDate(
          currencyPairId,
          new Date(nearDate),
          storage
        );

        const farSwapPoint = await getSwapPointForDate(
          currencyPairId,
          new Date(farDate),
          storage
        );

        if (nearSwapPoint === null || farSwapPoint === null) {
          return res.status(404).json({ 
            message: "Swap points not available for these dates. Please contact admin." 
          });
        }

        // Calculate theoretical rates for both legs
        const nearTheoreticalRate = calculateTheoreticalRate(spotRate, nearSwapPoint);
        const farTheoreticalRate = calculateTheoreticalRate(spotRate, farSwapPoint);

        // Get applicable spread (apply only to far leg)
        const spread = await getApplicableSpread(
          req.user.id,
          currencyPairId,
          productType,
          undefined,
          storage
        );

        // Apply spread only to far leg
        const nearCustomerRate = nearTheoreticalRate; // No spread on near leg
        const farCustomerRate = farTheoreticalRate + (spread / 100); // Spread on far leg only

        res.json({
          productType: "SWAP",
          spotRate,
          near: {
            date: nearDate,
            swapPoint: nearSwapPoint,
            theoreticalRate: nearTheoreticalRate,
            customerRate: nearCustomerRate,
          },
          far: {
            date: farDate,
            swapPoint: farSwapPoint,
            theoreticalRate: farTheoreticalRate,
            spread,
            customerRate: farCustomerRate,
          },
        });

      } else {
        return res.status(400).json({ message: "Invalid product type. Use FORWARD or SWAP" });
      }

    } catch (error: any) {
      console.error("Quote preview error:", error);
      res.status(500).json({ message: error.message || "Failed to calculate quote preview" });
    }
  });

  // Quote requests
  app.get("/api/quote-requests", isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.query;
      
      if (req.user.role === "admin") {
        const requests = await storage.getPendingQuoteRequests();
        res.json(requests);
      } else {
        // If status filter is provided, use filtered query
        if (status) {
          const requests = await storage.getUserQuoteRequestsByStatus(req.user.id, status as string);
          res.json(requests);
        } else {
          const requests = await storage.getUserQuoteRequests(req.user.id);
          res.json(requests);
        }
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quote requests" });
    }
  });

  app.post("/api/quote-requests", isAuthenticated, async (req: any, res) => {
    try {
      const requestData = insertQuoteRequestSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const request = await storage.createQuoteRequest(requestData);
      res.json(request);
    } catch (error: any) {
      console.error("Quote request creation error:", error);
      
      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const firstError = error.errors[0];
        return res.status(400).json({ 
          message: `입력 오류: ${firstError.path.join('.')} - ${firstError.message}` 
        });
      }
      
      res.status(400).json({ 
        message: error.message || "Invalid quote request data" 
      });
    }
  });

  app.post("/api/quote-requests/:id/approve", isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { quotedRate } = req.body;
      const request = await storage.approveQuoteRequest(id, req.user.id, quotedRate);
      if (!request) {
        return res.status(404).json({ message: "Quote request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve quote request" });
    }
  });

  app.post("/api/quote-requests/:id/reject", isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.rejectQuoteRequest(id, req.user.id);
      if (!request) {
        return res.status(404).json({ message: "Quote request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject quote request" });
    }
  });

  app.post("/api/quote-requests/:id/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.confirmQuoteRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Quote request not found" });
      }
      res.json(request);
    } catch (error: any) {
      // Handle specific error cases
      if (error.message === "Quote has expired") {
        return res.status(409).json({ message: "Quote has expired and cannot be executed" });
      }
      if (error.message === "Quote is not in QUOTE_READY status") {
        return res.status(409).json({ message: "Quote is not available for execution" });
      }
      console.error("Confirm quote error:", error);
      res.status(500).json({ message: "Failed to confirm quote request" });
    }
  });

  app.post("/api/quote-requests/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.cancelQuoteRequest(id, req.user.id);
      if (!request) {
        return res.status(404).json({ message: "Quote request not found or you don't have permission to cancel it" });
      }
      res.json(request);
    } catch (error: any) {
      if (error.message === "Only pending quote requests can be cancelled") {
        return res.status(409).json({ message: "Only pending quote requests can be cancelled" });
      }
      console.error("Cancel quote error:", error);
      res.status(500).json({ message: "Failed to cancel quote request" });
    }
  });

  // Get customer rates for quote requests (admin only)
  app.get("/api/quote-requests/customer-rates", isAdmin, async (req: any, res) => {
    try {
      const pendingRequests = await storage.getPendingQuoteRequests();
      const customerRates: Record<string, { baseRate: number; spread: number; customerRate: number }> = {};
      
      // Get all latest market rates
      const allMarketRates = await storage.getLatestMarketRates();
      
      for (const request of pendingRequests) {
        try {
          // Skip if currencyPairId is null
          if (!request.currencyPairId) continue;
          
          // Get user info
          const user = await storage.getUser(request.userId);
          if (!user) continue;
          
          // Find market rate for this currency pair
          const marketRate = allMarketRates.find(rate => rate.currencyPairId === request.currencyPairId);
          if (!marketRate) continue;
          
          // Determine base rate based on direction
          const baseRate = request.direction === "BUY" 
            ? parseFloat(marketRate.buyRate) 
            : parseFloat(marketRate.sellRate);
          
          // Get spread for this user and product type
          const spread = await storage.getSpreadForUser(
            request.productType,
            request.currencyPairId,
            user,
            request.tenor ?? undefined
          );
          
          // Calculate customer rate
          // For BUY: customer pays more (base + spread)
          // For SELL: customer receives less (base - spread)
          const customerRate = request.direction === "BUY"
            ? baseRate + (spread / 100)
            : baseRate - (spread / 100);
          
          customerRates[request.id] = {
            baseRate,
            spread,
            customerRate
          };
        } catch (error) {
          console.error(`Error calculating rate for request ${request.id}:`, error);
          // Continue processing other requests
        }
      }
      
      res.json(customerRates);
    } catch (error) {
      console.error("Customer rates calculation error:", error);
      res.status(500).json({ message: "Failed to calculate customer rates" });
    }
  });

  // Trades
  app.get("/api/trades", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role === "admin") {
        const trades = await storage.getAllActiveTrades();
        res.json(trades);
      } else {
        const trades = await storage.getUserActiveTrades(req.user.id);
        res.json(trades);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.post("/api/trades", isAuthenticated, async (req: any, res) => {
    try {
      const tradeData = insertTradeSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      // If this trade is associated with a quote request, verify the quote is in valid status
      if (tradeData.quoteRequestId) {
        const quoteRequests = await storage.getUserQuoteRequests(req.user.id);
        const quote = quoteRequests.find(q => q.id === tradeData.quoteRequestId);
        
        if (!quote) {
          return res.status(404).json({ message: "Quote request not found" });
        }
        
        // Only allow trades from CONFIRMED or QUOTE_READY quotes
        if (quote.status !== "CONFIRMED" && quote.status !== "QUOTE_READY") {
          return res.status(409).json({ 
            message: `Cannot create trade from quote with status: ${quote.status}` 
          });
        }
        
        // Check if quote has expired
        if (quote.expiresAt && new Date(quote.expiresAt) <= new Date()) {
          return res.status(409).json({ message: "Quote has expired" });
        }
      }
      
      const trade = await storage.createTrade(tradeData);
      res.json(trade);
    } catch (error) {
      console.error("Trade creation error:", error);
      res.status(400).json({ message: "Invalid trade data" });
    }
  });

  app.get("/api/trades/pending", isAuthenticated, async (req: any, res) => {
    try {
      const pendingTrades = await storage.getUserPendingTrades(req.user.id);
      res.json(pendingTrades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending trades" });
    }
  });

  app.post("/api/trades/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const trade = await storage.cancelTrade(id, req.user.id);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found or you don't have permission to cancel it" });
      }
      res.json(trade);
    } catch (error: any) {
      if (error.message === "Only pending trades can be cancelled") {
        return res.status(409).json({ message: "Only pending trades can be cancelled" });
      }
      console.error("Cancel trade error:", error);
      res.status(500).json({ message: "Failed to cancel trade" });
    }
  });

  // Users (admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get unique group values for a specific group type
  app.get("/api/users/group-values/:groupType", isAdmin, async (req, res) => {
    try {
      const { groupType } = req.params;
      const users = await storage.getAllUsers();
      
      let groupValues: string[] = [];
      
      if (groupType === "major") {
        groupValues = Array.from(new Set(users.map(u => u.majorGroup).filter(Boolean))) as string[];
      } else if (groupType === "mid") {
        groupValues = Array.from(new Set(users.map(u => u.midGroup).filter(Boolean))) as string[];
      } else if (groupType === "sub") {
        groupValues = Array.from(new Set(users.map(u => u.subGroup).filter(Boolean))) as string[];
      }
      
      res.json(groupValues.sort());
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch group values" });
    }
  });

  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Auto approval settings
  app.get("/api/auto-approval/:userId", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const setting = await storage.getAutoApprovalSetting(userId);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch auto approval setting" });
    }
  });

  app.post("/api/auto-approval", isAdmin, async (req, res) => {
    try {
      const settingData = insertAutoApprovalSettingSchema.parse(req.body);
      const setting = await storage.upsertAutoApprovalSetting(settingData);
      res.json(setting);
    } catch (error) {
      res.status(400).json({ message: "Invalid auto approval setting data" });
    }
  });

  // Bloomberg API routes (Admin only)
  app.get("/api/admin/bloomberg/status", isAdmin, async (req, res) => {
    try {
      // Bloomberg API 상태 확인
      const status = {
        connected: true, // 실제 Bloomberg API 연결 상태로 교체 필요
        lastUpdate: new Date().toISOString(),
        apiVersion: "3.18.4.1",
        rateLimitRemaining: 1000
      };
      res.json(status);
    } catch (error) {
      console.error("Bloomberg API status error:", error);
      res.status(500).json({ message: "Failed to get Bloomberg API status" });
    }
  });

  app.post("/api/admin/bloomberg/test-connection", isAdmin, async (req, res) => {
    try {
      // 실제 Bloomberg API 연결 테스트
      const { stdout, stderr } = await execAsync("python3 server/bloomberg.py test");
      
      if (stderr) {
        console.error("Bloomberg API 오류:", stderr);
        return res.status(500).json({ message: "Bloomberg API connection failed", error: stderr });
      }
      
      const result = JSON.parse(stdout);
      
      if (result.connected) {
        res.json({ success: true, message: "Bloomberg API connection successful" });
      } else {
        res.status(500).json({ message: "Bloomberg API connection failed" });
      }
    } catch (error) {
      console.error("Bloomberg API connection test error:", error);
      // Fallback to simulation if Python script fails
      res.json({ success: true, message: "Bloomberg API simulation mode" });
    }
  });

  app.get("/api/admin/bloomberg/data", isAdmin, async (req, res) => {
    try {
      const { symbols = [], requestType = "realtime" } = req.query;
      const symbolArray = Array.isArray(symbols) ? symbols.map(s => String(s)) : symbols.toString().split(',');
      
      if (requestType === "realtime") {
        try {
          // 실제 Bloomberg API로 실시간 데이터 가져오기
          const symbolsString = symbolArray.join(',');
          const { stdout, stderr } = await execAsync(`python3 server/bloomberg.py realtime ${symbolsString}`);
          
          if (stderr) {
            console.error("Bloomberg API 오류:", stderr);
            throw new Error(stderr);
          }
          
          const realData = JSON.parse(stdout);
          
          if (realData.error) {
            throw new Error(realData.error);
          }
          
          res.json(realData);
        } catch (pythonError) {
          console.log("Bloomberg API 사용 불가, 시뮬레이션 모드로 전환:", pythonError);
          
          // Fallback to simulation
          const mockData = symbolArray.map((symbol: string) => ({
            symbol,
            price: 1200 + Math.random() * 100,
            change: (Math.random() - 0.5) * 20,
            changePercent: (Math.random() - 0.5) * 2,
            volume: Math.floor(Math.random() * 1000000),
            timestamp: new Date().toISOString(),
            source: "bloomberg_simulation"
          }));
          
          res.json(mockData);
        }
      } else {
        // 과거 데이터나 기타 요청 타입에 대한 시뮬레이션
        const mockData = symbolArray.map((symbol: string) => ({
          symbol,
          price: 1200 + Math.random() * 100,
          change: (Math.random() - 0.5) * 20,
          changePercent: (Math.random() - 0.5) * 2,
          volume: Math.floor(Math.random() * 1000000),
          timestamp: new Date().toISOString(),
          source: "bloomberg_simulation"
        }));
        
        res.json(mockData);
      }
    } catch (error) {
      console.error("Bloomberg API data error:", error);
      res.status(500).json({ message: "Failed to fetch Bloomberg data" });
    }
  });

  app.post("/api/admin/bloomberg/save-data", isAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      
      // Bloomberg 데이터를 market_rates 테이블에 저장
      for (const item of data) {
        // 통화쌍 찾기 또는 생성
        let currencyPair = await storage.getCurrencyPairBySymbol(item.symbol);
        if (!currencyPair) {
          // 새 통화쌍 생성
          const baseCurrency = item.symbol.slice(0, 3);
          const quoteCurrency = item.symbol.slice(3, 6);
          currencyPair = await storage.createCurrencyPair({
            symbol: item.symbol,
            baseCurrency,
            quoteCurrency,
            isActive: true
          });
        }

        // 시장 데이터 저장
        await storage.createMarketRate({
          currencyPairId: currencyPair.id,
          buyRate: (item.price + (item.change / 2)).toString(),
          sellRate: (item.price - (item.change / 2)).toString(),
        });
      }

      res.json({ success: true, message: `${data.length} records saved to database` });
    } catch (error) {
      console.error("Bloomberg data save error:", error);
      res.status(500).json({ message: "Failed to save Bloomberg data" });
    }
  });

  app.post("/api/admin/bloomberg/bulk-import", isAdmin, async (req, res) => {
    try {
      const { symbols, startDate, endDate } = req.body;
      let totalRecords = 0;
      
      try {
        // 실제 Bloomberg API로 과거 데이터 가져오기
        const symbolsString = symbols.join(',');
        const { stdout, stderr } = await execAsync(`python3 server/bloomberg.py historical ${symbolsString} ${startDate} ${endDate}`);
        
        if (stderr) {
          console.error("Bloomberg API 오류:", stderr);
          throw new Error(stderr);
        }
        
        const historicalData = JSON.parse(stdout);
        
        if (historicalData.error) {
          throw new Error(historicalData.error);
        }
        
        // 실제 Bloomberg 데이터를 데이터베이스에 저장
        for (const item of historicalData) {
          let currencyPair = await storage.getCurrencyPairBySymbol(item.symbol);
          if (!currencyPair) {
            const baseCurrency = item.symbol.slice(0, 3);
            const quoteCurrency = item.symbol.slice(3, 6);
            currencyPair = await storage.createCurrencyPair({
              symbol: item.symbol,
              baseCurrency,
              quoteCurrency,
              isActive: true
            });
          }

          await storage.createMarketRate({
            currencyPairId: currencyPair.id,
            buyRate: (item.price + 0.5).toString(),
            sellRate: (item.price - 0.5).toString(),
          });
          
          totalRecords++;
        }
        
        res.json({ 
          success: true, 
          message: `${totalRecords} historical records imported from Bloomberg`,
          recordsImported: totalRecords,
          source: "bloomberg"
        });
        
      } catch (pythonError) {
        console.log("Bloomberg API 사용 불가, 시뮬레이션 모드로 전환:", pythonError);
        
        // Fallback to simulation
        for (const symbol of symbols) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          
          for (let i = 0; i <= daysDiff; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            
            let currencyPair = await storage.getCurrencyPairBySymbol(symbol);
            if (!currencyPair) {
              const baseCurrency = symbol.slice(0, 3);
              const quoteCurrency = symbol.slice(3, 6);
              currencyPair = await storage.createCurrencyPair({
                symbol,
                baseCurrency,
                quoteCurrency,
                isActive: true
              });
            }

            const price = 1200 + Math.random() * 100;
            await storage.createMarketRate({
              currencyPairId: currencyPair.id,
              buyRate: (price + 0.5).toString(),
              sellRate: (price - 0.5).toString(),
            });
            
            totalRecords++;
          }
        }
        
        res.json({ 
          success: true, 
          message: `${totalRecords} simulated historical records imported`,
          recordsImported: totalRecords,
          source: "simulation"
        });
      }
    } catch (error) {
      console.error("Bloomberg bulk import error:", error);
      res.status(500).json({ message: "Failed to import Bloomberg data" });
    }
  });

  // Infomax API routes (Admin only)
  app.get("/api/admin/infomax/status", isAdmin, async (req, res) => {
    try {
      const { infomaxService } = await import('./services/infomaxService');
      const status = infomaxService.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Infomax API status error:", error);
      res.status(500).json({ message: "Failed to get Infomax API status" });
    }
  });

  app.post("/api/admin/infomax/test-connection", isAdmin, async (req, res) => {
    try {
      const { infomaxService } = await import('./services/infomaxService');
      const result = await infomaxService.testConnection();
      
      if (!result.success) {
        return res.status(result.simulationMode ? 200 : 429).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Infomax API connection test error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Internal server error",
        simulationMode: true 
      });
    }
  });

  // Infomax Forward API routes
  app.get("/api/admin/infomax/forward", isAdmin, async (req, res) => {
    try {
      const { infomaxService } = await import('./services/infomaxService');
      const broker = req.query.broker as string || 'KMB';
      const result = await infomaxService.fetchForwardData(broker);
      
      if (!result.success) {
        return res.status(result.simulationMode ? 200 : 429).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Infomax Forward API error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Internal server error",
        simulationMode: true 
      });
    }
  });

  // Market rates historical data (admin only)
  app.get("/api/admin/market-rates/history", isAdmin, async (req, res) => {
    try {
      const currencyPairId = req.query.currencyPairId as string;
      const hours = parseInt(req.query.hours as string) || 24;
      
      if (!currencyPairId) {
        return res.status(400).json({ message: "Currency pair ID is required" });
      }
      
      const history = await storage.getMarketRateHistory(currencyPairId, hours);
      res.json(history);
    } catch (error) {
      console.error("Get market rate history error:", error);
      res.status(500).json({ message: "Failed to get market rate history" });
    }
  });

  // Swap Points routes (admin only)
  app.get("/api/swap-points", isAdmin, async (req, res) => {
    try {
      const currencyPairId = req.query.currencyPairId as string;
      const swapPoints = await storage.getSwapPoints(currencyPairId);
      res.json(swapPoints);
    } catch (error) {
      console.error("Get swap points error:", error);
      res.status(500).json({ message: "Failed to get swap points" });
    }
  });

  // Swap Points historical data (admin only)
  app.get("/api/admin/swap-points/history", isAdmin, async (req, res) => {
    try {
      const currencyPairId = req.query.currencyPairId as string;
      const hours = parseInt(req.query.hours as string) || 24;
      
      if (!currencyPairId) {
        return res.status(400).json({ message: "Currency pair ID is required" });
      }
      
      const history = await storage.getSwapPointHistory(currencyPairId, hours);
      res.json(history);
    } catch (error) {
      console.error("Get swap point history error:", error);
      res.status(500).json({ message: "Failed to get swap point history" });
    }
  });

  // Create single swap point (admin only)
  app.post("/api/swap-points", isAdmin, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || 'system';
      
      const validated = insertSwapPointSchema.parse({
        ...req.body,
        uploadedBy: userId,
      });
      
      const created = await storage.createSwapPoint(validated);
      res.json(created);
    } catch (error) {
      console.error("Create swap point error:", error);
      res.status(500).json({ message: "Failed to create swap point" });
    }
  });

  // Excel file upload endpoint
  app.post("/api/admin/swap-points/upload-excel", isAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const currencyPairId = req.body.currencyPairId;
      if (!currencyPairId) {
        return res.status(400).json({ 
          success: false,
          message: "Currency pair ID is required" 
        });
      }

      // Verify currency pair exists
      const currencyPair = await storage.getCurrencyPair(currencyPairId);
      if (!currencyPair) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid currency pair ID" 
        });
      }

      const userId = (req.user as any)?.id || 'system';

      // Parse and validate Excel file (throws on invalid data)
      const swapPoints = parseSwapPointsExcel(req.file.buffer, currencyPairId, userId);
      
      // Validate parsed data structure
      validateSwapPoints(swapPoints);

      // Store in database
      const results = [];
      for (const point of swapPoints) {
        const validated = insertSwapPointSchema.parse(point);
        const created = await storage.createSwapPoint(validated);
        results.push(created);
      }

      res.json({ 
        success: true, 
        message: `${results.length} swap points uploaded successfully`,
        data: results 
      });
    } catch (error: any) {
      console.error("Excel upload error:", error);
      res.status(400).json({ 
        success: false,
        message: error.message || "Failed to upload Excel file" 
      });
    }
  });

  app.post("/api/admin/swap-points/upload", isAdmin, async (req, res) => {
    try {
      const { currencyPairId, swapPoints } = req.body;
      
      if (!currencyPairId || !Array.isArray(swapPoints)) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const userId = (req.user as any)?.id;
      const results = [];

      for (const point of swapPoints) {
        const created = await storage.createSwapPoint({
          currencyPairId,
          tenor: point.tenor,
          settlementDate: point.settlementDate,
          days: point.days,
          swapPoint: point.swapPoint,
          source: 'excel',
          uploadedBy: userId,
        });
        results.push(created);
      }

      res.json({ 
        success: true, 
        message: `${results.length} swap points uploaded successfully`,
        data: results 
      });
    } catch (error) {
      console.error("Upload swap points error:", error);
      res.status(500).json({ message: "Failed to upload swap points" });
    }
  });

  app.delete("/api/admin/swap-points/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSwapPoint(id);
      res.json({ success: true, message: "Swap point deleted" });
    } catch (error) {
      console.error("Delete swap point error:", error);
      res.status(500).json({ message: "Failed to delete swap point" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    // Send initial market data
    ws.send(JSON.stringify({
      type: "market_rates",
      data: []
    }));

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Setup Excel monitoring WebSocket
  const excelWss = new WebSocketServer({ server: httpServer, path: "/excel-ws" });
  
  excelWss.on("connection", (ws: WebSocket) => {
    console.log("Excel WebSocket client connected");
    excelMonitor.addClient(ws);
    
    // 클라이언트에게 현재 모니터링 중인 파일 목록 전송
    const watchedFiles = excelMonitor.getWatchedFiles();
    ws.send(JSON.stringify({
      type: "watched_files",
      files: watchedFiles
    }));

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  // Bloomberg WebSocket setup for real-time streaming
  const bloombergWss = new WebSocketServer({ 
    server: httpServer, 
    path: '/bloomberg-ws',
    perMessageDeflate: false,
    maxPayload: 1024 * 1024 // 1MB
  });

  bloombergWss.on('connection', (ws, request) => {
    console.log('Bloomberg client connected from:', request.socket.remoteAddress);
    bloombergClients.add(ws);
    
    // 연결 즉시 확인 메시지 전송
    try {
      ws.send(JSON.stringify({
        type: 'connection_confirmed',
        message: 'Bloomberg WebSocket connected'
      }));
      console.log('Connection confirmation sent');
    } catch (error) {
      console.error('Error sending connection confirmation:', error);
    }
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Bloomberg WebSocket received:', data);
        
        if (data.type === 'start_stream') {
          const symbols = data.symbols || ['USDKRW', 'EURKRW', 'JPYKRW'];
          console.log('Starting Bloomberg stream for:', symbols);
          startBloombergSimulation(symbols);
          
          ws.send(JSON.stringify({
            type: 'stream_started',
            message: 'Bloomberg streaming started',
            symbols: symbols
          }));
        } else if (data.type === 'stop_stream') {
          console.log('Stopping Bloomberg stream');
          stopBloombergStream();
          
          ws.send(JSON.stringify({
            type: 'stream_stopped',
            message: 'Bloomberg streaming stopped'
          }));
        }
      } catch (error) {
        console.error('Bloomberg WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Bloomberg client disconnected');
      bloombergClients.delete(ws);
      
      // 마지막 클라이언트가 연결 해제되면 스트리밍 중지
      if (bloombergClients.size === 0) {
        stopBloombergStream();
      }
    });

    ws.on('error', (error) => {
      console.error('Bloomberg WebSocket error:', error);
      bloombergClients.delete(ws);
    });
  });

  bloombergWss.on('error', (error) => {
    console.error('Bloomberg WebSocket server error:', error);
  });

  // HTTP upgrade 처리를 위한 디버깅
  httpServer.on('upgrade', (request, socket, head) => {
    console.log('WebSocket upgrade request received for:', request.url);
    if (request.url === '/bloomberg-ws') {
      console.log('Handling Bloomberg WebSocket upgrade');
    }
  });

  function startBloombergSimulation(symbols: string[]) {
    if (bloombergStreamProcess) {
      stopBloombergStream();
    }

    console.log('Starting Bloomberg simulation for symbols:', symbols);
    
    // 시뮬레이션 스트리밍 시작 (Python 사용하지 않음)
    bloombergStreamProcess = setInterval(() => {
      if (bloombergClients.size === 0) {
        stopBloombergStream();
        return;
      }

      symbols.forEach(symbol => {
        const basePrice = symbol === 'USDKRW' ? 1350.5 : 
                         symbol === 'EURKRW' ? 1450.2 : 
                         symbol === 'JPYKRW' ? 950.8 : 1200;
        
        const variation = (Math.random() - 0.5) * 10; // -5 to +5 변동
        const price = basePrice + variation;
        const change = variation;
        const changePercent = (change / basePrice) * 100;
        const volume = Math.floor(Math.random() * 1000000) + 100000;

        const marketData = {
          type: 'market_data',
          symbol,
          price: parseFloat(price.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          volume,
          timestamp: new Date().toISOString(),
          source: 'bloomberg_simulation'
        };

        console.log('Broadcasting market data:', marketData);

        // 모든 연결된 클라이언트에게 전송
        bloombergClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(marketData));
          }
        });
      });
    }, 2000); // 2초마다 업데이트
  }

  function stopBloombergStream() {
    if (bloombergStreamProcess) {
      if (typeof bloombergStreamProcess.kill === 'function') {
        bloombergStreamProcess.kill();
      } else {
        clearInterval(bloombergStreamProcess);
      }
      bloombergStreamProcess = null;
      console.log('Bloomberg stream stopped');
    }
  }

  function startSimulationStream(symbols: string[]) {
    // 시뮬레이션 데이터를 주기적으로 전송
    const simulationInterval = setInterval(() => {
      if (bloombergClients.size === 0) {
        clearInterval(simulationInterval);
        return;
      }

      symbols.forEach(symbol => {
        const simulationData = {
          symbol,
          price: 1200 + Math.random() * 100,
          change: (Math.random() - 0.5) * 20,
          changePercent: (Math.random() - 0.5) * 2,
          volume: Math.floor(Math.random() * 1000000),
          timestamp: new Date().toISOString(),
          source: "bloomberg_simulation"
        };

        const message = JSON.stringify({
          type: 'realtime_data',
          data: simulationData
        });

        bloombergClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      });
    }, 2000); // 2초마다 업데이트
  }

  // Simulate market data updates
  setInterval(async () => {
    try {
      const rates = await storage.getLatestMarketRates();
      const message = JSON.stringify({
        type: "market_rates",
        data: rates,
        timestamp: new Date().toISOString()
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (error) {
      console.error("Error broadcasting market data:", error);
    }
  }, 5000); // Update every 5 seconds

  // Excel monitoring API endpoints
  app.post("/api/excel/start-monitoring", isAdmin, async (req, res) => {
    try {
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }

      const success = excelMonitor.startWatching(filePath);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Started monitoring ${path.basename(filePath)}`,
          filePath 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: "Failed to start monitoring file" 
        });
      }
    } catch (error) {
      console.error("Excel monitoring start error:", error);
      res.status(500).json({ message: "Failed to start Excel monitoring" });
    }
  });

  app.post("/api/excel/stop-monitoring", isAdmin, async (req, res) => {
    try {
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }

      const success = excelMonitor.stopWatching(filePath);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Stopped monitoring ${path.basename(filePath)}` 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: "File was not being monitored" 
        });
      }
    } catch (error) {
      console.error("Excel monitoring stop error:", error);
      res.status(500).json({ message: "Failed to stop Excel monitoring" });
    }
  });

  app.get("/api/excel/watched-files", isAdmin, async (req, res) => {
    try {
      const watchedFiles = excelMonitor.getWatchedFiles();
      res.json({ files: watchedFiles });
    } catch (error) {
      console.error("Excel watched files error:", error);
      res.status(500).json({ message: "Failed to get watched files" });
    }
  });

  app.post("/api/excel/get-cell-value", isAdmin, async (req, res) => {
    try {
      const { filePath, sheetName, cellAddress } = req.body;
      const value = excelMonitor.getCellValue(filePath, sheetName, cellAddress);
      
      res.json({ 
        success: true, 
        value,
        filePath: path.basename(filePath),
        sheetName,
        cellAddress 
      });
    } catch (error) {
      console.error("Excel cell value error:", error);
      res.status(500).json({ message: "Failed to get cell value" });
    }
  });

  app.post("/api/excel/get-range-data", isAdmin, async (req, res) => {
    try {
      const { filePath, sheetName, range } = req.body;
      const data = excelMonitor.getRangeData(filePath, sheetName, range);
      
      res.json({ 
        success: true, 
        data,
        filePath: path.basename(filePath),
        sheetName,
        range 
      });
    } catch (error) {
      console.error("Excel range data error:", error);
      res.status(500).json({ message: "Failed to get range data" });
    }
  });

  return httpServer;
}
