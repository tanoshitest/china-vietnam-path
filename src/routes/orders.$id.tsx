import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
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
  FileText,
  Download,
} from "lucide-react";
import {
  statusLabel,
  statusColor,
  statusDot,
  ORDER_STATUSES,
  normalizeStatus,
  formatVND,
  formatLogDate,
  buildDemoOrderLogs,
  buildItemFieldChangeLog,
  buildManualOrderLog,
  createOrderLogId,
  todayLogDate,
  getOrderAttachments,
  isImageAttachment,
  clients as mockClients,
  type OrderStatus,
  type GoodsItem,
  type Order,
  type OrderLog,
  type OrderAttachment,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { orderBelongsToClient, useAppRole } from "@/lib/app-role";
import { probeSupabaseSync } from "@/lib/supabase-health";
import { loadAllOrders, persistOrder } from "@/lib/order-storage";

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

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const ATTACHMENT_ACCEPT =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsDataURL(file);
  });

const syncOrderImages = (attachments: OrderAttachment[]): string[] =>
  attachments.filter(isImageAttachment).map((item) => item.url);

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

function OrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isClient, client } = useAppRole();
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [cloudSync, setCloudSync] = useState<boolean | null>(null);
  const skipSaveRef = useRef(true);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const lastSavedRef = useRef<Order | null>(null);

  // Form states matching Frame 15
  const [receivedDate, setReceivedDate] = useState("");
  const [masterBill, setMasterBill] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [origin, setOrigin] = useState("Quảng Châu");
  const [destination, setDestination] = useState("Hà Nội");
  const [note, setNote] = useState("");
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([]);
  const [manualLogText, setManualLogText] = useState("");
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>("van_chuyen_noi_dia_tq");

  // Goods item dynamic list
  const [items, setItems] = useState<GoodsItem[]>([]);
  const [savedItemNotes, setSavedItemNotes] = useState<Record<string, string>>({});
  
  // Local list units & clients
  const [localClients, setLocalClients] = useState<StoredCustomer[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [isAddingClient, setIsAddingClient] = useState(false);

  // Lightbox Receipt Gallery state matching Frame 16
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageAttachments = useMemo(
    () => attachments.filter(isImageAttachment),
    [attachments],
  );

  useEffect(() => {
    void probeSupabaseSync().then(setCloudSync);
  }, []);

  // Load order data
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      skipSaveRef.current = true;

      const list = await loadAllOrders();
      if (cancelled) return;

      setAllOrders(list);
      setLocalClients(getStoredCustomers());
      const target = list.find((o) => o.id === id || o.code === id);

      if (target) {
        setOrder(target);
        lastSavedRef.current = target;
        setReceivedDate(target.createdAt || "");
        setMasterBill(target.masterBill || "");
        setCustomCode(target.code || "");
        setSelectedClient(target.client || "");
        setOrigin(target.origin ? target.origin.replace(", TQ", "").replace(", VN", "") : "Quảng Châu");
        setDestination(target.destination ? target.destination.replace(", TQ", "").replace(", VN", "") : "Hà Nội");
        setNote(target.note || "");
        setOrderLogs(buildDemoOrderLogs(target));
        setCurrentStatus(normalizeStatus(target.status));
        setAttachments(getOrderAttachments(target));

        if (target.items && target.items.length > 0) {
          setItems(target.items);
          setSavedItemNotes(Object.fromEntries(target.items.map((it) => [it.id, it.note || ""])));
        } else {
          const defaults = [
            { id: "1", name: "bỉm bỉm", quantity: 1, unit: "Rolls", weight: 267.23, volume: 8, shippingPrice: 120000000, extraFee: 0 },
            { id: "2", name: "bỉm bỉm", quantity: 2, unit: "Sacks", weight: 2700, volume: 1.2, shippingPrice: 2000000, extraFee: 0 },
          ];
          setItems(defaults);
          setSavedItemNotes(Object.fromEntries(defaults.map((it) => [it.id, ""])));
        }
      } else {
        setOrder(null);
      }

      setLoading(false);
      window.setTimeout(() => {
        skipSaveRef.current = false;
      }, 300);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const readOnly = isClient;

  const buildUpdatedOrder = (
    nextItems: GoodsItem[] = items,
    nextLogs: OrderLog[] = orderLogs,
    nextAttachments: OrderAttachment[] = attachments,
  ): Order => {
    const weightDescs = nextItems.map((it) => `${it.quantity} ${it.unit}`).join(", ");
    const logDate = todayLogDate();
    return {
      ...order!,
      code: customCode.trim() || order!.code,
      client: selectedClient,
      clientId: localClients.find((c) => c.name === selectedClient)?.id || order!.clientId || "KH999",
      status: currentStatus,
      createdAt: receivedDate,
      fee: nextItems.reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 0) * (Number(item.shippingPrice) || 0) + (Number(item.extraFee) || 0),
        0,
      ),
      weight: weightDescs || `${nextItems.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 1), 0)} kg`,
      origin: origin.includes("TQ") ? origin : `${origin}, TQ`,
      destination: destination.includes("VN") ? destination : `${destination}, VN`,
      items: nextItems,
      note,
      masterBill,
      logs: nextLogs,
      attachments: nextAttachments,
      images: syncOrderImages(nextAttachments),
      updatedAt: logDate,
    };
  };

  const appendStatusLogIfNeeded = (logs: OrderLog[]): OrderLog[] => {
    const prev = normalizeStatus(lastSavedRef.current?.status ?? order!.status);
    if (currentStatus === prev) return logs;
    return [
      ...logs,
      {
        id: createOrderLogId(),
        type: "status_change" as const,
        date: todayLogDate(),
        status: currentStatus,
      },
    ];
  };

  const persistOrderFull = async (
    nextOrder: Order,
    options?: { syncItems?: GoodsItem[]; syncLogs?: OrderLog[]; syncAttachments?: OrderAttachment[] },
  ) => {
    const list = allOrders.map((existing) => (existing.id === nextOrder.id ? nextOrder : existing));
    setSaveStatus("saving");
    try {
      await persistOrder(nextOrder, list);
      setOrder(nextOrder);
      setAllOrders(list);
      if (options?.syncItems) setItems(options.syncItems);
      if (options?.syncLogs) setOrderLogs(options.syncLogs);
      if (options?.syncAttachments) setAttachments(options.syncAttachments);
      lastSavedRef.current = nextOrder;
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      if (String(error).includes("STORAGE_FULL")) {
        toast.error("Không lưu được — bộ nhớ trình duyệt đã đầy");
      } else {
        toast.error("Lưu thất bại — kiểm tra kết nối Supabase");
      }
      throw error;
    }
  };

  const scheduleAutoSave = () => {
    if (readOnly || skipSaveRef.current || !order) return;
    setSaveStatus("pending");
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      if (!selectedClient.trim()) return;
      const logs = appendStatusLogIfNeeded(orderLogs);
      if (logs !== orderLogs) setOrderLogs(logs);
      const nextOrder = buildUpdatedOrder(items, logs, attachments);
      try {
        await persistOrderFull(nextOrder, { syncLogs: logs });
      } catch {
        /* toast shown in persistOrderFull */
      }
    }, 800);
  };

  useEffect(() => {
    scheduleAutoSave();
    return () => window.clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    receivedDate,
    masterBill,
    customCode,
    selectedClient,
    origin,
    destination,
    note,
    currentStatus,
    items,
    attachments,
    orderLogs,
  ]);

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
    setItems([...items, { id: newId, name: "", quantity: 1, unit: DEFAULT_ORDER_UNIT, weight: 0, volume: 0, shippingPrice: 0, extraFee: 0, note: "" }]);
    setSavedItemNotes((prev) => ({ ...prev, [newId]: "" }));
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

  const persistOrderState = async (nextItems: GoodsItem[], nextLogs: OrderLog[]) => {
    const nextOrder = buildUpdatedOrder(nextItems, nextLogs, attachments);
    await persistOrderFull(nextOrder, { syncItems: nextItems, syncLogs: nextLogs });
  };

  const appendOrderLog = (log: OrderLog, nextItems: GoodsItem[] = items) => {
    void persistOrderState(nextItems, [...orderLogs, log]);
  };

  const logItemFieldChange = (
    item: GoodsItem,
    fieldLabel: string,
    oldValue: string,
    newValue: string,
    nextItems: GoodsItem[] = items,
  ) => {
    if (oldValue === newValue) return;
    appendOrderLog(buildItemFieldChangeLog(item.name, fieldLabel, oldValue, newValue), nextItems);
  };

  const handleSaveItemNote = (item: GoodsItem) => {
    const prev = savedItemNotes[item.id] ?? "";
    const newVal = item.note || "";
    if (prev === newVal) {
      toast.message("Ghi chú không thay đổi");
      return;
    }
    const nextItems = items.map((it) =>
      it.id === item.id ? { ...it, note: newVal } : it,
    );
    logItemFieldChange(item, "ghi chú", prev, newVal, nextItems);
    setSavedItemNotes((prevNotes) => ({ ...prevNotes, [item.id]: newVal }));
    toast.success("Đã lưu ghi chú");
  };

  const handleSaveManualLog = () => {
    const text = manualLogText.trim();
    if (!text) {
      toast.error("Vui lòng nhập nội dung log");
      return;
    }
    appendOrderLog(buildManualOrderLog(text));
    setManualLogText("");
    toast.success("Đã lưu log");
  };

  const persistAttachments = async (nextAttachments: OrderAttachment[]) => {
    const nextOrder = buildUpdatedOrder(items, orderLogs, nextAttachments);
    try {
      await persistOrderFull(nextOrder, { syncAttachments: nextAttachments });
    } catch {
      return;
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;

    const nextAttachments = [...attachments];
    let added = 0;

    for (const file of Array.from(selected)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`"${file.name}" vượt quá 4MB`);
        continue;
      }

      try {
        const url = await readFileAsDataUrl(file);
        nextAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          url,
        });
        added += 1;
      } catch {
        toast.error(`Không thể đọc file "${file.name}"`);
      }
    }

    if (added > 0) {
      await persistAttachments(nextAttachments);
      toast.success(`Đã tải lên ${added} tài liệu`);
    }

    e.target.value = "";
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    const target = attachments.find((item) => item.id === attachmentId);
    await persistAttachments(attachments.filter((item) => item.id !== attachmentId));
    toast.success(`Đã xóa tài liệu${target?.name ? `: ${target.name}` : ""}`);
  };

  // Calculations
  const totalCost = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.shippingPrice) || 0) + (Number(item.extraFee) || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 1), 0);
  const totalVolume = items.reduce((sum, item) => sum + (Number(item.volume) || 0) * (Number(item.quantity) || 1), 0);

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
    setCurrentPhotoIdx((prev) => (prev === 0 ? imageAttachments.length - 1 : prev - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev === imageAttachments.length - 1 ? 0 : prev + 1));
  };

  const saveStatusLabel =
    saveStatus === "saving"
      ? "Đang lưu..."
      : saveStatus === "saved"
        ? "Đã lưu tự động"
        : saveStatus === "error"
          ? "Lưu thất bại"
          : saveStatus === "pending"
            ? "Sẽ lưu..."
            : cloudSync === true
              ? "Cloud"
              : "Local";

  if (loading) {
    return (
      <AppLayout>
        <div className="py-12 text-center text-sm text-slate-500">Đang tải vận đơn...</div>
      </AppLayout>
    );
  }

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

  if (isClient && !orderBelongsToClient(order, client)) {
    return (
      <AppLayout>
        <div className="space-y-4 py-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Không có quyền xem vận đơn</h2>
          <p className="text-slate-500">Vận đơn này không thuộc tài khoản khách hàng của bạn.</p>
          <Link to="/orders" className="text-primary hover:underline text-sm font-semibold">
            Quay lại danh sách
          </Link>
        </div>
      </AppLayout>
    );
  }

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
            <p className="text-xs text-slate-500 mt-0.5">
              Hiển thị thông tin lô hàng tuyến TQ – VN
              {!readOnly && (
                <span
                  className={cn(
                    "ml-2 font-semibold",
                    saveStatus === "error" ? "text-red-600" : saveStatus === "saved" ? "text-emerald-600" : "text-slate-400",
                  )}
                >
                  · {saveStatusLabel}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {readOnly ? (
              <span className={cn("inline-flex h-9 items-center rounded-lg border px-3.5 text-xs font-semibold shadow-sm min-w-[260px]", statusColor[currentStatus])}>
                {statusLabel[currentStatus]}
              </span>
            ) : (
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
            )}
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
                readOnly={readOnly}
                disabled={readOnly}
                className={cn("h-9 text-xs font-semibold", readOnly && "bg-slate-50 cursor-default opacity-100")}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="masterBill" className="text-xs font-semibold text-slate-700">Biển xe/vận đơn tổng</Label>
              <Input
                id="masterBill"
                placeholder="VD: GZ02"
                value={masterBill}
                onChange={(e) => setMasterBill(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
                className={cn("h-9 text-xs font-semibold", readOnly && "bg-slate-50 cursor-default opacity-100")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customCode" className="text-xs font-semibold text-slate-700">Mã vận đơn</Label>
              <Input
                id="customCode"
                placeholder="Nhập mã vận đơn..."
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
                className={cn("h-9 text-xs font-mono font-bold text-primary", readOnly && "bg-slate-50 cursor-default opacity-100")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client selector with plus trigger */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Khách hàng *</Label>
              {readOnly ? (
                <Input
                  value={selectedClient}
                  readOnly
                  disabled
                  className="h-9 text-xs bg-slate-50 cursor-default opacity-100"
                />
              ) : isAddingClient ? (
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
                readOnly={readOnly}
                disabled={readOnly}
                className={cn("h-9 text-xs font-semibold", readOnly && "bg-slate-50 cursor-default opacity-100")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="destination" className="text-xs font-semibold text-slate-700">Khách đến (Điểm đến)</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
                className={cn("h-9 text-xs font-semibold", readOnly && "bg-slate-50 cursor-default opacity-100")}
              />
            </div>
          </div>
        </Card>

        {/* Dynamic Goods Items Editor */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Danh sách hàng hóa</h3>
            {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="h-8 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Thêm hàng hóa
            </Button>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse table-fixed">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-2 py-2.5 w-[13%]">Hàng hoá *</th>
                    <th className="px-1.5 py-2.5 w-[5%] text-center">SL</th>
                    <th className="px-1.5 py-2.5 w-[6%]">ĐVT</th>
                    <th className="px-1.5 py-2.5 w-[6%]">Kg</th>
                    <th className="px-1.5 py-2.5 text-right w-[9%]">Đơn giá</th>
                    <th className="px-1.5 py-2.5 text-right w-[9%]">CP phát sinh</th>
                    <th className="px-1.5 py-2.5 text-right w-[8%]">Thành tiền</th>
                    <th className="px-2 py-2.5 w-[39%]">Ghi chú</th>
                    {!readOnly && <th className="px-1 py-2.5 text-center w-[5%]">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {readOnly ? (
                        <>
                          <td className="px-2 py-2 font-medium text-slate-800 truncate" title={item.name}>{item.name || "—"}</td>
                          <td className="px-1.5 py-2 text-center tabular-nums">{item.quantity}</td>
                          <td className="px-1.5 py-2 truncate">{normalizeOrderUnit(item.unit)}</td>
                          <td className="px-1.5 py-2 tabular-nums">{item.weight || "—"}</td>
                          <td className="px-1.5 py-2 text-right tabular-nums text-[11px]">{formatVND(item.shippingPrice)}</td>
                          <td className="px-1.5 py-2 text-right tabular-nums text-[11px]">{item.extraFee ? formatVND(item.extraFee) : "—"}</td>
                          <td className="px-1.5 py-2 text-right font-medium text-slate-800 text-[11px] whitespace-nowrap">
                            {formatVND(item.quantity * item.shippingPrice + (item.extraFee || 0))}
                          </td>
                          <td className="px-2 py-2 text-slate-700 break-words">{item.note?.trim() || "—"}</td>
                        </>
                      ) : (
                        <>
                      <td className="px-2 py-2">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          placeholder="Tên hàng..."
                          className="h-8 text-xs py-1 px-2"
                          required
                        />
                      </td>
                      <td className="px-1.5 py-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value) || 0)}
                          className="h-8 text-xs py-1 px-1 text-center"
                          required
                        />
                      </td>
                      <td className="px-1.5 py-2">
                        <Select
                          value={normalizeOrderUnit(item.unit)}
                          onValueChange={(val) => updateItem(item.id, "unit", val)}
                        >
                          <SelectTrigger className="h-8 text-xs py-1 px-1.5">
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
                      <td className="px-1.5 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.weight === 0 ? "" : item.weight}
                          onChange={(e) => updateItem(item.id, "weight", Number(e.target.value) || 0)}
                          className="h-8 text-xs py-1 px-1"
                        />
                      </td>
                      <td className="px-1.5 py-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={item.shippingPrice === 0 ? "" : item.shippingPrice.toLocaleString("en-US")}
                          onChange={(e) => updateItem(item.id, "shippingPrice", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                          className="h-8 text-xs py-1 px-1 text-right"
                          required
                        />
                      </td>
                      <td className="px-1.5 py-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={!item.extraFee ? "" : item.extraFee.toLocaleString("en-US")}
                          onChange={(e) => updateItem(item.id, "extraFee", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                          onFocus={(e) => {
                            e.currentTarget.dataset.prevValue = String(item.extraFee || 0);
                          }}
                          onBlur={(e) => {
                            const prev = Number(e.currentTarget.dataset.prevValue || 0);
                            const newFee = Number(e.currentTarget.value.replace(/[^\d]/g, "")) || 0;
                            const nextItems = items.map((it) =>
                              it.id === item.id ? { ...it, extraFee: newFee } : it,
                            );
                            logItemFieldChange(
                              item,
                              "chi phí phát sinh",
                              prev ? formatVND(prev) : "0 đ",
                              newFee ? formatVND(newFee) : "0 đ",
                              nextItems,
                            );
                          }}
                          className="h-8 text-xs py-1 px-1 text-right"
                        />
                      </td>
                      <td className="px-1.5 py-2 text-right font-medium text-slate-800 text-[11px] whitespace-nowrap">
                        {formatVND(item.quantity * item.shippingPrice + (item.extraFee || 0))}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Input
                            value={item.note || ""}
                            onChange={(e) => updateItem(item.id, "note", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveItemNote(item);
                              }
                            }}
                            placeholder="Ghi chú hàng hoá..."
                            className="h-8 flex-1 min-w-0 text-xs py-1 px-2"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSaveItemNote(item)}
                            className="h-8 shrink-0 px-2.5 text-[11px] font-semibold"
                          >
                            Lưu
                          </Button>
                        </div>
                      </td>
                      <td className="px-1 py-2 text-center">
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
                        </>
                      )}
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

        {/* Logs */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Logs</h3>
          {!readOnly && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={manualLogText}
                onChange={(e) => setManualLogText(e.target.value)}
                placeholder="Nhập nội dung log..."
                className="h-9 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveManualLog();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleSaveManualLog}
                className="h-9 text-xs font-semibold px-5 shrink-0"
              >
                Lưu
              </Button>
            </div>
          )}
          <Card className="p-4 border-slate-200 shadow-sm">
            <div className="space-y-0">
              {orderLogs.length === 0 ? (
                <p className="text-xs text-slate-500">Chưa có log nào.</p>
              ) : (
                orderLogs.map((log, idx) => {
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
                          log.type === "field_change" && "bg-violet-500",
                          log.type === "manual" && "bg-sky-500",
                          isStatusLog && logStatus && statusDot[logStatus],
                        )}
                      />
                      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
                          <span className="font-semibold text-slate-500 tabular-nums shrink-0">
                            {formatLogDate(log.date)}
                          </span>
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
                          {(log.type === "field_change" || log.type === "manual") && (
                            <span className="font-medium text-slate-800 break-words">{log.message}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Attached Documents matching Frame 15 */}
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Tài liệu đính kèm</h3>
            {!readOnly && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleUploadClick}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Tải lên tài liệu
                </Button>
              </>
            )}
          </div>

          {attachments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
              Chưa có tài liệu đính kèm. Bấm &quot;Tải lên tài liệu&quot; để thêm ảnh hoặc file.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {attachments.map((attachment) => {
                const isImage = isImageAttachment(attachment);
                const imageIdx = imageAttachments.findIndex((item) => item.id === attachment.id);

                return (
                  <div key={attachment.id} className="relative group">
                    {isImage ? (
                      <div
                        className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm cursor-pointer hover:border-primary transition-all duration-200"
                        onClick={() => handleOpenLightbox(imageIdx)}
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-0.5 rounded-full">
                            Xem
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] rounded-lg border border-slate-200 bg-white shadow-sm p-3 flex flex-col justify-between">
                        <div className="flex items-start gap-2 min-w-0">
                          <FileText className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                          <span className="text-[11px] font-semibold text-slate-700 line-clamp-3 break-all">
                            {attachment.name}
                          </span>
                        </div>
                        <a
                          href={attachment.url}
                          download={attachment.name}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline mt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-3 h-3" />
                          Tải xuống
                        </a>
                      </div>
                    )}

                    {!readOnly && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="absolute top-1.5 right-1.5 h-6 w-6 bg-white/90 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}

                    <p className="mt-1 text-[10px] text-slate-500 truncate" title={attachment.name}>
                      {attachment.name}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1.5 pt-1">
          <Label htmlFor="note" className="text-xs font-semibold text-slate-700">Ghi chú</Label>
          <Textarea 
            id="note" 
            placeholder="Ghi chú thêm về lô hàng (ví dụ: Hàng dễ vỡ, cần bọc chống sốc)..." 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            readOnly={readOnly}
            disabled={readOnly}
            className={cn("text-xs min-h-[60px]", readOnly && "bg-slate-50 cursor-default opacity-100 resize-none")}
          />
        </div>

        {/* Form actions */}
        <div className="pt-4 border-t flex justify-end gap-3.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/orders" })}
            className="h-10 text-xs font-semibold px-5 text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            Quay lại
          </Button>
        </div>
      </div>

      {/* premium Receipts Lightbox Gallery matching Frame 16 */}
      {lightboxOpen && imageAttachments.length > 0 && (
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
                src={imageAttachments[currentPhotoIdx]?.url}
                alt={imageAttachments[currentPhotoIdx]?.name ?? "Tài liệu"}
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
            {currentPhotoIdx + 1} trong {imageAttachments.length} ảnh
          </div>
        </div>
      )}
    </AppLayout>
  );
}
