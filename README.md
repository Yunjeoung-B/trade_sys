# Choice FX Trading Platform

> The Smartest Choice in FX

FX 거래 플랫폼 - 외환 거래 운영을 위한 풀스택 웹 애플리케이션

## 기술 스택

| 기술 | 역할 |
|------|------|
| React 18.3.1 | UI 컴포넌트 라이브러리 |
| Next.js 16.1.1 | React 기반 풀스택 프레임워크 (라우팅, SSR 등) |
| Supabase | 백엔드 (DB, Auth) |
| Tailwind CSS | 스타일링 |

## 주요 기능

- **실시간 환율 모니터링**: Infomax API를 통한 실시간 USD/KRW 시세
- **다양한 거래 상품**: FX SPOT, FX FORWARD, FX SWAP, MAR 거래 지원
- **관리자 대시보드**: 스프레드 설정, 사용자 관리, 거래 승인 등
- **Supabase 인증**: 안전한 사용자 인증 및 세션 관리
- **PostgreSQL 데이터베이스**: Drizzle ORM을 통한 타입 안전 데이터베이스 작업

## 시작하기

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_connection_string
\`\`\`

### 설치 및 실행

\`\`\`bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start
\`\`\`

## 데모 계정

- **관리자**: admin / password
- **고객**: client / password

## 프로젝트 구조

\`\`\`
trade_sys/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 페이지 (로그인 등)
│   ├── (dashboard)/       # 대시보드 페이지
│   ├── (trading)/         # 거래 페이지
│   ├── (admin)/           # 관리자 페이지
│   ├── api/               # Next.js API Routes
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 홈 페이지
├── lib/                   # 유틸리티 라이브러리
│   └── supabase/          # Supabase 클라이언트 설정
├── client/src/            # 레거시 React 컴포넌트 (마이그레이션 중)
├── server/                # 레거시 Express 서버 (마이그레이션 중)
├── shared/                # 공유 타입 및 스키마
└── components/            # 재사용 가능한 UI 컴포넌트
\`\`\`

## 라이선스

MIT
