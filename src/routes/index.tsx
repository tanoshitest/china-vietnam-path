import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  weeklyVolume,
  revenueByMonth,
  formatVND,
  normalizeStatus,
  type Order,
} from "@/lib/mock-data";
import {
  buildEbtRows,
  getLocalDebts,
  getStoredOrders,
  loadAllDebts,
  loadAllOrders,
  type EbtRow,
} from "@/lib/debt-storage";
import { cn } from "@/lib/utils";
import { useAppRole } from "@/lib/app-role";
import { useTmsPageLoader } from "@/lib/use-tms-page-loader";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Tổng quan — Quocviet JR" },
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
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 truncate text-lg font-semibold tabular-nums text-slate-900">{value}</div>
          {delta && <div className="mt-0.5 truncate text-[11px] text-slate-500">{delta}</div>}
        </div>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function OverviewTab({ orders }: { orders: Order[] }) {
  const monthOrders = orders.length;
  const expectedRevenue = orders.reduce((s, o) => s + o.fee, 0);
  const overdue = 32500000;
  const inTransit = orders.filter((o) => normalizeStatus(o.status) !== "da_giao_hang").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Đơn hàng trong tháng" value={String(monthOrders)} delta="+12% so với tháng trước" tone="blue" />
        <StatCard icon={TrendingUp} label="Doanh thu dự kiến" value={formatVND(expectedRevenue)} delta="Tính trên đơn đang xử lý" tone="green" />
        <StatCard icon={AlertCircle} label="Công nợ quá hạn" value={formatVND(overdue)} delta="1 khách hàng" tone="red" />
        <StatCard icon={Truck} label="Đơn đang vận chuyển" value={String(inTransit)} delta="Cập nhật real-time" tone="yellow" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
        <Card className="flex min-h-0 flex-col p-3">
          <div className="mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-slate-900">Sản lượng hàng theo tuần</h3>
            <p className="text-[11px] text-slate-500">Đơn vị: kg</p>
          </div>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} width={36} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="volume" fill="#1A73E8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col p-3">
          <div className="mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-slate-900">Doanh thu</h3>
            <p className="text-[11px] text-slate-500">Đơn vị: triệu VND</p>
          </div>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} width={36} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#1A73E8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EbtTab({ rows }: { rows: EbtRow[] }) {
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          receivable: acc.receivable + row.receivable,
          payable: acc.payable + row.payable,
          profit: acc.profit + row.profit,
        }),
        { receivable: 0, payable: 0, profit: 0 }
      ),
    [rows]
  );

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-slate-200 p-0 shadow-sm">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-900">Báo cáo EBT theo đơn hàng</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Phải thu lấy từ công nợ khách hàng · Phải trả lấy tổng chi phí NCC · Lợi nhuận = Phải thu − Phải trả
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Mã đơn</th>
              <th className="px-4 py-3 text-left">Tên khách</th>
              <th className="px-4 py-3 text-right">Phải thu</th>
              <th className="px-4 py-3 text-right">Phải trả</th>
              <th className="px-4 py-3 text-right">Lợi nhuận</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.orderId} className="hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-primary">
                  {row.orderCode}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{row.customer}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                  {formatVND(row.receivable)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                  {row.payable > 0 ? formatVND(row.payable) : "—"}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums",
                    row.profit >= 0 ? "text-emerald-700" : "text-red-600"
                  )}
                >
                  {formatVND(row.profit)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                  Chưa có đơn hàng để hiển thị báo cáo EBT.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="sticky bottom-0 border-t-2 border-slate-200 bg-slate-100 text-sm font-bold text-slate-900">
              <tr>
                <td colSpan={2} className="px-4 py-3 uppercase text-xs tracking-wide text-slate-600">
                  Tổng cộng
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatVND(totals.receivable)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatVND(totals.payable)}</td>
                <td
                  className={cn(
                    "px-4 py-3 text-right tabular-nums",
                    totals.profit >= 0 ? "text-emerald-700" : "text-red-600"
                  )}
                >
                  {formatVND(totals.profit)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { isClient } = useAppRole();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ebtRows, setEbtRows] = useState<EbtRow[]>([]);

  if (isClient) {
    return <Navigate to="/orders" />;
  }

  const hydrateFromLocal = useCallback(() => {
    const storedOrders = getStoredOrders();
    setOrders(storedOrders);
    setEbtRows(buildEbtRows(storedOrders, getLocalDebts()));
  }, []);

  const syncFromRemote = useCallback(() => {
    return Promise.all([loadAllOrders(), loadAllDebts()]).then(([storedOrders, debts]) => {
      setOrders(storedOrders);
      setEbtRows(buildEbtRows(storedOrders, debts));
    });
  }, []);

  useTmsPageLoader(hydrateFromLocal, syncFromRemote);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-7rem)] flex-col gap-2 overflow-hidden">
        <div className="shrink-0">
          <h2 className="text-lg font-bold text-slate-900">Tổng quan</h2>
          <p className="text-[11px] text-slate-500">Bảng điều khiển hoạt động tuyến Trung Quốc – Việt Nam</p>
        </div>

        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col gap-2">
          <TabsList className="h-9 shrink-0 bg-slate-100 p-1">
            <TabsTrigger value="overview" className="px-4 text-sm font-semibold">
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="ebt" className="px-4 text-sm font-semibold">
              EBT
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <OverviewTab orders={orders} />
          </TabsContent>

          <TabsContent value="ebt" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <EbtTab rows={ebtRows} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
