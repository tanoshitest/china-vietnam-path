export type OrderStatus =
  | "van_chuyen_noi_dia_tq"
  | "dang_thong_quan"
  | "nhap_kho_ha_noi"
  | "dang_giao_hang"
  | "da_giao_hang";

export const ORDER_STATUSES: OrderStatus[] = [
  "van_chuyen_noi_dia_tq",
  "dang_thong_quan",
  "nhap_kho_ha_noi",
  "dang_giao_hang",
  "da_giao_hang",
];

export const statusLabel: Record<OrderStatus, string> = {
  van_chuyen_noi_dia_tq: "Vận chuyển nội địa Trung Quốc",
  dang_thong_quan: "Đang thông quan",
  nhap_kho_ha_noi: "Hàng nhập Kho Hà Nội",
  dang_giao_hang: "Đang giao hàng",
  da_giao_hang: "Đã giao hàng",
};

export const statusColor: Record<OrderStatus, string> = {
  van_chuyen_noi_dia_tq: "bg-amber-100 text-amber-800 border-amber-200",
  dang_thong_quan: "bg-orange-100 text-orange-800 border-orange-200",
  nhap_kho_ha_noi: "bg-blue-100 text-blue-800 border-blue-200",
  dang_giao_hang: "bg-emerald-100 text-emerald-800 border-emerald-200",
  da_giao_hang: "bg-slate-100 text-slate-800 border-slate-300",
};

export const statusDot: Record<OrderStatus, string> = {
  van_chuyen_noi_dia_tq: "bg-amber-500",
  dang_thong_quan: "bg-orange-500",
  nhap_kho_ha_noi: "bg-blue-500",
  dang_giao_hang: "bg-emerald-500",
  da_giao_hang: "bg-slate-500",
};

const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  dang_ve: "van_chuyen_noi_dia_tq",
  dang_van_chuyen: "van_chuyen_noi_dia_tq",
  nhan_kho_tq: "van_chuyen_noi_dia_tq",
  xuat_kho_tq: "van_chuyen_noi_dia_tq",
  thong_quan: "dang_thong_quan",
  van_chuyen_vn: "nhap_kho_ha_noi",
  cho_giao: "dang_giao_hang",
  hoan_thanh: "da_giao_hang",
};

export function normalizeStatus(status: string): OrderStatus {
  if (status in statusLabel) return status as OrderStatus;
  return LEGACY_STATUS_MAP[status] ?? "van_chuyen_noi_dia_tq";
}

export interface VendorCost {
  id: string;
  type: "Vendor vận chuyển TQ" | "Vendor thông quan" | "Nhà xe VN" | "Phí bốc xếp";
  vendor: string;
  amount: number;
  note?: string;
}

export interface TimelineStep {
  label: string;
  location: string;
  date: string;
  done: boolean;
}

export interface GoodsItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  weight: number;      // kg
  volume: number;      // m3
  shippingPrice: number; // VND
  extraFee?: number;   // VND - chi phí phát sinh
  note?: string;       // ghi chú theo dòng hàng hóa
}

export interface OrderLog {
  id: string;
  type: "created" | "status_change" | "completed" | "field_change" | "manual";
  date: string;
  status?: OrderStatus;
  message?: string;
  itemName?: string;
  fieldLabel?: string;
  oldValue?: string;
  newValue?: string;
}

export function createOrderLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function todayLogDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function buildItemFieldChangeLog(
  itemName: string,
  fieldLabel: string,
  oldValue: string,
  newValue: string,
): OrderLog {
  const label = itemName.trim() || "—";
  return {
    id: createOrderLogId(),
    type: "field_change",
    date: todayLogDate(),
    message: `Cập nhật ${fieldLabel} hàng hoá "${label}": ${oldValue || "(trống)"} → ${newValue || "(trống)"}`,
    itemName: label,
    fieldLabel,
    oldValue,
    newValue,
  };
}

export function buildManualOrderLog(message: string): OrderLog {
  return {
    id: createOrderLogId(),
    type: "manual",
    date: todayLogDate(),
    message: message.trim(),
  };
}

export interface OrderAttachment {
  id: string;
  name: string;
  mimeType: string;
  url: string;
}

