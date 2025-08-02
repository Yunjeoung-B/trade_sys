import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertCurrencyPairSchema,
  insertMarketRateSchema,
  insertSpreadSettingSchema,
  insertQuoteRequestSchema,
  insertTradeSchema,
  insertAutoApprovalSettingSchema,
} from "@shared/schema";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPg from "connect-pg-simple";

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
      secure: process.env.NODE_ENV === "production",
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
      done(null, user);
    } catch (error) {
      done(error);
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
      res.status(400).json({ message: "Invalid spread setting data" });
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

  // Quote requests
  app.get("/api/quote-requests", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role === "admin") {
        const requests = await storage.getPendingQuoteRequests();
        res.json(requests);
      } else {
        const requests = await storage.getUserQuoteRequests(req.user.id);
        res.json(requests);
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
    } catch (error) {
      res.status(400).json({ message: "Invalid quote request data" });
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
      const trade = await storage.createTrade(tradeData);
      res.json(trade);
    } catch (error) {
      res.status(400).json({ message: "Invalid trade data" });
    }
  });

  // User management (admin only)
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
  });

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

  return httpServer;
}
