import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MarketWatch from "@/components/MarketWatch";
import OrderForm from "@/components/OrderForm";

export default function SpotTrading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">현물환 거래 (FX Spot)</h2>
            <p className="text-gray-600">실시간 환율로 즉시 거래가 가능합니다.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MarketWatch />
            </div>
            <div>
              <OrderForm
                productType="Spot"
                title="주문 입력"
                requiresApproval={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
