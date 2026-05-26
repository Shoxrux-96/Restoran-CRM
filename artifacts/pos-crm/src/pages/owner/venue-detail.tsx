import { useParams } from "wouter";
import {
  useGetVenue,
  useGetVenueStats,
  useListUsers,
  useAssignVenueAdmin,
  getGetVenueQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Store, TrendingUp, AlertCircle, Package, ShoppingBag, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(n) + " so'm";
}

export default function OwnerVenueDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: venue, isLoading } = useGetVenue(id);
  const { data: stats } = useGetVenueStats(id);
  const { data: users } = useListUsers();
  const assignAdmin = useAssignVenueAdmin();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const adminUsers = users?.filter((u) => u.role === "admin") ?? [];

  const handleAssign = () => {
    if (!selectedUserId) return;
    assignAdmin.mutate(
      { id, data: { userId: Number(selectedUserId) } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetVenueQueryKey(id) });
          setSelectedUserId("");
          toast({ title: "Admin tayinlandi" });
        },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  if (isLoading) return <div className="text-muted-foreground">Yuklanmoqda...</div>;
  if (!venue) return <div className="text-red-400">Filial topilmadi</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center">
          <Store className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{venue.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize border-border text-muted-foreground">
              {venue.type === "cafe" ? "Kafe" : "Restoran"}
            </Badge>
            {venue.address && <span className="text-sm text-muted-foreground">{venue.address}</span>}
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Bugungi savdo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-400">{fmt(stats.todaySales)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Jami daromad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">{fmt(stats.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Qarz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-red-400">{fmt(stats.totalDebts)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" /> Buyurtmalar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">{stats.orderCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center gap-2">
          <UserCheck className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-foreground">Admin Tayinlash</CardTitle>
        </CardHeader>
        <CardContent>
          {venue.adminName ? (
            <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-900 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-sm font-bold text-blue-400">
                {venue.adminName.charAt(0)}
              </div>
              <div>
                <p className="text-foreground font-medium">{venue.adminName}</p>
                <p className="text-sm text-muted-foreground">Joriy admin</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm mb-4">Hali admin tayinlanmagan</p>
          )}
          <div className="flex gap-3">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="bg-input border-border flex-1">
                <SelectValue placeholder="Admin tanlang" />
              </SelectTrigger>
              <SelectContent className="bg-input border-border">
                {adminUsers.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name || u.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || assignAdmin.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Tayinlash
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-foreground">Filial Ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Telefon</span>
            <span className="text-foreground">{venue.phone || "—"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Manzil</span>
            <span className="text-foreground">{venue.address || "—"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Mahsulotlar soni</span>
            <span className="text-foreground">{stats?.productCount ?? "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
