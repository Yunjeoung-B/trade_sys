# Bloomberg API 연동 설정 가이드

## 1. Bloomberg Terminal 설정

### 필수 조건
- Bloomberg Terminal이 설치되어 있어야 함
- Bloomberg 계정으로 로그인되어 있어야 함
- Bloomberg API 서비스가 활성화되어 있어야 함

### Terminal에서 API 활성화
1. Bloomberg Terminal에서 `API <GO>` 입력
2. API Settings에서 Local API 활성화
3. Port 8194가 열려있는지 확인

## 2. Python 환경 설정

### blpapi 라이브러리 설치
```bash
# Windows
pip install blpapi

# macOS/Linux
pip install blpapi
```

### 기타 필요 라이브러리
```bash
pip install pandas sqlalchemy mysql-connector-python
```

## 3. 시스템 연동 테스트

### Node.js 서버에서 Bloomberg API 테스트
```bash
# Bloomberg API 연결 테스트
python3 server/bloomberg.py test

# 실시간 데이터 조회 테스트
python3 server/bloomberg.py realtime USDKRW,EURKRW

# 과거 데이터 조회 테스트  
python3 server/bloomberg.py historical USDKRW 2024-01-01 2024-01-31
```

## 4. 사용 가능한 통화쌍

### 주요 환율
- USDKRW Curncy (달러/원)
- EURKRW Curncy (유로/원)
- JPYKRW Curncy (엔/원)
- GBPKRW Curncy (파운드/원)
- AUDKRW Curncy (호주달러/원)
- CNYUSD Curncy (위안/달러)
- EURUSD Curncy (유로/달러)
- GBPUSD Curncy (파운드/달러)
- USDJPY Curncy (달러/엔)
- AUDUSD Curncy (호주달러/달러)

## 5. 트러블슈팅

### 연결 실패 시
1. Bloomberg Terminal이 실행되고 있는지 확인
2. API 서비스가 Port 8194에서 실행되고 있는지 확인
3. 방화벽 설정에서 8194 포트가 허용되어 있는지 확인

### 데이터 조회 실패 시  
1. 통화쌍 심볼이 올바른지 확인 (예: USDKRW)
2. Bloomberg 구독 권한이 있는지 확인
3. 장 시간 중인지 확인 (주말/공휴일에는 데이터가 업데이트되지 않음)

## 6. 현재 구현 상태

✅ **구현 완료**
- Bloomberg API 연결 테스트
- 실시간 FX 데이터 조회 (BDP)
- 과거 데이터 조회 (BDH)  
- 데이터베이스 저장
- 시뮬레이션 모드 fallback

⏳ **추가 개발 가능**
- 실시간 구독 (실시간 스트리밍)
- 더 많은 필드 조회 (볼륨, 스프레드 등)
- 에러 처리 및 재시도 로직 강화
- 데이터 검증 및 정제

## 7. API 제한사항

- Bloomberg API는 Bloomberg Terminal 라이센스가 필요
- 일부 데이터는 추가 구독이 필요할 수 있음
- 실시간 데이터는 15-20분 지연될 수 있음 (구독에 따라 다름)
- API 호출 제한이 있을 수 있음