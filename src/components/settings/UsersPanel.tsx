import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Search, Filter, Mail, Phone } from "lucide-react";
import { getLocalUsers, loadAllUsers, persistUsersList, type UserItem, type UserRole, type UserStatus } from "@/lib/user-storage";
import { useTmsDataRefresh } from "@/lib/use-tms-data-refresh";

const roleOptions: UserRole[] = ["Admin", "Sale"];

const roleBadge = (role: UserRole) =>
  role === "Admin"
    ? "bg-blue-100 text-blue-700 border-blue-200"
    : "bg-emerald-100 text-emerald-700 border-emerald-200";

const statusBadge = (status: UserStatus) =>
  status === "Hoạt động"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-slate-100 text-slate-600 border-slate-200";

export function UsersPanel() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Sale" as UserRole,
  });

  const reload = useCallback(() => {
    void loadAllUsers().then(setUsers);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useTmsDataRefresh(reload);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Vui lòng nhập tên và email người dùng");
      return;
    }

    const newUser: UserItem = {
      id: `U${String(users.length + 1).padStart(3, "0")}`,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || "—",
      role: form.role,
      status: "Hoạt động",
      createdAt: new Date().toISOString().split("T")[0],
    };

    const updated = [...users, newUser];
    setUsers(updated);
    void persistUsersList(updated);
    toast.success(`Đã thêm người dùng: ${newUser.name}`);
    setForm({ name: "", email: "", phone: "", role: "Sale" });
    setOpen(false);
  };

  const toggleStatus = (id: string) => {
    const updated: UserItem[] = users.map((item) =>
      item.id === id
        ? { ...item, status: item.status === "Hoạt động" ? "Tạm khóa" : "Hoạt động" }
        : item
    );
    setUsers(updated);
    void persistUsersList(updated);
  };

  const handleDelete = (id: string, name: string) => {
    const updated = users.filter((item) => item.id !== id);
    setUsers(updated);
    void persistUsersList(updated);
    toast.success(`Đã xoá người dùng: ${name}`);
  };

  const filteredUsers = users.filter((item) => {
    if (roleFilter !== "all" && item.role !== roleFilter) return false;
    const needle = q.trim().toLowerCase();
    if (
      needle &&
      !item.id.toLowerCase().includes(needle) &&
      !item.name.toLowerCase().includes(needle) &&
      !item.email.toLowerCase().includes(needle)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản lý người dùng</h2>
          <p className="text-sm text-slate-500">Quản lý tài khoản nhân sự theo vai trò Admin và Sale.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white shadow-sm hover:bg-primary/95">
              <Plus className="mr-1.5 h-4 w-4" />
              Thêm người dùng
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="text-base font-bold text-slate-900">Thêm người dùng mới</DialogTitle>
              <DialogDescription>Tạo tài khoản nhân sự và phân quyền vai trò.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddUser} className="space-y-4 py-3 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="user-name" className="text-xs font-semibold text-slate-700">Họ tên *</Label>
                <Input
                  id="user-name"
                  placeholder="VD: Nguyễn Văn An"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-email" className="text-xs font-semibold text-slate-700">Email *</Label>
                <div className="relative">
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="VD: an@quocvietjr.vn"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-9 pl-9 text-sm"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-phone" className="text-xs font-semibold text-slate-700">Số điện thoại</Label>
                <div className="relative">
                  <Input
                    id="user-phone"
                    placeholder="VD: 0903 111 222"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-9 pl-9 text-sm"
                  />
                  <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-role" className="text-xs font-semibold text-slate-700">Vai trò *</Label>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value as UserRole })}>
                  <SelectTrigger id="user-role" className="h-9 text-sm">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="gap-2 border-t pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} className="h-8.5 text-xs font-semibold">
                  Hủy
                </Button>
                <Button type="submit" size="sm" className="h-8.5 bg-primary text-xs font-semibold text-white hover:bg-primary/95">
                  Lưu người dùng
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm theo mã, tên hoặc email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 pl-9 text-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-10 md:w-[200px]">
              <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vai trò</SelectItem>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table — sticky header, only the rows scroll (~7 visible) */}
      <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
        <div className="max-h-[440px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Mã</th>
                <th className="px-4 py-3 text-left">Họ tên</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">SĐT</th>
                <th className="px-4 py-3 text-left">Vai trò</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Ngày tạo</th>
                <th className="px-4 py-3 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono font-bold text-slate-500">{item.id}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{item.email}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-slate-600">{item.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleBadge(item.role)}`}>
                      {item.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleStatus(item.id)}
                      className={`inline-flex min-w-[96px] justify-center rounded-full border px-3 py-1 text-[11px] font-semibold leading-none whitespace-nowrap transition-colors ${statusBadge(item.status)}`}
                      title="Bấm để đổi trạng thái"
                    >
                      {item.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-slate-600">{item.createdAt}</td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(item.id, item.name)}
                      className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-slate-400">
                    Không tìm thấy người dùng phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
