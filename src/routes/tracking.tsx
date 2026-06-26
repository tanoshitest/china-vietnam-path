import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, Circle, Package } from "lucide-react";
import { statusLabel, statusColor, normalizeStatus, type Order } from "@/lib/mock-data";
import { getStoredOrders } from "@/lib/debt-storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tracking")({
  component: TrackingPage,
  head: () => ({
    meta: [
      { title: "Tra Cứu vận đơn — Quocviet JR" },
      { name: "description", content: "Tra cứu trạng thái vận đơn TQ – VN bằng mã CTV." },
    ],
  }),
});

function TrackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [code, setCode] = useState("CRTO-2511025-01");
  const [searched, setSearched] = useState("CRTO-2511025-01");

  useEffect(() => {
    setOrders(getStoredOrders());
  }, []);

  const order = orders.find((o) => o.code.toLowerCase() === searched.toLowerCase());

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Tra Cứu vận đơn</h2>
          <p className="mt-1 text-sm text-slate-500">Nhập mã vận đơn (ví dụ: CRTO-2511025-01)</p>
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CRTO-2511025-01"
                className="h-11 pl-9"
              />
            </div>
            <Button type="submit" className="h-11 px-6">
              Tra Cứu
            </Button>
          </form>
        </Card>

        {order ? (
          <Card className="p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500">Mã vận đơn</div>
                <div className="text-lg font-semibold text-slate-900">{order.code}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {order.origin} → {order.destination} · {order.weight}
                </div>
              </div>
              <span className={cn("rounded-full border px-3 py-1 text-xs", statusColor[normalizeStatus(order.status)])}>
                {statusLabel[normalizeStatus(order.status)]}
              </span>
            </div>

            <div className="relative">
              {order.timeline.map((step, idx) => (
                <div key={idx} className="relative flex gap-4 pb-5 last:pb-0">
                  {idx < order.timeline.length - 1 && (
                    <div
                      className={cn(
                        "absolute bottom-0 left-3 top-7 w-0.5",
                        step.done ? "bg-primary" : "bg-slate-200"
                      )}
                    />
                  )}
                  <div className="relative z-10 mt-0.5">
                    {step.done ? (
                      <CheckCircle2 className="h-6 w-6 fill-primary/10 text-primary" />
                    ) : (
                      <Circle className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={cn("font-medium", step.done ? "text-slate-900" : "text-slate-500")}>
                      {step.label}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {step.location} · {step.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-10 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <div className="font-medium text-slate-700">Không tìm thấy vận đơn</div>
            <div className="mt-1 text-sm text-slate-500">Vui lòng kiểm tra lại mã vận đơn</div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
