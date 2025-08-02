# Overview

This is a full-stack FX Trading Platform prototype built for foreign exchange trading operations. The system provides a comprehensive trading environment with real-time market data, order management, and administrative controls. It serves both client traders and administrators with role-based access to different trading products including Spot FX, Forward FX, Swap transactions, and Market Average Rate (MAR) trading. The platform emphasizes compliance through approval workflows and hierarchical user group management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern component development
- **Styling**: TailwindCSS with shadcn/ui component library for consistent design system
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (@tanstack/react-query) for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds
- **Component Structure**: Modular design with reusable UI components, trading-specific components (Chart, MarketWatch, OrderForm), and role-based page layouts

## Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API development
- **Language**: TypeScript for type safety across the entire stack
- **Authentication**: Passport.js with local strategy and express-session for secure user authentication
- **API Design**: RESTful endpoints organized by feature (auth, trading, admin) with proper HTTP status codes and error handling
- **Session Management**: PostgreSQL-backed session storage using connect-pg-simple for scalable session persistence

## Database Design
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL for cloud-native deployment
- **Schema Design**: Comprehensive schema covering users with hierarchical groups (majorGroup/midGroup/subGroup), currency pairs, market rates with historical tracking, spread settings with granular controls, quote requests with approval workflows, trades, and auto-approval settings
- **Data Relationships**: Well-defined foreign key relationships between entities with proper indexing for performance

## Authentication & Authorization
- **User Roles**: Two-tier system with 'admin' and 'client' roles providing different access levels
- **Group Hierarchy**: Three-level user grouping (major/mid/sub) for granular spread and approval management
- **Session Security**: HTTP-only cookies with secure flags in production, configurable session TTL
- **Password Security**: bcrypt for password hashing with secure salt rounds

## Trading System Features
- **Real-time Data**: WebSocket integration for live market rate updates with 5-second refresh intervals
- **Product Types**: Support for Spot (immediate execution), Forward (future-dated), Swap (dual-leg), and MAR (time-restricted morning orders)
- **Approval Workflow**: Configurable approval requirements for Forward and Swap products with admin oversight
- **Spread Management**: Multi-dimensional spread settings by product type, currency pair, settlement date, and user group level
- **Time Restrictions**: Business logic for MAR trading cutoff (9:00 AM) with real-time validation

## Business Logic Architecture
- **Quote Calculation**: Layered pricing model combining source rates with group-specific spreads, product spreads, currency spreads, and tenor spreads
- **Order Lifecycle**: Complete order flow from request creation through approval to execution and settlement
- **Risk Management**: Approval gates for complex products with configurable auto-approval windows
- **Compliance**: Audit trail through comprehensive trade and quote request logging

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling and automatic scaling
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect support

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