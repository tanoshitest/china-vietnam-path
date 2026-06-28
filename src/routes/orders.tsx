import { createFileRoute, Link, useNavigate, useLocation, Outlet } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, Plus, Filter, Trash2, Calendar as CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  orders as mockOrders,
  statusLabel,
  statusColor,
  statusDot,
  ORDER_STATUSES,
  normalizeStatus,
  buildDemoOrderLogs,
  getOrderUpdatedAt,
  formatLogDate,
  formatVND,
  clients as mockClients,
  type OrderStatus,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { orderBelongsToClient, useAppRole } from "@/lib/app-role";
import { getLocalOrders, loadAllOrders, persistOrder, persistOrdersBatch } from "@/lib/order-storage";
import { getLocalCustomers, loadAllCustomers } from "@/lib/customer-storage";
import { getLocalProducts, loadAllProducts } from "@/lib/product-storage";
import { isDateInRange } from "@/lib/order-date";
import { useTmsPageLoader } from "@/lib/use-tms-page-loader";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Quản lý Vận đơn — Quocviet JR" }] }),
});

interface GoodsItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  weight: number;
  volume: number;
  shippingPrice: number;
  extraFee?: number;
}

type OrderCustomer = {
  id: string;
  name: string;
  unitPrice?: number;
  priceUnit?: string;
};

type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  unit: string;
};

const PRODUCT_UNITS = ["Cái", "Cuộn", "Thùng"] as const;
type ProductUnit = (typeof PRODUCT_UNITS)[number];

const normalizeProductUnit = (unit?: string): ProductUnit =>
  PRODUCT_UNITS.includes(unit as ProductUnit) ? (unit as ProductUnit) : "Cái";

const resolveProductUnit = (name: string, products: CatalogProduct[]): string => {
  const matched = products.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  return matched ? normalizeProductUnit(matched.unit) : "";
};

const DEMO_CUSTOMER_PRICING: Record<string, Pick<OrderCustomer, "unitPrice" | "priceUnit">> = {
  KH001: { unitPrice: 85000, priceUnit: "Rolls" },
  KH002: { unitPrice: 92000, priceUnit: "Sacks" },
  KH003: { unitPrice: 78000, priceUnit: "Bags" },
};

const createEmptyItem = (): GoodsItem => ({
  id: Math.random().toString(36).substring(2, 9),
  name: "",
  quantity: 1,
  unit: "",
  weight: 0,
  volume: 0,
  shippingPrice: 0,
  extraFee: 0,
});

const getStoredCustomers = (): OrderCustomer[] => {
  if (typeof window === "undefined") {
    return mockClients.map((c) => ({
      id: c.id,
      name: c.name,
      ...DEMO_CUSTOMER_PRICING[c.id],
    }));
  }
  return getLocalCustomers().map((item) => {
    const demo = DEMO_CUSTOMER_PRICING[item.id];
    return {
      id: item.id,
      name: item.name,
      unitPrice: item.unitPrice && item.unitPrice > 0 ? item.unitPrice : demo?.unitPrice,
      priceUnit: item.priceUnit ?? demo?.priceUnit,
    };
  });
};

const DEMO_PRODUCTS: CatalogProduct[] = [
  { id: "SP001", name: "Tai nghe Bluetooth", category: "Điện tử", unit: "Cái" },
  { id: "SP002", name: "Cáp sạc Type-C", category: "Phụ kiện", unit: "Cái" },
  { id: "SP003", name: "Thùng carton", category: "Vật tư", unit: "Thùng" },
];

const getStoredProducts = (): CatalogProduct[] => {
  if (typeof window === "undefined") return DEMO_PRODUCTS;
  const parsed = getLocalProducts();
  return parsed.length > 0 ? parsed : DEMO_PRODUCTS;
};

const applyCustomerPricing = (customer: OrderCustomer | undefined, currentItems: GoodsItem[]) => {
  if (!customer?.unitPrice) return currentItems;
  return currentItems.map((item) => ({
    ...item,
    shippingPrice: customer.unitPrice!,
  }));
};

const createItemForCustomer = (customer: OrderCustomer | undefined): GoodsItem => {
  const item = createEmptyItem();
  if (!customer?.unitPrice) return item;
  return {
    ...item,
    shippingPrice: customer.unitPrice,
  };
};

// Helpers for localStorage persistence
const loadOrders = () => loadAllOrders();

