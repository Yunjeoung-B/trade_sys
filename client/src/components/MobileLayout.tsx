import { useState } from "react";
import { Menu, X, Home, TrendingUp, Calendar, RotateCcw, BarChart3, Settings, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  const menuItems = [
    { path: "/customer/mar", icon: BarChart3, label: "MAR 거래" },
    { path: "/customer/spot", icon: TrendingUp, label: "현물환 거래" },
    { path: "/customer/forward", icon: Calendar, label: "선물환 거래" },
    { path: "/customer/swap", icon: RotateCcw, label: "스왑 거래" },
    { path: "/trades", icon: BarChart3, label: "거래현황" },
  ];

  if (user?.role === "admin") {
    menuItems.push({ path: "/admin", icon: Settings, label: "관리자" });
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Mobile Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between md:hidden">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-white hover:bg-slate-700"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          <h1 className="text-white font-semibold text-lg">CHOIICE FX</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 bg-slate-800 border-r border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg">메뉴</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white hover:bg-slate-700"
                >
                  <X size={20} />
                </Button>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div
                      className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-teal-600 text-white"
                          : "text-gray-300 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              <div className="pt-4 border-t border-slate-700">
                <a href="/api/logout">
                  <div className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-colors">
                    <Settings size={20} />
                    <span className="font-medium">로그아웃</span>
                  </div>
                </a>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="bg-slate-800 border-t border-slate-700 px-2 py-2 md:hidden">
        <div className="flex items-center justify-around">
          {menuItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                    isActive
                      ? "text-teal-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs mt-1">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}