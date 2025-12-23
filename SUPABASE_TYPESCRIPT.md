# Supabase + TypeScript 완벽 가이드

## 🎯 현재 프로젝트 TypeScript 구조

현재 프로젝트는 **100% TypeScript**로 작성되어 있습니다:

```typescript
✅ server/db.ts                    - TypeScript DB 연결
✅ server/repositories/*.ts        - 타입 안전 Repository
✅ server/middleware/*.ts          - 타입 안전 Middleware
✅ shared/schema.ts                - Drizzle 스키마 (타입 자동 생성)
✅ api/index.ts                    - Vercel TypeScript handler
```

## 🔥 방법 1: 현재 방식 유지 (추천)

**현재 구조를 그대로 유지하면서 Supabase만 연결**

### 장점
- ✅ **완벽한 타입 안정성** (Drizzle ORM)
- ✅ **기존 코드 변경 없음**
- ✅ **타입 추론 자동**
- ✅ **Repository 패턴 유지**

### 설정 방법

**1단계**: .env 파일만 업데이트

```bash
# .env
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
```

**2단계**: 스키마 푸시

```bash
npm run db:push
```

**끝!** 모든 TypeScript 타입이 자동으로 작동합니다.

### TypeScript 타입 예시

```typescript
// ✅ 완전한 타입 안정성
import { userRepository } from './repositories/user.repository';

// 타입 자동 추론
const user = await userRepository.getUser(userId);
//    ^? User | undefined

// 타입 안전한 생성
const newUser = await userRepository.createUser({
  username: "test",
  password: "pass",
  role: "client",  // ✅ "client" | "admin" 만 허용
  email: "test@test.com"
});
//    ^? User

// 컴파일 에러 예시
await userRepository.createUser({
  username: "test",
  password: "pass",
  role: "invalid"  // ❌ TypeScript Error!
});
```

## 🚀 방법 2: Supabase Client SDK 추가 (선택사항)

**Supabase의 Auth, Storage, Realtime 기능도 사용하려면**

### 설치

```bash
npm install @supabase/supabase-js
```

### 타입 생성

Supabase에서 TypeScript 타입 자동 생성:

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# TypeScript 타입 생성
supabase gen types typescript --project-id your-project-id > shared/supabase-types.ts
```

### Client 설정

```typescript
// server/supabase.ts (새 파일)
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/supabase-types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
```

### TypeScript 타입 안전 사용

```typescript
// ✅ 완전한 타입 안전성
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('username', 'test');

// data의 타입이 자동으로 User[]로 추론됨
if (data) {
  data[0].username; // ✅ 타입 안전
  data[0].invalid;  // ❌ TypeScript Error!
}
```

## 📊 두 방식 비교

| 기능 | 방법 1: Drizzle ORM | 방법 2: Supabase SDK |
|------|-------------------|-------------------|
| **타입 안정성** | ✅ 완벽 | ✅ 완벽 |
| **PostgreSQL 쿼리** | ✅ 지원 | ✅ 지원 |
| **Repository 패턴** | ✅ 유지 | ⚠️ 별도 구현 필요 |
| **Auth (인증)** | ❌ 직접 구현 | ✅ 내장 |
| **Storage (파일)** | ❌ 별도 서비스 | ✅ 내장 |
| **Realtime** | ❌ 별도 구현 | ✅ 내장 |
| **코드 변경** | ✅ 불필요 | ⚠️ 필요 |

## 💡 추천 방식

### 현재 프로젝트에 최적: **방법 1 (Drizzle ORM 유지)**

이유:
1. **코드 변경 없음** - DATABASE_URL만 바꾸면 끝
2. **Repository 패턴 유지** - 이미 리팩토링 완료
3. **타입 안정성** - Drizzle이 자동으로 타입 생성
4. **성능** - 직접 PostgreSQL 연결이 더 빠름

### Supabase Auth/Storage 필요 시: **방법 1 + 2 혼합**

```typescript
// DB 쿼리는 Drizzle 사용 (기존 방식)
const user = await userRepository.getUser(userId);

// Auth는 Supabase SDK 사용 (새로 추가)
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Storage는 Supabase SDK 사용 (새로 추가)
const { data: file } = await supabase.storage
  .from('avatars')
  .upload('public/avatar.png', avatarFile);
```

## 🔧 현재 타입 시스템 확인

### 1. Drizzle 스키마로 타입 자동 생성

```typescript
// shared/schema.ts
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(),
  role: varchar("role").notNull().default("client"), // "admin" | "client"
  // ...
});

// ✅ 타입 자동 추론
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
```

### 2. Repository에서 타입 사용

```typescript
// server/repositories/user.repository.ts
import { type User, type InsertUser } from "@shared/schema";

export class UserRepository {
  async getUser(id: string): Promise<User | undefined> {
    // ✅ 반환 타입이 User로 보장됨
  }

  async createUser(userData: InsertUser): Promise<User> {
    // ✅ userData의 타입이 InsertUser로 보장됨
  }
}
```

### 3. Storage에서 타입 사용

```typescript
// server/storage.ts
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  //                           ^? User 타입
  createUser(user: InsertUser): Promise<User>;
  //              ^? InsertUser 타입
}
```

## ✅ TypeScript 설정 확인

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,              // ✅ 엄격한 타입 체크
    "noImplicitAny": true,       // ✅ any 타입 금지
    "strictNullChecks": true,    // ✅ null 안정성
    "esModuleInterop": true,     // ✅ ES 모듈 호환
    "moduleResolution": "node"   // ✅ Node 모듈 해상도
  }
}
```

## 🎯 빠른 시작 (TypeScript 유지하면서 Supabase 연결)

### 1. Supabase 프로젝트 생성
https://supabase.com에서 프로젝트 생성

### 2. DATABASE_URL 업데이트
```bash
# .env
DATABASE_URL="postgresql://postgres.xxxxx:password@...supabase.com:6543/postgres"
```

### 3. 스키마 푸시
```bash
npm run db:push
```

### 4. 타입 체크
```bash
npm run check
```

### 5. 개발 서버 실행
```bash
npm run dev
```

**끝!** 모든 TypeScript 타입이 자동으로 작동합니다.

## 📚 참고 자료

- [Drizzle TypeScript 가이드](https://orm.drizzle.team/docs/typescript)
- [Supabase TypeScript 가이드](https://supabase.com/docs/guides/api/typescript-support)

---

**현재 프로젝트는 이미 완벽한 TypeScript 환경입니다!** 🎉

DATABASE_URL만 Supabase로 바꾸면 타입 안정성이 그대로 유지됩니다.
