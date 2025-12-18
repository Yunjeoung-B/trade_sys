# Overview

This is a full-stack FX Trading Platform prototype built for foreign exchange trading operations. The system provides a comprehensive trading environment with real-time market data, order management, and administrative controls. It serves both client traders and administrators with role-based access to different trading products including Spot FX, Forward FX, Swap transactions, and Market Average Rate (MAR) trading. The platform emphasizes compliance through approval workflows and hierarchical user group management.

# User Preferences

Preferred communication style: Simple, everyday language.
Design preferences: Modern gradient-based UI with soft colors and rounded corners. Login pages should use mint (teal) and dark navy color scheme instead of orange/amber colors.
Brand slogan: "The Smartest Choice in FX" (approved by user).
Logo assets: User provided dark/white mode compatible logo assets for dark/white modes, don't modify.
Font preference: Nanum Gothic font family for Korean text support.
UI Style: Gradient backgrounds (slate-800 → blue-900 → purple-900), rounded-3xl cards with transparency and backdrop-blur effects.

# Recent Changes (Session 25-Nov-2025)

## ✅ Complete KST Timezone Unification
- **Backend**: `process.env.TZ = "Asia/Seoul"` set in server/index.ts at startup
- **Backend Utilities**: Created server/utils/dateUtils.ts with getTodayLocal(), formatDateForInput(), verifyTimezone()
- **Timezone Verification**: Server logs timezone confirmation on startup (UTC offset: -540 = KST ✓)
- **Frontend**: formatDateString() updated to use local date methods (getFullYear/getMonth/getDate) instead of toISOString()
- **Status**: System now unified to UTC+9 (KST) across frontend, backend, and database operations ✅

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern component development
- **Styling**: TailwindCSS with shadcn/ui component library for consistent design system, featuring gradient backgrounds and rounded corners
- **Typography**: Nanum Gothic font family for Korean language support via Google Fonts
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (@tanstack/react-query) for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds
- **Component Structure**: Modular design with reusable UI components, trading-specific components (Chart, MarketWatch, OrderForm), and role-based page layouts
- **Design System**: Modern gradient-based UI with soft colors, rounded-3xl cards, transparency effects, and backdrop-blur styling

## Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API development
- **Language**: TypeScript for type safety across the entire stack
- **Authentication**: Passport.js with local strategy and express-session for secure user authentication
- **API Design**: RESTful endpoints organized by feature (auth, trading, admin) with proper HTTP status codes and error handling
- **Session Management**: PostgreSQL-backed session storage using connect-pg-simple for scalable session persistence

## Database Design
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations (MySQL configuration attempted but reverted due to local server unavailability)
- **Connection**: Supabase PostgreSQL for cloud-native deployment
- **Schema Design**: Comprehensive schema covering users with hierarchical groups (majorGroup/midGroup/subGroup), currency pairs, market rates with historical tracking, spread settings with granular controls, quote requests with approval workflows, trades, and auto-approval settings
- **Data Relationships**: Well-defined foreign key relationships between entities with proper indexing for performance
- **UUID Generation**: Application-level UUID generation using nanoid() library instead of database auto-generation
- **MySQL Compatibility**: Schema designed to be compatible with both PostgreSQL and MySQL with minor type adjustments

## Authentication & Authorization
- **User Roles**: Two-tier system with 'admin' and 'client' roles providing different access levels
- **Group Hierarchy**: Three-level user grouping (major/mid/sub) for granular spread and approval management
- **Session Security**: HTTP-only cookies with secure flags in production, configurable session TTL
- **Password Security**: bcrypt for password hashing with secure salt rounds

## Trading System Features
- **Real-time Data**: WebSocket integration for live market rate updates with 5-second refresh intervals
- **Product Types**: Support for FX SPOT (immediate execution), FX FORWARD (future-dated), FX SWAP (dual-leg), and MAR (time-restricted morning orders)
- **Quote Request Workflow**: Gated pricing system for Forward exchange where transaction prices are hidden from customers until admin approval, preventing immediate price visibility
  - Customer submits quote request with currency pair, direction, amount, and value date (status: REQUESTED)
  - Admin reviews and approves quote requests, providing quoted rate with 30-minute expiry window (status: QUOTE_READY)
  - Customer can execute trades from approved quotes before expiry (status: CONFIRMED)
  - Server-side validation prevents execution of expired or invalid quotes (status: EXPIRED)
  - Client-side revalidation before execution prevents race conditions
  - Trade creation validates quote status to ensure atomic state transitions
