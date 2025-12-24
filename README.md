# CHOIICE FX - FX Trading System

## 초기 설정

### 1. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 설정하세요:

```bash
cp .env.example .env
```

필수 환경 변수:
- `DATABASE_URL`: PostgreSQL 데이터베이스 연결 문자열
- `SESSION_SECRET`: 세션 암호화 키

### 2. 초기 관리자 계정

서버가 처음 시작될 때 관리자 계정이 없으면 **자동으로 기본 관리자 계정을 생성**합니다.

**기본 관리자 계정:**
- Username: `admin`
- Password: `admin123`

⚠️ **보안 주의사항:**
1. 첫 로그인 후 **반드시 비밀번호를 변경**하세요
2. 프로덕션 환경에서는 `.env` 파일에서 다른 값으로 설정하세요:
   ```env
   DEFAULT_ADMIN_USERNAME=your-admin-username
   DEFAULT_ADMIN_PASSWORD=your-secure-password
   ```

### 3. 회원가입 시스템

일반 사용자는 **OTP 코드**를 통해 회원가입할 수 있습니다:

1. 관리자가 로그인 후 "OTP 코드 관리" 메뉴에서 코드 생성
2. 생성된 OTP 코드를 사용자에게 전달
3. 사용자가 회원가입 페이지에서 OTP 코드와 함께 가입
4. 모든 신규 가입자는 **client** 역할로 자동 생성됨
5. 관리자는 "사용자 관리"에서 역할을 변경할 수 있음

## 개발

```bash
npm install
npm run dev
```

## 사용자 역할

- **admin**: 모든 기능 접근 가능 (관리자 대시보드, 설정, 사용자 관리 등)
- **client**: 거래 기능만 접근 가능 (현물환, 선물환, 스왑, MAR 거래)