export function isImageAttachment(attachment: Pick<OrderAttachment, "mimeType" | "url">): boolean {
  if (attachment.mimeType.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(attachment.url);
}

export function getOrderAttachments(
  order: Pick<Order, "images" | "attachments">,
): OrderAttachment[] {
  if (order.attachments && order.attachments.length > 0) {
    return order.attachments;
  }
  return (order.images ?? []).map((url, idx) => ({
    id: `legacy-img-${idx}`,
    name: `Ảnh ${idx + 1}`,
    mimeType: "image/jpeg",
    url,
  }));
}

export interface Order {
  id: string;
  code: string;
  client: string;
  clientId: string;
  status: OrderStatus;
  fee: number;
  createdAt: string;
  updatedAt?: string;
  weight: string;
  origin: string;
  destination: string;
  images: string[];
  attachments?: OrderAttachment[];
  timeline: TimelineStep[];
  costs: VendorCost[];
  items: GoodsItem[];
  note?: string;
  masterBill?: string;
  logs?: OrderLog[];
}

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

export function formatLogDate(date: string): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${d}/${m}/${y}`;
}

/** Demo hành trình — tạo đơn → cập nhật trạng thái → đã giao hàng */
export function buildDemoOrderLogs(
  order: Pick<Order, "createdAt" | "status" | "logs">
): OrderLog[] {
  if (order.logs && order.logs.length > 0) {
    return order.logs.map((log) =>
      log.type === "completed"
        ? { ...log, type: "status_change" as const, status: "da_giao_hang" as OrderStatus }
        : log
    );
  }

  const created = order.createdAt || new Date().toISOString().split("T")[0];
  const currentIdx = ORDER_STATUSES.indexOf(normalizeStatus(order.status));
  const dayOffsets = [0, 2, 5, 8, 11, 14];

  const logs: OrderLog[] = [{ id: "log-created", type: "created", date: created }];

  for (let i = 0; i <= currentIdx; i++) {
    logs.push({
      id: `log-status-${i}`,
      type: "status_change",
      date: addDays(created, dayOffsets[i] ?? i * 2),
      status: ORDER_STATUSES[i],
    });
  }

  return logs;
}

export function getOrderUpdatedAt(
  order: Pick<Order, "createdAt" | "updatedAt" | "status" | "logs">
): string {
  if (order.updatedAt) return order.updatedAt;
  const logs = buildDemoOrderLogs(order);
  const last = logs[logs.length - 1];
  return last?.date || order.createdAt || "";
}

const img = (seed: string) =>
  `https://picsum.photos/seed/${seed}/600/400`;

// Real receipt images for premium attached files mockup
const receiptImages = [
  "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=600"
];

export const orders: Order[] = [
  {
    id: "1",
    code: "CRTO-2511025-01",
    client: "NGUYEN TIEN MINH",
    clientId: "KH001",
    status: "van_chuyen_noi_dia_tq",
    fee: 150000000,
    createdAt: "2026-07-21",
    updatedAt: "",
    weight: "1 PCL, 2 Bao, 120 Cuộn, 1 Kiện",
    origin: "Quảng Châu, TQ",
    destination: "Hà Nội, VN",
    images: receiptImages,
    note: "Hàng cồng kềnh, cần chú ý bốc xếp cẩn thận.",
    masterBill: "GZ02",
    items: [
      { id: "1", name: "bỉm bỉm", quantity: 1, unit: "PCL", weight: 267.23, volume: 8, shippingPrice: 120000000 },
      { id: "2", name: "bỉm bỉm", quantity: 2, unit: "Bao", weight: 2700, volume: 1.2, shippingPrice: 2000000 },
      { id: "3", name: "bỉm bỉm", quantity: 120, unit: "Cuộn", weight: 10, volume: 0.5, shippingPrice: 12000 },
      { id: "4", name: "bỉm bỉm", quantity: 1, unit: "Kiện", weight: 800, volume: 2.1, shippingPrice: 2400000 }
    ],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Quảng Châu", date: "21/07", done: true },
      { label: "Xuất kho TQ", location: "Nam Ninh", date: "—", done: false },
      { label: "Thông quan biên giới", location: "Hữu Nghị Quan", date: "—", done: false },
      { label: "Vận chuyển nội địa VN", location: "Lạng Sơn → Hà Nội", date: "—", done: false },
      { label: "Giao hàng cho khách", location: "Hà Nội", date: "—", done: false },
    ],
    costs: [
      { id: "c1", type: "Vendor vận chuyển TQ", vendor: "GZ Express", amount: 60000000 },
      { id: "c2", type: "Vendor thông quan", vendor: "Hải quan Hữu Nghị", amount: 22500000 },
    ],
    logs: [
      { id: "l1", type: "created", date: "2026-07-21" },
      { id: "l2", type: "status_change", date: "2026-07-21", status: "van_chuyen_noi_dia_tq" },
    ],
  },
  {
    id: "2",
    code: "CRTO-2511025-02",
    client: "NGUYEN TIEN MINH",
    clientId: "KH001",
    status: "nhap_kho_ha_noi",
    fee: 36000000,
    createdAt: "2026-07-21",
    updatedAt: "",
    weight: "1 Bao, 120 Cuộn",
    origin: "Quảng Châu, TQ",
    destination: "Hà Nội, VN",
    images: [receiptImages[1], receiptImages[2]],
    masterBill: "MBN-GZH-HN",
    items: [
      { id: "1", name: "Cát vệ sinh mèo", quantity: 1, unit: "Bao", weight: 20, volume: 0.1, shippingPrice: 20000000 },
      { id: "2", name: "Bỉm em bé", quantity: 120, unit: "Cuộn", weight: 8, volume: 0.3, shippingPrice: 133333 }
    ],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Quảng Châu", date: "21/07", done: true },
      { label: "Xuất kho TQ", location: "Nam Ninh", date: "22/07", done: true },
      { label: "Thông quan biên giới", location: "Hữu Nghị Quan", date: "23/07", done: true },
      { label: "Vận chuyển nội địa VN", location: "Lạng Sơn → Hà Nội", date: "24/07", done: true },
      { label: "Giao hàng cho khách", location: "Hà Nội", date: "—", done: false },
    ],
    costs: [
      { id: "c1", type: "Vendor vận chuyển TQ", vendor: "GZ Express", amount: 12000000 },
      { id: "c2", type: "Nhà xe VN", vendor: "Vận tải Minh Long", amount: 5000000 },
    ],
    logs: [
      { id: "l1", type: "created", date: "2026-07-18" },
      { id: "l2", type: "status_change", date: "2026-07-18", status: "van_chuyen_noi_dia_tq" },
      { id: "l3", type: "status_change", date: "2026-07-20", status: "dang_thong_quan" },
      { id: "l4", type: "status_change", date: "2026-07-23", status: "nhap_kho_ha_noi" },
    ],
  },
  {
    id: "3",
    code: "CRTO-2511025-03",
    client: "NGUYEN TIEN MINH",
    clientId: "KH001",
    status: "dang_thong_quan",
    fee: 120000000,
    createdAt: "2026-07-20",
    updatedAt: "",
    weight: "300 Cuộn",
    origin: "Thâm Quyến, TQ",
    destination: "TP. HCM, VN",
    images: [receiptImages[0], receiptImages[3]],
    items: [
      { id: "1", name: "Sữa bột", quantity: 300, unit: "Cuộn", weight: 5, volume: 0.08, shippingPrice: 400000 }
    ],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Thâm Quyến", date: "20/07", done: true },
      { label: "Xuất kho TQ", location: "Bằng Tường", date: "21/07", done: true },
      { label: "Thông quan biên giới", location: "Hữu Nghị Quan", date: "22/07", done: true },
      { label: "Vận chuyển nội địa VN", location: "Lạng Sơn → HCM", date: "—", done: false },
    ],
    costs: [
      { id: "c1", type: "Vendor vận chuyển TQ", vendor: "SZ Cargo", amount: 48000000 },
      { id: "c2", type: "Vendor thông quan", vendor: "DV Móng Cái", amount: 18000000 },
    ],
  },
  {
    id: "4",
    code: "CRTO-2511025-04",
    client: "NGUYEN THI HANH",
    clientId: "KH002",
    status: "van_chuyen_noi_dia_tq",
    fee: 150000000,
    createdAt: "2026-07-21",
    updatedAt: "",
    weight: "1 PCL, 2 Bao, 120 Cuộn, 1 Kiện",
    origin: "Nghĩa Ô, TQ",
    destination: "Hải Phòng, VN",
    images: [receiptImages[2]],
    items: [
      { id: "1", name: "bỉm bỉm", quantity: 1, unit: "PCL", weight: 267.23, volume: 8, shippingPrice: 120000000 },
      { id: "2", name: "bỉm bỉm", quantity: 2, unit: "Bao", weight: 2700, volume: 1.2, shippingPrice: 2000000 },
      { id: "3", name: "bỉm bỉm", quantity: 120, unit: "Cuộn", weight: 10, volume: 0.5, shippingPrice: 12000 },
      { id: "4", name: "bỉm bỉm", quantity: 1, unit: "Kiện", weight: 800, volume: 2.1, shippingPrice: 2400000 }
    ],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Nghĩa Ô", date: "21/07", done: true },
      { label: "Xuất kho TQ", location: "Quảng Châu", date: "—", done: false },
    ],
    costs: [
      { id: "c1", type: "Vendor vận chuyển TQ", vendor: "YW Logistics", amount: 60000000 },
    ],
  },
  {
    id: "5",
    code: "CRTO-2511025-05",
    client: "NGUYEN TIEN MINH",
    clientId: "KH001",
    status: "van_chuyen_noi_dia_tq",
    fee: 150000000,
    createdAt: "2026-07-21",
    updatedAt: "2026-07-21",
    weight: "1 PCL, 2 Bao, 120 Cuộn, 1 Kiện",
    origin: "Quảng Châu, TQ",
    destination: "Hà Nội, VN",
    images: receiptImages,
    items: [
      { id: "1", name: "bỉm bỉm", quantity: 1, unit: "PCL", weight: 267.23, volume: 8, shippingPrice: 120000000 },
      { id: "2", name: "bỉm bỉm", quantity: 2, unit: "Bao", weight: 2700, volume: 1.2, shippingPrice: 2000000 },
      { id: "3", name: "bỉm bỉm", quantity: 120, unit: "Cuộn", weight: 10, volume: 0.5, shippingPrice: 12000 },
      { id: "4", name: "bỉm bỉm", quantity: 1, unit: "Kiện", weight: 800, volume: 2.1, shippingPrice: 2400000 }
    ],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Quảng Châu", date: "21/07", done: true },
    ],
    costs: [],
  },
  {
    id: "6",
    code: "CRTO-2511025-06",
    client: "NGUYEN TIEN MINH",
    clientId: "KH001",
    status: "da_giao_hang",
    fee: 100000000,
    createdAt: "2026-07-21",
    updatedAt: "2026-07-24",
    weight: "50 Cuộn, 2 Kiện",
    origin: "Quảng Châu, TQ",
    destination: "Hà Nội, VN",
    images: [receiptImages[3]],
    items: [
      { id: "1", name: "Quần áo trẻ em", quantity: 50, unit: "Cuộn", weight: 20, volume: 0.4, shippingPrice: 1000000 },
      { id: "2", name: "Sữa bột", quantity: 2, unit: "Kiện", weight: 50, volume: 0.2, shippingPrice: 25000000 }
    ],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Quảng Châu", date: "21/07", done: true },
      { label: "Xuất kho TQ", location: "Nam Ninh", date: "21/07", done: true },
      { label: "Giao hàng cho khách", location: "Hà Nội", date: "21/07", done: true }
    ],
    costs: [],
    logs: [
      { id: "l1", type: "created", date: "2026-07-15" },
      { id: "l2", type: "status_change", date: "2026-07-15", status: "van_chuyen_noi_dia_tq" },
      { id: "l3", type: "status_change", date: "2026-07-17", status: "dang_thong_quan" },
      { id: "l4", type: "status_change", date: "2026-07-20", status: "nhap_kho_ha_noi" },
      { id: "l5", type: "status_change", date: "2026-07-22", status: "dang_giao_hang" },
      { id: "l6", type: "status_change", date: "2026-07-24", status: "da_giao_hang" },
    ],
  },
  {
    id: "7",
    code: "CRTO-2511025-07",
    client: "NGUYEN TIEN MINH",
    clientId: "KH001",
    status: "van_chuyen_noi_dia_tq",
    fee: 150000000,
    createdAt: "2026-07-21",
    updatedAt: "",
    weight: "1 PCL, 2 Bao, 120 Cuộn, 1 Kiện",
    origin: "Quảng Châu, TQ",
    destination: "Hà Nội, VN",
    images: receiptImages,
    items: [
      { id: "1", name: "bỉm bỉm", quantity: 1, unit: "PCL", weight: 267.23, volume: 8, shippingPrice: 120000000 },
      { id: "2", name: "bỉm bỉm", quantity: 2, unit: "Bao", weight: 2700, volume: 1.2, shippingPrice: 2000000 },
      { id: "3", name: "bỉm bỉm", quantity: 120, unit: "Cuộn", weight: 10, volume: 0.5, shippingPrice: 12000 },
      { id: "4", name: "bỉm bỉm", quantity: 1, unit: "Kiện", weight: 800, volume: 2.1, shippingPrice: 2400000 }
    ],
    timeline: [],
    costs: [],
  }
];

