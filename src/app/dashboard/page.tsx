"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        throw new Error("인증되지 않은 사용자입니다.");
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (error) {
      router.push("/login");
    }
  }, [error, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast({
        title: "로그아웃",
        description: "성공적으로 로그아웃되었습니다.",
      });
      router.push("/login");
    } catch {
      toast({
        title: "오류",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">로딩 중...</div>
      </div>
    );
  }

  if (!data?.user) {
    return null;
  }

  const user = data.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">대시보드</h1>
            <p className="text-slate-400 mt-1">
              안녕하세요, {user.displayName || user.username}님
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            로그아웃
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">사용자 정보</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400">사용자 ID:</span> {user.username}
                </div>
                <div>
                  <span className="text-slate-400">역할:</span>{" "}
                  {user.role === "admin" ? "관리자" : "고객"}
                </div>
                {user.majorGroup && (
                  <div>
                    <span className="text-slate-400">그룹:</span> {user.majorGroup}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">환율 조회</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p className="text-sm text-slate-400">
                실시간 환율 정보를 확인하세요.
              </p>
              <Button className="mt-4 bg-teal-600 hover:bg-teal-700" disabled>
                곧 제공 예정
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">거래 내역</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p className="text-sm text-slate-400">
                거래 내역을 확인하고 관리하세요.
              </p>
              <Button className="mt-4 bg-teal-600 hover:bg-teal-700" disabled>
                곧 제공 예정
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
