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
} from "lucide-react";

const clientMenuItems = [
  { path: "/spot", label: "현물환 거래 (Spot)", icon: ArrowLeftRight },
  { path: "/forward", label: "선물환 거래 (Forward)", icon: Calendar },
  { path: "/swap", label: "스왑 거래 (Swap)", icon: RefreshCw },
  { path: "/mar", label: "MAR 거래", icon: TrendingUp },
  { path: "/rates", label: "환율조회", icon: BarChart3 },
  { path: "/trades", label: "거래현황", icon: History },
];

const adminMenuItems = [
  { path: "/admin", label: "관리자 대시보드", icon: Gauge },
  { path: "/admin/spreads", label: "스프레드 설정", icon: Settings },
  { path: "/admin/approvals", label: "호가 승인 관리", icon: CheckCircle },
  { path: "/admin/users", label: "사용자 관리", icon: Users },
  { path: "/admin/trades", label: "거래 관리", icon: History },
  { path: "/admin/bloomberg", label: "Bloomberg API", icon: Database },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) return null;

  const menuItems = user.role === "admin" ? adminMenuItems : clientMenuItems;

  return (
    <div className="w-64 bg-slate-800/50 backdrop-blur-sm h-screen overflow-y-auto border-r border-slate-700/50">
      <div className="p-4">
        <div className="space-y-2">
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
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-400/30 shadow-lg"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                )}
                onClick={() => setLocation(item.path)}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
