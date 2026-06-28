import { createSyncStorage } from "@/lib/sync-storage";
import type { Database } from "@/lib/database.types";

export type SupplierType =
  | "Export Handling Agent"
  | "Import Handling Agent"
  | "Freight Handling Agent"
  | "Unloading Handling Agent"
  | "Last-mile Carrier"
  | "Outsourced Unit"
  | "Others";

export type Supplier = {
  id: string;
  name: string;
  type: SupplierType;
  contact: string;
  address: string;
};

const supplierTypes: SupplierType[] = [
  "Export Handling Agent",
  "Import Handling Agent",
  "Freight Handling Agent",
  "Unloading Handling Agent",
  "Last-mile Carrier",
  "Outsourced Unit",
  "Others",
];

const LEGACY_SUPPLIER_TYPE_MAP: Record<string, SupplierType> = {
  "Nhà cung cấp Thông Quan": "Import Handling Agent",
  "Nhà cung cấp Vận chuyển": "Freight Handling Agent",
  "Nhà Xe": "Last-mile Carrier",
  "Bốc Xếp": "Unloading Handling Agent",
};

export const normalizeSupplierType = (type: string): SupplierType => {
  if (supplierTypes.includes(type as SupplierType)) return type as SupplierType;
  return LEGACY_SUPPLIER_TYPE_MAP[type] ?? "Others";
};

export const normalizeSupplier = (item: Partial<Supplier>): Supplier => ({
  id: item.id ?? "",
  name: item.name ?? "",
  type: normalizeSupplierType(item.type ?? "Others"),
  contact: item.contact ?? "—",
  address: item.address ?? "—",
});

const demoSuppliers: Supplier[] = [
  {
    id: "NCC01",
    name: "Hải Quan Hữu Nghị",
    type: "Import Handling Agent",
    contact: "0205 123 456",
    address: "Cửa khẩu Hữu Nghị, Lạng Sơn",
  },
  {
    id: "NCC02",
    name: "GZ Express",
    type: "Freight Handling Agent",
    contact: "+86 138 0000 1111",
    address: "Guangzhou, Guangdong, China",
  },
  {
    id: "NCC03",
    name: "Nhà Xe An Phát",
    type: "Last-mile Carrier",
    contact: "0988 111 222",
    address: "Km 15, Quốc lộ 1A, Hà Nội",
  },
  {
    id: "NCC04",
    name: "Bốc Xếp Móng Cái",
    type: "Unloading Handling Agent",
    contact: "0912 333 444",
    address: "Cửa khẩu Móng Cái, Quảng Ninh",
  },
  {
    id: "NCC05",
    name: "SZ Export Services",
    type: "Export Handling Agent",
    contact: "+86 755 888 9999",
    address: "Shenzhen, Guangdong, China",
  },
  {
    id: "NCC06",
    name: "Logistics Partner Co.",
    type: "Outsourced Unit",
    contact: "0909 555 666",
    address: "KCN VSIP, Thuận An, Bình Dương",
  },
];

const normalizeSuppliers = (items: Partial<Supplier>[]): Supplier[] => {
  const demoById = Object.fromEntries(demoSuppliers.map((item) => [item.id, item]));
  return items.map((item) => {
    const normalized = normalizeSupplier(item);
    const demo = demoById[normalized.id];
    if (!demo) return normalized;
    return {
      ...normalized,
      address: normalized.address === "—" ? demo.address : normalized.address,
    };
  });
};

type SupplierRow = Database["public"]["Tables"]["tms_suppliers"]["Row"];

const supplierStorage = createSyncStorage<Supplier, "tms_suppliers">({
  localKey: "viet_thao_suppliers",
  migratedKey: "viet_thao_suppliers_supabase_migrated",
  table: "tms_suppliers",
  demoData: demoSuppliers,
  normalizeLocal: (items) => normalizeSuppliers(items),
  fromRow: (row: SupplierRow) =>
    normalizeSupplier({
      id: row.id,
      name: row.name,
      type: row.type as SupplierType,
      ...((row.data ?? {}) as Partial<Supplier>),
    }),
  toRow: (supplier) => ({
    id: supplier.id,
    name: supplier.name,
    type: supplier.type,
    data: supplier as unknown as Database["public"]["Tables"]["tms_suppliers"]["Insert"]["data"],
    updated_at_ts: new Date().toISOString(),
  }),
});

export const getLocalSuppliers = supplierStorage.getLocal;
export const loadAllSuppliers = supplierStorage.loadAll;
export const persistSuppliersList = supplierStorage.persistList;
