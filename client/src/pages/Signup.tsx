import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password || !otpCode) {
      toast({
        title: "입력 오류",
        description: "사용자 ID, 비밀번호, OTP 코드는 필수입니다.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "입력 오류",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "입력 오류",
        description: "비밀번호는 최소 6자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/register", {
        username,
        password,
        otpCode,
        firstName,
        lastName,
        email,
      });

      toast({
        title: "회원가입 성공",
        description: "회원가입이 완료되었습니다. 로그인해주세요.",
      });

      // Redirect to login page
      setTimeout(() => {
        setLocation("/login");
      }, 1500);
    } catch (error: any) {
      toast({
        title: "회원가입 실패",
        description: error.message || "회원가입 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex">
      {/* Left side - Signup Form */}
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

          {/* Back to Login Button */}
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-teal-300 hover:text-teal-200 mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            로그인으로 돌아가기
          </Button>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-6">
            <h2 className="text-white text-2xl font-normal mb-8">회원가입</h2>

            <div className="space-y-4">
              {/* OTP Code */}
              <div>
                <Label className="text-teal-300 text-sm block mb-2">
                  OTP 코드 <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.toUpperCase())}
                  className="bg-slate-800/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                  placeholder="관리자로부터 받은 OTP 코드 입력"
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Username */}
              <div>
                <Label className="text-teal-300 text-sm block mb-2">
                  사용자 ID <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-slate-800/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                  placeholder="사용자 ID를 입력하세요"
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <Label className="text-teal-300 text-sm block mb-2">
                  비밀번호 <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-800/80 border-teal-500/30 text-white placeholder-slate-400 pr-10 focus:border-teal-400 focus:ring-teal-400/20"
                    placeholder="비밀번호를 입력하세요"
                    disabled={isLoading}
                    required
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

              {/* Confirm Password */}
              <div>
                <Label className="text-teal-300 text-sm block mb-2">
                  비밀번호 확인 <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-800/80 border-teal-500/30 text-white placeholder-slate-400 pr-10 focus:border-teal-400 focus:ring-teal-400/20"
                    placeholder="비밀번호를 다시 입력하세요"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-teal-300"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* First Name */}
              <div>
                <Label className="text-teal-300 text-sm block mb-2">이름</Label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-slate-800/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                  placeholder="이름 (선택사항)"
                  disabled={isLoading}
                />
              </div>

              {/* Last Name */}
              <div>
                <Label className="text-teal-300 text-sm block mb-2">성</Label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-slate-800/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                  placeholder="성 (선택사항)"
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div>
                <Label className="text-teal-300 text-sm block mb-2">이메일</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                  placeholder="이메일 (선택사항)"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white py-3 font-medium"
              disabled={isLoading}
            >
              {isLoading ? "가입 중..." : "회원가입"}
            </Button>

            <div className="text-center text-sm text-slate-400">
              이미 계정이 있으신가요?{" "}
              <button
                type="button"
                onClick={() => setLocation("/")}
                className="text-teal-300 hover:text-teal-200 font-medium"
              >
                로그인
              </button>
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
