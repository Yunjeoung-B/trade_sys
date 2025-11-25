import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  Calendar,
  RefreshCw,
  TrendingUp,
  BarChart3,
  History,
  Gauge,
  Settings,
  CheckCircle,
  Users,
  Database,
  FileSpreadsheet,
  LineChart,
  Smartphone,
  Calculator,
} from "lucide-react";

const customerMenuItems = [
  { path: "/customer/mar", label: "MAR 거래", icon: TrendingUp },
  { path: "/customer/spot", label: "현물환 거래", icon: ArrowLeftRight },
  { path: "/customer/forward", label: "선물환 거래", icon: Calendar },
  { path: "/customer/swap", label: "스왑 거래", icon: RefreshCw },
  { path: "/trades", label: "거래현황", icon: History },
];

const clientMenuItems: typeof customerMenuItems = [];

const adminMenuItems = [
  { path: "/admin", label: "관리자 대시보드", icon: Gauge },
  { path: "/admin/forward-calculator", label: "선도환율 계산기", icon: Calculator },
  { path: "/admin/fx-spot", label: "가격모니터링 (FX SPOT)", icon: LineChart },
  { path: "/admin/fx-swap", label: "가격모니터링 (FX SWAP)", icon: RefreshCw },
  { path: "/admin/swap-points-history", label: "SWAP 가격변동내역", icon: TrendingUp },
  { path: "/admin/spreads", label: "스프레드 설정", icon: Settings },
  { path: "/admin/approvals", label: "호가 승인 관리", icon: CheckCircle },
  { path: "/admin/users", label: "사용자 관리", icon: Users },
  { path: "/admin/trades", label: "거래 관리", icon: History },
  { path: "/admin/infomax", label: "Infomax API", icon: Database },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) return null;

  const menuItems = user.role === "admin" ? adminMenuItems : clientMenuItems;

  return (
    <div className="w-64 bg-slate-800/50 backdrop-blur-sm h-screen overflow-y-auto border-r border-slate-700/50">
      <div className="p-4">
        {/* 고객 거래 섹션 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 px-4 py-2 mb-2">
            <Smartphone className="h-4 w-4 text-teal-400" />
            <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider">고객 거래</h3>
          </div>
          <div className="space-y-2">
            {customerMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-teal-500/20 to-blue-500/20 text-white font-semibold border border-teal-400/30 shadow-lg"
                      : "text-slate-100 font-medium hover:text-white hover:bg-white/10"
                  )}
                  onClick={() => setLocation(item.path)}
                  data-testid={`nav-${item.path}`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* 관리자 메뉴 */}
        {menuItems.length > 0 && (
          <div className="space-y-2">
            <div className="px-4 py-2 mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {user.role === "admin" ? "관리자 메뉴" : "트레이더 메뉴"}
              </h3>
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white font-semibold border border-blue-400/30 shadow-lg"
                      : "text-slate-100 font-medium hover:text-white hover:bg-white/10"
                  )}
                  onClick={() => setLocation(item.path)}
                  data-testid={`nav-${item.path}`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
