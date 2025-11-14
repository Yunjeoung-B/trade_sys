import { sql } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  timestamp, 
  decimal, 
  boolean, 
  integer,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  email: varchar("email"),
  role: varchar("role").notNull().default("client"), // admin or client
  majorGroup: varchar("major_group"), // external/internal
  midGroup: varchar("mid_group"), // team name
  subGroup: varchar("sub_group"), // individual ID
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Currency pairs
export const currencyPairs = pgTable("currency_pairs", {
  id: varchar("id").primaryKey(),
  symbol: varchar("symbol").notNull().unique(), // USD/KRW, JPY/KRW, etc.
  baseCurrency: varchar("base_currency").notNull(),
  quoteCurrency: varchar("quote_currency").notNull(),
  isActive: boolean("is_active").default(true),
});

// Market rates
export const marketRates = pgTable("market_rates", {
  id: varchar("id").primaryKey(),
  currencyPairId: varchar("currency_pair_id").references(() => currencyPairs.id),
  buyRate: decimal("buy_rate", { precision: 12, scale: 4 }).notNull(),
  sellRate: decimal("sell_rate", { precision: 12, scale: 4 }).notNull(),
  source: varchar("source").default("manual"), // infomax, bloomberg, manual
  timestamp: timestamp("timestamp").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Spread settings
export const spreadSettings = pgTable("spread_settings", {
  id: varchar("id").primaryKey(),
  productType: varchar("product_type").notNull(), // Spot, Forward, Swap, MAR
  currencyPairId: varchar("currency_pair_id").references(() => currencyPairs.id),
  groupType: varchar("group_type"), // major, mid, sub, or null for default
  groupValue: varchar("group_value"), // group identifier
  baseSpread: decimal("base_spread", { precision: 8, scale: 4 }).notNull(),
  tenorSpreads: jsonb("tenor_spreads"), // {1M: 0.5, 3M: 1.0, etc.}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quote requests
export const quoteRequests = pgTable("quote_requests", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  productType: varchar("product_type").notNull(), // Spot, Forward, Swap, MAR
  currencyPairId: varchar("currency_pair_id").references(() => currencyPairs.id),
  direction: varchar("direction").notNull(), // BUY, SELL
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  amountCurrency: varchar("amount_currency"), // BASE or QUOTE
  orderType: varchar("order_type"), // MARKET or LIMIT
  limitRate: decimal("limit_rate", { precision: 12, scale: 4 }), // for LIMIT orders
  validityType: varchar("validity_type"), // DAY or TIME
  validUntilTime: varchar("valid_until_time"), // HH:MM format
  tenor: varchar("tenor"), // 1M, 3M, 6M, 1Y, etc.
  nearDate: timestamp("near_date"), // for swaps and forwards (value date)
  farDate: timestamp("far_date"), // for swaps
  nearRate: decimal("near_rate", { precision: 12, scale: 4 }), // for swaps
  nearAmount: decimal("near_amount", { precision: 18, scale: 2 }), // for swaps
  farAmount: decimal("far_amount", { precision: 18, scale: 2 }), // for swaps
  hedgeCompleted: boolean("hedge_completed").default(false),
  nearSpread: decimal("near_spread", { precision: 8, scale: 4 }),
  farSpread: decimal("far_spread", { precision: 8, scale: 4 }),
  status: varchar("status").default("REQUESTED"), // REQUESTED, QUOTE_READY, CONFIRMED, EXPIRED
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  quotedRate: decimal("quoted_rate", { precision: 12, scale: 4 }),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trading history
export const trades = pgTable("trades", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tradeNumber: varchar("trade_number").notNull().unique(),
  productType: varchar("product_type").notNull(),
  currencyPairId: varchar("currency_pair_id").references(() => currencyPairs.id),
  direction: varchar("direction").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  amountCurrency: varchar("amount_currency"), // BASE or QUOTE
  orderType: varchar("order_type"), // MARKET or LIMIT
  limitRate: decimal("limit_rate", { precision: 12, scale: 4 }), // for LIMIT orders
  validityType: varchar("validity_type"), // DAY or TIME
  validUntilTime: varchar("valid_until_time"), // HH:MM format or ISO timestamp
  rate: decimal("rate", { precision: 12, scale: 4 }).notNull(),
  settlementDate: timestamp("settlement_date"),
  maturityDate: timestamp("maturity_date"),
  status: varchar("status").default("active"), // pending, active, settled, cancelled
  quoteRequestId: varchar("quote_request_id").references(() => quoteRequests.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Auto approval settings
export const autoApprovalSettings = pgTable("auto_approval_settings", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  maxAmount: decimal("max_amount", { precision: 18, scale: 2 }).notNull(),
  timeWindowMinutes: integer("time_window_minutes").default(30),
  isEnabled: boolean("is_enabled").default(false),
  allowWeekends: boolean("allow_weekends").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCurrencyPairSchema = createInsertSchema(currencyPairs).omit({
  id: true,
});

export const insertMarketRateSchema = createInsertSchema(marketRates).omit({
  id: true,
  timestamp: true,
});

export const insertSpreadSettingSchema = createInsertSchema(spreadSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  baseSpread: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({
  id: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  quotedRate: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform(val => String(val)),
  limitRate: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)).optional(),
  nearDate: z.union([z.string(), z.date(), z.null()]).transform(val => 
    val === null ? null : (typeof val === 'string' ? new Date(val) : val)
  ).optional(),
  farDate: z.union([z.string(), z.date(), z.null()]).transform(val => 
    val === null ? null : (typeof val === 'string' ? new Date(val) : val)
  ).optional(),
  nearRate: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)).optional(),
  nearAmount: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)).optional(),
  farAmount: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)).optional(),
  nearSpread: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)).optional(),
  farSpread: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)).optional(),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  tradeNumber: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform(val => String(val)),
  rate: z.union([z.string(), z.number()]).transform(val => String(val)),
  limitRate: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)).optional(),
  settlementDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
  maturityDate: z.union([z.string(), z.date(), z.null()]).transform(val => 
    val === null ? null : (typeof val === 'string' ? new Date(val) : val)
  ).optional(),
});

