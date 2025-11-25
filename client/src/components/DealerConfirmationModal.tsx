import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { formatCurrencyAmount } from "@/lib/currencyUtils";
import { getTodayLocal, getSpotDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import type { Trade } from "@shared/schema";

interface DealerConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade;
  currencyPairDisplay: string;
  user?: any;
}

export function DealerConfirmationModal({
  isOpen,
  onClose,
  trade,
  currencyPairDisplay,
  user,
}: DealerConfirmationModalProps) {
  if (!trade) return null;

  const formatAmount = (amount: string | number | undefined) => {
    if (!amount) return "-";
    return formatCurrencyAmount(Math.abs(Number(amount)), "KRW");
  };

  const formatRate = (rate: string | number | undefined) => {
    if (!rate) return "-";
    return Number(rate).toFixed(4);
  };

  const tradeDate = format(parseISO(String(trade.createdAt)), "yyyy-MM-dd HH:mm:ss");
  const valueDate = trade.settlementDate ? format(parseISO(String(trade.settlementDate)), "yyyy-MM-dd") : "-";
  const spotDate = getSpotDate(new Date()).toISOString().split("T")[0];

  const getTransactionType = () => {
    if (trade.productType === "Spot") return "현물거래 (Spot FX)";
    if (trade.productType === "Forward") return "선도거래 (Deliverable Forward)";
    if (trade.productType === "Swap") return "스왑거래 (FX Swap)";
    if (trade.productType === "MAR") return "일중단기 (MAR)";
    return trade.productType;
  };

  const getBoughtSoldInfo = () => {
    const [base, quote] = currencyPairDisplay.split("/");
    const baseAmount = formatAmount(trade.amount);
    const quoteAmount = formatAmount(
      Number(trade.amount) * Number(trade.rate || 0)
    );

    if (trade.direction === "BUY") {
      return {
        bought: `${base} ${baseAmount}`,
        sold: `${quote} ${quoteAmount}`,
      };
    } else {
      return {
        bought: `${quote} ${quoteAmount}`,
        sold: `${base} ${baseAmount}`,
      };
    }
  };

  const boughtSoldInfo = getBoughtSoldInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            딜러 확인 (Dealer Confirmation)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 1. 거래 기본 정보 */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                  1
                </span>
                거래 기본 정보
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">거래일 (Trade Date)</p>
                  <p className="font-semibold text-gray-800">{tradeDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">결제일 (Value Date)</p>
                  <p className="font-semibold text-gray-800">{valueDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">스팟결제일 (Spot Date)</p>
                  <p className="font-semibold text-gray-800">{spotDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">거래 유형 (Transaction Type)</p>
                  <p className="font-semibold text-gray-800">{getTransactionType()}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 2. 통화 / 금액 정보 */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                  2
                </span>
                통화 / 금액 정보
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">통화쌍 (Currency Pair)</p>
                  <p className="font-semibold text-lg text-gray-800">{currencyPairDisplay}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">매수 (Bought Amount)</p>
                    <p className="font-bold text-gray-800">{boughtSoldInfo.bought}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">매도 (Sold Amount)</p>
                    <p className="font-bold text-gray-800">{boughtSoldInfo.sold}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">호가 기준 (Quote Basis)</p>
                  <p className="font-semibold text-gray-800">
                    {currencyPairDisplay.split("/")[1]} per 1 {currencyPairDisplay.split("/")[0]}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* 3. Forward Rate & 가격 정보 */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                  3
                </span>
                Forward Rate & 가격 정보
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">선도환율 (Forward Rate)</p>
                  <p className="font-bold text-lg text-purple-600">{formatRate(trade.rate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">기준 스팟환율 (Spot Rate)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">포인트 (Forward Points)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">소수점 규정 (Pricing Convention)</p>
                <p className="font-semibold text-gray-800">
                  {currencyPairDisplay.includes("KRW") ? "소수점 둘째 자리" : "표준"}
                </p>
              </div>
            </div>
          </Card>

          {/* 4. 결제 방식 */}
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-0 shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                  4
                </span>
                결제 방식 (Settlement Method)
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">결제 방식</p>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    실물결제 (Deliverable)
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">고정 일자 (Fixing Date)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">고정 윈도우 (Fixing Window)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">고정 기관 (Determination Agent)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 5. 계약 당사자 정보 */}
          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-0 shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                  5
                </span>
                계약 당사자 정보 (Party Information)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">구매자/판매자</p>
                  <div className="flex gap-2">
                    <Badge
                      className={cn(
                        trade.direction === "BUY"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-blue-100 text-blue-800 border-blue-200"
                      )}
                    >
                      {trade.direction === "BUY" ? "구매자" : "판매자"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">사용자 ID</p>
                  <p className="font-semibold text-gray-800">{trade.userId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">법인명 (Legal Entity Name)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">LEI (Legal Entity Identifier)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 6. 결제 계좌 정보 */}
          <Card className="bg-gradient-to-br from-teal-50 to-green-50 border-0 shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                  6
                </span>
                결제 계좌 정보 (Settlement Account)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">은행명 (Bank Name)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">SWIFT Code</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">계좌번호 (Account Number)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">중개은행 (Correspondent Bank)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 7. 법적 문구 / ISDA 조항 */}
          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-0 shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                  7
                </span>
                법적 문구 / ISDA 조항 (Documentation)
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">ISDA Master Agreement</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">FX Definitions 적용</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">준거법 (Governing Law)</p>
                  <p className="font-semibold text-gray-800">ISDA 기준 (영국/뉴욕)</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">분쟁 해결 절차 (Dispute Resolution)</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 8. Special Conditions */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-0 shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                  8
                </span>
                추가 조건 (Special Conditions)
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">조기 인도 가능 여부</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">분할 결제 가능 여부</p>
                  <p className="font-semibold text-gray-800">-</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">휴장 달력 (Holiday Calendar)</p>
                  <p className="font-semibold text-gray-800">
                    {currencyPairDisplay.includes("KRW") ? "한국 휴장일" : "표준"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">영업일 규정 (Business Day Convention)</p>
                  <p className="font-semibold text-gray-800">Modified Following</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">계산 기관 (Calculation Agent)</p>
                  <p className="font-semibold text-gray-800">딜러</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 고지 및 서명 */}
          <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-0 shadow-sm">
            <div className="p-6">
              <p className="text-xs text-gray-600 mb-3">
                본 거래 확인서는 쌍방의 거래 합의를 나타내며, 모든 관련 조건을 포함합니다.
                이 거래에 대한 이의는 거래일로부터 1영업일 내에 제기되어야 합니다.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">생성 일시</p>
                  <p className="font-semibold text-sm">{tradeDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">거래 ID</p>
                  <p className="font-mono text-sm text-gray-800">{trade.id}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
