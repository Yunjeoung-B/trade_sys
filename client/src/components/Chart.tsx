import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChartProps {
  currencyPairId?: string;
  symbol?: string;
}

interface MarketRate {
  id: string;
  currencyPairId: string;
  buyRate: string;
  sellRate: string;
  timestamp: string;
}

export default function Chart({ currencyPairId, symbol }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeframe, setTimeframe] = useState("24");

  const { data: history } = useQuery<MarketRate[]>({
    queryKey: ["/api/market-rates/history", currencyPairId, { hours: timeframe }],
    enabled: !!currencyPairId,
  });

  useEffect(() => {
    if (!history || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (history.length === 0) return;

    // Set up canvas
    const padding = 40;
    const width = canvas.width - 2 * padding;
    const height = canvas.height - 2 * padding;

    // Get data points
    const prices = history.map(h => parseFloat(h.buyRate));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Draw grid lines
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 6; i++) {
      const x = padding + (width / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + height);
      ctx.stroke();
    }

    // Draw price line
    ctx.strokeStyle = "#20B2AA";
    ctx.lineWidth = 2;
    ctx.beginPath();

    history.forEach((point, index) => {
      const x = padding + (width / (history.length - 1)) * index;
      const y = padding + height - ((parseFloat(point.buyRate) - minPrice) / priceRange) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw filled area
    ctx.fillStyle = "rgba(32, 178, 170, 0.1)";
    ctx.beginPath();
    
    history.forEach((point, index) => {
      const x = padding + (width / (history.length - 1)) * index;
      const y = padding + height - ((parseFloat(point.buyRate) - minPrice) / priceRange) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(padding + width, padding + height);
    ctx.lineTo(padding, padding + height);
    ctx.closePath();
    ctx.fill();

    // Draw y-axis labels
    ctx.fillStyle = "#666";
    ctx.font = "12px Inter";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= 5; i++) {
      const value = maxPrice - (priceRange / 5) * i;
      const y = padding + (height / 5) * i;
      ctx.fillText(value.toFixed(2), padding - 10, y);
    }

    // Draw x-axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const labelCount = Math.min(6, history.length);
    for (let i = 0; i < labelCount; i++) {
      const index = Math.floor((history.length - 1) * (i / (labelCount - 1)));
      const point = history[index];
      const x = padding + (width / (history.length - 1)) * index;
      const time = new Date(point.timestamp);
      const label = time.getHours().toString().padStart(2, '0') + ':00';
      ctx.fillText(label, x, padding + height + 10);
    }

  }, [history]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>환율 차트 {symbol && `- ${symbol}`}</CardTitle>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={timeframe === "24" ? "default" : "outline"}
              onClick={() => setTimeframe("24")}
              className={timeframe === "24" ? "bg-teal-100 text-teal-700" : ""}
            >
              1일
            </Button>
            <Button
              size="sm"
              variant={timeframe === "168" ? "default" : "outline"}
              onClick={() => setTimeframe("168")}
              className={timeframe === "168" ? "bg-teal-100 text-teal-700" : ""}
            >
              1주
            </Button>
            <Button
              size="sm"
              variant={timeframe === "720" ? "default" : "outline"}
              onClick={() => setTimeframe("720")}
              className={timeframe === "720" ? "bg-teal-100 text-teal-700" : ""}
            >
              1개월
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <canvas
            ref={canvasRef}
            width={800}
            height={384}
            className="w-full h-full"
            style={{ maxWidth: "100%" }}
          />
        </div>
        {!currencyPairId && (
          <div className="flex items-center justify-center h-96 text-gray-500">
            통화쌍을 선택하여 차트를 확인하세요
          </div>
        )}
      </CardContent>
    </Card>
  );
}
