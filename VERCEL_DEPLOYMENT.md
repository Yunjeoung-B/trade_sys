# Vercel 배포 가이드

## 개발 환경 vs 배포 환경 차이점

### 1. **서버 실행 방식**
- **개발**: Express 서버가 계속 실행 (`npm run dev`)
- **배포**: 서버리스 함수로 각 요청마다 실행 (Vercel)

### 2. **프론트엔드 빌드**
- **개발**: Vite가 실시간으로 변환 (HMR)
- **배포**: `vite build`로 빌드된 정적 파일 필요 (`dist/public`)

### 3. **환경 변수**
- **개발**: `.env` 파일에서 자동 로드 (`dotenv/config`)
- **배포**: Vercel 프로젝트 설정에서 환경 변수 설정 필요

### 4. **데이터베이스 연결**
- **개발**: 서버 시작 시 한 번 연결
- **배포**: 서버리스 함수마다 연결 (연결 풀링 사용 권장)

## 필수 설정

### Vercel 환경 변수 설정
1. Vercel 대시보드 > 프로젝트 > Settings > Environment Variables
2. 다음 변수 추가:
   - `DATABASE_URL`: Supabase 연결 문자열
   - `SESSION_SECRET`: 세션 암호화 키
   - `NODE_ENV`: `production`

### 빌드 확인
- `npm run build` 실행 시 `dist/public` 폴더에 파일이 생성되는지 확인
- `dist/public/index.html` 파일이 존재해야 함

## 문제 해결

### 서버리스 함수 크래시
1. Vercel 로그 확인: Functions > Logs
2. 환경 변수 확인
3. 데이터베이스 연결 확인

### 정적 파일이 안 보임
- 빌드 산출물이 `dist/public`에 있는지 확인
- `vercel.json`의 경로 설정 확인

