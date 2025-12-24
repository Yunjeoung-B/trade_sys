import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { User, Lock, Eye, EyeOff } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("POST", "/api/auth/change-password", data),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "비밀번호가 성공적으로 변경되었습니다.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "비밀번호 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "입력 오류",
        description: "새 비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "입력 오류",
        description: "새 비밀번호는 최소 6자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">관리자</Badge>;
      case "client":
        return <Badge variant="secondary">고객</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">프로필</h2>
        <p className="text-slate-300">사용자 정보 및 비밀번호를 관리할 수 있습니다.</p>
      </div>

      <div className="grid gap-6">
        {/* User Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              사용자 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">사용자 ID</Label>
                  <p className="text-base font-medium">{user.username}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">역할</Label>
                  <div className="mt-1">{getRoleBadge(user.role)}</div>
                </div>
              </div>

              {(user.firstName || user.lastName) && (
                <div className="grid grid-cols-2 gap-4">
                  {user.firstName && (
                    <div>
                      <Label className="text-sm text-gray-500">이름</Label>
                      <p className="text-base font-medium">{user.firstName}</p>
                    </div>
                  )}
                  {user.lastName && (
                    <div>
                      <Label className="text-sm text-gray-500">성</Label>
                      <p className="text-base font-medium">{user.lastName}</p>
                    </div>
                  )}
                </div>
              )}

              {(user.majorGroup || user.midGroup || user.subGroup) && (
                <div className="grid grid-cols-3 gap-4">
                  {user.majorGroup && (
                    <div>
                      <Label className="text-sm text-gray-500">Major Group</Label>
                      <p className="text-base font-medium">{user.majorGroup}</p>
                    </div>
                  )}
                  {user.midGroup && (
                    <div>
                      <Label className="text-sm text-gray-500">Mid Group</Label>
                      <p className="text-base font-medium">{user.midGroup}</p>
                    </div>
                  )}
                  {user.subGroup && (
                    <div>
                      <Label className="text-sm text-gray-500">Sub Group</Label>
                      <p className="text-base font-medium">{user.subGroup}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              비밀번호 변경
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label>현재 비밀번호 <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="현재 비밀번호를 입력하세요"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <Label>새 비밀번호 <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <Label>새 비밀번호 확인 <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호를 다시 입력하세요"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="gradient-bg hover:opacity-90"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? "변경 중..." : "비밀번호 변경"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
