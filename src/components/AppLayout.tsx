import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Search,
  Settings,
  Truck,
  Users,
  ShoppingBag,
  Wallet,
  UserCog,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItemType = { to: string; label: string; icon: React.ElementType };

const overviewItem: NavItemType = {
  to: "/",
  label: "Tổng Quan",
  icon: LayoutDashboard,
};

const navGroups = [
  {
    label: "Quản lý Vận Đơn",
    items: [
      { to: "/orders", label: "Quản lý Vận đơn", icon: Package },
      { to: "/tracking", label: "Tra Cứu vận đơn", icon: Search },
    ],
  },
  {
    label: "Quản lý Danh mục",
    items: [
      { to: "/suppliers", label: "Quản lý nhà cung cấp", icon: Truck },
      { to: "/customers", label: "Quản lý khách hàng", icon: Users },
      { to: "/products", label: "Quản lý Sản phẩm", icon: ShoppingBag },
    ],
  },
  {
    label: "Quản lý công nợ",
    items: [
      { to: "/vendors?kind=Phải thu", label: "Công nợ phải thu", icon: Wallet },
      { to: "/vendors?kind=Phải trả", label: "Công nợ phải trả", icon: Wallet },
    ],
  },
  {
    label: "Cấu hình",
    items: [
      { to: "/settings", label: "Cấu hình chi phí", icon: Settings },
      { to: "/users", label: "Quản lý người dùng", icon: UserCog },
      { to: "/logs", label: "Lịch sử hệ thống", icon: History },
    ],
  },
];

function NavItem({ item, pathname }: { item: NavItemType; pathname: string }) {
  const active = pathname === item.to || pathname.startsWith(item.to + "/");
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Quocviet JR</div>
            <div className="text-[11px] text-slate-500">TQ ↔ VN Logistics</div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          <div className="space-y-1">
            <NavItem item={overviewItem} pathname={pathname} />
          </div>

          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem key={item.to} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
          Prototype by Tanoshivietnam
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Hệ thống Quản lý Vận chuyển
            </h1>
            <p className="text-xs text-slate-500">Tuyến Trung Quốc – Việt Nam</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">Nguyễn Văn An</div>
              <div className="text-xs text-slate-500">Quản trị viên</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              NA
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
