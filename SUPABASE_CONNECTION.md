# Supabase 연결 완료 가이드

## ✅ 완료된 작업

1. **환경 변수 파일 생성**: `.env` 파일이 생성되었고 비밀번호가 설정되었습니다
2. **예제 파일**: `.env.example` 파일이 생성되어 팀원과 공유할 수 있습니다
3. **Gitignore**: `.env` 파일은 git에 추적되지 않도록 설정되었습니다

## 🔧 로컬에서 실행해야 할 단계

### 1. 데이터베이스 스키마 푸시

현재 환경에서는 외부 네트워크 접근이 제한되어 있어, 로컬에서 실행해야 합니다:

```bash
# 스키마를 Supabase에 푸시
npm run db:push
```

예상 출력:
```
✓ Pulling schema from database...
✓ Pushing schema to database...
✓ Done!
```

### 2. 로컬 개발 서버 테스트

```bash
# 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:5000` 접속 후 로그인 테스트

### 3. Vercel 환경 변수 설정

Vercel 대시보드에서 환경 변수를 추가해야 합니다:

#### Option A: Vercel CLI 사용

```bash
# Vercel CLI로 환경 변수 추가
vercel env add DATABASE_URL production
# 값 입력: postgresql://postgres:Gksghkxnwk1@db.bkvfveowocqhgcuxpizr.supabase.co:5432/postgres

vercel env add SESSION_SECRET production
# 값 입력: trade-sys-session-secret-2025-prod-key

vercel env add NODE_ENV production
# 값 입력: production

vercel env add VERCEL production
# 값 입력: 1
```

#### Option B: Vercel 대시보드 사용

1. https://vercel.com/dashboard 접속
2. 프로젝트 선택
3. **Settings** → **Environment Variables** 메뉴
4. 다음 변수들을 추가:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres:Gksghkxnwk1@db.bkvfveowocqhgcuxpizr.supabase.co:5432/postgres` | Production, Preview, Development |
| `SESSION_SECRET` | `trade-sys-session-secret-2025-prod-key` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |
| `VERCEL` | `1` | Production, Preview, Development |

### 4. Vercel 배포

```bash
# Vercel에 배포
vercel --prod
```

또는 GitHub에 push하면 자동 배포됩니다:

```bash
git add .
git commit -m "Setup Supabase connection"
git push origin claude/refactor-architecture-dmJ5f
```

## 🔍 연결 확인 방법

### 로컬에서 확인

```bash
# PostgreSQL 연결 테스트
node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT NOW()').then(r => console.log('✓ Connected:', r.rows[0]))"
```

### Supabase 대시보드에서 확인

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. **Table Editor** 메뉴에서 테이블 확인:
   - `users`
   - `currency_pairs`
   - `market_rates`
   - `quotes`
   - `trades`
   - 기타 테이블들...

## ⚠️ 보안 주의사항

1. **절대 커밋하지 말 것**:
   - `.env` 파일은 이미 `.gitignore`에 추가되어 있습니다
   - 비밀번호가 포함된 파일은 절대 GitHub에 push하지 마세요

2. **Production 환경**:
   - SESSION_SECRET은 더 강력한 랜덤 문자열로 변경하세요
   - 데이터베이스 비밀번호를 주기적으로 변경하세요

3. **팀원과 공유**:
   - `.env.example` 파일만 공유하세요
   - 실제 비밀번호는 안전한 방법으로 전달하세요 (예: 1Password, LastPass)

## 🚀 Connection Pooling (선택사항)

Vercel 같은 서버리스 환경에서는 Connection Pooling을 사용하는 것이 좋습니다:

### Pooling 모드로 전환

`.env` 파일에서 포트를 6543으로 변경:

```bash
# Before (Direct Connection)
DATABASE_URL="postgresql://postgres:Gksghkxnwk1@db.bkvfveowocqhgcuxpizr.supabase.co:5432/postgres"

# After (Connection Pooling)
DATABASE_URL="postgresql://postgres:Gksghkxnwk1@db.bkvfveowocqhgcuxpizr.supabase.co:6543/postgres?pgbouncer=true"
```

**장점**:
- 더 많은 동시 연결 처리 가능
- 서버리스 환경에서 더 나은 성능
- 연결 재사용으로 리소스 절약

**단점**:
- `db:push` 같은 마이그레이션 작업은 Direct Connection(5432)으로 해야 함
- 트랜잭션 모드가 제한됨

### 두 가지 연결을 모두 사용하는 방법

`.env` 파일:
```bash
# Direct Connection (for migrations)
DATABASE_URL="postgresql://postgres:Gksghkxnwk1@db.bkvfveowocqhgcuxpizr.supabase.co:5432/postgres"

# Pooling (for runtime)
DATABASE_URL_POOLING="postgresql://postgres:Gksghkxnwk1@db.bkvfveowocqhgcuxpizr.supabase.co:6543/postgres?pgbouncer=true"
```

`server/db.ts` 수정:
```typescript
const connectionString = process.env.VERCEL === "1"
  ? process.env.DATABASE_URL_POOLING  // Vercel에서는 Pooling 사용
  : process.env.DATABASE_URL;          // 로컬에서는 Direct 사용

export const db = drizzle(new Pool({ connectionString }));
```

## 📝 다음 단계 체크리스트

- [ ] `npm run db:push` 실행 (로컬)
- [ ] `npm run dev` 실행 후 로그인 테스트
- [ ] Vercel 환경 변수 설정
- [ ] Vercel에 배포
- [ ] 배포된 사이트에서 로그인 테스트
- [ ] (선택) Connection Pooling으로 전환

## 🆘 문제 해결

### 연결 오류가 발생하면

1. **비밀번호 확인**: Supabase 대시보드에서 비밀번호가 맞는지 확인
2. **방화벽**: Supabase 프로젝트 설정에서 IP 화이트리스트 확인
3. **테이블 확인**: `npm run db:push` 실행 여부 확인

### Vercel 배포 오류

1. **환경 변수**: 모든 환경 변수가 설정되었는지 확인
2. **빌드 로그**: Vercel 대시보드에서 빌드 로그 확인
3. **런타임 로그**: Functions 탭에서 실시간 로그 확인

## 📚 관련 문서

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - 전체 Supabase 설정 가이드
- [SUPABASE_TYPESCRIPT.md](./SUPABASE_TYPESCRIPT.md) - TypeScript 통합 가이드
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 프로젝트 아키텍처 문서
