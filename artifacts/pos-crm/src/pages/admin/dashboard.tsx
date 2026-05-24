import { useGetVenueSummary, getGetVenueSummaryQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertCircle, ShoppingBag, Clock } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(n) + " so'm";
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} soat oldin`;
  return d.toLocaleDateString("uz-UZ");
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const { data, isLoading } = useGetVenueSummary(venueId, {
    query: { enabled: !!venueId, queryKey: getGetVenueSummaryQueryKey(venueId) },
  });

  if (isLoading) return <div className="text-zinc-400">Yuklanmoqda...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Boshqaruv Paneli</h1>
        <p className="text-zinc-400 mt-1">{user?.venueName}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-zinc-400">Bugungi daromad</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-400">{fmt(data?.todayRevenue ?? 0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-zinc-400">Bugungi buyurtmalar</CardTitle>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">{data?.todayOrderCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-zinc-400">Jami qarz</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-red-400">{fmt(data?.totalDebt ?? 0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-zinc-400">To'lanmagan qarz</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-orange-400">{data?.unpaidDebtCount ?? 0} ta</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.topProducts && data.topProducts.length > 0 && (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Eng Ko'p Sotilgan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 w-4">{i + 1}.</span>
                    <span className="text-sm text-zinc-200">{p.productName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-400 font-medium">{fmt(p.revenue)}</p>
                    <p className="text-xs text-zinc-500">{p.totalSold} ta</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data?.recentOrders && data.recentOrders.length > 0 && (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="flex flex-row items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-500" />
              <CardTitle className="text-white text-sm">So'nggi Buyurtmalar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentOrders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-200">{o.customerName || "Naqd mijoz"}</p>
                    <p className="text-xs text-zinc-500">{timeAgo(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{fmt(o.totalAmount)}</p>
                    <p className={`text-xs ${o.paymentType === "debt" ? "text-red-400" : "text-green-400"}`}>
                      {o.paymentType === "debt" ? "Qarz" : "Naqd"}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
