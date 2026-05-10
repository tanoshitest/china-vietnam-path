import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { orders, clients, debtHistory, statusLabel, statusColor, formatVND, type OrderStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { LogIn, LogOut, UserCircle, AlertTriangle, Wallet } from "lucide-react";

export const Route = createFileRoute("/portal")({
  component: PortalPage,
  head: () => ({ meta: [{ title: "Cổng Khách hàng — Quocviet JR" }] }),
});

function PortalPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [clientId, setClientId] = useState("KH001");

  const client = clients.find((c) => c.id === clientId)!;
  const myOrders = orders.filter((o) => o.clientId === clientId);

  if (!loggedIn) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto mt-12">
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <UserCircle className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Cổng Khách hàng</h2>
              <p className="text-sm text-slate-500 mt-1">Đăng nhập để xem đơn hàng & công nợ</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Mã khách hàng</label>
                <Input value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1.5" placeholder="KH001" />
                <p className="text-xs text-slate-500 mt-1">Demo: KH001, KH002, KH003</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
                <Input type="password" defaultValue="demo1234" className="mt-1.5" />
              </div>
              <Button className="w-full" onClick={() => setLoggedIn(true)}>
                <LogIn className="w-4 h-4" /> Đăng nhập
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Xin chào, {client.name}</h2>
            <p className="text-sm text-slate-500">Mã KH: {client.id}</p>
          </div>
          <Button variant="outline" onClick={() => setLoggedIn(false)}>
            <LogOut className="w-4 h-4" /> Đăng xuất
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="text-sm text-slate-500">Tổng đơn hàng</div>
            <div className="text-2xl font-semibold mt-1">{myOrders.length}</div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm text-slate-500"><Wallet className="w-4 h-4" /> Công nợ hiện tại</div>
            <div className="text-2xl font-semibold mt-1">{formatVND(client.debt)}</div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm text-slate-500"><AlertTriangle className="w-4 h-4" /> Quá hạn</div>
            <div className={cn("text-2xl font-semibold mt-1", client.overdue > 0 ? "text-red-600" : "text-slate-900")}>
              {formatVND(client.overdue)}
            </div>
          </Card>
        </div>

        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">Đơn hàng của tôi</TabsTrigger>
            <TabsTrigger value="debt">Báo cáo công nợ</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Mã vận đơn</th>
                    <th className="text-left px-4 py-3 font-medium">Lộ trình</th>
                    <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                    <th className="text-right px-4 py-3 font-medium">Cước phí</th>
                    <th className="text-left px-4 py-3 font-medium">Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {myOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-primary">{o.code}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{o.origin} → {o.destination}</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-1 rounded-full text-xs border", statusColor[o.status as OrderStatus])}>
                          {statusLabel[o.status as OrderStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatVND(o.fee)}</td>
                      <td className="px-4 py-3 text-slate-600">{o.createdAt}</td>
                    </tr>
                  ))}
                  {myOrders.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">Chưa có đơn hàng</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="debt" className="mt-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-500">Tổng công nợ</div>
                  <div className="text-2xl font-semibold text-slate-900">{formatVND(client.debt)}</div>
                </div>
                <Button>Thanh toán</Button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Mã vận đơn</th>
                    <th className="text-left px-4 py-3 font-medium">Ngày</th>
                    <th className="text-right px-4 py-3 font-medium">Số tiền</th>
                    <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {debtHistory.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-primary">{d.code}</td>
                      <td className="px-4 py-3 text-slate-600">{d.date}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatVND(d.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs border",
                          d.status === "Đã thanh toán"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-yellow-100 text-yellow-700 border-yellow-200"
                        )}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
