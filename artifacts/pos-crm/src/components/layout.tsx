import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Store,
  Users,
  MonitorSmartphone,
  Package,
  Receipt,
  LogOut,
  DoorOpen,
  BarChart3,
  Table2,
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();
  const userRole = (user?.role as string) ?? "";

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
      },
    });
  };

  const ownerLinks = [
    { href: "/owner/dashboard", label: "Ko'rinish", icon: LayoutDashboard },
    { href: "/owner/venues", label: "Filiallar", icon: Store },
    { href: "/owner/users", label: "Foydalanuvchilar", icon: Users },
  ];

  const adminLinks = [
    { href: "/admin/dashboard", label: "Boshqaruv", icon: LayoutDashboard },
    { href: "/admin/pos", label: "POS Terminal", icon: MonitorSmartphone },
    { href: "/admin/products", label: "Mahsulotlar", icon: Package },
    { href: "/admin/rooms", label: "Xonalar & Stollar", icon: DoorOpen },
    { href: "/admin/waiters", label: "Afitsilar", icon: Users },
    { href: "/admin/debts", label: "Qarz Daftar", icon: Receipt },
    { href: "/admin/report", label: "Sotuvlar Hisobot", icon: BarChart3 },
  ];

  const waiterLinks = [
    { href: "/waiter/tables", label: "Xona va Stollar", icon: Table2 },
  ];

  const links =
    userRole === "owner"
      ? ownerLinks
      : userRole === "waiter"
      ? waiterLinks
      : adminLinks;

  const roleLabel =
    userRole === "owner" ? "Egasi" : userRole === "waiter" ? "Afitsiant" : "Admin";

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">
                R
              </div>
              RestoCRM
            </h1>
            {user?.venueName && (
              <p className="text-sm text-muted-foreground mt-2 truncate">{user.venueName}</p>
            )}
          </div>
          <ThemeToggle className="text-muted-foreground hover:text-foreground mt-0.5" />
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive =
              location === link.href || location.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className="block">
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                    isActive
                      ? "bg-blue-600/10 text-blue-500 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{user?.name || user?.username}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Chiqish
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="flex-1 overflow-auto p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
