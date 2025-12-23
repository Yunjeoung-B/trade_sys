# Trade System Architecture

## 📁 Project Structure

```
server/
├── middleware/          # ✅ NEW - Request middleware
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   └── validation.middleware.ts
│
├── repositories/        # ✅ NEW - Data access layer
│   ├── user.repository.ts
│   ├── currencyPair.repository.ts
│   ├── marketRate.repository.ts
│   ├── spreadSetting.repository.ts
│   ├── quote.repository.ts
│   ├── trade.repository.ts
│   ├── autoApproval.repository.ts
│   └── swapPoint.repository.ts
│
├── routes/              # 🔄 TODO - Split routes.ts
│   ├── auth.routes.ts
│   ├── quotes.routes.ts
│   ├── trades.routes.ts
│   └── ...
│
├── services/            # 🔄 TODO - Business logic layer
│   ├── auth.service.ts
│   ├── quote.service.ts
│   └── ...
│
├── controllers/         # 🔄 TODO - HTTP handlers
│   └── ...
│
├── utils/               # ✅ Existing utilities
│   ├── forwardEngine.ts
│   ├── settlement.ts
│   ├── dateUtils.ts
│   └── ...
│
├── index.ts             # Server entry point
├── routes.ts            # ⚠️ To be deprecated (1,929 lines)
└── storage.ts           # ✅ Refactored to use repositories
```

## ✅ Completed Refactoring

### 1. Middleware Layer (NEW)
**Location**: `server/middleware/`

- `auth.middleware.ts` - Authentication & authorization
- `error.middleware.ts` - Global error handling
- `validation.middleware.ts` - Request validation with Zod

**Benefits**:
- Reusable authentication logic
- Centralized error handling
- Type-safe validation

### 2. Repository Layer (NEW)
**Location**: `server/repositories/`

**Purpose**: Separates data access from business logic

**Repositories**:
- `user.repository.ts` (57 lines)
- `currencyPair.repository.ts` (29 lines)
- `marketRate.repository.ts` (98 lines)
- `spreadSetting.repository.ts` (105 lines)
- `quote.repository.ts` (162 lines)
- `trade.repository.ts` (98 lines)
- `autoApproval.repository.ts` (32 lines)
- `swapPoint.repository.ts` (129 lines)

**Total**: 710 lines (vs. 814 lines in original `storage.ts`)

**Benefits**:
- Single Responsibility Principle
- Easier testing and maintenance
- Clear domain boundaries

### 3. Refactored Storage (UPDATED)
**Location**: `server/storage.ts`

- Now delegates to domain-specific repositories
- Maintains backward compatibility
- Cleaner, more maintainable code

**Before**: 814 lines monolithic class
**After**: 458 lines delegation layer

## 🔄 Next Steps

### Phase 2: Service Layer
Create business logic services:
- `auth.service.ts` - User authentication
- `quote.service.ts` - Quote calculation & approval
- `trade.service.ts` - Trade execution
- `spread.service.ts` - Spread calculation

### Phase 3: Route Splitting
Split `routes.ts` (1,929 lines) into:
- `auth.routes.ts` (~100 lines)
- `quotes.routes.ts` (~400 lines)
- `trades.routes.ts` (~200 lines)
- `marketRates.routes.ts` (~300 lines)
- `swapPoints.routes.ts` (~400 lines)
- `users.routes.ts` (~200 lines)
- `admin.routes.ts` (~329 lines)

### Phase 4: Controller Layer
Extract HTTP handling from routes:
- Request parsing
- Response formatting
- Error handling

## 📊 Impact Analysis

### Before Refactoring
```
routes.ts        1,929 lines ⚠️  Too large
storage.ts         814 lines ⚠️  Monolithic
No middleware       -        ⚠️  Duplicated logic
```

### After Phase 1
```
middleware/         3 files  ✅  Reusable
repositories/       8 files  ✅  Domain-separated
storage.ts        458 lines  ✅  Delegation layer
routes.ts       1,929 lines  ⚠️  Still to split
```

## 🎯 Architecture Principles

1. **Separation of Concerns**
   - Middleware: Request/Response processing
   - Controllers: HTTP handling
   - Services: Business logic
   - Repositories: Data access

2. **Single Responsibility**
   - Each module has one clear purpose
   - Easier to test and maintain

3. **Dependency Injection**
   - Repositories injected into services
   - Services injected into controllers

4. **Type Safety**
   - Zod validation middleware
   - TypeScript interfaces

## 📝 Migration Guide

### Using New Middleware

```typescript
import { isAuthenticated, isAdmin } from './middleware/auth.middleware';
import { validateBody } from './middleware/validation.middleware';

app.post('/api/users',
  isAdmin,
  validateBody(insertUserSchema),
  async (req, res) => {
    // Handler
  }
);
```

### Using Repositories

```typescript
import { userRepository } from './repositories/user.repository';

// Instead of storage.getUser()
const user = await userRepository.getUser(userId);
```

### Backward Compatibility

Existing code using `storage` continues to work:

```typescript
import { storage } from './storage';

// Still works!
const user = await storage.getUser(userId);
```

## 🚀 Future Enhancements

1. Add caching layer (Redis)
2. Implement event sourcing for audit trail
3. Add API versioning
4. Implement rate limiting per user
5. Add GraphQL API alongside REST
