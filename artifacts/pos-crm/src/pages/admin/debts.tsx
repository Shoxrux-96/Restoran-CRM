import { useState } from "react";
import {
  useListDebts,
  usePayDebt,
  getListDebtsQueryKey,
  type Debt,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Receipt, Phone, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(n) + " so'm";
}

export default function AdminDebts() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const { data: debts, isLoading } = useListDebts(venueId, { query: { enabled: !!venueId } });
  const payDebt = usePayDebt();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("unpaid");

  const filtered = (debts ?? []).filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  const totalUnpaid = (debts ?? [])
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + (d.remaining ?? d.amount), 0);

  const handlePay = () => {
    if (!payingDebt) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;

    payDebt.mutate(
      { id: payingDebt.id, data: { amount } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListDebtsQueryKey(venueId) });
          setPayingDebt(null);
          setPayAmount("");
          toast({ title: "To'lov qabul qilindi" });
        },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  const statusBadge = (status: string) => {
    if (status === "paid") return <Badge className="bg-green-600/20 text-green-400 border-green-800">To'langan</Badge>;
    if (status === "partial") return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-800">Qisman</Badge>;
    return <Badge className="bg-red-600/20 text-red-400 border-red-800">To'lanmagan</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Qarz Daftar</h1>
        <p className="text-zinc-400 mt-1">Jami to'lanmagan: <span className="text-red-400 font-semibold">{fmt(totalUnpaid)}</span></p>
      </div>

      <div className="flex gap-2">
        {(["unpaid", "all", "paid"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? "bg-blue-600 hover:bg-blue-700" : "border-zinc-700 text-zinc-400 hover:text-white"}
          >
            {f === "unpaid" ? "To'lanmagan" : f === "paid" ? "To'langan" : "Barchasi"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-zinc-400">Yuklanmoqda...</div>
      ) : !filtered.length ? (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Receipt className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">Qarz yo'q</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <Card key={d.id} className="bg-zinc-950 border-zinc-800">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{d.customerName}</p>
                      {statusBadge(d.status)}
                    </div>
                    {d.customerPhone && (
                      <p className="text-sm text-zinc-400 flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" /> {d.customerPhone}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                      Buyurtma #{d.orderId} · {new Date(d.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-400">Jami: {fmt(d.amount)}</p>
                    {d.paidAmount! > 0 && <p className="text-sm text-green-400">To'landi: {fmt(d.paidAmount!)}</p>}
                    <p className="text-lg font-bold text-red-400">{fmt(d.remaining ?? d.amount)}</p>
                    {d.status !== "paid" && (
                      <Button
                        size="sm"
                        onClick={() => { setPayingDebt(d); setPayAmount(String(d.remaining ?? d.amount)); }}
                        className="mt-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        To'lash
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!payingDebt} onOpenChange={() => setPayingDebt(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Qarz To'lash — {payingDebt?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-zinc-800 rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Jami qarz:</span>
                <span className="text-red-400 font-semibold">{fmt(payingDebt?.remaining ?? 0)}</span>
              </div>
            </div>
            <div>
              <Label>To'lov miqdori (so'm)</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="bg-zinc-800 border-zinc-700 mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayingDebt(null)}>Bekor</Button>
            <Button
              onClick={handlePay}
              disabled={!payAmount || Number(payAmount) <= 0 || payDebt.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {payDebt.isPending ? "Saqlanmoqda..." : "To'lovni Qabul Qilish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