export const clients = [
  { id: "KH001", name: "NGUYEN TIEN MINH", contact: "+84 987 654 321", debt: 245000000, overdue: 0 },
  { id: "KH002", name: "NGUYEN THI HANH", contact: "+84 912 345 678", debt: 150000000, overdue: 0 },
  { id: "KH003", name: "Điện Tử Phú Quý", contact: "+84 909 123 456", debt: 32500000, overdue: 32500000 },
];

export const vendors = [
  { id: "V01", name: "GZ Express", type: "Vendor vận chuyển TQ", contact: "+86 138 0000 1111", totalSpent: 12000000 },
  { id: "V02", name: "SZ Cargo", type: "Vendor vận chuyển TQ", contact: "+86 138 0000 2222", totalSpent: 4800000 },
  { id: "V03", name: "YW Logistics", type: "Vendor vận chuyển TQ", contact: "+86 138 0000 3333", totalSpent: 6200000 },
  { id: "V04", name: "SH Express", type: "Vendor vận chuyển TQ", contact: "+86 138 0000 4444", totalSpent: 11000000 },
  { id: "V05", name: "Hải quan Hữu Nghị", type: "Vendor thông quan", contact: "+84 205 123 456", totalSpent: 5600000 },
  { id: "V06", name: "DV Móng Cái", type: "Vendor thông quan", contact: "+84 203 987 654", totalSpent: 1800000 },
  { id: "V07", name: "Vận tải Minh Long", type: "Nhà xe VN", contact: "+84 912 345 678", totalSpent: 4500000 },
  { id: "V08", name: "Vận tải Phương Trang", type: "Nhà xe VN", contact: "+84 919 222 333", totalSpent: 6300000 },
  { id: "V09", name: "Đội bốc xếp Lạng Sơn", type: "Phí bốc xếp", contact: "+84 205 555 666", totalSpent: 800000 },
];

