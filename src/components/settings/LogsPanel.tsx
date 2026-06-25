import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

type LogAction = "Tạo mới" | "Cập nhật" | "Xóa" | "Đăng nhập" | "Đăng xuất";

type LogItem = {
  id: string;
  time: string;
  user: string;
  role: "Admin" | "Sale";
  action: LogAction;
  target: string;
  detail: string;
};

const actionOptions: LogAction[] = ["Tạo mới", "Cập nhật", "Xóa", "Đăng nhập", "Đăng xuất"];

const actionBadge = (action: LogAction) =>
  action === "Tạo mới"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : action === "Cập nhật"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : action === "Xóa"
        ? "bg-red-100 text-red-700 border-red-200"
        : action === "Đăng nhập"
          ? "bg-slate-100 text-slate-600 border-slate-200"
          : "bg-amber-100 text-amber-700 border-amber-200";

const demoLogs: LogItem[] = [
  { id: "L0001", time: "2026-06-25 14:32", user: "Nguyễn Văn An", role: "Admin", action: "Cập nhật", target: "CRTO-2511025-01", detail: "Đổi trạng thái sang Đang vận chuyển" },
  { id: "L0002", time: "2026-06-25 14:05", user: "Trần Thị Bình", role: "Sale", action: "Tạo mới", target: "CRTO-2511025-09", detail: "Tạo vận đơn mới cho NGUYEN TIEN MINH" },
  { id: "L0003", time: "2026-06-25 11:48", user: "Lê Văn Cường", role: "Sale", action: "Tạo mới", target: "CN009", detail: "Thêm công nợ phải thu 54.000.000đ" },
  { id: "L0004", time: "2026-06-25 09:15", user: "Nguyễn Văn An", role: "Admin", action: "Xóa", target: "SP003", detail: "Xoá sản phẩm Thùng carton" },
  { id: "L0005", time: "2026-06-25 08:02", user: "Nguyễn Văn An", role: "Admin", action: "Đăng nhập", target: "—", detail: "Đăng nhập hệ thống" },
  { id: "L0006", time: "2026-06-24 17:40", user: "Phạm Thị Dung", role: "Sale", action: "Cập nhật", target: "KH002", detail: "Cập nhật liên hệ khách hàng" },
  { id: "L0007", time: "2026-06-24 16:20", user: "Trần Thị Bình", role: "Sale", action: "Tạo mới", target: "NCC05", detail: "Thêm nhà cung cấp Vận tải Phương Trang" },
  { id: "L0008", time: "2026-06-24 15:05", user: "Lê Văn Cường", role: "Sale", action: "Cập nhật", target: "CRTO-2511025-03", detail: "Cập nhật ngày giao dự kiến" },
  { id: "L0009", time: "2026-06-24 10:33", user: "Hoàng Minh Đức", role: "Admin", action: "Xóa", target: "CN008", detail: "Xoá công nợ phải trả quá hạn" },
  { id: "L0010", time: "2026-06-24 08:00", user: "Trần Thị Bình", role: "Sale", action: "Đăng nhập", target: "—", detail: "Đăng nhập hệ thống" },
  { id: "L0011", time: "2026-06-23 18:10", user: "Phạm Thị Dung", role: "Sale", action: "Đăng xuất", target: "—", detail: "Đăng xuất hệ thống" },
  { id: "L0012", time: "2026-06-23 14:25", user: "Nguyễn Văn An", role: "Admin", action: "Cập nhật", target: "U004", detail: "Tạm khóa tài khoản Phạm Thị Dung" },
];

export function LogsPanel() {
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const filteredLogs = demoLogs.filter((item) => {
    if (actionFilter !== "all" && item.action !== actionFilter) return false;
    const needle = q.trim().toLowerCase();
    if (
      needle &&
      !item.user.toLowerCase().includes(needle) &&
      !item.target.toLowerCase().includes(needle) &&
      !item.detail.toLowerCase().includes(needle)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 text-left">
      <p className="text-sm text-slate-500">Nhật ký toàn bộ thao tác của người dùng trên hệ thống.</p>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm theo người dùng, đối tượng hoặc nội dung..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 pl-9 text-sm"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-10 md:w-[200px]">
              <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
              <SelectValue placeholder="Loại thao tác" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả thao tác</SelectItem>
              {actionOptions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
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
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Người dùng</th>
                <th className="px-4 py-3 text-left">Vai trò</th>
                <th className="px-4 py-3 text-left">Thao tác</th>
                <th className="px-4 py-3 text-left">Đối tượng</th>
                <th className="px-4 py-3 text-left">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap text-slate-500">{item.time}</td>
                  <td className="px-4 py-3 font-bold whitespace-nowrap text-slate-800">{item.user}</td>
                  <td className="px-4 py-3 text-slate-600">{item.role}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${actionBadge(item.action)}`}>
                      {item.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap text-slate-700">{item.target}</td>
                  <td className="px-4 py-3 text-slate-600">{item.detail}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">
                    Không tìm thấy nhật ký phù hợp.
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
