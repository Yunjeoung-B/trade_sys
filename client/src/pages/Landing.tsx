import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function Landing() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-white text-lg font-medium mb-1">CHOIICE FX</h1>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <h2 className="text-white text-2xl font-normal mb-8">Enter your password</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder-gray-500"
                  placeholder="your-email@domain.com"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-2">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder-gray-500 pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4 pt-4">
              <a href="/api/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2">
                  LOG IN
                </Button>
              </a>
              <button className="text-gray-400 hover:text-white text-sm">
                FORGOT PASSWORD?
              </button>
              <button className="text-gray-400 hover:text-white text-sm">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Decorative Pattern */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-700 to-orange-900">
          {/* Dot Pattern Overlay */}
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
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