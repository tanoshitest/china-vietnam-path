import { createSyncStorage } from "@/lib/sync-storage";
import type { Database } from "@/lib/database.types";

export type CostType = {
  id: string;
  name: string;
  note?: string;
};

const demoCostTypes: CostType[] = [
  { id: "CT01", name: "Vận chuyển", note: "Chi phí vận chuyển hàng hóa" },
  { id: "CT02", name: "Thông quan", note: "Chi phí khai báo, thủ tục hải quan" },
  { id: "CT03", name: "Bốc xếp", note: "Chi phí bốc dỡ tại kho hoặc cửa khẩu" },
  { id: "CT04", name: "Nhà xe", note: "Chi phí xe nội địa" },
];

type CostTypeRow = Database["public"]["Tables"]["tms_cost_types"]["Row"];

const costTypeStorage = createSyncStorage<CostType, "tms_cost_types">({
  localKey: "viet_thao_cost_types",
  migratedKey: "viet_thao_cost_types_supabase_migrated",
  table: "tms_cost_types",
  demoData: demoCostTypes,
  fromRow: (row: CostTypeRow) => ({
    id: row.id,
    name: row.name,
    ...((row.data ?? {}) as Partial<CostType>),
  }),
  toRow: (costType) => ({
    id: costType.id,
    name: costType.name,
    data: costType as unknown as Database["public"]["Tables"]["tms_cost_types"]["Insert"]["data"],
    updated_at_ts: new Date().toISOString(),
  }),
});

export const getLocalCostTypes = costTypeStorage.getLocal;
export const loadAllCostTypes = costTypeStorage.loadAll;
export const persistCostTypesList = costTypeStorage.persistList;
