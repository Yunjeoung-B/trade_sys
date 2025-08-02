import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";

interface MobileTradingCardProps {
  title: string;
  description: string;
  currencyPairs: Array<{ id: string; symbol: string }>;
  selectedPair: string;
  onPairChange: (pair: string) => void;
  direction: "BUY" | "SELL";
  onDirectionChange: (direction: "BUY" | "SELL") => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  buyRate: number;
  sellRate: number;
  onTrade: () => void;
  isLoading: boolean;
  buttonText?: string;
}

export default function MobileTradingCard({
  title,
  description,
  currencyPairs,
  selectedPair,
  onPairChange,
  direction,
  onDirectionChange,
  amount,
  onAmountChange,
  buyRate,
  sellRate,
  onTrade,
  isLoading,
  buttonText = "거래 실행"
}: MobileTradingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Extract base and quote currencies from selected pair
  const [baseCurrency, quoteCurrency] = selectedPair.split('/');

  return (
    <div className="p-4">
      <Card className="bg-white dark:bg-white text-gray-900 border-0 shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500"
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Currency Pair Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">통화쌍</label>
            <Select value={selectedPair} onValueChange={onPairChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyPairs.map((pair) => (
                  <SelectItem key={pair.id} value={pair.symbol}>
                    {pair.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rate Display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">SELL {baseCurrency}</div>
              <div className="text-xl font-bold text-blue-600">
                {sellRate.toFixed(2)}
              </div>
              <Button 
                size="sm" 
                variant="outline"
                className={`mt-2 w-full ${direction === "SELL" ? "border-blue-500 bg-blue-50" : ""}`}
                onClick={() => onDirectionChange("SELL")}
              >
                SELL선택
              </Button>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">BUY {baseCurrency}</div>
              <div className="text-xl font-bold text-red-600">
                {buyRate.toFixed(2)}
              </div>
              <Button 
                size="sm" 
                className="mt-2 w-full text-white"
                style={{ backgroundColor: 'hsl(330, 100%, 71%)' }}
                onClick={() => onDirectionChange("BUY")}
              >
                BUY선택
              </Button>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {/* Direction Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={direction === "SELL" ? "default" : "outline"}
                  onClick={() => onDirectionChange("SELL")}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  시장가
                </Button>
                <Button 
                  variant={direction === "BUY" ? "default" : "outline"}
                  onClick={() => onDirectionChange("BUY")}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  지정가
                </Button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  금액 ({direction === "BUY" ? quoteCurrency : baseCurrency})
                </label>
                <Input
                  type="number"
                  placeholder="거래금액을 입력하세요"
                  value={amount}
                  onChange={(e) => onAmountChange(e.target.value)}
                  className="text-right text-lg"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{direction} {direction === "BUY" ? baseCurrency : quoteCurrency}</span>
                  <span className="font-medium">+{amount || "0"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">환산 금액</span>
                  <span className="font-medium">
                    {amount ? (parseFloat(amount) * (direction === "BUY" ? buyRate : sellRate)).toLocaleString() : "0"} {direction === "BUY" ? quoteCurrency : baseCurrency}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={onTrade}
            disabled={isLoading || !amount}
            className="w-full text-white py-3 text-lg font-semibold"
            style={{ backgroundColor: 'hsl(330, 100%, 71%)' }}
          >
            {isLoading ? "처리중..." : buttonText}
          </Button>
        </div>
      </Card>
    </div>
  );
}