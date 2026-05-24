import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetVenueReport, getGetVenueReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { BarChart3, TrendingUp, ShoppingBag, Receipt, ChevronLeft, ChevronRight } from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  if (n >= 1_000) return Math.round(n / 1_000) + " ming";
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}
function fmtFull(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  cash: { label: "Naqd", color: "bg-green-600/20 text-green-400 border-green-800" },
  card: { label: "Karta", color: "bg-blue-600/20 text-blue-400 border-blue-800" },
  debt: { label: "Qarzga", color: "bg-red-600/20 text-red-400 border-red-800" },
  transfer: { label: "O'tkazma", color: "bg-purple-600/20 text-purple-400 border-purple-800" },
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Tugallangan",
  pending: "Kutilmoqda",
  cancelled: "Bekor",
};

type OrderItem = { productId: number; productName: string; quantity: number; unitPrice: number; total: number };
type Order = {
  id: number;
  customerName: string | null;
  roomName: string | null;
  tableNumber: string | null;
  totalAmount: number;
  paymentType: string;
  status: string;
  notes: string | null;
  items: OrderItem[];
  createdAt: string;
};

export default function AdminReport() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [filterPayment, setFilterPayment] = useState<string>("all");

  const { data, isLoading } = useGetVenueReport(venueId, { year }, {
    query: {
      enabled: !!venueId,
      queryKey: getGetVenueReportQueryKey(venueId, { year }),
    },
  });

  const filteredOrders = (data?.allOrders ?? []).filter((o) =>
    filterPayment === "all" ? true : o.paymentType === filterPayment
  );

  const chartData = (data?.monthlySales ?? []).map((m) => ({
    name: m.monthName.slice(0, 3),
    fullName: m.monthName,
    revenue: m.revenue,
    orders: m.orderCount,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm shadow-xl">
          <p className="text-white font-medium mb-1">{payload[0]?.payload?.fullName}</p>
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex justify-between gap-4">
              <span className="text-zinc-400">{p.dataKey === "revenue" ? "Daromad:" : "Buyurtmalar:"}</span>
              <span style={{ color: p.color }} className="font-semibold">
                {p.dataKey === "revenue" ? fmtFull(p.value) : `${p.value} ta`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sotuvlar Hisobot</h1>
          <p className="text-zinc-400 mt-1">Oylik va yillik daromad tahlili</p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-2 py-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-white font-semibold w-12 text-center">{year}</span>
          <button
            onClick={() => setYear((y) => Math.min(y + 1, currentYear))}
            disabled={year >= currentYear}
            className="p-1 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-zinc-500 text-center py-20">Yuklanmoqda...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">{year} yil daromadi</span>
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                </div>
                <p className="text-xl font-bold text-green-400">{fmt(data?.totalRevenue ?? 0)}</p>
                <p className="text-xs text-zinc-600 mt-0.5">so'm</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">Jami buyurtmalar</span>
                  <ShoppingBag className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-white">{data?.totalOrders ?? 0}</p>
                <p className="text-xs text-zinc-600 mt-0.5">ta</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">O'rtacha chek</span>
                  <Receipt className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <p className="text-xl font-bold text-purple-400">
                  {fmt((data?.totalOrders ?? 0) > 0 ? (data?.totalRevenue ?? 0) / data!.totalOrders : 0)}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">so'm</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">Eng yaxshi oy</span>
                  <BarChart3 className="h-3.5 w-3.5 text-orange-500" />
                </div>
                {(() => {
                  const best = [...(data?.monthlySales ?? [])].sort((a, b) => b.revenue - a.revenue)[0];
                  return best && best.revenue > 0 ? (
                    <>
                      <p className="text-xl font-bold text-orange-400">{best.monthName}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{fmt(best.revenue)} so'm</p>
                    </>
                  ) : <p className="text-xl font-bold text-zinc-600">—</p>;
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-zinc-300">{year} yil oylik daromad</CardTitle>
              <div className="flex gap-1">
                <button
                  onClick={() => setChartType("bar")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${chartType === "bar" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
                >
                  Ustunli
                </button>
                <button
                  onClick={() => setChartType("line")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${chartType === "line" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
                >
                  Chiziqli
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                {chartType === "bar" ? (
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>

              {/* Month minibar */}
              <div className="grid grid-cols-6 md:grid-cols-12 gap-1 mt-3">
                {(data?.monthlySales ?? []).map((m) => (
                  <div key={m.month} className="text-center">
                    <p className="text-xs text-zinc-600">{m.monthName.slice(0, 3)}</p>
                    <p className="text-xs font-medium text-blue-400">{m.orderCount}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Orders table */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm text-zinc-300">
                Barcha Sotuvlar
                <span className="ml-2 text-zinc-600 font-normal">{filteredOrders.length} ta</span>
              </CardTitle>
              <div className="flex gap-1 flex-wrap justify-end">
                {(["all", "cash", "card", "debt", "transfer"] as const).map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setFilterPayment(pt)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      filterPayment === pt ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {pt === "all" ? "Barchasi" : PAYMENT_LABELS[pt]?.label ?? pt}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-zinc-600">Sotuvlar yo'q</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-2.5 px-4 text-xs text-zinc-500 font-medium">ID</th>
                        <th className="text-left py-2.5 px-4 text-xs text-zinc-500 font-medium">Sana</th>
                        <th className="text-left py-2.5 px-4 text-xs text-zinc-500 font-medium">Mijoz / Stol</th>
                        <th className="text-left py-2.5 px-4 text-xs text-zinc-500 font-medium">Tur</th>
                        <th className="text-left py-2.5 px-4 text-xs text-zinc-500 font-medium">Holat</th>
                        <th className="text-right py-2.5 px-4 text-xs text-zinc-500 font-medium">Summa</th>
                        <th className="text-center py-2.5 px-4 text-xs text-zinc-500 font-medium">Chek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => {
                        const pm = PAYMENT_LABELS[o.paymentType] ?? { label: o.paymentType, color: "bg-zinc-800 text-zinc-400 border-zinc-700" };
                        return (
                          <tr
                            key={o.id}
                            className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedOrder(o)}
                          >
                            <td className="py-3 px-4 text-zinc-500">#{o.id}</td>
                            <td className="py-3 px-4 text-zinc-400 whitespace-nowrap text-xs">{fmtDate(o.createdAt)}</td>
                            <td className="py-3 px-4">
                              <p className="text-zinc-200">{o.customerName ?? "Mehmon"}</p>
                              {(o.roomName || o.tableNumber) && (
                                <p className="text-xs text-zinc-600">{o.roomName} {o.tableNumber ? `· Stol ${o.tableNumber}` : ""}</p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className={`text-xs ${pm.color}`}>{pm.label}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-xs ${o.status === "completed" ? "text-green-400" : o.status === "cancelled" ? "text-red-400" : "text-yellow-400"}`}>
                                {STATUS_LABELS[o.status] ?? o.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-white">{fmtFull(o.totalAmount)}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title="Chekni ko'rish"
                              >
                                <Receipt className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Receipt Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-400" />
              Sotuv Cheki #{selectedOrder?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Receipt header */}
              <div className="bg-zinc-800 rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Sana:</span>
                  <span className="text-zinc-200">{fmtDate(selectedOrder.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Mijoz:</span>
                  <span className="text-zinc-200">{selectedOrder.customerName ?? "Mehmon"}</span>
                </div>
                {(selectedOrder.roomName || selectedOrder.tableNumber) && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Joy:</span>
                    <span className="text-zinc-200">
                      {selectedOrder.roomName} {selectedOrder.tableNumber ? `· Stol ${selectedOrder.tableNumber}` : ""}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">To'lov turi:</span>
                  <Badge variant="outline" className={`text-xs ${PAYMENT_LABELS[selectedOrder.paymentType]?.color ?? ""}`}>
                    {PAYMENT_LABELS[selectedOrder.paymentType]?.label ?? selectedOrder.paymentType}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Holat:</span>
                  <span className={`text-xs font-medium ${selectedOrder.status === "completed" ? "text-green-400" : selectedOrder.status === "cancelled" ? "text-red-400" : "text-yellow-400"}`}>
                    {STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                  </span>
                </div>
                {selectedOrder.notes && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Izoh:</span>
                    <span className="text-zinc-300 text-xs max-w-32 text-right">{selectedOrder.notes}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Buyurtmalar</p>
                  <div className="space-y-1">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-zinc-800/60 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200 truncate">{item.productName}</p>
                          <p className="text-xs text-zinc-500">{item.quantity} × {fmtFull(item.unitPrice)}</p>
                        </div>
                        <p className="text-sm font-medium text-white ml-3">{fmtFull(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="bg-zinc-800 rounded-lg p-3 flex justify-between items-center">
                <span className="text-zinc-300 font-medium">JAMI:</span>
                <span className="text-xl font-bold text-white">{fmtFull(selectedOrder.totalAmount)}</span>
              </div>

              <Button
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                Yopish
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
