import { createSyncStorage } from "@/lib/sync-storage";
import type { Database } from "@/lib/database.types";

export type PriceUnit = "Conts" | "Sacks" | "Bags" | "Rolls";

export type Customer = {
  id: string;
  name: string;
  contact: string;
  address: string;
  unitPrice: number;
  priceUnit: PriceUnit;
};

const PRICE_UNITS: PriceUnit[] = ["Conts", "Sacks", "Bags", "Rolls"];
const DEFAULT_PRICE_UNIT: PriceUnit = "Rolls";

export const normalizePriceUnit = (value: unknown): PriceUnit =>
  PRICE_UNITS.includes(value as PriceUnit) ? (value as PriceUnit) : DEFAULT_PRICE_UNIT;

const demoCustomers: Customer[] = [
  {
    id: "KH001",
    name: "NGUYEN TIEN MINH",
    contact: "0903 111 222",
    address: "Số 12 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    unitPrice: 85000,
    priceUnit: "Rolls",
  },
  {
    id: "KH002",
    name: "NGUYEN THI HANH",
    contact: "0912 333 444",
    address: "KCN VSIP, Thuận An, Bình Dương",
    unitPrice: 92000,
    priceUnit: "Sacks",
  },
  {
    id: "KH003",
    name: "Điện Tử Phú Quý",
    contact: "028 8888 9999",
    address: "Quận 7, TP. Hồ Chí Minh",
    unitPrice: 78000,
    priceUnit: "Bags",
  },
];

export const normalizeCustomer = (item: Partial<Customer>): Customer => ({
  id: item.id ?? "",
  name: item.name ?? "",
  contact: item.contact ?? "—",
  address: item.address ?? "—",
  unitPrice: item.unitPrice ?? 0,
  priceUnit: normalizePriceUnit(item.priceUnit),
});

const normalizeCustomers = (items: Partial<Customer>[]): Customer[] => {
  const demoById = Object.fromEntries(demoCustomers.map((c) => [c.id, c]));
  return items.map((item) => {
    const normalized = normalizeCustomer(item);
    const demo = demoById[normalized.id];
    if (!demo) return normalized;
    return {
      ...normalized,
      address: normalized.address === "—" ? demo.address : normalized.address,
      unitPrice: normalized.unitPrice > 0 ? normalized.unitPrice : demo.unitPrice,
      priceUnit: item.priceUnit ? normalized.priceUnit : demo.priceUnit,
    };
  });
};

type CustomerRow = Database["public"]["Tables"]["tms_customers"]["Row"];

const customerStorage = createSyncStorage<Customer, "tms_customers">({
  localKey: "viet_thao_customers",
  migratedKey: "viet_thao_customers_supabase_migrated",
  table: "tms_customers",
  demoData: demoCustomers,
  normalizeLocal: (items) => normalizeCustomers(items),
  fromRow: (row: CustomerRow) =>
    normalizeCustomer({
      id: row.id,
      name: row.name,
      ...((row.data ?? {}) as Partial<Customer>),
    }),
  toRow: (customer) => ({
    id: customer.id,
    name: customer.name,
    data: customer as unknown as Database["public"]["Tables"]["tms_customers"]["Insert"]["data"],
    updated_at_ts: new Date().toISOString(),
  }),
});

export const getLocalCustomers = customerStorage.getLocal;
export const loadAllCustomers = customerStorage.loadAll;
export const persistCustomersList = customerStorage.persistList;

export const getClientProfileById = (clientId: string): Pick<Customer, "id" | "name"> => {
  const customer = getLocalCustomers().find((item) => item.id === clientId);
  return customer ? { id: customer.id, name: customer.name } : { id: clientId, name: clientId };
};
