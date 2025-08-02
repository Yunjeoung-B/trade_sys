import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import OrderForm from "@/components/OrderForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuoteRequest {
  id: string;
  productType: string;
  currencyPairId: string;
  direction: string;
  amount: string;
  tenor: string;
  status: string;
  createdAt: string;
  quotedRate?: string;
  expiresAt?: string;
}

export default function ForwardTrading() {
  const { data: quoteRequests } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
  });

  const pendingRequests = quoteRequests?.filter(req => 
    req.productType === "Forward" && req.status === "pending"
  ) || [];

  const approvedRequests = quoteRequests?.filter(req => 
    req.productType === "Forward" && req.status === "approved"
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">선물환 거래 (FX Forward)</h2>
            <p className="text-gray-600">미래 날짜의 환율을 미리 확정하는 거래입니다. 승인 후 호가가 표시됩니다.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrderForm
              productType="Forward"
              title="선물환 주문"
              requiresApproval={true}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>호가 현황</CardTitle>
              </CardHeader>
              <CardContent>
                {approvedRequests.length > 0 ? (
                  <div className="space-y-4">
                    {approvedRequests.map((request) => (
                      <div key={request.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            승인됨
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(request.createdAt).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>방향:</span>
                            <span className="font-medium">{request.direction}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>금액:</span>
                            <span className="font-medium">{Number(request.amount).toLocaleString()} USD</span>
                          </div>
                          <div className="flex justify-between">
                            <span>만기:</span>
                            <span className="font-medium">{request.tenor}</span>
                          </div>
                          {request.quotedRate && (
                            <div className="flex justify-between">
                              <span>호가:</span>
                              <span className="font-medium text-teal-600">{request.quotedRate}</span>
                            </div>
                          )}
                          {request.expiresAt && (
                            <div className="flex justify-between">
                              <span>만료:</span>
                              <span className="text-red-600">{new Date(request.expiresAt).toLocaleString('ko-KR')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pendingRequests.length > 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-clock text-4xl mb-4 block"></i>
                    <p>승인 대기 중인 호가 요청이 {pendingRequests.length}건 있습니다.</p>
                    <p className="text-sm mt-2">승인을 기다려주세요.</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-clock text-4xl mb-4 block"></i>
                    <p>승인 대기 중인 호가가 없습니다.</p>
                    <p className="text-sm mt-2">호가 요청 후 승인을 기다려주세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