function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isClient, client } = useAppRole();
  const [allOrders, setAllOrders] = useState<any[]>([]);

  const hydrateFromLocal = useCallback(() => {
    setAllOrders(getLocalOrders());
  }, []);

  const syncFromRemote = useCallback(() => loadAllOrders().then(setAllOrders), []);

  useTmsPageLoader(hydrateFromLocal, syncFromRemote);

  // If navigating to detail route, render Outlet directly
  if (location.pathname !== "/orders" && location.pathname !== "/orders/") {
    return <Outlet />;
  }

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  
  // Date filters matching Mockup default: "01/01/2026 - 30/07/2026"
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-07-30");

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  // Form states for Create Modal
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [masterBill, setMasterBill] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [origin, setOrigin] = useState("Quảng Châu");
  const [destination, setDestination] = useState("Hà Nội");
  const [note, setNote] = useState("");

  // Local lists for autocomplete / selection
  const [localClients, setLocalClients] = useState<OrderCustomer[]>(() => getStoredCustomers());
  const [localProducts, setLocalProducts] = useState<CatalogProduct[]>(() => getStoredProducts());

  useEffect(() => {
    void Promise.all([loadAllCustomers(), loadAllProducts()]).then(() => {
      setLocalClients(getStoredCustomers());
      setLocalProducts(getStoredProducts());
    });
  }, []);
  const [clientQuery, setClientQuery] = useState("");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [productPopoverRowId, setProductPopoverRowId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");

  // Goods item dynamic list
  const [items, setItems] = useState<GoodsItem[]>([createEmptyItem()]);

  // Filters logic
  const visibleOrders = isClient
    ? allOrders.filter((order) => orderBelongsToClient(order, client))
    : allOrders;

  const filtered = visibleOrders.filter((o) => {
    const matchQ =
      o.code.toLowerCase().includes(q.toLowerCase()) ||
      o.client.toLowerCase().includes(q.toLowerCase());
    
    const matchS = status === "all" || normalizeStatus(o.status) === status;
    const matchDate = isDateInRange(o.createdAt, startDate, endDate);

    return matchQ && matchS && matchDate;
  });

  // Checkbox handlers
  const handleToggleRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleToggleAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((o) => o.id));
    }
  };

  // Bulk Actions submissions
  const handleBulkStatusUpdate = (newStatus: OrderStatus) => {
    if (selectedIds.length === 0) return;

    const logDate = new Date().toISOString().split("T")[0];

    const updated = allOrders.map((o) => {
      if (!selectedIds.includes(o.id)) return o;

      const prevStatus = normalizeStatus(o.status);
      if (prevStatus === newStatus) return o;

      const logs = [
        ...buildDemoOrderLogs(o),
        {
          id: `log-${Date.now()}-${o.id}`,
          type: "status_change" as const,
          date: logDate,
          status: newStatus,
        },
      ];

      return { ...o, status: newStatus, logs, updatedAt: logDate };
    });

    setAllOrders(updated);
    const changed = updated.filter((o) => selectedIds.includes(o.id));
    void persistOrdersBatch(changed, updated).catch(() => toast.error("Lưu Supabase thất bại"));
    toast.success(`Đã cập nhật trạng thái hàng loạt cho ${selectedIds.length} vận đơn`, {
      description: `Trạng thái mới: ${statusLabel[newStatus]}`,
    });
    setSelectedIds([]);
  };

  const handleRowStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    const logDate = new Date().toISOString().split("T")[0];

    const updated = allOrders.map((o) => {
      if (o.id !== orderId) return o;

      const prevStatus = normalizeStatus(o.status);
      if (prevStatus === newStatus) return o;

      const logs = [
        ...buildDemoOrderLogs(o),
        {
          id: `log-${Date.now()}-${o.id}`,
          type: "status_change" as const,
          date: logDate,
          status: newStatus,
        },
      ];

      return { ...o, status: newStatus, logs, updatedAt: logDate };
    });

    setAllOrders(updated);
    const changed = updated.find((o) => o.id === orderId);
    if (changed) {
      void persistOrder(changed, updated).catch(() => toast.error("Lưu Supabase thất bại"));
    }
    toast.success(`Đã cập nhật trạng thái vận đơn`, {
      description: statusLabel[newStatus],
    });
  };

  const filteredClients = localClients.filter((c) =>
    c.name.toLowerCase().includes(clientQuery.trim().toLowerCase())
  );

  const selectedCustomer = localClients.find((c) => c.name === selectedClient);

  const filteredProducts = localProducts.filter((product) => {
    const needle = productQuery.trim().toLowerCase();
    if (!needle) return true;
    return (
      product.name.toLowerCase().includes(needle) ||
      product.category.toLowerCase().includes(needle) ||
      product.unit.toLowerCase().includes(needle)
    );
  });

  const selectCustomer = (customer: OrderCustomer) => {
    setSelectedClient(customer.name);
    setClientQuery(customer.name);
    setClientPopoverOpen(false);
    setItems((prev) => applyCustomerPricing(customer, prev));
  };

  const selectProduct = (rowId: string, product: CatalogProduct) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? {
              ...item,
              name: product.name,
              unit: normalizeProductUnit(product.unit),
              shippingPrice: selectedCustomer?.unitPrice ?? item.shippingPrice,
            }
          : item,
      ),
    );
    setProductPopoverRowId(null);
    setProductQuery("");
  };

  const addItem = () => {
    setItems((prev) => [...prev, createItemForCustomer(selectedCustomer)]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error("Vui lòng giữ lại ít nhất 1 hàng hoá");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof GoodsItem, value: any) => {
    setItems(items.map((item) => {
      if (item.id !== id) return item;
      if (field === "name") {
        return {
          ...item,
          name: value,
          unit: resolveProductUnit(String(value), localProducts),
        };
      }
      return { ...item, [field]: value };
    }));
  };

  // Calculations
  const totalUniqueItems = items.length;
  const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 1), 0);
  const totalCost = items.reduce(
    (sum, item) =>
      sum +
      (Number(item.quantity) || 0) * (Number(item.shippingPrice) || 0) +
      (Number(item.extraFee) || 0),
    0
  );

  const resetForm = () => {
    setReceivedDate(new Date().toISOString().split("T")[0]);
    setMasterBill("");
    setCustomCode("");
    setSelectedClient("");
    setClientQuery("");
    setClientPopoverOpen(false);
    setProductPopoverRowId(null);
    setProductQuery("");
    setOrigin("Quảng Châu");
    setDestination("Hà Nội");
    setNote("");
    setItems([createEmptyItem()]);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setCustomCode("CRTO-" + Math.floor(1000000 + Math.random() * 9000000) + "-01");
      setLocalClients(getStoredCustomers());
      setLocalProducts(getStoredProducts());
      setSelectedClient("");
      setClientQuery("");
      setClientPopoverOpen(false);
      setItems([createEmptyItem()]);
    } else {
      resetForm();
    }
  };

  const submit = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error("Vui lòng chọn khách hàng từ danh sách");
      return;
    }

    const code = customCode.trim() || ("CRTO-" + Math.floor(1000000 + Math.random() * 9000000) + "-01");

    // Dynamic weight formatting
    const weightDescs = items.map(it => `${it.quantity} ${it.unit}`).join(", ");
    
    // Create new order object
    const newOrder = {
      id: String(allOrders.length + 1),
      code,
      client: selectedClient,
      clientId: localClients.find(c => c.name === selectedClient)?.id || "KH999",
      status: "van_chuyen_noi_dia_tq" as OrderStatus,
      fee: totalCost,
      createdAt: receivedDate,
      updatedAt: "",
      weight: weightDescs || `${totalWeight} kg`,
      origin,
      destination,
      images: [
        "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=600"
      ],
      timeline: [
        { label: "Vận chuyển nội địa Trung Quốc", location: origin, date: receivedDate.split("-").reverse().slice(0, 2).join("/"), done: true },
        { label: "Đang thông quan", location: "Hữu Nghị Quan", date: "—", done: false },
        { label: "Hàng nhập Kho Hà Nội", location: "Hà Nội", date: "—", done: false },
        { label: "Đang giao hàng", location: destination, date: "—", done: false },
      ],
      costs: [
        { id: "c1", type: "Vendor vận chuyển TQ" as const, vendor: "GZ Express", amount: totalCost * 0.4 },
        { id: "c2", type: "Vendor thông quan" as const, vendor: "Hải quan Hữu Nghị", amount: totalCost * 0.15 },
      ],
      items,
      note,
      masterBill,
      logs: [
        { id: "log-created", type: "created" as const, date: receivedDate },
        { id: "log-status-0", type: "status_change" as const, date: receivedDate, status: "van_chuyen_noi_dia_tq" as OrderStatus },
      ],
    };

    const newOrdersList = [newOrder, ...allOrders];
    setAllOrders(newOrdersList);
    void persistOrder(newOrder, newOrdersList).catch(() => toast.error("Lưu Supabase thất bại"));
    
    toast.success(isDraft ? `Đã lưu nháp vận đơn ${code}` : `Đã tạo thành công vận đơn ${code}`, {
      description: `Khách hàng: ${selectedClient} - Cước phí: ${formatVND(totalCost)}`
    });
    setOpen(false);
    resetForm();
  };

  return (
    <AppLayout>
      <div className={cn("flex flex-col", isClient ? "h-full gap-3" : "space-y-5")}>
        <div className={cn("flex items-center justify-between", isClient && "shrink-0")}>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {isClient ? "Vận đơn của tôi" : "Quản lý Vận đơn"}
            </h2>
            <p className="text-sm text-slate-500">
              {isClient
                ? `Danh sách vận đơn của ${client.name} (${client.id})`
                : "Theo dõi toàn bộ đơn hàng tuyến TQ – VN"}
            </p>
          </div>

          {!isClient && (
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/95 text-white transition-all shadow-sm duration-200">
                <Plus className="w-4 h-4 mr-1.5" /> Tạo vận đơn
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
              <DialogHeader className="pb-4 border-b">
                <DialogTitle className="text-xl font-semibold text-slate-900">Tạo vận đơn mới</DialogTitle>
                <DialogDescription>Nhập thông tin lô hàng và chi tiết các mặt hàng tuyến TQ – VN</DialogDescription>
              </DialogHeader>
              
              <form onSubmit={(e) => submit(e, false)} className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-5 text-left">
                  {/* General Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="receivedDate" className="text-xs font-semibold text-slate-700">Ngày nhận hàng <span className="text-red-500">*</span></Label>
                      <Input 
                        id="receivedDate" 
                        type="date"
                        value={receivedDate} 
                        onChange={(e) => setReceivedDate(e.target.value)} 
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="masterBill" className="text-xs font-semibold text-slate-700">Biển xe/vận đơn tổng</Label>
                      <Input 
                        id="masterBill" 
                        placeholder="VD: MBN-GZH-HN" 
                        value={masterBill} 
                        onChange={(e) => setMasterBill(e.target.value)} 
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="customCode" className="text-xs font-semibold text-slate-700">Mã vận đơn</Label>
                      <Input 
                        id="customCode" 
                        placeholder="Tự động tạo..." 
                        value={customCode} 
                        onChange={(e) => setCustomCode(e.target.value)} 
                        className="h-9 text-sm font-mono text-primary font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Client search — chỉ chọn từ danh mục khách hàng */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Khách hàng <span className="text-red-500">*</span></Label>
                      <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                        <PopoverAnchor asChild>
                          <Input
                            placeholder="Tìm và chọn khách hàng..."
                            value={clientQuery}
                            onChange={(e) => {
                              setClientQuery(e.target.value);
                              setSelectedClient("");
                              setClientPopoverOpen(true);
                            }}
                            onFocus={() => setClientPopoverOpen(true)}
                            className="h-9 text-sm"
                            autoComplete="off"
                          />
                        </PopoverAnchor>
                        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                          <Command shouldFilter={false}>
                            <CommandList>
                              <CommandEmpty>Không tìm thấy khách hàng</CommandEmpty>
                              <CommandGroup>
                                {filteredClients.map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={c.name}
                                    onSelect={() => selectCustomer(c)}
                                    className="text-sm"
                                  >
                                    <div className="flex w-full items-center justify-between gap-2">
                                      <span>{c.name}</span>
                                      {c.unitPrice ? (
                                        <span className="text-[11px] text-slate-500">
                                          {c.unitPrice.toLocaleString("en-US")} VND/{c.priceUnit ?? "đv"}
                                        </span>
                                      ) : null}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {selectedCustomer?.unitPrice ? (
                        <p className="text-[11px] text-slate-500">
                          Đơn giá cấu hình:{" "}
                          <span className="font-semibold text-primary">
                            {selectedCustomer.unitPrice.toLocaleString("en-US")} VND/{selectedCustomer.priceUnit ?? "đv"}
                          </span>
                          {" "}— đã điền vào giá cước, có thể sửa từng dòng.
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="origin" className="text-xs font-semibold text-slate-700">Khách xuất (Điểm đi)</Label>
                      <Input 
                        id="origin" 
                        value={origin} 
                        onChange={(e) => setOrigin(e.target.value)} 
                        className="h-9 text-sm"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="destination" className="text-xs font-semibold text-slate-700">Khách đến (Điểm đến)</Label>
                      <Input 
                        id="destination" 
                        value={destination} 
                        onChange={(e) => setDestination(e.target.value)} 
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Goods Item Table Section */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Danh sách hàng hóa</h3>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={addItem}
                        className="h-8 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Thêm hàng hóa
                      </Button>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[960px] text-xs text-left border-collapse">
                          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2.5 whitespace-nowrap">Hàng hoá <span className="text-red-500">*</span></th>
                              <th className="px-3 py-2.5 whitespace-nowrap text-center">Số lượng</th>
                              <th className="px-3 py-2.5 whitespace-nowrap">Đơn vị</th>
                              <th className="px-3 py-2.5 whitespace-nowrap">K.Lượng (kg)</th>
                              <th className="px-3 py-2.5 whitespace-nowrap text-right">Giá cước (VND)</th>
                              <th className="px-3 py-2.5 whitespace-nowrap text-right">Chi phí phát sinh (VND)</th>
                              <th className="px-3 py-2.5 whitespace-nowrap text-right">Thành tiền</th>
                              <th className="px-3 py-2.5 whitespace-nowrap text-center">Xóa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-3 py-2">
                                  <Popover
                                    open={productPopoverRowId === item.id}
                                    onOpenChange={(isOpen) => {
                                      if (isOpen) {
                                        setProductPopoverRowId(item.id);
                                        setProductQuery(item.name);
                                      } else if (productPopoverRowId === item.id) {
                                        setProductPopoverRowId(null);
                                        setProductQuery("");
                                      }
                                    }}
                                  >
                                    <PopoverAnchor asChild>
                                      <Input
                                        value={productPopoverRowId === item.id ? productQuery : item.name}
                                        onChange={(e) => {
                                          setProductQuery(e.target.value);
                                          setProductPopoverRowId(item.id);
                                          updateItem(item.id, "name", e.target.value);
                                        }}
                                        onFocus={() => {
                                          setProductPopoverRowId(item.id);
                                          setProductQuery(item.name);
                                        }}
                                        placeholder="Chọn hàng hoá..."
                                        className="h-8 text-xs py-1 px-2.5"
                                        required
                                        autoComplete="off"
                                      />
                                    </PopoverAnchor>
                                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                                      <Command shouldFilter={false}>
                                        <CommandList>
                                          <CommandEmpty>Không tìm thấy sản phẩm trong danh mục</CommandEmpty>
                                          <CommandGroup>
                                            {filteredProducts.map((product) => (
                                              <CommandItem
                                                key={product.id}
                                                value={product.name}
                                                onSelect={() => selectProduct(item.id, product)}
                                                className="text-xs"
                                              >
                                                <div className="flex w-full items-center justify-between gap-2">
                                                  <span>{product.name}</span>
                                                  <span className="text-[11px] text-slate-500">
                                                    {product.category} · {product.unit}
                                                  </span>
                                                </div>
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
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
                                  <Input
                                    value={item.unit || "—"}
                                    readOnly
                                    disabled
                                    tabIndex={-1}
                                    className="h-8 text-xs py-1 px-2.5 bg-slate-50 cursor-default opacity-100 font-semibold text-slate-600"
                                  />
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

                      {/* Summary Row */}
                      <div className="bg-slate-50/70 border-t border-slate-100 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 font-medium">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span>Tổng cộng: <strong className="text-slate-900">{totalUniqueItems}</strong> hàng hoá</span>
                          <span className="text-slate-300">|</span>
                          <span><strong className="text-slate-900">{totalUnits}</strong> đơn vị</span>
                          <span className="text-slate-300">|</span>
                          <span>Khối lượng: <strong className="text-slate-900">{totalWeight.toLocaleString("vi-VN")}</strong> kg</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-auto sm:ml-0">
                          <span className="text-slate-500 uppercase tracking-wider text-[10px]">Tổng thanh toán:</span>
                          <span className="text-lg font-bold text-primary">{formatVND(totalCost)}</span>
                        </div>
                      </div>
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
                </div>

                <DialogFooter className="pt-4 border-t gap-2 flex items-center justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpen(false)}
                    className="h-9 text-xs font-semibold text-slate-700 px-4 hover:bg-slate-50"
                  >
                    Hủy
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={(e) => submit(e, true)}
                    className="h-9 text-xs font-semibold border-slate-200 text-slate-700 px-4 hover:bg-slate-50"
                  >
                    Lưu nháp
                  </Button>
                  <Button 
                    type="submit"
                    className="h-9 text-xs font-semibold bg-primary hover:bg-primary/95 text-white px-5 shadow-sm"
                  >
                    Tạo vận đơn
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Filters and Actions Block */}
        <Card className={cn("space-y-4 p-4", isClient && "shrink-0")}>
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={
                  isClient
                    ? "Tìm theo mã vận đơn..."
                    : "Tìm theo tên khách hàng hoặc mã vận đơn..."
                }
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 text-sm h-10"
              />
            </div>

            {/* Date range filter matching Frame 9: "01/01/2026 - 30/07/2026" */}
            <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-white text-xs text-slate-600 shadow-sm md:w-[280px] shrink-0 border-slate-200 h-10">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <div className="flex items-center gap-1.5 flex-1 justify-between">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="bg-transparent border-none p-0 outline-none text-slate-700 select-none text-[11px] w-[85px] cursor-pointer"
                />
                <span className="text-slate-300 font-light">to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="bg-transparent border-none p-0 outline-none text-slate-700 select-none text-[11px] w-[85px] cursor-pointer"
                />
              </div>
            </div>

            {/* Status select filter */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="md:w-[200px] h-10">
                <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Action Trigger Bar matching Frame 9 / Frame 12 */}
          {!isClient && selectedIds.length > 0 && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <span className="font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Đang chọn {selectedIds.length}
                </span>
                <span>vận đơn được chọn để thay đổi</span>
              </div>
              <div className="flex gap-2 items-center">
                {/* Dropdown "Thực hiện hàng loạt" */}
                <Select
                  value=""
                  onValueChange={(val) => handleBulkStatusUpdate(val as OrderStatus)}
                >
                  <SelectTrigger className="w-[240px] bg-white h-8 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50">
                    <SelectValue placeholder="Thực hiện hàng loạt" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-medium cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot[s])} />
                          {statusLabel[s]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setSelectedIds([])} 
                  className="h-8 text-xs text-slate-500 hover:text-slate-700"
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Orders Table Card */}
        <Card className={cn("overflow-hidden border-slate-200 p-0 shadow-sm", isClient && "flex min-h-0 flex-1 flex-col")}>
          <div className="overflow-x-auto">
          <div className={cn(isClient ? "min-h-0 flex-1 overflow-y-auto" : "max-h-[440px] overflow-y-auto")}>
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-[0_1px_0_0_rgb(226_232_240)]">
              <tr>
                {!isClient && (
                <th className="px-4 py-3 text-center w-[40px]">
                  <input 
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={handleToggleAll}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                </th>
                )}
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Mã vận đơn</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Tên khách hàng</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Tổng số lượng</th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Thành tiền</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Ngày nhận</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Ngày cập nhật</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => (
                <tr 
                  key={o.id} 
                  className={cn(
                    "hover:bg-slate-50/50 transition-colors cursor-pointer",
                    selectedIds.includes(o.id) && "bg-blue-50/20"
                  )}
                  onClick={() => navigate({ to: "/orders/$id", params: { id: o.id } })}
                >
                  {!isClient && (
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(o.id)}
                      onChange={() => handleToggleRow(o.id)}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                  </td>
                  )}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-primary hover:underline">
                      {o.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-semibold text-xs">{o.client}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-[180px] truncate" title={o.weight}>
                    {o.weight || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 font-semibold text-xs whitespace-nowrap">
                    {o.fee.toLocaleString("en-US")} VND
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                    {o.createdAt ? formatLogDate(o.createdAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                    {formatLogDate(getOrderUpdatedAt(o)) || "—"}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {isClient ? (
                      <span
                        className={cn(
                          "inline-flex min-w-[260px] justify-center rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-sm",
                          statusColor[normalizeStatus(o.status)]
                        )}
                      >
                        {statusLabel[normalizeStatus(o.status)]}
                      </span>
                    ) : (
                    <Select
                      value={normalizeStatus(o.status)}
                      onValueChange={(val) => handleRowStatusUpdate(o.id, val as OrderStatus)}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-9 text-xs font-semibold border shadow-sm px-3.5 rounded-lg min-w-[260px]",
                          statusColor[normalizeStatus(o.status)]
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="start">
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {statusLabel[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isClient ? 7 : 8} className="text-center py-12 text-slate-400 text-sm">
                    Không tìm thấy vận đơn nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
