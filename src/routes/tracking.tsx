import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, CheckCircle2, Circle, FileText, Package } from "lucide-react";
import { orders, statusLabel, statusColor, type OrderStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tracking")({
  component: TrackingPage,
  head: () => ({
    meta: [
      { title: "Tra cứu vận đơn — Quocviet JR" },
      { name: "description", content: "Tra cứu trạng thái vận đơn TQ – VN bằng mã CTV." },
    ],
  }),
});

function TrackingPage() {
  const [code, setCode] = useState("CTV-123456");
  const [searched, setSearched] = useState("CTV-123456");

  const order = orders.find((o) => o.code.toLowerCase() === searched.toLowerCase());

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Tra cứu vận đơn</h2>
          <p className="text-sm text-slate-500 mt-1">Nhập mã vận đơn (ví dụ: CTV-123456)</p>
        </div>

        <Card className="p-5">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearched(code.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CTV-XXXXXX"
                className="pl-9 h-11"
              />
            </div>
            <Button type="submit" className="h-11 px-6">Tra cứu</Button>
          </form>
        </Card>

        {order ? (
          <Card className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-xs text-slate-500">Mã vận đơn</div>
                <div className="text-lg font-semibold text-slate-900">{order.code}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {order.origin} → {order.destination} · {order.weight}
                </div>
              </div>
              <span className={cn("px-3 py-1 rounded-full text-xs border", statusColor[order.status as OrderStatus])}>
                {statusLabel[order.status as OrderStatus]}
              </span>
            </div>

            <div className="relative mb-5">
              {order.timeline.map((step, idx) => (
                <div key={idx} className="flex gap-4 pb-5 last:pb-0 relative">
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

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4" /> Xem biên bản ký nhận
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Biên bản ký nhận – {order.code}</DialogTitle>
                </DialogHeader>
                <div className="rounded-lg overflow-hidden bg-slate-100 aspect-[4/3]">
                  <img
                    src={order.images[0] || "https://picsum.photos/seed/sign/800/600"}
                    alt="Biên bản"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-slate-500">Ký nhận bởi: Nguyễn Văn Khách · {order.timeline.at(-1)?.date}</p>
              </DialogContent>
            </Dialog>
          </Card>
        ) : (
          <Card className="p-10 text-center">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="text-slate-700 font-medium">Không tìm thấy vận đơn</div>
            <div className="text-sm text-slate-500 mt-1">Vui lòng kiểm tra lại mã vận đơn</div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
