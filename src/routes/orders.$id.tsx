import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import {
  orders as mockOrders,
  statusLabel,
  statusColor,
  statusDot,
  ORDER_STATUSES,
  normalizeStatus,
  formatVND,
  formatLogDate,
  buildDemoOrderLogs,
  clients as mockClients,
  type OrderStatus,
  type GoodsItem,
  type Order,
  type OrderLog,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ORDER_SPEC_UNITS = ["Conts", "Sacks", "Bags", "Rolls"] as const;
type OrderSpecUnit = (typeof ORDER_SPEC_UNITS)[number];
const DEFAULT_ORDER_UNIT: OrderSpecUnit = "Rolls";

const normalizeOrderUnit = (unit?: string): OrderSpecUnit =>
  ORDER_SPEC_UNITS.includes(unit as OrderSpecUnit) ? (unit as OrderSpecUnit) : DEFAULT_ORDER_UNIT;

export const Route = createFileRoute("/orders/$id")({
  component: OrderDetail,
  head: ({ params }) => ({
    meta: [{ title: `Vận đơn ${params.id} — Quocviet JR` }],
  }),
});

// Helpers for localStorage persistence
const getStoredOrders = (): Order[] => {
  if (typeof window === "undefined") return mockOrders;
  const stored = localStorage.getItem("viet_thao_orders");
  if (stored) {
    try {
      return JSON.parse(stored) as Order[];
    } catch (e) {
      return mockOrders;
    }
  }
  localStorage.setItem("viet_thao_orders", JSON.stringify(mockOrders));
  return mockOrders;
};

const saveStoredOrders = (newOrders: Order[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("viet_thao_orders", JSON.stringify(newOrders));
};

type StoredCustomer = {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  unitPrice?: number;
  priceUnit?: string;
};

const getStoredCustomers = (): StoredCustomer[] => {
  if (typeof window === "undefined") {
    return mockClients.map((c) => ({ id: c.id, name: c.name, contact: c.contact ?? "—" }));
  }
  const stored = localStorage.getItem("viet_thao_customers");
  if (stored) {
    try {
      return JSON.parse(stored) as StoredCustomer[];
    } catch {
      return mockClients.map((c) => ({ id: c.id, name: c.name, contact: c.contact ?? "—" }));
    }
  }
  return mockClients.map((c) => ({ id: c.id, name: c.name, contact: c.contact ?? "—" }));
};

const saveStoredCustomers = (items: StoredCustomer[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("viet_thao_customers", JSON.stringify(items));
};

function OrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [order, setOrder] = useState<any | null>(null);

  // Form states matching Frame 15
  const [receivedDate, setReceivedDate] = useState("");
  const [masterBill, setMasterBill] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [origin, setOrigin] = useState("Quảng Châu");
  const [destination, setDestination] = useState("Hà Nội");
  const [note, setNote] = useState("");
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([]);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>("van_chuyen_noi_dia_tq");

  // Goods item dynamic list
  const [items, setItems] = useState<GoodsItem[]>([]);
  
  // Local list units & clients
  const [localClients, setLocalClients] = useState<StoredCustomer[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [isAddingClient, setIsAddingClient] = useState(false);

  // Lightbox Receipt Gallery state matching Frame 16
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  // Load order data from local storage
  useEffect(() => {
    const list = getStoredOrders();
    setAllOrders(list);
    setLocalClients(getStoredCustomers());
    const target = list.find((o) => o.id === id || o.code === id);
    if (target) {
      setOrder(target);
      setReceivedDate(target.createdAt || "");
      setMasterBill(target.masterBill || "");
      setCustomCode(target.code || "");
      setSelectedClient(target.client || "");
      setOrigin(target.origin ? target.origin.replace(", TQ", "").replace(", VN", "") : "Quảng Châu");
      setDestination(target.destination ? target.destination.replace(", TQ", "").replace(", VN", "") : "Hà Nội");
      setNote(target.note || "");
      setOrderLogs(buildDemoOrderLogs(target));
      setCurrentStatus(normalizeStatus(target.status));
      
      // Default mock items if none exist
      if (target.items && target.items.length > 0) {
        setItems(target.items);
      } else {
        setItems([
          { id: "1", name: "bỉm bỉm", quantity: 1, unit: "Rolls", weight: 267.23, volume: 8, shippingPrice: 120000000, extraFee: 0 },
          { id: "2", name: "bỉm bỉm", quantity: 2, unit: "Sacks", weight: 2700, volume: 1.2, shippingPrice: 2000000, extraFee: 0 },
        ]);
      }
    }
  }, [id]);

  if (!order) {
    return (
      <AppLayout>
        <div className="space-y-4 py-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy vận đơn</h2>
          <p className="text-slate-500">Mã vận đơn không tồn tại hoặc đã bị xóa.</p>
          <Link to="/orders" className="text-primary hover:underline text-sm font-semibold">
            Quay lại danh sách
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Client add handler
  const handleAddClient = () => {
    if (!newClientName.trim()) {
      toast.error("Tên khách hàng không được để trống");
      return;
    }
    const newId = `KH${String(localClients.length + 1).padStart(3, "0")}`;
    const newC: StoredCustomer = {
      id: newId,
      name: newClientName.trim(),
      contact: "—",
      address: "—",
      unitPrice: 0,
      priceUnit: "Rolls",
    };
    const updated = [...localClients, newC];
    setLocalClients(updated);
    saveStoredCustomers(updated);
    setSelectedClient(newC.name);
    setNewClientName("");
    setIsAddingClient(false);
    toast.success(`Đã thêm khách hàng mới: ${newC.name}`);
  };

  // Goods handlers
  const addItem = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    setItems([...items, { id: newId, name: "", quantity: 1, unit: DEFAULT_ORDER_UNIT, weight: 0, volume: 0, shippingPrice: 0, extraFee: 0 }]);
  };

  const removeItem = (rowId: string) => {
    if (items.length === 1) {
      toast.error("Vui lòng giữ lại ít nhất 1 hàng hoá");
      return;
    }
    setItems(items.filter((item) => item.id !== rowId));
  };

  const updateItem = (rowId: string, field: keyof GoodsItem, value: any) => {
    setItems(items.map((item) => {
      if (item.id === rowId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Calculations
  const totalCost = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.shippingPrice) || 0) + (Number(item.extraFee) || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 1), 0);
  const totalVolume = items.reduce((sum, item) => sum + (Number(item.volume) || 0) * (Number(item.quantity) || 1), 0);

  // Form submit handler
  const handleSave = () => {
    if (!selectedClient) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }

    const weightDescs = items.map(it => `${it.quantity} ${it.unit}`).join(", ");

    const prevStatus = normalizeStatus(order.status);
    const logDate = new Date().toISOString().split("T")[0];
    let logs = [...orderLogs];
    if (currentStatus !== prevStatus) {
      logs = [
        ...logs,
        {
          id: `log-${Date.now()}`,
          type: "status_change" as const,
          date: logDate,
          status: currentStatus,
        },
      ];
    }

    const updatedOrder = {
      ...order,
      code: customCode.trim() || order.code,
      client: selectedClient,
      clientId: localClients.find(c => c.name === selectedClient)?.id || "KH999",
      status: currentStatus,
      createdAt: receivedDate,
      fee: totalCost,
      weight: weightDescs || `${totalWeight} kg`,
      origin: origin.includes("TQ") ? origin : `${origin}, TQ`,
      destination: destination.includes("VN") ? destination : `${destination}, VN`,
      items,
      note,
      masterBill,
      logs,
      updatedAt: currentStatus !== prevStatus ? logDate : (order.updatedAt || logDate),
    };

    const newOrdersList = allOrders.map((o) => (o.id === order.id ? updatedOrder : o));
    setAllOrders(newOrdersList);
    saveStoredOrders(newOrdersList);

    toast.success(`Đã lưu thay đổi cho vận đơn ${updatedOrder.code}`);
    navigate({ to: "/orders" });
  };

  // Timeline mock update based on status
  const handleStatusChange = (val: OrderStatus) => {
    setCurrentStatus(val);
  };

  // Photo gallery logic
  const handleOpenLightbox = (idx: number) => {
    setCurrentPhotoIdx(idx);
    setLightboxOpen(true);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev === 0 ? order.images.length - 1 : prev - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev === order.images.length - 1 ? 0 : prev + 1));
  };

  return (
    <AppLayout>
      <div className="space-y-5 text-left">
        {/* Back Link */}
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        {/* Title & Status Block matching Frame 15 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Chi tiết vận đơn</h2>
            <p className="text-xs text-slate-500 mt-0.5">Hiển thị thông tin lô hàng tuyến TQ – VN</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status dropdown */}
            <Select value={currentStatus} onValueChange={(val) => handleStatusChange(val as OrderStatus)}>
              <SelectTrigger className={cn("h-9 text-xs font-semibold border shadow-sm px-3.5 rounded-lg min-w-[260px]", statusColor[currentStatus])}>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{statusLabel[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* General Form Info */}
        <Card className="p-5 shadow-sm border-slate-200 space-y-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="receivedDate" className="text-xs font-semibold text-slate-700">Ngày nhận hàng *</Label>
              <Input
                id="receivedDate"
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="h-9 text-xs font-semibold"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="masterBill" className="text-xs font-semibold text-slate-700">Biển xe/vận đơn tổng</Label>
              <Input
                id="masterBill"
                placeholder="VD: GZ02"
                value={masterBill}
                onChange={(e) => setMasterBill(e.target.value)}
                className="h-9 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customCode" className="text-xs font-semibold text-slate-700">Mã vận đơn</Label>
              <Input
                id="customCode"
                placeholder="Nhập mã vận đơn..."
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="h-9 text-xs font-mono font-bold text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client selector with plus trigger */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Khách hàng *</Label>
              {isAddingClient ? (
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Tên khách mới..."
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="h-9 text-xs flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddClient();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleAddClient}
                    className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setIsAddingClient(false); setNewClientName(""); }}
                    className="h-9 px-2 text-xs shrink-0 text-slate-500 hover:bg-slate-100"
                  >
                    Hủy
                  </Button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="h-9 text-xs flex-1">
                      <SelectValue placeholder="Chọn khách hàng..." />
                    </SelectTrigger>
                    <SelectContent>
                      {localClients.map((c) => (
                        <SelectItem key={c.id} value={c.name} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 shrink-0"
                    onClick={() => setIsAddingClient(true)}
                    title="Thêm khách hàng mới"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="origin" className="text-xs font-semibold text-slate-700">Khách xuất (Điểm đi)</Label>
              <Input
                id="origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="h-9 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="destination" className="text-xs font-semibold text-slate-700">Khách đến (Điểm đến)</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="h-9 text-xs font-semibold"
              />
            </div>
          </div>
        </Card>

        {/* Dynamic Goods Items Editor */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Danh sách hàng hóa</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="h-8 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Thêm hàng hóa
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 w-[22%]">Hàng hoá *</th>
                    <th className="px-3 py-2.5 w-[8%] text-center">Số lượng</th>
                    <th className="px-3 py-2.5 w-[12%]">Đơn vị</th>
                    <th className="px-3 py-2.5 w-[11%]">K.Lượng (kg)</th>
                    <th className="px-3 py-2.5 text-right w-[15%]">Đơn giá (VND)</th>
                    <th className="px-3 py-2.5 text-right w-[15%]">Chi phí phát sinh (VND)</th>
                    <th className="px-3 py-2.5 text-right w-[13%]">Thành tiền</th>
                    <th className="px-3 py-2.5 text-center w-[6%]">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          placeholder="Nhập tên hàng hoá..."
                          className="h-8 text-xs py-1 px-2.5"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value) || 0)}
                          className="h-8 text-xs py-1 px-2 text-center"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={normalizeOrderUnit(item.unit)}
                          onValueChange={(val) => updateItem(item.id, "unit", val)}
                        >
                          <SelectTrigger className="h-8 text-xs py-1 px-2.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_SPEC_UNITS.map((u) => (
                              <SelectItem key={u} value={u} className="text-xs">
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.weight === 0 ? "" : item.weight}
                          onChange={(e) => updateItem(item.id, "weight", Number(e.target.value) || 0)}
                          className="h-8 text-xs py-1 px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={item.shippingPrice === 0 ? "" : item.shippingPrice.toLocaleString("en-US")}
                          onChange={(e) => updateItem(item.id, "shippingPrice", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                          className="h-8 text-xs py-1 px-2 text-right"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={!item.extraFee ? "" : item.extraFee.toLocaleString("en-US")}
                          onChange={(e) => updateItem(item.id, "extraFee", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                          className="h-8 text-xs py-1 px-2 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">
                        {formatVND(item.quantity * item.shippingPrice + (item.extraFee || 0))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Row matching Frame 15 */}
            <div className="bg-slate-50/70 border-t border-slate-100 p-3.5 flex items-center justify-between text-xs text-slate-600 font-semibold">
              <div>
                <span>Số lượng: <strong className="text-slate-900">{items.map(it => `${it.quantity} ${it.unit}`).join(", ")}</strong></span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Tổng thanh toán:</span>
                <span className="text-lg font-bold text-primary">{formatVND(totalCost)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attached Documents matching Frame 15 */}
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Tài liệu đính kèm</h3>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
              <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Tải lên tài liệu
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {order.images.map((src: string, idx: number) => (
              <div 
                key={idx} 
                className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm cursor-pointer group relative hover:border-primary transition-all duration-200"
                onClick={() => handleOpenLightbox(idx)}
              >
                <img 
                  src={src} 
                  alt={`Tài liệu ${idx + 1}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" 
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-0.5 rounded-full">Xem</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <Label htmlFor="note" className="text-xs font-semibold text-slate-700">Ghi chú</Label>
          <Textarea 
            id="note" 
            placeholder="Ghi chú thêm về lô hàng (ví dụ: Hàng dễ vỡ, cần bọc chống sốc)..." 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            className="text-xs min-h-[60px]"
          />
        </div>

        {/* Hành trình đơn hàng */}
        <div className="space-y-3 pt-1">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Hành trình đơn hàng</h3>
          <Card className="p-4 border-slate-200 shadow-sm">
            <div className="space-y-0">
              {orderLogs.map((log, idx) => {
                const isStatusLog = log.type === "status_change" || log.type === "completed";
                const logStatus = log.type === "completed" ? "da_giao_hang" : log.status;

                return (
                <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {idx < orderLogs.length - 1 && (
                    <div className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-200" />
                  )}
                  <div
                    className={cn(
                      "relative z-10 mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white",
                      log.type === "created" && "bg-slate-400",
                      isStatusLog && logStatus && statusDot[logStatus]
                    )}
                  />
                  <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-500 tabular-nums">{formatLogDate(log.date)}</span>
                      <span className="text-slate-300 hidden sm:inline">·</span>
                      {log.type === "created" && (
                        <span className="font-medium text-slate-800">Tạo đơn hàng</span>
                      )}
                      {isStatusLog && logStatus && (
                        <>
                          <span className="text-slate-600">Cập nhật trạng thái:</span>
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", statusColor[logStatus])}>
                            {statusLabel[logStatus]}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          </Card>
        </div>

        {/* Form actions */}
        <div className="pt-4 border-t flex justify-end gap-3.5">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate({ to: "/orders" })}
            className="h-10 text-xs font-semibold px-5 text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            Hủy
          </Button>
          <Button 
            type="button" 
            onClick={handleSave}
            className="h-10 text-xs font-semibold bg-primary hover:bg-primary/95 text-white px-6 shadow-md"
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* premium Receipts Lightbox Gallery matching Frame 16 */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col justify-between items-center py-6 px-4 animate-in fade-in duration-300"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Top Actions */}
          <div className="w-full max-w-5xl flex justify-end">
            <button 
              type="button"
              className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all shrink-0 cursor-pointer"
              onClick={() => setLightboxOpen(false)}
              title="Đóng"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Center Image and Nav Controls */}
          <div className="w-full max-w-4xl flex items-center justify-between gap-4 flex-1">
            {/* Left Nav */}
            <button
              type="button"
              className="text-white/60 hover:text-white bg-black/40 hover:bg-black/60 p-3 rounded-full transition-all border border-white/10 shrink-0 cursor-pointer"
              onClick={handlePrevPhoto}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            {/* Receipt Image Content */}
            <div 
              className="max-h-[70vh] max-w-[90%] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={order.images[currentPhotoIdx]}
                alt={`Biên lai Receipt ${currentPhotoIdx + 1}`}
                className="max-h-[70vh] w-auto max-w-full object-contain mx-auto animate-in zoom-in-95 duration-300 select-none"
              />
            </div>

            {/* Right Nav */}
            <button
              type="button"
              className="text-white/60 hover:text-white bg-black/40 hover:bg-black/60 p-3 rounded-full transition-all border border-white/10 shrink-0 cursor-pointer"
              onClick={handleNextPhoto}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>

          {/* Bottom count display */}
          <div className="text-white/80 font-bold bg-white/10 border border-white/10 rounded-full px-4.5 py-1.5 text-xs tracking-wide shadow-md animate-in slide-in-from-bottom duration-200">
            {currentPhotoIdx + 1} trong {order.images.length} ảnh
          </div>
        </div>
      )}
    </AppLayout>
  );
}
