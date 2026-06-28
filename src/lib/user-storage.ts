import { createSyncStorage } from "@/lib/sync-storage";
import type { Database } from "@/lib/database.types";

export type UserRole = "Admin" | "Sale";
export type UserStatus = "Hoạt động" | "Tạm khóa";

export type UserItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
};

const demoUsers: UserItem[] = [
  {
    id: "U001",
    name: "Nguyễn Văn An",
    email: "an@quocvietjr.vn",
    phone: "0903 111 222",
    role: "Admin",
    status: "Hoạt động",
    createdAt: "2026-01-05",
  },
  {
    id: "U002",
    name: "Trần Thị Bình",
    email: "binh@quocvietjr.vn",
    phone: "0912 333 444",
    role: "Sale",
    status: "Hoạt động",
    createdAt: "2026-02-12",
  },
  {
    id: "U003",
    name: "Lê Văn Cường",
    email: "cuong@quocvietjr.vn",
    phone: "0988 555 666",
    role: "Sale",
    status: "Hoạt động",
    createdAt: "2026-03-20",
  },
  {
    id: "U004",
    name: "Phạm Thị Dung",
    email: "dung@quocvietjr.vn",
    phone: "0977 888 999",
    role: "Sale",
    status: "Tạm khóa",
    createdAt: "2026-04-02",
  },
  {
    id: "U005",
    name: "Hoàng Minh Đức",
    email: "duc@quocvietjr.vn",
    phone: "0905 121 314",
    role: "Admin",
    status: "Hoạt động",
    createdAt: "2026-05-18",
  },
];

type UserRow = Database["public"]["Tables"]["tms_users"]["Row"];

const userStorage = createSyncStorage<UserItem, "tms_users">({
  localKey: "viet_thao_users",
  migratedKey: "viet_thao_users_supabase_migrated",
  table: "tms_users",
  demoData: demoUsers,
  fromRow: (row: UserRow) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: "",
    role: "Sale",
    status: "Hoạt động",
    createdAt: "",
    ...((row.data ?? {}) as Partial<UserItem>),
  }),
  toRow: (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    data: user as unknown as Database["public"]["Tables"]["tms_users"]["Insert"]["data"],
    updated_at_ts: new Date().toISOString(),
  }),
});

export const getLocalUsers = userStorage.getLocal;
export const loadAllUsers = userStorage.loadAll;
export const persistUsersList = userStorage.persistList;
