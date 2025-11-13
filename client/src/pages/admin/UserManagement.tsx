import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Edit, Trash2, Plus, Users } from "lucide-react";

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: string;
  majorGroup?: string;
  midGroup?: string;
  subGroup?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UserManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");
  const [majorGroup, setMajorGroup] = useState("");
  const [midGroup, setMidGroup] = useState("");
  const [subGroup, setSubGroup] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: any) => apiRequest("POST", "/api/users", userData),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "사용자가 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "사용자 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/users/${id}`, data),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "사용자 정보가 업데이트되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "사용자 정보 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setRole("client");
    setMajorGroup("");
    setMidGroup("");
    setSubGroup("");
    setEditingUser(null);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword(""); // Don't populate password for security
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setEmail(user.email || "");
    setRole(user.role);
    setMajorGroup(user.majorGroup || "");
    setMidGroup(user.midGroup || "");
    setSubGroup(user.subGroup || "");
    setIsEditDialogOpen(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    const userData = {
      username,
      password,
      firstName,
      lastName,
      email,
      role,
      majorGroup,
      midGroup,
      subGroup,
      isActive: true,
    };

    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    const userData: any = {
      username,
      firstName,
      lastName,
      email,
      role,
      majorGroup,
      midGroup,
      subGroup,
    };

    // Only include password if it's provided
    if (password) {
      userData.password = password;
    }

    updateUserMutation.mutate({ id: editingUser.id, data: userData });
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "관리자";
      case "client":
        return "고객";
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "client":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? "활성" : "비활성";
  };

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? "default" : "secondary";
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">사용자 관리</h2>
        <p className="text-slate-300">사용자 계정과 그룹을 관리할 수 있습니다.</p>
          </div>
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  사용자 목록 ({users?.length || 0}명)
                </CardTitle>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg hover:opacity-90">
                      <Plus className="w-4 h-4 mr-2" />
                      신규 사용자 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>신규 사용자 추가</DialogTitle>
                      <DialogDescription>
                        새로운 사용자 계정을 생성합니다.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <Label>사용자 ID</Label>
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="사용자 ID"
                          required
                        />
                      </div>
                      <div>
                        <Label>비밀번호</Label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="비밀번호"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>이름</Label>
                          <Input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="이름"
                          />
                        </div>
                        <div>
                          <Label>성</Label>
                          <Input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="성"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>이메일</Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="이메일"
                        />
                      </div>
                      <div>
                        <Label>역할</Label>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">고객</SelectItem>
                            <SelectItem value="admin">관리자</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label>Major Group</Label>
                          <Input
                            value={majorGroup}
                            onChange={(e) => setMajorGroup(e.target.value)}
                            placeholder="External"
                          />
                        </div>
                        <div>
                          <Label>Mid Group</Label>
                          <Input
                            value={midGroup}
                            onChange={(e) => setMidGroup(e.target.value)}
                            placeholder="Team A"
                          />
                        </div>
                        <div>
                          <Label>Sub Group</Label>
                          <Input
                            value={subGroup}
                            onChange={(e) => setSubGroup(e.target.value)}
                            placeholder="001"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full gradient-bg hover:opacity-90"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "생성 중..." : "사용자 생성"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
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
                        <th className="text-left py-3">사용자 ID</th>
                        <th className="text-left py-3">이름</th>
                        <th className="text-left py-3">Major Group</th>
                        <th className="text-left py-3">Mid Group</th>
                        <th className="text-left py-3">Sub Group</th>
                        <th className="text-center py-3">역할</th>
                        <th className="text-center py-3">상태</th>
                        <th className="text-center py-3">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 font-medium">{user.username}</td>
                          <td className="py-3">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : user.firstName || user.lastName || "-"
                            }
                          </td>
                          <td className="py-3">{user.majorGroup || "-"}</td>
                          <td className="py-3">{user.midGroup || "-"}</td>
                          <td className="py-3">{user.subGroup || "-"}</td>
                          <td className="py-3 text-center">
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {getRoleText(user.role)}
                            </Badge>
                          </td>
                          <td className="py-3 text-center">
                            <Badge 
                              variant={getStatusBadgeVariant(user.isActive)}
                              className={user.isActive ? "bg-green-100 text-green-800" : ""}
                            >
                              {getStatusText(user.isActive)}
                            </Badge>
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex space-x-2 justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(user)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={user.role === "admin"}
                                className={user.role === "admin" 
                                  ? "text-gray-400 cursor-not-allowed" 
                                  : "text-red-600 hover:text-red-800 hover:bg-red-50"
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-500">
                            사용자가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>사용자 정보 수정</DialogTitle>
                <DialogDescription>
                  사용자 정보를 수정합니다.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <Label>사용자 ID</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="사용자 ID"
                    required
                  />
                </div>
                <div>
                  <Label>새 비밀번호 (선택사항)</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="변경하지 않으려면 비워두세요"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>이름</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="이름"
                    />
                  </div>
                  <div>
                    <Label>성</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="성"
                    />
                  </div>
                </div>
                <div>
                  <Label>이메일</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일"
                  />
                </div>
                <div>
                  <Label>역할</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">고객</SelectItem>
                      <SelectItem value="admin">관리자</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Major Group</Label>
                    <Input
                      value={majorGroup}
                      onChange={(e) => setMajorGroup(e.target.value)}
                      placeholder="External"
                    />
                  </div>
                  <div>
                    <Label>Mid Group</Label>
                    <Input
                      value={midGroup}
                      onChange={(e) => setMidGroup(e.target.value)}
                      placeholder="Team A"
                    />
                  </div>
                  <div>
                    <Label>Sub Group</Label>
                    <Input
                      value={subGroup}
                      onChange={(e) => setSubGroup(e.target.value)}
                      placeholder="001"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-bg hover:opacity-90"
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "업데이트 중..." : "정보 업데이트"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
    </div>
  );
}
