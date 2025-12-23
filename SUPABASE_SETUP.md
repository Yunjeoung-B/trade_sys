# Supabase + Vercel 연결 가이드

## 📋 개요

현재 프로젝트는 PostgreSQL + Drizzle ORM을 사용하므로 Supabase로 쉽게 전환 가능합니다.

## 🎯 Step 1: Supabase 프로젝트 생성

### 1.1 Supabase 회원가입 및 프로젝트 생성
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub/Google 계정으로 로그인
4. "New Project" 클릭
5. 프로젝트 정보 입력:
   - **Name**: `trade-sys` (원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` 추천
   - **Pricing Plan**: Free tier 선택

### 1.2 연결 정보 확인
프로젝트 생성 후:
1. 왼쪽 메뉴에서 **Settings** → **Database** 클릭
2. **Connection string** 섹션에서 **URI** 탭 선택
3. Connection string 복사 (형식: `postgresql://postgres:[YOUR-PASSWORD]@...`)

예시:
```
postgresql://postgres.xxxxxxxxxxxxx:your-password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

> ⚠️ **중요**: `[YOUR-PASSWORD]`를 실제 비밀번호로 교체하세요!

## 🎯 Step 2: 로컬 환경 설정

### 2.1 .env 파일 업데이트

프로젝트 루트에 `.env` 파일 생성/수정:

```bash
# Supabase Database Connection
DATABASE_URL="postgresql://postgres.xxxxx:your-password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

# Session Secret
SESSION_SECRET="your-session-secret-key-here"

# Other settings (optional)
NODE_ENV="development"
PORT="5000"
```

### 2.2 환경변수 확인

```bash
# .env 파일이 제대로 로드되는지 확인
npm run dev
```

## 🎯 Step 3: 데이터베이스 스키마 마이그레이션

### 3.1 Drizzle Push (간단한 방법)

```bash
# 현재 스키마를 Supabase에 푸시
npm run db:push
```

이 명령어는 `shared/schema.ts`에 정의된 모든 테이블을 자동으로 생성합니다.

### 3.2 마이그레이션 생성 및 적용 (선택사항)

더 체계적인 관리를 원하면:

```bash
# 1. 마이그레이션 파일 생성
npx drizzle-kit generate

# 2. 마이그레이션 적용
npx drizzle-kit migrate
```

## 🎯 Step 4: Vercel 배포 설정

### 4.1 Vercel 프로젝트 연결

1. https://vercel.com 접속
2. GitHub 레포지토리 import
3. 프로젝트 설정:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: (비워둠)

### 4.2 환경변수 설정

Vercel Dashboard에서:

1. **Settings** → **Environment Variables** 이동
2. 다음 변수들 추가:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | Supabase 연결 문자열 | Production, Preview, Development |
| `SESSION_SECRET` | 랜덤 문자열 (32자 이상) | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

**DATABASE_URL 예시**:
```
postgresql://postgres.xxxxx:your-password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**SESSION_SECRET 생성**:
```bash
# 랜덤 시크릿 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4.3 Supabase + Vercel 공식 통합 (선택사항)

더 쉬운 방법:

1. Vercel Dashboard → **Integrations** 탭
2. "Supabase" 검색 후 설치
3. Supabase 프로젝트 선택
4. 환경변수 자동 설정됨

## 🎯 Step 5: 배포 및 테스트

### 5.1 Vercel 배포

```bash
# Vercel CLI 설치 (없으면)
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

또는 GitHub에 푸시하면 자동 배포됩니다.

### 5.2 배포 확인

1. Vercel에서 배포 완료 대기
2. 제공된 URL 접속
3. `/api/auth/login` 등 API 엔드포인트 테스트

## 🔧 추가 설정

### Supabase Connection Pooling

고성능이 필요하면 Connection Pooling 사용:

1. Supabase Dashboard → **Settings** → **Database**
2. **Connection Pooling** 섹션에서 **Transaction** 모드 사용
3. Pooler connection string 복사 (포트: `6543`)

```
postgresql://postgres.xxxxx:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

### Supabase Row Level Security (RLS)

보안 강화를 위해:

1. Supabase Dashboard → **Authentication** → **Policies**
2. 각 테이블에 RLS 정책 설정 (선택사항)

> 현재는 Express 세션으로 인증을 처리하므로 RLS는 선택사항입니다.

## 📊 현재 프로젝트 호환성

✅ **이미 호환됨**:
- PostgreSQL 사용 (`postgres` 라이브러리)
- Drizzle ORM 사용
- 환경변수 기반 설정 (`DATABASE_URL`)
- Vercel serverless 지원 (`api/index.ts`)

✅ **변경 불필요**:
- `server/db.ts` - 그대로 사용
- `drizzle.config.ts` - 그대로 사용
- `server/repositories/` - 그대로 사용
- `shared/schema.ts` - 그대로 사용

## 🐛 트러블슈팅

### 연결 에러

```
Error: connect ECONNREFUSED
```

**해결**:
- DATABASE_URL이 올바른지 확인
- 비밀번호에 특수문자가 있으면 URL 인코딩 필요
  ```bash
  # 예: password with @ → password%40
  ```

### Vercel 타임아웃

```
Error: Function execution timed out
```

**해결**:
- Supabase Connection Pooling 사용 (포트 6543)
- 쿼리 최적화
- 인덱스 추가

### 세션 에러

```
Error: Failed to create session
```

**해결**:
- `SESSION_SECRET` 환경변수 확인
- Supabase에 `sessions` 테이블이 생성되었는지 확인

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Vercel + Supabase 통합](https://vercel.com/integrations/supabase)
- [Drizzle ORM 문서](https://orm.drizzle.team/)

## ✅ 체크리스트

- [ ] Supabase 프로젝트 생성
- [ ] DATABASE_URL 복사
- [ ] 로컬 .env 파일 업데이트
- [ ] `npm run db:push` 실행
- [ ] 로컬에서 테스트 (`npm run dev`)
- [ ] Vercel 프로젝트 생성/연결
- [ ] Vercel 환경변수 설정
- [ ] Vercel 배포
- [ ] 프로덕션 환경 테스트

---

**완료 후**: 로컬 개발과 프로덕션 배포 모두 Supabase를 사용하게 됩니다!
