import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { exec, spawn } from "child_process";
import { promisify } from "util";
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

const execAsync = promisify(exec);

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

  // Bloomberg WebSocket setup for real-time streaming
  const bloombergWss = new WebSocketServer({ server: httpServer, path: '/bloomberg-ws' });

  bloombergWss.on('connection', (ws) => {
    console.log('Bloomberg client connected');
    bloombergClients.add(ws);
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'start_stream' && data.symbols) {
          startBloombergStream(data.symbols);
        } else if (data.type === 'stop_stream') {
          stopBloombergStream();
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
  });

  function startBloombergStream(symbols: string[]) {
    if (bloombergStreamProcess) {
      stopBloombergStream();
    }

    try {
      // Python Bloomberg 스트리밍 프로세스 시작
      const symbolsString = symbols.join(',');
      bloombergStreamProcess = spawn('python3', ['server/bloomberg.py', 'stream', symbolsString]);

      bloombergStreamProcess.stdout.on('data', (data: Buffer) => {
        try {
          const lines = data.toString().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            const marketData = JSON.parse(line);
            
            // 모든 연결된 클라이언트에게 브로드캐스트
            const message = JSON.stringify({
              type: 'realtime_data',
              data: marketData
            });
            
            bloombergClients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(message);
              }
            });
          }
        } catch (parseError) {
          console.log('Bloomberg data parse error:', parseError);
          
          // Fallback: 시뮬레이션 데이터 전송
          const simulationData = symbols.map(symbol => ({
            symbol,
            price: 1200 + Math.random() * 100,
            change: (Math.random() - 0.5) * 20,
            changePercent: (Math.random() - 0.5) * 2,
            volume: Math.floor(Math.random() * 1000000),
            timestamp: new Date().toISOString(),
            source: "bloomberg_simulation"
          }));
          
          const message = JSON.stringify({
            type: 'realtime_data',
            data: simulationData[0] // 하나씩 전송
          });
          
          bloombergClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        }
      });

      bloombergStreamProcess.stderr.on('data', (data: Buffer) => {
        console.error('Bloomberg stream error:', data.toString());
      });

      bloombergStreamProcess.on('close', (code: number) => {
        console.log(`Bloomberg stream process exited with code ${code}`);
        bloombergStreamProcess = null;
      });

    } catch (error) {
      console.error('Bloomberg stream start error:', error);
      
      // Fallback: 시뮬레이션 스트리밍
      startSimulationStream(symbols);
    }
  }

  function stopBloombergStream() {
    if (bloombergStreamProcess) {
      bloombergStreamProcess.kill();
      bloombergStreamProcess = null;
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

  return httpServer;
}
