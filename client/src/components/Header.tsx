import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Clock, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      setLocation("/");
    },
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="bg-slate-800/50 backdrop-blur-sm shadow-lg border-b border-slate-700/50">
      <div className="max-w-full px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                <div className="w-1 h-3 bg-teal-600 rounded-full"></div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">CHOIICE FX</h1>
              <p className="text-xs text-slate-300">The Smartest Choice in FX</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center text-sm text-slate-300">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-mono">
                {currentTime.toLocaleString('ko-KR')}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">접속자:</span>
              <span className="font-medium text-teal-300 ml-1">{user?.username}</span>
              <span className="text-xs text-slate-400 ml-2">
                ({user?.role === 'admin' ? '관리자' : '고객'})
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
