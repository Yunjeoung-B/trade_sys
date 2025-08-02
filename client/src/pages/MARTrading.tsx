import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import OrderForm from "@/components/OrderForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";

export default function MARTrading() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const isTimeRestricted = currentTime.getHours() >= 9;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">MAR 거래 (Market Average Rate)</h2>
            <p className="text-gray-600">오전 9시 이전에만 주문 가능한 시장평균환율 거래입니다.</p>
            
            <Alert className={`mt-4 ${isTimeRestricted ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
              <AlertTriangle className={`h-4 w-4 ${isTimeRestricted ? 'text-red-500' : 'text-yellow-500'}`} />
              <AlertDescription className={isTimeRestricted ? 'text-red-800' : 'text-yellow-800'}>
                <div className="font-medium">
                  주의사항: MAR 거래는 오전 9:00 이전에만 주문 가능합니다.
                </div>
                <div className="mt-2 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  현재 시각: {currentTime.toLocaleString('ko-KR')}
                </div>
              </AlertDescription>
            </Alert>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrderForm
              productType="MAR"
              title="MAR 주문"
              requiresApproval={false}
              showTimeRestriction={true}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>MAR 거래 안내</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">MAR이란?</h4>
                    <p className="text-sm text-blue-800">
                      오전 9시부터 오후 3시 30분까지의 현물환 거래 가중평균환율로 결정되는 거래입니다.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">주문 마감시간:</span>
                      <span className="font-medium">오전 9:00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">환율 확정시간:</span>
                      <span className="font-medium">오후 3:30</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">정산일:</span>
                      <span className="font-medium">거래일 + 2영업일</span>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">거래 특징</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 오전 9시 이전에만 주문 접수</li>
                      <li>• 시장평균환율로 거래 체결</li>
                      <li>• 환율 변동 위험 제한</li>
                      <li>• 즉시 승인 (별도 승인 불요)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
