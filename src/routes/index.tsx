import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import {
  Package,
  TrendingUp,
  AlertCircle,
  Truck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { orders, weeklyVolume, revenueByMonth, formatVND, statusLabel, statusColor } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Tổng quan — LogiTrans" },
      { name: "description", content: "Bảng điều khiển hệ thống quản lý vận chuyển TQ-VN." },
    ],
  }),
});

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delta?: string;
  tone: "blue" | "green" | "red" | "yellow";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="text-2xl font-semibold text-slate-900 mt-2">{value}</div>
          {delta && <div className="text-xs text-slate-500 mt-1">{delta}</div>}
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", tones[tone])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const monthOrders = orders.length;
  const expectedRevenue = orders.reduce((s, o) => s + o.fee, 0);
  const overdue = 32500000;
  const inTransit = orders.filter((o) => o.status === "dang_van_chuyen" || o.status === "dang_ve").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Package} label="Đơn hàng trong tháng" value={String(monthOrders)} delta="+12% so với tháng trước" tone="blue" />
          <StatCard icon={TrendingUp} label="Doanh thu dự kiến" value={formatVND(expectedRevenue)} delta="Tính trên đơn đang xử lý" tone="green" />
          <StatCard icon={AlertCircle} label="Công nợ quá hạn" value={formatVND(overdue)} delta="1 khách hàng" tone="red" />
          <StatCard icon={Truck} label="Đơn đang vận chuyển" value={String(inTransit)} delta="Cập nhật real-time" tone="yellow" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">Sản lượng hàng theo tuần</h3>
                <p className="text-xs text-slate-500">Đơn vị: kg</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="volume" fill="#1A73E8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Doanh thu (triệu VND)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="revenue" stroke="#1A73E8" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Đơn hàng gần đây</h3>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Mã vận đơn</th>
                  <th className="text-left px-4 py-3 font-medium">Khách hàng</th>
                  <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                  <th className="text-right px-4 py-3 font-medium">Cước phí</th>
                  <th className="text-left px-4 py-3 font-medium">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-primary">{o.code}</td>
                    <td className="px-4 py-3 text-slate-700">{o.client}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-1 rounded-full text-xs border", statusColor[o.status])}>
                        {statusLabel[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 font-medium">{formatVND(o.fee)}</td>
                    <td className="px-4 py-3 text-slate-600">{o.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
