import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, Key, Copy, CheckCircle2 } from "lucide-react";

interface OtpCode {
  id: string;
  code: string;
  isUsed: boolean;
  expiresAt: string;
  createdBy: string;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}

export default function OTPManagement() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: otpCodes, isLoading } = useQuery<OtpCode[]>({
    queryKey: ["/api/otp-codes"],
  });

  const createOtpMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/otp-codes", {}),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "OTP 코드가 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/otp-codes"] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "OTP 코드 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteOtpMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/otp-codes/${id}`, {}),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "OTP 코드가 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/otp-codes"] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "OTP 코드 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: "복사 완료",
        description: "OTP 코드가 클립보드에 복사되었습니다.",
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "클립보드에 복사하는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (otp: OtpCode) => {
    if (otp.isUsed) {
      return <Badge variant="secondary">사용됨</Badge>;
    }

    const now = new Date();
    const expiresAt = new Date(otp.expiresAt);

    if (now > expiresAt) {
      return <Badge variant="destructive">만료됨</Badge>;
    }

    return <Badge className="bg-green-100 text-green-800">사용 가능</Badge>;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">OTP 코드 관리</h2>
        <p className="text-slate-300">회원가입용 OTP 코드를 생성하고 관리할 수 있습니다.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Key className="w-5 h-5 mr-2" />
              OTP 코드 목록 ({otpCodes?.length || 0}개)
            </CardTitle>
            <Button
              className="gradient-bg hover:opacity-90"
              onClick={() => createOtpMutation.mutate()}
              disabled={createOtpMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              {createOtpMutation.isPending ? "생성 중..." : "OTP 코드 생성"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-sm text-gray-500 border-b">
                    <th className="text-left py-3">OTP 코드</th>
                    <th className="text-center py-3">상태</th>
                    <th className="text-left py-3">생성일시</th>
                    <th className="text-left py-3">만료일시</th>
                    <th className="text-left py-3">사용일시</th>
                    <th className="text-center py-3">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {otpCodes && otpCodes.length > 0 ? (
                    otpCodes.map((otp) => (
                      <tr key={otp.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm font-bold">
                              {otp.code}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyCode(otp.code)}
                              className="text-teal-600 hover:text-teal-800 hover:bg-teal-50"
                            >
                              {copiedCode === otp.code ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          {getStatusBadge(otp)}
                        </td>
                        <td className="py-3 text-sm">{formatDate(otp.createdAt)}</td>
                        <td className="py-3 text-sm">{formatDate(otp.expiresAt)}</td>
                        <td className="py-3 text-sm">
                          {otp.usedAt ? formatDate(otp.usedAt) : "-"}
                        </td>
                        <td className="py-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteOtpMutation.mutate(otp.id)}
                            disabled={deleteOtpMutation.isPending}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        생성된 OTP 코드가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">OTP 코드 사용 안내</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• OTP 코드는 회원가입 시 필요한 일회용 코드입니다.</li>
          <li>• 생성된 코드는 30일간 유효하며, 한 번만 사용할 수 있습니다.</li>
          <li>• 사용자에게 OTP 코드를 안내하여 회원가입을 진행하도록 하세요.</li>
          <li>• 사용되었거나 만료된 코드는 삭제할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}