- **Approval Workflow**: Configurable approval requirements for Forward and Swap products with admin oversight
- **Spread Management**: Multi-dimensional spread settings by product type, currency pair, settlement date, and user group level
- **Customer Rate Calculation**: Comprehensive group-based spread application system where customer trading rates = Infomax base rates ± group spreads (buy = base + spread/100, sell = base - spread/100), with priority-based spread selection matching user's major/mid/sub groups across product types, currency pairs, and settlement dates
- **Real-time Rate Integration**: All four trading pages (Spot, Forward, Swap, MAR) integrated with useCustomerRate hook for live customer rate display with 10-second polling interval, stale detection (30s threshold), error handling, and automatic refetching when currency pairs change
- **Trading Page Validation**: Complete safety guards across all trading flows including hasValidRates checks preventing trades when rates unavailable, currency pair ID validation before mutations, disabled buttons during rate loading, and comprehensive error messages for missing data scenarios
- **Time Restrictions**: Business logic for MAR trading cutoff (9:00 AM) with real-time validation
- **UI Enhancement**: Consistent gradient-based design across all trading pages with modern button styling and rounded input fields
- **Standardized Order Input**: All trading pages now use consistent layout with currency selection buttons above order amount input field, matching MAR trading design
- **Bloomberg API Dashboard**: Comprehensive admin interface for Bloomberg API management with connection testing, real-time data display, and bulk import capabilities
- **HTTP Polling System**: WebSocket 연결 문제 해결을 위해 HTTP 폴링 기반 실시간 데이터 시스템으로 변경 (2초 간격 업데이트)
- **Infomax API Integration**: Real-time market data from Infomax API (https://infomaxy.einfomax.co.kr/api/usdkrw/tick) with data=order parameter and broker=SMB configuration, 10-second background polling, automatic rate limiting compliance, and graceful error handling
- **FX Swap Point Management**: Comprehensive admin interface (FX Swap 가격 모니터링 page) for managing swap points with Excel upload, manual CRUD operations, and linear interpolation for intermediate settlement dates
  - Excel upload with strict validation (tenor, settlement_date, days, swap_point columns)
  - Atomic validation: Invalid numeric values (NaN) abort entire upload with row-specific error messages
  - Linear interpolation utility for calculating swap points for intermediate settlement dates not in dataset
  - Currency pair-scoped queries with proper cache invalidation
  - Real-time Infomax Forward API integration displaying MID_PRICE data
  - Admin-only access controls on all swap points endpoints
- **이론가환율 (Theoretical Forward Rate Calculator)**: Redesigned admin interface for managing complete swap point curve including ON/TN
  - **ON/TN Support**: Now includes ON (T+1), TN (T+2), SPOT, and forward tenors (1M-12M)
  - **Start Date Field**: Added startDate for swap period tracking (ON: today, TN: T+1, others: today)
  - **Settlement Date Mapping**: ON → T+1 settlement, TN → SPOT settlement
  - **Business Days**: Calculated via addBusinessDays function with weekend skipping (extendable to US/KR holidays)
  - **Upper Bracket Validation**: Settlement dates beyond 12M (366 days max) return 400 error
  - **Linear Interpolation**: Automatic swap point calculation for intermediate dates (e.g., 365D calculated from 3M/12M spread)
  - **Data Persistence**: startDate and settlementDate both saved to database for accurate settlement tracking

## Business Logic Architecture
- **Quote Calculation**: Layered pricing model combining source rates with group-specific spreads, product spreads, currency spreads, and tenor spreads
- **Order Lifecycle**: Complete order flow from request creation through approval to execution and settlement
- **Risk Management**: Approval gates for complex products with configurable auto-approval windows
- **Compliance**: Audit trail through comprehensive trade and quote request logging
- **Bloomberg API Integration**: Real-time market data integration with Python Bloomberg API (blpapi) and automatic fallback to simulation mode

# External Dependencies

## Database Services
- **Supabase**: PostgreSQL hosting with connection pooling, automatic scaling, and built-in authentication features
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect support

## Market Data Services
- **Bloomberg API**: Real-time and historical FX market data via Python blpapi library with automatic fallback to simulation mode
- **Python Integration**: Child process execution for Bloomberg API calls with error handling and graceful degradation
- **Infomax API**: Real-time USD/KRW market data via REST API with order data (ask_price as BUY rate, bid_price as SELL rate), 10-second background polling service with rate limiting compliance, automatic retry logic, and persistent storage in PostgreSQL market_rates table

## UI Framework & Components
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives including dialogs, dropdowns, forms, and navigation components
- **shadcn/ui**: Pre-built component library built on Radix UI with TailwindCSS styling
- **Lucide React**: Icon library for consistent iconography throughout the application

## Development & Build Tools
- **Vite**: Modern build tool with HMR, optimized bundling, and plugin ecosystem
- **TypeScript**: Static type checking across frontend, backend, and shared schemas
- **PostCSS & Autoprefixer**: CSS processing pipeline for cross-browser compatibility
- **ESBuild**: Fast bundling for production server builds

## Authentication & Security
- **Passport.js**: Authentication middleware with local strategy support
- **bcrypt**: Password hashing library for secure credential storage
- **express-session**: Session management middleware with PostgreSQL store integration

## State Management & API
- **React Query**: Server state synchronization with intelligent caching, background updates, and optimistic updates
- **React Hook Form**: Form state management with validation integration
- **Zod**: Schema validation for API requests and database operations

## Real-time Features
- **WebSocket (ws)**: Native WebSocket implementation for real-time market data streaming
- **React Query Integration**: Automatic cache invalidation and background refetching for live data updates

## Development Environment
- **Replit Integration**: Custom plugins for development environment integration including error overlay and cartographer for debugging
- **Hot Module Replacement**: Development server with instant feedback for code changes