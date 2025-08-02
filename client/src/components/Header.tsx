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
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-full px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                <div className="w-1 h-3 bg-teal-600 rounded-full"></div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Choice FX</h1>
              <p className="text-xs text-gray-500">The Smartest Choice in FX</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-mono">
                {currentTime.toLocaleString('ko-KR')}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">접속자:</span>
              <span className="font-medium text-teal-600 ml-1">{user?.username}</span>
              <span className="text-xs text-gray-500 ml-2">
                ({user?.role === 'admin' ? '관리자' : '고객'})
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
