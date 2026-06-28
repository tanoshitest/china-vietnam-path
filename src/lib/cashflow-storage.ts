import { createSyncStorage } from "@/lib/sync-storage";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { canSyncToSupabase, handleSupabaseSyncError } from "@/lib/supabase-health";
import { cachedLoad, seedTmsLoadCache } from "@/lib/tms-load-cache";
import { notifyTmsDataUpdated } from "@/lib/tms-sync";
import type { Database } from "@/lib/database.types";

export type CashflowVoucherType = "receipt" | "payment";

export type CashflowAllocation = {
  orderId: string;
  waybill: string;
  recordType: "receivable" | "payable";
  amount: number;
  counterparty: string;
  /** Công nợ còn lại tại thời điểm tạo phiếu */
  debtBefore: number;
  /** Công nợ còn lại sau khi thu/chi lần này */
  debtAfter: number;
};

export type CashflowVoucher = {
  id: string;
  code: string;
  type: CashflowVoucherType;
  date: string;
  note?: string;
  totalAmount: number;
  allocations: CashflowAllocation[];
  createdAt: string;
};

type VoucherRow = Database["public"]["Tables"]["tms_cashflow_vouchers"]["Row"];

const TOMBSTONE_KEY = "viet_thao_cashflow_vouchers_tombstones";

