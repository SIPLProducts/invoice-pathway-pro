import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Camera,
  PackageCheck,
  Database,
  CheckSquare,
  FolderOpen,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Plug,
  Activity,
} from "lucide-react";
import { useState } from "react";
import logo from "@/assets/rithwik-logo.png";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InstallPwaButton } from "@/components/InstallPwaButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavChild = { to: string; label: string; icon: typeof LayoutDashboard };
type NavItem = {
  to?: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: number;
  children?: NavChild[];
};

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dmr", label: "DMR", icon: FileText },
  { to: "/ocr", label: "OCR Capture", icon: Camera },
  { to: "/grn", label: "GRN", icon: PackageCheck },
  { to: "/tracker", label: "SAP Tracker", icon: Database },
  {
    label: "SAP Module",
    icon: Plug,
    children: [
      { to: "/sap/monitor", label: "Sync Monitor", icon: Activity },
      { to: "/sap/settings", label: "API Settings", icon: Settings },
    ],
  },
  { to: "/approvals", label: "Approvals", icon: CheckSquare, badge: 8 },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin", label: "Admin", icon: Settings },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [sapOpen, setSapOpen] = useState(location.pathname.startsWith("/sap"));
  const current = nav.find((n) =>
    n.to ? (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)) : false,
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border bg-white px-5">
          <img src={logo} alt="Rithwik" className="h-8 w-auto" />
          <button className="lg:hidden text-foreground" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-accent shadow-glow">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold text-sidebar-accent-foreground">DMR & GRN Portal</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Enterprise · v2.4</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin">
          <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Workspace
          </div>
          {nav.map((item) => {
            if (item.children) {
              const groupActive = location.pathname.startsWith("/sap");
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setSapOpen((s) => !s)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      groupActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronRight
                      className={cn("h-3.5 w-3.5 transition-transform", sapOpen && "rotate-90")}
                    />
                  </button>
                  {sapOpen && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                      {item.children.map((c) => (
                        <NavLink
                          key={c.to}
                          to={c.to}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                            )
                          }
                        >
                          <c.icon className="h-3.5 w-3.5 shrink-0" />
                          {c.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-lg bg-sidebar-accent/40 p-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-sidebar-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              SAP S/4HANA Connected
            </div>
            <div className="mt-1 text-[10px] text-sidebar-foreground/50">Last sync 12s ago • PRD-100</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-md lg:px-8"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <button className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
            <span>Workspace</span>
            <span>/</span>
            <span className="font-medium text-foreground">{current?.label ?? "Dashboard"}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search DMR, GRN, PO, vendor…"
                className="h-9 w-72 rounded-md border bg-background pl-9 pr-12 text-sm outline-none transition-shadow focus:shadow-glow"
              />
              <span className="kbd absolute right-2 top-1/2 -translate-y-1/2">⌘K</span>
            </div>

            <InstallPwaButton />

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-muted">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                    AK
                  </div>
                  <div className="hidden text-xs leading-tight md:block">
                    <div className="font-semibold">Anil Kumar</div>
                    <div className="text-muted-foreground">Site Engineer · BLR-01</div>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Switch role (demo)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Site Engineer</DropdownMenuItem>
                <DropdownMenuItem>Accounts (HO)</DropdownMenuItem>
                <DropdownMenuItem>Management</DropdownMenuItem>
                <DropdownMenuItem>System Admin</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile & Settings</DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          className="px-4 py-6 lg:px-8 lg:py-8 animate-fade-in"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
