import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "입력 오류",
        description: "사용자 ID와 비밀번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login", { username, password });
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "로그인 실패",
        description: error.message || "사용자 ID 또는 비밀번호가 올바르지 않습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex items-center">
            <div className="w-12 h-12 bg-teal-400 rounded-full flex items-center justify-center mr-4">
              <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold mb-1">CHOIICE FX</h1>
              <p className="text-slate-300 text-sm">The Smartest Choice in FX</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <h2 className="text-white text-2xl font-normal mb-8">로그인</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-teal-300 text-sm block mb-2">사용자 ID</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-slate-800/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                  placeholder="사용자 ID를 입력하세요"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="text-teal-300 text-sm block mb-2">비밀번호</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-800/80 border-teal-500/30 text-white placeholder-slate-400 pr-10 focus:border-teal-400 focus:ring-teal-400/20"
                    placeholder="비밀번호를 입력하세요"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-teal-300"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white py-3 font-medium"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "LOG IN"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right side - Decorative Pattern */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
          {/* Geometric Pattern Overlay */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgb(20, 184, 166) 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }}
          ></div>
          
          {/* Diagonal overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/20 to-black/40"></div>
        </div>
      </div>
    </div>
  );
}