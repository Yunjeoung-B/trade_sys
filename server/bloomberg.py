import pandas as pd
import blpapi as blp
import json
import sys
from datetime import datetime, timedelta
import mysql.connector
from typing import Dict, List, Optional

class BloombergAPI:
    def __init__(self):
        self.session = None
        self.service = None
        self.subscription_service = None
        self.is_streaming = False
        
    def connect(self) -> bool:
        """Bloomberg API 연결"""
        try:
            # Bloomberg API 세션 시작
            sessionOptions = blp.SessionOptions()
            sessionOptions.setServerHost("localhost")
            sessionOptions.setServerPort(8194)
            
            self.session = blp.Session(sessionOptions)
            
            if not self.session.start():
                return False
                
            if not self.session.openService("//blp/refdata"):
                return False
                
            self.service = self.session.getService("//blp/refdata")
            
            # 실시간 스트리밍을 위한 mktdata 서비스도 열기
            if not self.session.openService("//blp/mktdata"):
                print("Warning: mktdata service not available")
            else:
                self.subscription_service = self.session.getService("//blp/mktdata")
            
            return True
            
        except Exception as e:
            print(f"Bloomberg API 연결 실패: {e}")
            return False
    
    def get_realtime_fx_rates(self, symbols: List[str]) -> List[Dict]:
        """실시간 환율 데이터 조회"""
        if not self.session or not self.service:
            raise Exception("Bloomberg API가 연결되지 않았습니다")
            
        results = []
        
        for symbol in symbols:
            try:
                # Bloomberg 티커 형식으로 변환
                bloomberg_ticker = f'{symbol} Curncy'
                
                # BDP 요청 생성
                request = self.service.createRequest("ReferenceDataRequest")
                request.append("securities", bloomberg_ticker)
                request.append("fields", "BID")
                request.append("fields", "ASK") 
                request.append("fields", "LAST_PRICE")
                request.append("fields", "CHG_NET_1D")
                request.append("fields", "CHG_PCT_1D")
                request.append("fields", "VOLUME")
                
                # 요청 전송
                self.session.sendRequest(request)
                
                # 응답 처리
                while True:
                    event = self.session.nextEvent(500)
                    
                    if event.eventType() == blp.Event.RESPONSE:
                        for msg in event:
                            security_data = msg.getElement("securityData")
                            for i in range(security_data.numValues()):
                                security = security_data.getValue(i)
                                
                                if security.hasElement("securityError"):
                                    continue
                                    
                                field_data = security.getElement("fieldData")
                                
                                # 데이터 추출
                                bid = field_data.getElementAsFloat("BID") if field_data.hasElement("BID") else 0
                                ask = field_data.getElementAsFloat("ASK") if field_data.hasElement("ASK") else 0
                                last_price = field_data.getElementAsFloat("LAST_PRICE") if field_data.hasElement("LAST_PRICE") else 0
                                change = field_data.getElementAsFloat("CHG_NET_1D") if field_data.hasElement("CHG_NET_1D") else 0
                                change_pct = field_data.getElementAsFloat("CHG_PCT_1D") if field_data.hasElement("CHG_PCT_1D") else 0
                                volume = field_data.getElementAsFloat("VOLUME") if field_data.hasElement("VOLUME") else 0
                                
                                results.append({
                                    "symbol": symbol,
                                    "price": last_price or (bid + ask) / 2,
                                    "bid": bid,
                                    "ask": ask,
                                    "change": change,
                                    "changePercent": change_pct,
                                    "volume": int(volume),
                                    "timestamp": datetime.now().isoformat(),
                                    "source": "bloomberg"
                                })
                        break
                        
                    if event.eventType() == blp.Event.TIMEOUT:
                        break
                        
            except Exception as e:
                print(f"심볼 {symbol} 데이터 조회 실패: {e}")
                continue
                
        return results
    
    def get_historical_data(self, symbols: List[str], start_date: str, end_date: str) -> List[Dict]:
        """과거 데이터 조회"""
        if not self.session or not self.service:
            raise Exception("Bloomberg API가 연결되지 않았습니다")
            
        results = []
        
        for symbol in symbols:
            try:
                bloomberg_ticker = f'{symbol} Curncy'
                
                # BDH 요청 생성
                request = self.service.createRequest("HistoricalDataRequest")
                request.append("securities", bloomberg_ticker)
                request.append("fields", "PX_LAST")
                request.append("fields", "PX_HIGH")
                request.append("fields", "PX_LOW")
                request.append("fields", "VOLUME")
                request.set("startDate", start_date.replace("-", ""))
                request.set("endDate", end_date.replace("-", ""))
                request.set("periodicitySelection", "DAILY")
                
                # 요청 전송
                self.session.sendRequest(request)
                
                # 응답 처리
                while True:
                    event = self.session.nextEvent(500)
                    
                    if event.eventType() == blp.Event.RESPONSE:
                        for msg in event:
                            security_data = msg.getElement("securityData")
                            for i in range(security_data.numValues()):
                                security = security_data.getValue(i)
                                
                                if security.hasElement("securityError"):
                                    continue
                                    
                                field_data_array = security.getElement("fieldData")
                                
                                for j in range(field_data_array.numValues()):
                                    field_data = field_data_array.getValue(j)
                                    
                                    date = field_data.getElementAsDatetime("date")
                                    price = field_data.getElementAsFloat("PX_LAST") if field_data.hasElement("PX_LAST") else 0
                                    high = field_data.getElementAsFloat("PX_HIGH") if field_data.hasElement("PX_HIGH") else 0
                                    low = field_data.getElementAsFloat("PX_LOW") if field_data.hasElement("PX_LOW") else 0
                                    volume = field_data.getElementAsFloat("VOLUME") if field_data.hasElement("VOLUME") else 0
                                    
                                    results.append({
                                        "symbol": symbol,
                                        "price": price,
                                        "high": high,
                                        "low": low,
                                        "volume": int(volume),
                                        "timestamp": date.isoformat(),
                                        "source": "bloomberg"
                                    })
                        break
                        
                    if event.eventType() == blp.Event.TIMEOUT:
                        break
                        
            except Exception as e:
                print(f"심볼 {symbol} 과거 데이터 조회 실패: {e}")
                continue
                
        return results
    
    def start_realtime_streaming(self, symbols: List[str], callback_func=None) -> bool:
        """실시간 스트리밍 시작"""
        if not self.session or not self.subscription_service:
            raise Exception("Bloomberg API 또는 스트리밍 서비스가 연결되지 않았습니다")
        
        try:
            # 구독 생성
            subscriptions = blp.SubscriptionList()
            
            for symbol in symbols:
                bloomberg_ticker = f'{symbol} Curncy'
                subscriptions.add(bloomberg_ticker, 
                                "BID,ASK,LAST_PRICE,CHG_NET_1D,CHG_PCT_1D,VOLUME")
            
            # 구독 시작
            self.session.subscribe(subscriptions)
            self.is_streaming = True
            
            # 실시간 이벤트 처리 루프
            while self.is_streaming:
                event = self.session.nextEvent(1000)  # 1초 타임아웃
                
                if event.eventType() == blp.Event.SUBSCRIPTION_DATA:
                    for msg in event:
                        data = self._process_subscription_data(msg)
                        if data and callback_func:
                            callback_func(data)
                        elif data:
                            print(json.dumps(data))
                            
                elif event.eventType() == blp.Event.SUBSCRIPTION_STATUS:
                    # 구독 상태 변경 처리
                    for msg in event:
                        print(f"Subscription status: {msg}")
                        
            return True
            
        except Exception as e:
            print(f"스트리밍 시작 실패: {e}")
            return False
    
    def _process_subscription_data(self, msg) -> Optional[Dict]:
        """구독 데이터 처리"""
        try:
            topic = msg.topicName()
            symbol = topic.split()[0].replace(" Curncy", "")
            
            # 필드 데이터 추출
            bid = msg.getElementAsFloat("BID") if msg.hasElement("BID") else 0
            ask = msg.getElementAsFloat("ASK") if msg.hasElement("ASK") else 0
            last_price = msg.getElementAsFloat("LAST_PRICE") if msg.hasElement("LAST_PRICE") else 0
            change = msg.getElementAsFloat("CHG_NET_1D") if msg.hasElement("CHG_NET_1D") else 0
            change_pct = msg.getElementAsFloat("CHG_PCT_1D") if msg.hasElement("CHG_PCT_1D") else 0
            volume = msg.getElementAsFloat("VOLUME") if msg.hasElement("VOLUME") else 0
            
            return {
                "symbol": symbol,
                "price": last_price or (bid + ask) / 2,
                "bid": bid,
                "ask": ask,
                "change": change,
                "changePercent": change_pct,
                "volume": int(volume),
                "timestamp": datetime.now().isoformat(),
                "source": "bloomberg_streaming"
            }
            
        except Exception as e:
            print(f"구독 데이터 처리 오류: {e}")
            return None
    
    def stop_streaming(self):
        """실시간 스트리밍 중지"""
        self.is_streaming = False
        if self.session:
            self.session.unsubscribeAll()
    
    def disconnect(self):
        """Bloomberg API 연결 해제"""
        self.stop_streaming()
        if self.session:
            self.session.stop()