export const insertAutoApprovalSettingSchema = createInsertSchema(autoApprovalSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type CurrencyPair = typeof currencyPairs.$inferSelect;
export type InsertCurrencyPair = z.infer<typeof insertCurrencyPairSchema>;

export type MarketRate = typeof marketRates.$inferSelect;
export type InsertMarketRate = z.infer<typeof insertMarketRateSchema>;

export type SpreadSetting = typeof spreadSettings.$inferSelect;
export type InsertSpreadSetting = z.infer<typeof insertSpreadSettingSchema>;

export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type AutoApprovalSetting = typeof autoApprovalSettings.$inferSelect;
export type InsertAutoApprovalSetting = z.infer<typeof insertAutoApprovalSettingSchema>;

// Infomax API Status Schema
export const infomaxStatusSchema = z.object({
  connected: z.boolean(),
  apiKeyConfigured: z.boolean(),
  remainingMinute: z.number(),
  remainingDaily: z.number(),
  remainingDailyMB: z.string(),
  usedMinute: z.number(),
  usedDailyMB: z.string(),
  lastCallAt: z.string().nullable(),
  lastApiError: z.string().nullable(),
});

export type InfomaxApiStatus = z.infer<typeof infomaxStatusSchema>;

// Infomax Tick Data Schema
export const infomaxTickDataSchema = z.object({
  broker: z.string(),
  data: z.string(),
  date: z.string(),
  time: z.string(),
  time_seq: z.number(),
  bid_price: z.number(),
  ask_price: z.number(),
  mid_price: z.number(),
  executing_price: z.number(),
  i_mar: z.number(),
});

export type InfomaxTickData = z.infer<typeof infomaxTickDataSchema>;

// Infomax API Response Schema
export const infomaxApiResponseSchema = z.object({
  success: z.boolean(),
  results: z.array(infomaxTickDataSchema).optional(),
  message: z.string().optional(),
});

export type InfomaxApiResponse = z.infer<typeof infomaxApiResponseSchema>;

// Bulk Customer Rate Schema
export const customerRateItemSchema = z.object({
  currencyPairId: z.string(),
  currencyPairSymbol: z.string(),
  buyRate: z.number(),
  sellRate: z.number(),
  spread: z.number(),
  baseRate: z.object({
    id: z.string(),
    currencyPairId: z.string(),
    buyRate: z.string(),
    sellRate: z.string(),
    source: z.string(),
    timestamp: z.date(),
    updatedAt: z.date(),
  }).nullable(),
});

export type CustomerRateItem = z.infer<typeof customerRateItemSchema>;
