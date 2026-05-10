import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orders, statusLabel, statusColor, formatVND, type OrderStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Quản lý Vận đơn — LogiTrans" }] }),
});

function OrdersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = orders.filter((o) => {
    const matchQ =
      o.code.toLowerCase().includes(q.toLowerCase()) ||
      o.client.toLowerCase().includes(q.toLowerCase());
    const matchS = status === "all" || o.status === status;
    return matchQ && matchS;
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Quản lý Vận đơn</h2>
            <p className="text-sm text-slate-500">Theo dõi toàn bộ đơn hàng tuyến TQ – VN</p>
          </div>
          <Button>
            <Plus className="w-4 h-4" /> Tạo vận đơn
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Tìm theo mã vận đơn hoặc khách hàng..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="md:w-56">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="dang_ve">Đang về kho</SelectItem>
                <SelectItem value="dang_van_chuyen">Đang vận chuyển</SelectItem>
                <SelectItem value="cho_giao">Chờ giao</SelectItem>
                <SelectItem value="hoan_thanh">Hoàn thành</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Mã vận đơn</th>
                <th className="text-left px-4 py-3 font-medium">Khách hàng</th>
                <th className="text-left px-4 py-3 font-medium">Lộ trình</th>
                <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                <th className="text-right px-4 py-3 font-medium">Cước phí</th>
                <th className="text-left px-4 py-3 font-medium">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <Link to="/orders/$id" params={{ id: o.id }} className="font-medium text-primary hover:underline">
                      {o.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{o.client}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{o.origin} → {o.destination}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-1 rounded-full text-xs border", statusColor[o.status as OrderStatus])}>
                      {statusLabel[o.status as OrderStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium">{formatVND(o.fee)}</td>
                  <td className="px-4 py-3 text-slate-600">{o.createdAt}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">Không tìm thấy đơn hàng.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </AppLayout>
  );
}