def main():
    """CLI 인터페이스"""
    if len(sys.argv) < 2:
        print("사용법: python bloomberg.py <command> [args...]")
        print("명령어:")
        print("  test - 연결 테스트")
        print("  realtime <symbols> - 실시간 데이터 조회")
        print("  historical <symbols> <start_date> <end_date> - 과거 데이터 조회")
        return
    
    command = sys.argv[1]
    bloomberg = BloombergAPI()
    
    try:
        if command == "test":
            connected = bloomberg.connect()
            result = {"connected": connected}
            print(json.dumps(result))
            
        elif command == "realtime":
            if len(sys.argv) < 3:
                print(json.dumps({"error": "심볼이 필요합니다"}))
                return
                
            symbols = sys.argv[2].split(",")
            
            if not bloomberg.connect():
                print(json.dumps({"error": "Bloomberg API 연결 실패"}))
                return
                
            data = bloomberg.get_realtime_fx_rates(symbols)
            print(json.dumps(data))
            
        elif command == "historical":
            if len(sys.argv) < 5:
                print(json.dumps({"error": "심볼, 시작일, 종료일이 필요합니다"}))
                return
                
            symbols = sys.argv[2].split(",")
            start_date = sys.argv[3]
            end_date = sys.argv[4]
            
            if not bloomberg.connect():
                print(json.dumps({"error": "Bloomberg API 연결 실패"}))
                return
                
            data = bloomberg.get_historical_data(symbols, start_date, end_date)
            print(json.dumps(data))
            
        elif command == "stream":
            if len(sys.argv) < 3:
                print(json.dumps({"error": "심볼이 필요합니다"}))
                return
                
            symbols = sys.argv[2].split(",")
            
            if not bloomberg.connect():
                print(json.dumps({"error": "Bloomberg API 연결 실패"}))
                return
                
            # 스트리밍 시작 (무한 루프로 실행)
            bloomberg.start_realtime_streaming(symbols)
            
        else:
            print(json.dumps({"error": f"알 수 없는 명령어: {command}"}))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        
    finally:
        bloomberg.disconnect()

if __name__ == "__main__":
    main()