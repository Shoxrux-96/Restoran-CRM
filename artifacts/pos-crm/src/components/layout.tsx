import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  MonitorSmartphone, 
  Package, 
  UsersRound, 
  Receipt,
  LogOut
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
      }
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
    { href: "/admin/customers", label: "Mijozlar", icon: UsersRound },
    { href: "/admin/debts", label: "Qarz Daftar", icon: Receipt },
  ];

  const links = user?.role === "owner" ? ownerLinks : adminLinks;

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">R</div>
            RestoCRM
          </h1>
          {user?.venueName && (
            <p className="text-sm text-zinc-400 mt-2 truncate">{user.venueName}</p>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = location === link.href || location.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className="block">
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                    isActive 
                      ? "bg-blue-600/10 text-blue-500 font-medium" 
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-zinc-500 capitalize">{user?.role === "owner" ? "Egasi" : "Admin"}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Chiqish
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-900">
        <div className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