const normalizeVoucher = (raw: Partial<CashflowVoucher>, index = 0): CashflowVoucher | null => {
  if (!raw.id && !raw.code) return null;
  const allocations = (Array.isArray(raw.allocations) ? raw.allocations : []).map((line) => ({
    ...line,
    debtBefore: typeof line.debtBefore === "number" ? line.debtBefore : line.amount ?? 0,
    debtAfter: typeof line.debtAfter === "number" ? line.debtAfter : 0,
  }));
  const totalAmount =
    typeof raw.totalAmount === "number"
      ? raw.totalAmount
      : allocations.reduce((sum, line) => sum + (line.amount ?? 0), 0);

  return {
    id: raw.id ?? `voucher-${index}`,
    code: raw.code ?? `PT-${index}`,
    type: raw.type === "payment" ? "payment" : "receipt",
    date: raw.date ?? new Date().toISOString().slice(0, 10),
    note: raw.note,
    totalAmount,
    allocations,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
};

const voucherStorage = createSyncStorage<CashflowVoucher, "tms_cashflow_vouchers">({
  localKey: "viet_thao_cashflow_vouchers",
  migratedKey: "viet_thao_cashflow_vouchers_supabase_migrated",
  table: "tms_cashflow_vouchers",
  demoData: [],
  normalizeLocal: (items) =>
    items
      .map((item, index) => normalizeVoucher(item as Partial<CashflowVoucher>, index))
      .filter((item): item is CashflowVoucher => item !== null),
  fromRow: (row: VoucherRow) => {
    const data = (row.data ?? {}) as Partial<CashflowVoucher>;
    return normalizeVoucher(
      {
        ...data,
        id: row.id,
        code: row.code ?? data.code,
        type: (row.type === "payment" ? "payment" : "receipt") as CashflowVoucherType,
      },
      0,
    )!;
  },
  toRow: (voucher) => ({
    id: voucher.id,
    code: voucher.code,
    type: voucher.type,
    data: {
      date: voucher.date,
      note: voucher.note,
      totalAmount: voucher.totalAmount,
      allocations: voucher.allocations,
      createdAt: voucher.createdAt,
    } as unknown as Database["public"]["Tables"]["tms_cashflow_vouchers"]["Insert"]["data"],
    updated_at_ts: new Date().toISOString(),
  }),
});

function getTombstones(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function addTombstone(id: string): void {
  if (typeof window === "undefined") return;
  const tombstones = getTombstones();
  tombstones.add(id);
  localStorage.setItem(TOMBSTONE_KEY, JSON.stringify([...tombstones]));
}

function pruneTombstones(activeRemoteIds: Set<string>): void {
  if (typeof window === "undefined") return;
  const tombstones = getTombstones();
  let changed = false;
  for (const id of [...tombstones]) {
    if (!activeRemoteIds.has(id)) {
      tombstones.delete(id);
      changed = true;
    }
  }
  if (changed) {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify([...tombstones]));
  }
}

async function deleteRemoteVoucher(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("tms_cashflow_vouchers").delete().eq("id", id);
  if (error) throw error;
}

async function upsertRemoteVouchers(items: CashflowVoucher[]): Promise<void> {
  if (!isSupabaseConfigured || items.length === 0) return;
  const rows = items.map((voucher) => ({
    id: voucher.id,
    code: voucher.code,
    type: voucher.type,
    data: {
      date: voucher.date,
      note: voucher.note,
      totalAmount: voucher.totalAmount,
      allocations: voucher.allocations,
      createdAt: voucher.createdAt,
    },
    updated_at_ts: new Date().toISOString(),
  }));
  const { error } = await supabase.from("tms_cashflow_vouchers").upsert(rows as never, {
    onConflict: "id",
  });
  if (error) throw error;
}

function mergeVouchers(local: CashflowVoucher[], remote: CashflowVoucher[]): CashflowVoucher[] {
  const tombstones = getTombstones();
  const byId = new Map(local.map((item) => [item.id, item]));

  for (const item of remote) {
    if (tombstones.has(item.id)) continue;
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  return [...byId.values()].filter((item) => !tombstones.has(item.id));
}

export const getLocalCashflowVouchers = voucherStorage.getLocal;
export const saveLocalCashflowVouchers = voucherStorage.saveLocal;
export const persistCashflowVouchersList = voucherStorage.persistList;

const CASHFLOW_CACHE_KEY = "viet_thao_cashflow_vouchers";

/** Tải phiếu — ưu tiên local + tombstone, không khôi phục phiếu đã xoá. */
export async function loadAllCashflowVouchers(options?: { force?: boolean }): Promise<CashflowVoucher[]> {
  const local = getLocalCashflowVouchers().filter((item) => !getTombstones().has(item.id));
  seedTmsLoadCache(CASHFLOW_CACHE_KEY, local);

  return cachedLoad(
    CASHFLOW_CACHE_KEY,
    async () => {
      if (!(await canSyncToSupabase())) return local;

      try {
        const { data, error } = await supabase
          .from("tms_cashflow_vouchers")
          .select("*")
          .order("updated_at_ts", { ascending: false });

        if (error) throw error;

        const remote = (data ?? [])
          .map((row) => {
            const voucherRow = row as VoucherRow;
            const payload = (voucherRow.data ?? {}) as Partial<CashflowVoucher>;
            return normalizeVoucher({
              ...payload,
              id: voucherRow.id,
              code: voucherRow.code ?? payload.code,
              type: (voucherRow.type === "payment" ? "payment" : "receipt") as CashflowVoucherType,
            });
          })
          .filter((item): item is CashflowVoucher => item !== null);

        const tombstones = getTombstones();
        for (const id of tombstones) {
          if (remote.some((item) => item.id === id)) {
            try {
              await deleteRemoteVoucher(id);
            } catch (syncError) {
              handleSupabaseSyncError(syncError);
            }
          }
        }

        const merged = mergeVouchers(getLocalCashflowVouchers(), remote);
        saveLocalCashflowVouchers(merged);

        const remoteIds = new Set(remote.map((item) => item.id));
        const pending = merged.filter((item) => !remoteIds.has(item.id));
        if (pending.length > 0) {
          await upsertRemoteVouchers(pending);
        }

        pruneTombstones(new Set(remote.filter((item) => !tombstones.has(item.id)).map((item) => item.id)));

        return merged;
      } catch (error) {
        handleSupabaseSyncError(error);
        return local;
      }
    },
    options,
  );
}

/** Thêm phiếu mới — luôn merge từ local cache, tránh ghi đè phiếu cũ. */
export async function appendCashflowVoucher(voucher: CashflowVoucher): Promise<CashflowVoucher[]> {
  const existing = getLocalCashflowVouchers();
  const next = existing.some((item) => item.id === voucher.id)
    ? existing.map((item) => (item.id === voucher.id ? voucher : item))
    : [...existing, voucher];
  await persistCashflowVouchersList(next);
  return next;
}

/** Xoá phiếu — ghi tombstone, xoá local ngay, đồng bộ xoá cloud. */
export async function removeCashflowVoucher(id: string): Promise<CashflowVoucher[]> {
  const next = getLocalCashflowVouchers().filter((item) => item.id !== id);
  addTombstone(id);
  saveLocalCashflowVouchers(next);

  if (isSupabaseConfigured && (await canSyncToSupabase())) {
    try {
      await deleteRemoteVoucher(id);
    } catch (error) {
      handleSupabaseSyncError(error);
    }
  }

  notifyTmsDataUpdated();
  return next;
}

export function generateVoucherCode(
  type: CashflowVoucherType,
  existing: CashflowVoucher[] = getLocalCashflowVouchers(),
): string {
  const prefix = type === "receipt" ? "PT" : "PC";
  const sameType = existing.filter((v) => v.type === type);
  const next = sameType.length + 1;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${date}-${String(next).padStart(3, "0")}`;
}
