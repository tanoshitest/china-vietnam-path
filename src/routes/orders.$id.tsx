import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Circle, Upload, Plus, Image as ImageIcon } from "lucide-react";
import { orders, statusLabel, statusColor, formatVND, type OrderStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id")({
  component: OrderDetail,
  head: ({ params }) => ({
    meta: [{ title: `Vận đơn ${params.id} — Quocviet JR` }],
  }),
});

function OrderDetail() {
  const { id } = Route.useParams();
  const order = orders.find((o) => o.id === id);
  if (!order) throw notFound();

  const totalCost = order.costs.reduce((s, c) => s + c.amount, 0);
  const profit = order.fee - totalCost;
  const [open, setOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-5">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-900">{order.code}</h2>
              <span className={cn("px-2 py-1 rounded-full text-xs border", statusColor[order.status as OrderStatus])}>
                {statusLabel[order.status as OrderStatus]}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {order.client} · {order.origin} → {order.destination} · {order.weight}
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4" /> Cập nhật trạng thái
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cập nhật trạng thái vận đơn</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Trạng thái mới</label>
                  <Select defaultValue={order.status}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dang_ve">Đang về kho</SelectItem>
                      <SelectItem value="dang_van_chuyen">Đang vận chuyển</SelectItem>
                      <SelectItem value="cho_giao">Chờ giao</SelectItem>
                      <SelectItem value="hoan_thanh">Hoàn thành</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Hình ảnh xác nhận</label>
                  <div className="mt-1.5 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center text-sm text-slate-500">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    Kéo thả ảnh hoặc bấm để tải lên
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                <Button onClick={() => { setOpen(false); toast.success("Đã cập nhật trạng thái"); }}>
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-xs text-slate-500">Cước phí</div>
            <div className="text-xl font-semibold text-slate-900 mt-1">{formatVND(order.fee)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500">Tổng chi phí</div>
            <div className="text-xl font-semibold text-slate-900 mt-1">{formatVND(totalCost)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500">Lợi nhuận</div>
            <div className={cn("text-xl font-semibold mt-1", profit >= 0 ? "text-green-600" : "text-red-600")}>
              {formatVND(profit)}
            </div>
          </Card>
        </div>

        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">Lộ trình</TabsTrigger>
            <TabsTrigger value="images">Hình ảnh</TabsTrigger>
            <TabsTrigger value="costs">Chi phí Vendor</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-5">Lộ trình vận chuyển</h3>
              <div className="relative">
                {order.timeline.map((step, idx) => (
                  <div key={idx} className="flex gap-4 pb-6 last:pb-0 relative">
                    {idx < order.timeline.length - 1 && (
                      <div className={cn("absolute left-3 top-7 bottom-0 w-0.5", step.done ? "bg-primary" : "bg-slate-200")} />
                    )}
                    <div className="relative z-10 mt-0.5">
                      {step.done ? (
                        <CheckCircle2 className="w-6 h-6 text-primary fill-primary/10" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={cn("font-medium", step.done ? "text-slate-900" : "text-slate-500")}>
                        {step.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{step.location} · {step.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="mt-4">
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Thư viện ảnh ({order.images.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {order.images.map((src, i) => (
                  <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 group cursor-pointer">
                    <img src={src} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="mt-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Chi phí theo Vendor</h3>
                <Button variant="outline" size="sm"><Plus className="w-4 h-4" /> Thêm chi phí</Button>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Loại</th>
                      <th className="text-left px-4 py-3 font-medium">Vendor</th>
                      <th className="text-right px-4 py-3 font-medium">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {order.costs.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{c.type}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">{c.vendor}</td>
                        <td className="px-4 py-3 text-right text-slate-900">{formatVND(c.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3" colSpan={2}>Tổng cộng</td>
                      <td className="px-4 py-3 text-right">{formatVND(totalCost)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
