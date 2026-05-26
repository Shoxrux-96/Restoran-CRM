import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetVenueReport, getGetVenueReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { BarChart3, TrendingUp, ShoppingBag, Receipt, ChevronLeft, ChevronRight, Download } from "lucide-react";
import * as XLSX from "xlsx";

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
  cash:     { label: "Naqd",    color: "bg-green-600/20 text-green-400 border-green-800" },
  card:     { label: "Karta",   color: "bg-blue-600/20 text-blue-400 border-blue-800" },
  debt:     { label: "Qarzga",  color: "bg-red-600/20 text-red-400 border-red-800" },
  transfer: { label: "O'tkazma", color: "bg-purple-600/20 text-purple-400 border-purple-800" },
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Tugallangan",
  pending:   "Kutilmoqda",
  cancelled: "Bekor",
  debt:      "Qarz",
};

type OrderItem = { productId: number; productName: string; quantity: number; unitPrice: number; total: number };
type Order = {
  id: number;
  customerName?: string | null;
  roomName?: string | null;
  tableNumber?: string | null;
  totalAmount: number;
  paymentType: string;
  status: string;
  notes?: string | null;
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
    query: { enabled: !!venueId, queryKey: getGetVenueReportQueryKey(venueId, { year }) },
  });

  const filteredOrders = ((data?.allOrders ?? []) as Order[]).filter((o) =>
    filterPayment === "all" ? true : o.paymentType === filterPayment
  );

  const chartData = (data?.monthlySales ?? []).map((m) => ({
    name: (m.monthName ?? "").slice(0, 3),
    fullName: m.monthName ?? "",
    revenue: m.revenue,
    orders: m.orderCount,
  }));

  const exportToExcel = () => {
    const orders = (data?.allOrders ?? []) as Order[];
    if (!orders.length) return;

    // Sheet 1: Summary by month
    const monthlySheet = (data?.monthlySales ?? []).map((m) => ({
      "Oy": m.monthName ?? "",
      "Buyurtmalar soni": m.orderCount,
      "Daromad (so'm)": m.revenue,
    }));

    // Sheet 2: All orders
    const ordersSheet = orders.map((o) => ({
      "Chek #": o.id,
      "Sana": fmtDate(o.createdAt),
      "Mijoz": o.customerName ?? "Mehmon",
      "Joy": [o.roomName, o.tableNumber ? `Stol ${o.tableNumber}` : ""].filter(Boolean).join(" · ") || "—",
      "To'lov turi": PAYMENT_LABELS[o.paymentType]?.label ?? o.paymentType,
      "Holat": STATUS_LABELS[o.status] ?? o.status,
      "Summa (so'm)": o.totalAmount,
      "Mahsulotlar": (o.items ?? []).map((i) => `${i.productName} ×${i.quantity}`).join(", "),
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(monthlySheet);
    const ws2 = XLSX.utils.json_to_sheet(ordersSheet);

    // Column widths for orders sheet
    ws2["!cols"] = [
      { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 50 },
    ];
    ws1["!cols"] = [{ wch: 15 }, { wch: 18 }, { wch: 16 }];

    XLSX.utils.book_append_sheet(wb, ws2, "Sotuvlar");
    XLSX.utils.book_append_sheet(wb, ws1, `${year} yil oylik`);
    XLSX.writeFile(wb, `sotuvlar_${year}.xlsx`);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-input border border-border rounded-lg p-3 text-sm shadow-xl">
          <p className="text-foreground font-medium mb-1">{payload[0]?.payload?.fullName}</p>
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{p.dataKey === "revenue" ? "Daromad:" : "Buyurtmalar:"}</span>
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
          <h1 className="text-2xl font-bold text-foreground">Sotuvlar Hisobot</h1>
          <p className="text-muted-foreground mt-1">Oylik va yillik daromad tahlili</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={exportToExcel} disabled={!data?.allOrders?.length} variant="outline" className="gap-2 border-green-700 text-green-400 hover:bg-green-700/10 hover:text-green-300">
            <Download className="h-4 w-4" />
            Excel yuklash
          </Button>
          <div className="flex items-center gap-2 bg-muted rounded-lg px-2 py-1">
            <button onClick={() => setYear((y) => y - 1)} className="p-1 text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-foreground font-semibold w-12 text-center">{year}</span>
            <button onClick={() => setYear((y) => Math.min(y + 1, currentYear))} disabled={year >= currentYear} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-center py-20">Yuklanmoqda...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground">{year} yil daromadi</span><TrendingUp className="h-3.5 w-3.5 text-green-500" /></div>
                <p className="text-xl font-bold text-green-400">{fmt(data?.totalRevenue ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">so'm</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground">Jami buyurtmalar</span><ShoppingBag className="h-3.5 w-3.5 text-blue-500" /></div>
                <p className="text-xl font-bold text-foreground">{data?.totalOrders ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ta</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground">O'rtacha chek</span><Receipt className="h-3.5 w-3.5 text-purple-500" /></div>
                <p className="text-xl font-bold text-purple-400">{fmt((data?.totalOrders ?? 0) > 0 ? (data?.totalRevenue ?? 0) / data!.totalOrders : 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">so'm</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground">Eng yaxshi oy</span><BarChart3 className="h-3.5 w-3.5 text-orange-500" /></div>
                {(() => {
                  const best = [...(data?.monthlySales ?? [])].sort((a, b) => b.revenue - a.revenue)[0];
                  return best && best.revenue > 0
                    ? <><p className="text-xl font-bold text-orange-400">{best.monthName}</p><p className="text-xs text-muted-foreground mt-0.5">{fmt(best.revenue)} so'm</p></>
                    : <p className="text-xl font-bold text-muted-foreground">—</p>;
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-foreground">{year} yil oylik daromad</CardTitle>
              <div className="flex gap-1">
                {(["bar", "line"] as const).map((t) => (
                  <button key={t} onClick={() => setChartType(t)} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${chartType === t ? "bg-blue-600 text-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    {t === "bar" ? "Ustunli" : "Chiziqli"}
                  </button>
                ))}
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
              <div className="grid grid-cols-6 md:grid-cols-12 gap-1 mt-3">
                {(data?.monthlySales ?? []).map((m) => (
                  <div key={m.month} className="text-center">
                    <p className="text-xs text-muted-foreground">{(m.monthName ?? "").slice(0, 3)}</p>
                    <p className="text-xs font-medium text-blue-400">{m.orderCount}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Orders table */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm text-foreground">
                Barcha Sotuvlar <span className="ml-2 text-muted-foreground font-normal">{filteredOrders.length} ta</span>
              </CardTitle>
              <div className="flex gap-1 flex-wrap justify-end">
                {(["all", "cash", "card", "debt", "transfer"] as const).map((pt) => (
                  <button key={pt} onClick={() => setFilterPayment(pt)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filterPayment === pt ? "bg-blue-600 text-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    {pt === "all" ? "Barchasi" : PAYMENT_LABELS[pt]?.label ?? pt}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">Sotuvlar yo'q</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-4 text-xs text-muted-foreground font-medium">ID</th>
                        <th className="text-left py-2.5 px-4 text-xs text-muted-foreground font-medium">Sana</th>
                        <th className="text-left py-2.5 px-4 text-xs text-muted-foreground font-medium">Mijoz / Stol</th>
                        <th className="text-left py-2.5 px-4 text-xs text-muted-foreground font-medium">Tur</th>
                        <th className="text-left py-2.5 px-4 text-xs text-muted-foreground font-medium">Holat</th>
                        <th className="text-right py-2.5 px-4 text-xs text-muted-foreground font-medium">Summa</th>
                        <th className="text-center py-2.5 px-4 text-xs text-muted-foreground font-medium">Chek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => {
                        const pm = PAYMENT_LABELS[o.paymentType] ?? { label: o.paymentType, color: "bg-muted text-muted-foreground border-border" };
                        return (
                          <tr key={o.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(o)}>
                            <td className="py-3 px-4 text-muted-foreground">#{o.id}</td>
                            <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-xs">{fmtDate(o.createdAt)}</td>
                            <td className="py-3 px-4">
                              <p className="text-foreground">{o.customerName ?? "Mehmon"}</p>
                              {(o.roomName || o.tableNumber) && <p className="text-xs text-muted-foreground">{o.roomName} {o.tableNumber ? `· Stol ${o.tableNumber}` : ""}</p>}
                            </td>
                            <td className="py-3 px-4"><Badge variant="outline" className={`text-xs ${pm.color}`}>{pm.label}</Badge></td>
                            <td className="py-3 px-4">
                              <span className={`text-xs ${o.status === "completed" ? "text-green-400" : o.status === "cancelled" ? "text-red-400" : "text-yellow-400"}`}>
                                {STATUS_LABELS[o.status as string] ?? o.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-foreground">{fmtFull(o.totalAmount)}</td>
                            <td className="py-3 px-4 text-center">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }} className="text-blue-400 hover:text-blue-300 transition-colors" title="Chekni ko'rish">
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
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-400" />
              Sotuv Cheki #{selectedOrder?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Sana:</span><span className="text-foreground">{fmtDate(selectedOrder.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mijoz:</span><span className="text-foreground">{selectedOrder.customerName ?? "Mehmon"}</span></div>
                {(selectedOrder.roomName || selectedOrder.tableNumber) && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Joy:</span><span className="text-foreground">{selectedOrder.roomName} {selectedOrder.tableNumber ? `· Stol ${selectedOrder.tableNumber}` : ""}</span></div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To'lov:</span>
                  <Badge variant="outline" className={`text-xs ${PAYMENT_LABELS[selectedOrder.paymentType]?.color ?? ""}`}>
                    {PAYMENT_LABELS[selectedOrder.paymentType]?.label ?? selectedOrder.paymentType}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Holat:</span>
                  <span className={`text-xs font-medium ${selectedOrder.status === "completed" ? "text-green-400" : selectedOrder.status === "cancelled" ? "text-red-400" : "text-yellow-400"}`}>
                    {STATUS_LABELS[selectedOrder.status as string] ?? selectedOrder.status}
                  </span>
                </div>
                {selectedOrder.notes && <div className="flex justify-between"><span className="text-muted-foreground">Izoh:</span><span className="text-zinc-300 text-xs max-w-32 text-right">{selectedOrder.notes}</span></div>}
              </div>
              {selectedOrder.items?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Buyurtmalar</p>
                  <div className="space-y-1">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-border/60 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} × {fmtFull(item.unitPrice)}</p>
                        </div>
                        <p className="text-sm font-medium text-foreground ml-3">{fmtFull(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-muted rounded-lg p-3 flex justify-between items-center">
                <span className="text-zinc-300 font-medium">JAMI:</span>
                <span className="text-xl font-bold text-foreground">{fmtFull(selectedOrder.totalAmount)}</span>
              </div>
              <Button onClick={() => setSelectedOrder(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-foreground">Yopish</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