export const weeklyVolume = [
  { week: "T1", volume: 3200 },
  { week: "T2", volume: 4100 },
  { week: "T3", volume: 3800 },
  { week: "T4", volume: 5200 },
  { week: "T5", volume: 4700 },
  { week: "T6", volume: 6100 },
];

export const revenueByMonth = [
  { month: "T12", revenue: 280 },
  { month: "T1", revenue: 320 },
  { month: "T2", revenue: 295 },
  { month: "T3", revenue: 410 },
  { month: "T4", revenue: 478 },
  { month: "T5", revenue: 520 },
];

export const debtHistory = [
  { id: 1, code: "CTV-123456", date: "02/05/2025", amount: 24500000, status: "Chưa thanh toán" },
  { id: 2, code: "CTV-123458", date: "04/05/2025", amount: 18200000, status: "Đã thanh toán" },
  { id: 3, code: "CTV-122001", date: "15/04/2025", amount: 15600000, status: "Đã thanh toán" },
];

export const users = [
  { id: 1, name: "Nguyễn Văn An", email: "an@logitrans.vn", role: "Quản trị viên" },
  { id: 2, name: "Trần Thị Bình", email: "binh@logitrans.vn", role: "Điều phối" },
  { id: 3, name: "Lê Văn Cường", email: "cuong@logitrans.vn", role: "Kế toán" },
  { id: 4, name: "Phạm Thị Dung", email: "dung@logitrans.vn", role: "Nhân viên kho" },
];

export const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
