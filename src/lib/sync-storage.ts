import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { canSyncToSupabase, handleSupabaseSyncError } from "@/lib/supabase-health";
import { cachedLoad, invalidateTmsLoadCache, seedTmsLoadCache } from "@/lib/tms-load-cache";
import { notifyTmsDataUpdated } from "@/lib/tms-sync";
import type { Database } from "@/lib/database.types";

type TableName = keyof Database["public"]["Tables"];
type RowOf<T extends TableName> = Database["public"]["Tables"][T]["Row"];
type InsertOf<T extends TableName> = Database["public"]["Tables"][T]["Insert"];

export interface SyncStorageConfig<T extends { id: string }, TTable extends TableName> {
  localKey: string;
  migratedKey: string;
  table: TTable;
  demoData: T[];
  fromRow: (row: RowOf<TTable>) => T;
  toRow: (item: T) => InsertOf<TTable>;
  normalizeLocal?: (items: T[]) => T[];
}

export function createSyncStorage<T extends { id: string }, TTable extends TableName>(
  config: SyncStorageConfig<T, TTable>,
) {
  const { localKey, migratedKey, table, demoData, fromRow, toRow, normalizeLocal } = config;

  function getLocal(): T[] {
    if (typeof window === "undefined") return demoData;

    const stored = localStorage.getItem(localKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as T[];
        return normalizeLocal ? normalizeLocal(parsed) : parsed;
      } catch {
        return isSupabaseConfigured ? [] : demoData;
      }
    }

    if (isSupabaseConfigured) return [];

    localStorage.setItem(localKey, JSON.stringify(demoData));
    return demoData;
  }

  function mergeItems(remote: T[], local: T[]): T[] {
    const byId = new Map<string, T>();
    for (const item of remote) byId.set(item.id, item);
    for (const item of local) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    return [...byId.values()];
  }

  async function syncLocalOnlyItems(local: T[], remote: T[]): Promise<void> {
    if (!(await canSyncToSupabase()) || local.length === 0) return;
    const remoteIds = new Set(remote.map((item) => item.id));
    const pending = local.filter((item) => !remoteIds.has(item.id));
    if (pending.length === 0) return;
    await upsertToSupabase(pending);
  }

  function saveLocal(items: T[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(localKey, JSON.stringify(items));
  }

  async function fetchAllFromSupabase(): Promise<T[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("updated_at_ts", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => fromRow(row as unknown as RowOf<TTable>));
  }

  async function upsertToSupabase(items: T[]): Promise<void> {
    if (!isSupabaseConfigured || items.length === 0) return;

    const rows = items.map(toRow) as InsertOf<TTable>[];
    const { error } = await supabase.from(table).upsert(rows as never, { onConflict: "id" });
    if (error) throw error;
  }

  async function migrateLocalToSupabase(local: T[]): Promise<void> {
    if (!(await canSyncToSupabase()) || local.length === 0) return;
    if (localStorage.getItem(migratedKey) === "1") return;

    try {
      await upsertToSupabase(local);
      localStorage.setItem(migratedKey, "1");
    } catch (error) {
      handleSupabaseSyncError(error);
    }
  }

  async function loadAll(options?: { force?: boolean }): Promise<T[]> {
    const local = getLocal();
    seedTmsLoadCache(localKey, local);

    return cachedLoad(
      localKey,
      async () => {
        if (!(await canSyncToSupabase())) return local;

        try {
          const remote = await fetchAllFromSupabase();
          if (remote.length > 0) {
            await syncLocalOnlyItems(local, remote);
            const merged = mergeItems(remote, local);
            saveLocal(merged);
            seedTmsLoadCache(localKey, merged);
            return merged;
          }

          await migrateLocalToSupabase(local);
          return local;
        } catch (error) {
          handleSupabaseSyncError(error);
          return local;
        }
      },
      options,
    );
  }

  async function persistList(items: T[]): Promise<void> {
    saveLocal(items);
    seedTmsLoadCache(localKey, items);
    if (await canSyncToSupabase()) {
      await upsertToSupabase(items);
      notifyTmsDataUpdated();
    }
  }

  return { getLocal, saveLocal, loadAll, persistList, invalidateCache: () => invalidateTmsLoadCache(localKey) };
}
