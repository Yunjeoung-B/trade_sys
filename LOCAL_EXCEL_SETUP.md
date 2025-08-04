# 로컬 Excel 파일 실시간 모니터링 설정 가이드

## 문제 상황
- Bloomberg API가 연결된 Excel 파일: `E:\Quit_someday\FX\FX_TOT_BLGVER_V2(신한리츠반영)(자동 복구됨).xlsx`
- 모니터링할 셀: `KRW FXcurve_Realtime` 시트의 `I5` 셀 (USD/KRW 환율)
- 현재 Replit 클라우드 환경에서는 로컬 파일에 직접 접근 불가

## 해결 방안

### 방법 1: 로컬 서버 설정 (권장)
1. **Node.js 로컬 설치**
   ```bash
   # 로컬 컴퓨터에 Node.js 설치
   # 프로젝트 코드를 로컬로 다운로드
   git clone [replit-project-url]
   cd [project-folder]
   npm install
   ```

2. **환경 변수 설정**
   ```env
   DATABASE_URL=your_local_database_url
   EXCEL_FILE_PATH=E:\Quit_someday\FX\FX_TOT_BLGVER_V2(신한리츠반영)(자동 복구됨).xlsx
   ```

3. **로컬 서버 실행**
   ```bash
   npm run dev
   ```

### 방법 2: 파일 동기화
1. **클라우드 드라이브 동기화**
   - Excel 파일을 Google Drive, OneDrive 등에 동기화
   - Replit에서 API를 통해 접근

2. **네트워크 드라이브 매핑**
   - 로컬 네트워크 공유 폴더 설정
   - 클라우드 환경에서 네트워크 경로로 접근

### 방법 3: 파일 업로드 시스템
1. **파일 업로드 기능 추가**
   - Excel 파일을 Replit 프로젝트에 업로드
   - 업로드된 파일을 실시간 모니터링

2. **자동 동기화 스크립트**
   - 로컬에서 파일 변경 감지
   - 자동으로 클라우드에 업데이트

## 현재 구현된 기능
- ✅ Excel 파일 읽기 및 셀 값 추출
- ✅ 실시간 파일 변경 감지
- ✅ WebSocket 기반 실시간 데이터 스트리밍
- ✅ KRW FXcurve_Realtime 시트 I5 셀 모니터링

## 테스트 완료 사항
- 샘플 파일에서 I5 셀 값 1308.95 정상 읽기
- 실시간 모니터링 시작/중지 기능
- WebSocket 연결 및 데이터 브로드캐스트

## 권장 사항
로컬 개발 환경 구축이 가장 효과적입니다. Bloomberg API와 Excel 파일이 모두 로컬에 있으므로, 로컬에서 이 시스템을 실행하는 것이 최적의 해결책입니다.