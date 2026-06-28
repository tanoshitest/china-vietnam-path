import { createSyncStorage } from "@/lib/sync-storage";
import type { Database } from "@/lib/database.types";

export type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
};

const demoProducts: Product[] = [
  { id: "SP001", name: "Tai nghe Bluetooth", category: "Điện tử", unit: "Cái" },
  { id: "SP002", name: "Cáp sạc Type-C", category: "Phụ kiện", unit: "Cái" },
  { id: "SP003", name: "Thùng carton", category: "Vật tư", unit: "Thùng" },
];

type ProductRow = Database["public"]["Tables"]["tms_products"]["Row"];

const productStorage = createSyncStorage<Product, "tms_products">({
  localKey: "viet_thao_products",
  migratedKey: "viet_thao_products_supabase_migrated",
  table: "tms_products",
  demoData: demoProducts,
  fromRow: (row: ProductRow) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    ...((row.data ?? {}) as Partial<Product>),
  }),
  toRow: (product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    unit: product.unit,
    data: product as unknown as Database["public"]["Tables"]["tms_products"]["Insert"]["data"],
    updated_at_ts: new Date().toISOString(),
  }),
});

export const getLocalProducts = productStorage.getLocal;
export const loadAllProducts = productStorage.loadAll;
export const persistProductsList = productStorage.persistList;
