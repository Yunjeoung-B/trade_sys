"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "로그인에 실패했습니다.");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user"], data.user);
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
      });
      router.push("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 bg-slate-800/90 border-teal-500/30">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 bg-teal-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="w-2 h-8 bg-slate-900 rounded-full"></div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">CHOIICE FX</h1>
          <p className="text-teal-300 text-sm">The Smartest Choice in FX</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-teal-300">
                사용자 ID
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="사용자 ID를 입력하세요"
                className="bg-slate-700/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-teal-300">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="bg-slate-700/80 border-teal-500/30 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400 space-y-1">
            <div className="text-teal-300">데모 계정:</div>
            <div>admin / password (관리자)</div>
            <div>client / password (고객)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
