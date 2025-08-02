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
];

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) return null;

  const menuItems = user.role === "admin" ? adminMenuItems : clientMenuItems;

  return (
    <div className="w-64 bg-white shadow-sm h-screen overflow-y-auto">
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
                  "w-full justify-start text-left px-4 py-3 rounded-lg transition-colors",
                  "hover:bg-teal-50 hover:text-teal-600",
                  isActive && "bg-teal-50 text-teal-600 nav-item-active"
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
