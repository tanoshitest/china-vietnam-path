export type OrderStatus = "dang_ve" | "cho_giao" | "hoan_thanh" | "dang_van_chuyen";

export const statusLabel: Record<OrderStatus, string> = {
  dang_ve: "Đang về kho",
  dang_van_chuyen: "Đang vận chuyển",
  cho_giao: "Chờ giao",
  hoan_thanh: "Hoàn thành",
};

export const statusColor: Record<OrderStatus, string> = {
  dang_ve: "bg-blue-100 text-blue-700 border-blue-200",
  dang_van_chuyen: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cho_giao: "bg-orange-100 text-orange-700 border-orange-200",
  hoan_thanh: "bg-green-100 text-green-700 border-green-200",
};

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

export interface Order {
  id: string;
  code: string;
  client: string;
  clientId: string;
  status: OrderStatus;
  fee: number;
  createdAt: string;
  weight: string;
  origin: string;
  destination: string;
  images: string[];
  timeline: TimelineStep[];
  costs: VendorCost[];
}

const img = (seed: string) =>
  `https://picsum.photos/seed/${seed}/600/400`;

export const orders: Order[] = [
  {
    id: "1",
    code: "CTV-123456",
    client: "Công ty TNHH An Phát",
    clientId: "KH001",
    status: "dang_van_chuyen",
    fee: 24500000,
    createdAt: "2025-05-02",
    weight: "1,250 kg",
    origin: "Quảng Châu, TQ",
    destination: "Hà Nội, VN",
    images: [img("p1"), img("p2"), img("p3"), img("p4")],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Quảng Châu", date: "02/05", done: true },
      { label: "Xuất kho - vận chuyển nội địa TQ", location: "Nam Ninh", date: "03/05", done: true },
      { label: "Thông quan biên giới", location: "Hữu Nghị Quan", date: "05/05", done: true },
      { label: "Vận chuyển nội địa VN", location: "Lạng Sơn → Hà Nội", date: "06/05", done: false },
      { label: "Giao hàng cho khách", location: "Hà Nội", date: "—", done: false },
    ],
    costs: [
      { id: "c1", type: "Vendor vận chuyển TQ", vendor: "GZ Express", amount: 8500000 },
      { id: "c2", type: "Vendor thông quan", vendor: "Hải quan Hữu Nghị", amount: 3200000 },
      { id: "c3", type: "Nhà xe VN", vendor: "Vận tải Minh Long", amount: 4500000 },
      { id: "c4", type: "Phí bốc xếp", vendor: "Đội bốc xếp Lạng Sơn", amount: 800000 },
    ],
  },
  {
    id: "2",
    code: "CTV-123457",
    client: "Shop Mỹ Phẩm Linh Chi",
    clientId: "KH002",
    status: "hoan_thanh",
    fee: 12800000,
    createdAt: "2025-04-28",
    weight: "420 kg",
    origin: "Thâm Quyến, TQ",
    destination: "TP. HCM, VN",
    images: [img("q1"), img("q2"), img("q3")],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Thâm Quyến", date: "28/04", done: true },
      { label: "Xuất kho - vận chuyển nội địa TQ", location: "Bằng Tường", date: "29/04", done: true },
      { label: "Thông quan biên giới", location: "Móng Cái", date: "01/05", done: true },
      { label: "Vận chuyển nội địa VN", location: "Móng Cái → HCM", date: "03/05", done: true },
      { label: "Giao hàng cho khách", location: "TP. HCM", date: "05/05", done: true },
    ],
    costs: [
      { id: "c1", type: "Vendor vận chuyển TQ", vendor: "SZ Cargo", amount: 4800000 },
      { id: "c2", type: "Vendor thông quan", vendor: "DV Móng Cái", amount: 1800000 },
      { id: "c3", type: "Nhà xe VN", vendor: "Vận tải Phương Trang", amount: 3500000 },
    ],
  },
  {
    id: "3",
    code: "CTV-123458",
    client: "Công ty TNHH An Phát",
    clientId: "KH001",
    status: "cho_giao",
    fee: 18200000,
    createdAt: "2025-05-04",
    weight: "880 kg",
    origin: "Nghĩa Ô, TQ",
    destination: "Hải Phòng, VN",
    images: [img("r1"), img("r2")],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Nghĩa Ô", date: "04/05", done: true },
      { label: "Xuất kho - vận chuyển nội địa TQ", location: "Quảng Châu", date: "05/05", done: true },
      { label: "Thông quan biên giới", location: "Hữu Nghị Quan", date: "07/05", done: true },
      { label: "Vận chuyển nội địa VN", location: "Lạng Sơn → Hải Phòng", date: "08/05", done: true },
      { label: "Giao hàng cho khách", location: "Hải Phòng", date: "—", done: false },
    ],
    costs: [
      { id: "c1", type: "Vendor vận chuyển TQ", vendor: "YW Logistics", amount: 6200000 },
      { id: "c2", type: "Vendor thông quan", vendor: "Hải quan Hữu Nghị", amount: 2400000 },
    ],
  },
  {
    id: "4",
    code: "CTV-123459",
    client: "Điện Tử Phú Quý",
    clientId: "KH003",
    status: "dang_ve",
    fee: 32500000,
    createdAt: "2025-05-08",
    weight: "2,100 kg",
    origin: "Thượng Hải, TQ",
    destination: "Đà Nẵng, VN",
    images: [img("s1")],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Thượng Hải", date: "08/05", done: true },
      { label: "Xuất kho - vận chuyển nội địa TQ", location: "Quảng Châu", date: "—", done: false },
      { label: "Thông quan biên giới", location: "Hữu Nghị Quan", date: "—", done: false },
      { label: "Vận chuyển nội địa VN", location: "Lạng Sơn → Đà Nẵng", date: "—", done: false },
      { label: "Giao hàng cho khách", location: "Đà Nẵng", date: "—", done: false },
    ],
    costs: [
      { id: "c1", type: "Vendor vận chuyển TQ", vendor: "SH Express", amount: 11000000 },
    ],
  },
  {
    id: "5",
    code: "CTV-123460",
    client: "Shop Mỹ Phẩm Linh Chi",
    clientId: "KH002",
    status: "hoan_thanh",
    fee: 9600000,
    createdAt: "2025-04-20",
    weight: "320 kg",
    origin: "Quảng Châu, TQ",
    destination: "TP. HCM, VN",
    images: [img("t1"), img("t2")],
    timeline: [
      { label: "Nhận hàng tại kho TQ", location: "Quảng Châu", date: "20/04", done: true },
      { label: "Xuất kho - vận chuyển nội địa TQ", location: "Nam Ninh", date: "21/04", done: true },
      { label: "Thông quan biên giới", location: "Hữu Nghị Quan", date: "22/04", done: true },
      { label: "Vận chuyển nội địa VN", location: "Lạng Sơn → HCM", date: "24/04", done: true },
      { label: "Giao hàng cho khách", location: "TP. HCM", date: "26/04", done: true },
    ],
    costs: [
      { id: "c1", type: "Vendor vận chuyển TQ", vendor: "GZ Express", amount: 3500000 },
      { id: "c2", type: "Nhà xe VN", vendor: "Vận tải Phương Trang", amount: 2800000 },
    ],
  },
];

export const clients = [
  { id: "KH001", name: "Công ty TNHH An Phát", debt: 24500000, overdue: 0 },
  { id: "KH002", name: "Shop Mỹ Phẩm Linh Chi", debt: 0, overdue: 0 },
  { id: "KH003", name: "Điện Tử Phú Quý", debt: 32500000, overdue: 32500000 },
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
