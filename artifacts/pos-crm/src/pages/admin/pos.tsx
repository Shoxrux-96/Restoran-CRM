import { useState, useRef, useEffect } from "react";
import {
  useListProducts,
  useListCustomers,
  useCreateCustomer,
  useCreateOrder,
  useListRooms,
  getListCustomersQueryKey,
  getListProductsQueryKey,
  getListRoomsQueryKey,
  type Product,
  type Room,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search, Plus, Minus, Trash2, Printer, CheckCircle, ChevronUp, X,
  Percent, ShoppingBag, UserPlus, DoorOpen, Table2, Shuffle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

type Unit = string;
const UNITS: { value: string; label: string }[] = [
  { value: "dona", label: "dona" },
  { value: "porsiya", label: "porsiya" },
  { value: "stakan", label: "stakan" },
  { value: "shisha", label: "shisha" },
  { value: "quti", label: "quti" },
  { value: "kg", label: "kg" },
  { value: "gram", label: "gram" },
  { value: "litr", label: "litr" },
  { value: "ml", label: "ml" },
  { value: "kosa", label: "kosa" },
  { value: "tarelka", label: "tarelka" },
  { value: "piyola", label: "piyola" },
  { value: "lagan", label: "lagan" },
];

type PayType = "naxt" | "karta" | "qarz" | "aralash";

type SplitPayment = {
  cash: number;
  card: number;
  debt: number;
};

type CartItem = {
  product: Product;
  quantity: number;
  discount: number;
  unit: Unit;
};

type ReceiptData = {
  orderId: number;
  venueName: string;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  payType: PayType;
  splitPayment?: SplitPayment;
  customerName?: string;
  tableNumber?: number;
  roomName?: string;
  date: Date;
};

type TableSelection = {
  roomId: number | null;
  roomName: string | null;
  tableId: number | null;
  tableNumber: number | null;
};

function itemTotal(item: CartItem) {
  const base = item.product.price * item.quantity;
  return base - (base * item.discount) / 100;
}

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

/* ── Thermal Fiscal Receipt ──────────────────────────────── */
function ThermalReceipt({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const dateStr = data.date.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const checkNum = String(data.orderId).padStart(6, "0");

  const qrData = JSON.stringify({
    id: data.orderId,
    venue: data.venueName,
    total: data.total,
    date: data.date.toISOString().slice(0, 10),
  });

  const payLabel = (type: PayType, split?: SplitPayment) => {
    if (type === "aralash" && split) {
      const parts: string[] = [];
      if (split.cash > 0) parts.push(`Naqd: ${fmt(split.cash)} so'm`);
      if (split.card > 0) parts.push(`Karta: ${fmt(split.card)} so'm`);
      if (split.debt > 0) parts.push(`Qarz: ${fmt(split.debt)} so'm`);
      return parts.join(" / ");
    }
    return type === "naxt" ? "Naqd pul" : type === "karta" ? "Bank kartasi" : "Qarzga";
  };

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=340,height=700");
    if (!win) return;
    const content = receiptRef.current?.innerHTML ?? "";
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>CHEK #${checkNum}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        @page { size: 58mm auto; margin: 0; }
        body { font-family:'Courier New',monospace; font-size:11px; width:58mm; background:#fff; color:#000; padding:3mm 2mm; }
        .c { text-align:center; }
        .r { text-align:right; }
        .b { font-weight:bold; }
        .dash { border-top:1px dashed #000; margin:2mm 0; }
        .solid { border-top:1px solid #000; margin:2mm 0; }
        .dbl { border-top:3px double #000; margin:2mm 0; }
        .row { display:flex; justify-content:space-between; line-height:1.4; }
        .xl { font-size:15px; font-weight:bold; }
        .sm { font-size:9px; }
        .qr { display:flex; justify-content:center; margin:2mm 0; }
        canvas, svg { display:block; }
      </style>
      </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const Dash = () => <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />;
  const Solid = () => <div style={{ borderTop: "1px solid #000", margin: "4px 0" }} />;
  const Dbl = () => <div style={{ borderTop: "3px double #000", margin: "4px 0" }} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full">
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-gray-800 text-sm">Sotuv muvaffaqiyatli!</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Receipt content (printable) */}
        <div className="overflow-y-auto max-h-[72vh] p-3 bg-gray-50">
          <div
            ref={receiptRef}
            className="bg-white mx-auto p-3 shadow-inner"
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: "11px",
              width: "220px",
              color: "#000",
              lineHeight: "1.45",
            }}
          >
            {/* ── Header ── */}
            <div style={{ textAlign: "center", marginBottom: "2px" }}>
              <div style={{ fontWeight: "bold", fontSize: "14px", letterSpacing: "1px" }}>
                {data.venueName.toUpperCase()}
              </div>
              <div style={{ fontSize: "9px", color: "#555" }}>Savdo cheki / Товарный чек</div>
            </div>
            <Solid />

            {/* ── Chek ma'lumotlari ── */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
              <span>CHEK: <b>#{checkNum}</b></span>
              <span>{dateStr}</span>
            </div>
            {data.customerName && (
              <div style={{ fontSize: "9px" }}>Mijoz: <b>{data.customerName}</b></div>
            )}
            {(data.roomName || data.tableNumber) && (
              <div style={{ fontSize: "9px" }}>
                Joy: <b>{[data.roomName, data.tableNumber ? `Stol #${data.tableNumber}` : ""].filter(Boolean).join(" · ")}</b>
              </div>
            )}
            <Dash />

            {/* ── Items header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#555" }}>
              <span style={{ flex: 1 }}>MAHSULOT</span>
              <span style={{ width: "70px", textAlign: "right" }}>SUMMA</span>
            </div>
            <Dash />

            {/* ── Items ── */}
            {data.items.map((item, i) => {
              const lineTotal = itemTotal(item);
              return (
                <div key={i} style={{ marginBottom: "3px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "10px" }}>
                    {i + 1}. {item.product.name}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                    <span>
                      {item.quantity} {item.unit} × {fmt(item.product.price)}
                      {item.discount > 0 ? ` (-${item.discount}%)` : ""}
                    </span>
                    <span style={{ fontWeight: "bold" }}>{fmt(lineTotal)}</span>
                  </div>
                </div>
              );
            })}
            <Dash />

            {/* ── Totals ── */}
            {data.totalDiscount > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                  <span>Jami (chegirmasiz):</span>
                  <span>{fmt(data.subtotal)} so'm</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#c00" }}>
                  <span>Chegirma:</span>
                  <span>-{fmt(data.totalDiscount)} so'm</span>
                </div>
              </>
            )}
            <Dbl />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px" }}>
              <span>JAMI:</span>
              <span>{fmt(data.total)} so'm</span>
            </div>
            <Dbl />

            {/* ── To'lov ── */}
            {data.payType === "aralash" && data.splitPayment ? (
              <div style={{ fontSize: "9px", marginTop: "2px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "1px" }}>To'lov:</div>
                {data.splitPayment.cash > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Naqd pul:</span><span>{fmt(data.splitPayment.cash)} so'm</span>
                  </div>
                )}
                {data.splitPayment.card > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Bank kartasi:</span><span>{fmt(data.splitPayment.card)} so'm</span>
                  </div>
                )}
                {data.splitPayment.debt > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#c00" }}>
                    <span>Qarz:</span><span>{fmt(data.splitPayment.debt)} so'm</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                <span>To'lov turi:</span>
                <span style={{ fontWeight: "bold" }}>
                  {payLabel(data.payType)}
                </span>
              </div>
            )}

            <Dash />

            {/* ── QR Code ── */}
            <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
              <QRCodeSVG value={qrData} size={72} level="M" />
            </div>
            <div style={{ textAlign: "center", fontSize: "8px", color: "#555" }}>
              Chekni skaner qiling
            </div>

            <Solid />
            {/* ── Footer ── */}
            <div style={{ textAlign: "center", fontSize: "9px", marginTop: "3px" }}>
              <div style={{ fontWeight: "bold" }}>✦ XARID UCHUN RAHMAT ✦</div>
              <div style={{ fontSize: "8px", color: "#777", marginTop: "2px" }}>
                Ushbu chek fiskal hujjat hisoblanadi
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 p-3 border-t border-gray-200">
          <Button onClick={handlePrint} className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Chop etish
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 text-sm border-gray-300 text-gray-700">
            Yopish
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Split Payment Panel ─────────────────────────────────── */
function SplitPaymentPanel({
  total,
  customers,
  venueId,
  onConfirm,
  onCancel,
  qc,
}: {
  total: number;
  customers: { id: number; name: string; phone?: string | null }[];
  venueId: number;
  onConfirm: (split: SplitPayment, customer?: { id?: number; name: string; phone?: string }) => void;
  onCancel: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [cashAmt, setCashAmt] = useState(String(Math.round(total)));
  const [cardAmt, setCardAmt] = useState("0");
  const [debtAmt, setDebtAmt] = useState("0");
  const [debtMode, setDebtMode] = useState<"existing" | "new">("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const createCustomer = useCreateCustomer();
  const { toast } = useToast();

  const cash = parseFloat(cashAmt) || 0;
  const card = parseFloat(cardAmt) || 0;
  const debt = parseFloat(debtAmt) || 0;
  const entered = cash + card + debt;
  const remaining = Math.round(total - entered);
  const hasDebt = debt > 0;

  const autoBalance = (field: "cash" | "card" | "debt", val: number) => {
    const others = { cash, card, debt, [field]: val };
    const sumOthers = Object.entries(others).filter(([k]) => k !== field).reduce((s, [, v]) => s + v, 0);
    return Math.max(0, total - sumOthers);
  };

  const handleConfirm = async () => {
    if (Math.abs(cash + card + debt - total) > 1) {
      toast({ title: `Summa to'g'ri kelmayapti. Farq: ${fmt(Math.abs(remaining))} so'm`, variant: "destructive" });
      return;
    }
    if (hasDebt) {
      let customer: { id?: number; name: string; phone?: string } | undefined;
      if (debtMode === "existing") {
        if (!selectedCustomerId) { toast({ title: "Mijozni tanlang", variant: "destructive" }); return; }
        const c = customers.find((x) => String(x.id) === selectedCustomerId);
        customer = { id: c?.id, name: c?.name ?? "", phone: c?.phone ?? "" };
      } else {
        if (!newName.trim()) { toast({ title: "Ism kiriting", variant: "destructive" }); return; }
        try {
          const newC = await new Promise<{ id: number; name: string; phone?: string | null }>((resolve, reject) => {
            createCustomer.mutate(
              { venueId, data: { name: newName.trim(), phone: newPhone.trim() || undefined } },
              { onSuccess: resolve, onError: reject }
            );
          });
          qc.invalidateQueries({ queryKey: getListCustomersQueryKey(venueId) });
          customer = { id: newC.id, name: newC.name, phone: newC.phone ?? "" };
        } catch { toast({ title: "Xatolik", variant: "destructive" }); return; }
      }
      onConfirm({ cash, card, debt }, customer);
    } else {
      onConfirm({ cash, card, debt });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={onCancel}>
      <div
        className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl shadow-2xl p-5 max-w-lg mx-auto w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Aralash To'lov</h3>
          </div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {/* Total */}
        <div className="bg-zinc-800 rounded-xl p-3 flex justify-between items-center mb-4">
          <span className="text-zinc-400 text-sm">To'lov summasi:</span>
          <span className="text-xl font-bold text-white">{fmt(total)} so'm</span>
        </div>

        {/* Amount inputs */}
        <div className="space-y-3 mb-4">
          {[
            { key: "cash" as const, label: "💵 Naqd pul", color: "text-green-400", val: cashAmt, set: setCashAmt },
            { key: "card" as const, label: "💳 Bank kartasi", color: "text-blue-400", val: cardAmt, set: setCardAmt },
            { key: "debt" as const, label: "📝 Qarzga", color: "text-red-400", val: debtAmt, set: setDebtAmt },
          ].map(({ key, label, color, val, set }) => (
            <div key={key} className="flex items-center gap-3">
              <span className={`text-sm font-medium w-28 shrink-0 ${color}`}>{label}</span>
              <Input
                type="number"
                value={val}
                onChange={(e) => set(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="0"
              />
              <button
                onClick={() => set(String(Math.round(autoBalance(key, 0))))}
                className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0 whitespace-nowrap"
              >
                Avto
              </button>
            </div>
          ))}
        </div>

        {/* Balance indicator */}
        <div className={`flex justify-between text-sm p-2 rounded-lg mb-4 ${
          Math.abs(remaining) < 1 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
        }`}>
          <span>{Math.abs(remaining) < 1 ? "✓ Balans to'g'ri" : "Farq:"}</span>
          {Math.abs(remaining) >= 1 && <span>{remaining > 0 ? `+${fmt(remaining)}` : fmt(remaining)} so'm</span>}
        </div>

        {/* Debt customer selection */}
        {hasDebt && (
          <div className="border border-red-900/50 rounded-xl p-3 mb-4 space-y-3">
            <p className="text-sm text-red-400 font-medium">Qarz uchun mijoz tanlang ({fmt(debt)} so'm)</p>
            <div className="flex gap-2">
              <button onClick={() => setDebtMode("existing")} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${debtMode === "existing" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>Mavjud</button>
              <button onClick={() => setDebtMode("new")} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${debtMode === "new" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}><UserPlus className="h-3 w-3" />Yangi</button>
            </div>
            {debtMode === "existing" ? (
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="">— Mijozni tanlang —</option>
                {customers.map((c) => <option key={c.id} value={String(c.id)}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>)}
              </select>
            ) : (
              <>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ism *" className="bg-zinc-800 border-zinc-700 text-white" />
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Telefon" className="bg-zinc-800 border-zinc-700 text-white" />
              </>
            )}
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={Math.abs(cash + card + debt - total) > 1 || createCustomer.isPending}
          className="w-full bg-purple-600 hover:bg-purple-700 font-semibold"
        >
          {createCustomer.isPending ? "Saqlanmoqda..." : "To'lovni amalga oshirish"}
        </Button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

/* ── Debt Panel ──────────────────────────────────────────── */
function DebtPanel({
  total, customers, venueId, onConfirm, onCancel, qc,
}: {
  total: number;
  customers: { id: number; name: string; phone?: string | null }[];
  venueId: number;
  onConfirm: (info: { customerId?: number; customerName: string; phone: string; deadline: string }) => void;
  onCancel: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const createCustomer = useCreateCustomer();
  const { toast } = useToast();
  const selectedCustomer = customers.find((c) => String(c.id) === selectedId);

  const handleConfirm = async () => {
    if (mode === "existing") {
      if (!selectedId) { toast({ title: "Mijozni tanlang", variant: "destructive" }); return; }
      onConfirm({ customerId: Number(selectedId), customerName: selectedCustomer?.name ?? "", phone: selectedCustomer?.phone ?? "", deadline });
    } else {
      if (!name.trim()) { toast({ title: "Ism kiriting", variant: "destructive" }); return; }
      createCustomer.mutate(
        { venueId, data: { name: name.trim(), phone: phone.trim() || undefined } },
        {
          onSuccess: (c) => {
            qc.invalidateQueries({ queryKey: getListCustomersQueryKey(venueId) });
            onConfirm({ customerId: c.id, customerName: c.name, phone: c.phone ?? "", deadline });
          },
          onError: () => toast({ title: "Xatolik", variant: "destructive" }),
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={onCancel}>
      <div className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl shadow-2xl p-5 max-w-lg mx-auto w-full" onClick={(e) => e.stopPropagation()} style={{ animation: "slideUp 0.25s ease-out" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><ChevronUp className="h-5 w-5 text-red-400" />Qarzga Sotuv</h3>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="bg-zinc-800 rounded-xl p-3 flex justify-between mb-4">
          <span className="text-zinc-400 text-sm">Qarz summasi:</span>
          <span className="text-xl font-bold text-red-400">{fmt(total)} so'm</span>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode("existing")} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === "existing" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>Mavjud mijoz</button>
          <button onClick={() => setMode("new")} className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${mode === "new" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}><UserPlus className="h-4 w-4" />Yangi</button>
        </div>
        <div className="space-y-3">
          {mode === "existing" ? (
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">— Mijozni tanlang —</option>
              {customers.map((c) => <option key={c.id} value={String(c.id)}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>)}
            </select>
          ) : (
            <>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ism *" className="bg-zinc-800 border-zinc-700 text-white" />
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" className="bg-zinc-800 border-zinc-700 text-white" />
            </>
          )}
          <div>
            <Label className="text-zinc-300 text-sm">Qarz muddati</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white mt-1" />
          </div>
          <Button onClick={handleConfirm} disabled={createCustomer.isPending} className="w-full bg-red-600 hover:bg-red-700 font-semibold">
            {createCustomer.isPending ? "Saqlanmoqda..." : "Qarzga Sotish"}
          </Button>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

/* ── Main POS Page ────────────────────────────────────────── */
export default function AdminPos() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const { data: products } = useListProducts(venueId, { query: { enabled: !!venueId, queryKey: getListProductsQueryKey(venueId) } });
  const { data: customers } = useListCustomers(venueId, { query: { enabled: !!venueId, queryKey: getListCustomersQueryKey(venueId) } });
  const { data: rooms } = useListRooms(venueId, { query: { enabled: !!venueId, queryKey: getListRoomsQueryKey(venueId) } });
  const createOrder = useCreateOrder();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showDebtPanel, setShowDebtPanel] = useState(false);
  const [showSplitPanel, setShowSplitPanel] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTablePanel, setShowTablePanel] = useState(false);
  const [tableSelection, setTableSelection] = useState<TableSelection>({ roomId: null, roomName: null, tableId: null, tableNumber: null });
  const searchRef = useRef<HTMLInputElement>(null);

  const availableProducts = (products ?? []).filter((p) => p.isAvailable);
  const suggestions = search.length > 0 ? availableProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8) : [];

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalDiscount = cart.reduce((s, i) => s + (i.product.price * i.quantity * i.discount) / 100, 0);
  const total = subtotal - totalDiscount;

  const addProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, discount: 0, unit: "dona" }];
    });
    setSearch(""); setShowSuggestions(false);
    searchRef.current?.focus();
  };

  const updateItem = (productId: number, field: Partial<Omit<CartItem, "product">>) =>
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, ...field } : i)));

  const removeItem = (productId: number) => setCart((prev) => prev.filter((i) => i.product.id !== productId));

  const clearCart = () => {
    setCart([]);
    setTableSelection({ roomId: null, roomName: null, tableId: null, tableNumber: null });
    qc.invalidateQueries();
  };

  const placeOrder = (opts: {
    customerId?: number;
    customerName?: string;
    payType: PayType;
    apiPayType: "cash" | "card" | "transfer" | "debt";
    splitPayment?: SplitPayment;
    notes?: string;
  }) => {
    const apiSplit = opts.splitPayment && opts.payType === "aralash"
      ? {
          ...(opts.splitPayment.cash > 0 && { cash: opts.splitPayment.cash }),
          ...(opts.splitPayment.card > 0 && { card: opts.splitPayment.card }),
          ...(opts.splitPayment.debt > 0 && { debt: opts.splitPayment.debt }),
        }
      : undefined;

    createOrder.mutate(
      {
        venueId,
        data: {
          customerId: opts.customerId ?? null,
          roomId: tableSelection.roomId ?? null,
          tableId: tableSelection.tableId ?? null,
          tableNumber: tableSelection.tableNumber ?? null,
          roomName: tableSelection.roomName ?? null,
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          paymentType: opts.apiPayType,
          paymentSplit: apiSplit,
          notes: opts.notes,
        },
      },
      {
        onSuccess: (order) => {
          setReceipt({
            orderId: order.id,
            venueName: user?.venueName ?? "Kafe",
            items: [...cart],
            subtotal, totalDiscount, total,
            payType: opts.payType,
            splitPayment: opts.splitPayment,
            customerName: opts.customerName,
            tableNumber: tableSelection.tableNumber ?? undefined,
            roomName: tableSelection.roomName ?? undefined,
            date: new Date(),
          });
          clearCart();
          setShowDebtPanel(false);
          setShowSplitPanel(false);
        },
        onError: () => toast({ title: "Xatolik yuz berdi", variant: "destructive" }),
      }
    );
  };

  const handleDebtConfirm = (info: { customerId?: number; customerName: string; phone: string; deadline: string }) => {
    placeOrder({
      customerId: info.customerId,
      customerName: info.customerName,
      payType: "qarz",
      apiPayType: "debt",
      notes: `Qarz muddati: ${info.deadline}${info.phone ? `, Tel: ${info.phone}` : ""}`,
    });
  };

  const handleSplitConfirm = (split: SplitPayment, customer?: { id?: number; name: string; phone?: string }) => {
    // Determine primary payment type
    const dominantType = split.debt >= split.cash && split.debt >= split.card
      ? "debt" : split.card >= split.cash ? "card" : "cash";
    const apiType = dominantType === "debt" ? "debt" : dominantType === "card" ? "card" : "cash";
    const notesParts: string[] = [];
    if (customer) notesParts.push(`Mijoz: ${customer.name}${customer.phone ? ` (${customer.phone})` : ""}`);
    placeOrder({
      customerId: customer?.id,
      customerName: customer?.name,
      payType: "aralash",
      apiPayType: apiType,
      splitPayment: split,
      notes: notesParts.join(", ") || undefined,
    });
  };

  const categoryGroups = [...new Set(availableProducts.map((p) => p.category))];

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] gap-0 overflow-hidden -m-6 md:-m-8">
      {/* Top bar */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <ShoppingBag className="h-5 w-5 text-blue-500 shrink-0" />
        <h1 className="text-white font-bold text-lg">Sotuv Kassa</h1>
        <button
          onClick={() => setShowTablePanel(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-2 ${
            tableSelection.tableNumber
              ? "bg-blue-600/20 text-blue-400 border border-blue-600/40 hover:bg-blue-600/30"
              : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-300"
          }`}
        >
          <Table2 className="h-3.5 w-3.5" />
          {tableSelection.tableNumber
            ? `${tableSelection.roomName ? `${tableSelection.roomName} · ` : ""}Stol #${tableSelection.tableNumber}`
            : "Stol tanlash"}
          {tableSelection.tableNumber && (
            <button onClick={(e) => { e.stopPropagation(); setTableSelection({ roomId: null, roomName: null, tableId: null, tableNumber: null }); }} className="ml-1 text-zinc-400 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          )}
        </button>
        <span className="text-zinc-500 text-sm ml-auto">{user?.venueName}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Search + Cart */}
        <div className="flex flex-col flex-1 overflow-hidden bg-zinc-900">
          {/* Search */}
          <div className="p-4 border-b border-zinc-800 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Mahsulot nomini yozing..."
                className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 text-base"
                autoComplete="off"
              />
              {search && <button onClick={() => { setSearch(""); setShowSuggestions(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 z-30 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                {suggestions.map((p) => (
                  <button key={p.id} onClick={() => addProduct(p)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-700 transition-colors text-left">
                    <div>
                      <p className="text-white font-medium">{p.name}</p>
                      <p className="text-xs text-zinc-400">{p.category}</p>
                    </div>
                    <span className="text-blue-400 font-semibold text-sm">{fmt(p.price)} so'm</span>
                  </button>
                ))}
              </div>
            )}
            {showSuggestions && search.length > 0 && suggestions.length === 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 z-30 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl px-4 py-3">
                <p className="text-zinc-400 text-sm">"{search}" topilmadi</p>
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4" onClick={() => setShowSuggestions(false)}>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                <ShoppingBag className="h-16 w-16 mb-3 opacity-30" />
                <p className="text-lg">Savat bo'sh</p>
                <p className="text-sm mt-1 text-zinc-700">Mahsulot qidiring va qo'shing</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, idx) => {
                  const lineTotal = itemTotal(item);
                  return (
                    <div key={item.product.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2">
                          {/* Product thumbnail */}
                          {(item.product as any).imageUrl ? (
                            <img src={(item.product as any).imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-lg opacity-40">🍽️</span>
                            </div>
                          )}
                          <div>
                            <span className="text-xs text-zinc-600 mr-1">{idx + 1}.</span>
                            <span className="text-white font-semibold text-sm">{item.product.name}</span>
                            <span className="text-xs text-zinc-500 ml-2">{item.product.category}</span>
                          </div>
                        </div>
                        <button onClick={() => removeItem(item.product.id)} className="text-red-500 hover:bg-red-500/10 rounded p-1 ml-2"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center bg-zinc-800 rounded-lg overflow-hidden">
                          <button onClick={() => updateItem(item.product.id, { quantity: Math.max(1, item.quantity - 1) })} className="px-2 py-1.5 text-zinc-300 hover:bg-zinc-700"><Minus className="h-3.5 w-3.5" /></button>
                          <input type="number" value={item.quantity} onChange={(e) => updateItem(item.product.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} className="w-10 text-center bg-transparent text-white text-sm font-semibold focus:outline-none" />
                          <button onClick={() => updateItem(item.product.id, { quantity: item.quantity + 1 })} className="px-2 py-1.5 text-zinc-300 hover:bg-zinc-700"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                        <select value={item.unit} onChange={(e) => updateItem(item.product.id, { unit: e.target.value as Unit })} className="bg-zinc-800 border-none text-zinc-300 text-sm rounded-lg px-2 py-1.5 focus:outline-none">
                          {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-1.5">
                          <Percent className="h-3.5 w-3.5 text-zinc-400" />
                          <input type="number" value={item.discount} min={0} max={100} onChange={(e) => updateItem(item.product.id, { discount: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} className="w-10 text-center bg-transparent text-zinc-300 text-sm focus:outline-none" placeholder="0" />
                          <span className="text-zinc-500 text-xs">chegirma</span>
                        </div>
                        <div className="ml-auto text-right">
                          {item.discount > 0 && <p className="text-xs text-zinc-500 line-through">{fmt(item.product.price * item.quantity)} so'm</p>}
                          <p className="text-white font-bold">{fmt(lineTotal)} so'm</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary + Payment */}
        <div className="w-72 flex flex-col bg-zinc-950 border-l border-zinc-800">
          {/* Totals */}
          <div className="p-4 border-b border-zinc-800 space-y-2">
            <div className="flex justify-between text-sm text-zinc-400">
              <span>Mahsulotlar:</span>
              <span className="text-white">{cart.reduce((s, i) => s + i.quantity, 0)} ta</span>
            </div>
            {totalDiscount > 0 && (
              <>
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Chegirmasiz:</span><span className="text-zinc-300">{fmt(subtotal)} so'm</span>
                </div>
                <div className="flex justify-between text-sm text-green-500">
                  <span>Chegirma:</span><span>−{fmt(totalDiscount)} so'm</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-xl font-bold border-t border-zinc-800 pt-2 mt-1">
              <span className="text-zinc-200">Jami:</span>
              <span className="text-white">{fmt(total)} so'm</span>
            </div>
          </div>

          {/* Payment buttons */}
          <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">To'lov turi</p>
              <button
                onClick={() => { if (!cart.length) return; placeOrder({ payType: "naxt", apiPayType: "cash" }); }}
                disabled={!cart.length || createOrder.isPending}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${cart.length ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
              >
                💵 Naqd Pul
              </button>
              <button
                onClick={() => { if (!cart.length) return; placeOrder({ payType: "karta", apiPayType: "card" }); }}
                disabled={!cart.length || createOrder.isPending}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${cart.length ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
              >
                💳 Karta
              </button>
              <button
                onClick={() => { if (!cart.length) return; setShowDebtPanel(true); }}
                disabled={!cart.length || createOrder.isPending}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${cart.length ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
              >
                📝 Qarzga
              </button>
              <button
                onClick={() => { if (!cart.length) return; setShowSplitPanel(true); }}
                disabled={!cart.length || createOrder.isPending}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${cart.length ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
              >
                🔀 Aralash
              </button>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="w-full py-2 text-sm text-zinc-600 hover:text-red-400 transition-colors">
                Savatni tozalash
              </button>
            )}
          </div>
        </div>
      </div>

      {showDebtPanel && <DebtPanel total={total} customers={customers ?? []} venueId={venueId} onConfirm={handleDebtConfirm} onCancel={() => setShowDebtPanel(false)} qc={qc} />}
      {showSplitPanel && <SplitPaymentPanel total={total} customers={customers ?? []} venueId={venueId} onConfirm={handleSplitConfirm} onCancel={() => setShowSplitPanel(false)} qc={qc} />}
      {receipt && <ThermalReceipt data={receipt} onClose={() => setReceipt(null)} />}
      {showTablePanel && (
        <TableSelectionPanel
          rooms={rooms ?? []}
          current={tableSelection}
          onSelect={(sel) => { setTableSelection(sel); setShowTablePanel(false); }}
          onCancel={() => setShowTablePanel(false)}
        />
      )}
    </div>
  );
}

/* ── Table Selection Panel ────────────────────────────────── */
function TableSelectionPanel({ rooms, current, onSelect, onCancel }: {
  rooms: Room[];
  current: TableSelection;
  onSelect: (sel: TableSelection) => void;
  onCancel: () => void;
}) {
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(current.roomId);
  const allTables = rooms.flatMap((r) => (r.tables ?? []).map((t) => ({ ...t, _roomName: r.name })));
  const activeRooms = rooms.filter((r) => r.isActive);
  const filteredTables = selectedRoomId
    ? allTables.filter((t) => t.roomId === selectedRoomId && t.isActive)
    : allTables.filter((t) => t.isActive);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={onCancel}>
      <div className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl shadow-2xl max-w-2xl mx-auto w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()} style={{ animation: "slideUp 0.25s ease-out" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2"><Table2 className="h-5 w-5 text-blue-400" /><h3 className="text-lg font-bold text-white">Xona va Stol tanlash</h3></div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {activeRooms.length > 0 && (
            <div className="w-48 border-r border-zinc-800 overflow-y-auto py-2 shrink-0">
              <button onClick={() => setSelectedRoomId(null)} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${selectedRoomId === null ? "bg-blue-600/10 text-blue-400 font-medium" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                <Table2 className="h-4 w-4 shrink-0" />Barcha stollar
              </button>
              {activeRooms.map((r) => (
                <button key={r.id} onClick={() => setSelectedRoomId(r.id)} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${selectedRoomId === r.id ? "bg-blue-600/10 text-blue-400 font-medium" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                  <DoorOpen className="h-4 w-4 shrink-0" />{r.name}
                  <span className="ml-auto text-xs text-zinc-600">{(r.tables ?? []).filter((t) => t.isActive).length}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-zinc-600"><Table2 className="h-8 w-8 mb-2 opacity-30" /><p className="text-sm">Stol topilmadi</p></div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {filteredTables.sort((a, b) => a.number - b.number).map((table) => {
                  const isSelected = current.tableId === table.id;
                  const roomName = rooms.find((r) => r.id === table.roomId)?.name ?? null;
                  return (
                    <button key={table.id} onClick={() => onSelect({ roomId: table.roomId ?? null, roomName, tableId: table.id, tableNumber: table.number })}
                      className={`flex flex-col items-center justify-center h-20 rounded-xl border-2 transition-all ${isSelected ? "border-blue-500 bg-blue-600/20 text-blue-400" : "border-zinc-700 bg-zinc-800 text-white hover:border-blue-600/50 hover:bg-zinc-700"}`}>
                      <span className="text-xl font-bold">#{table.number}</span>
                      {table.name && <span className="text-xs text-zinc-400 truncate px-1 max-w-full">{table.name}</span>}
                      {!selectedRoomId && roomName && <span className="text-xs text-zinc-500 truncate px-1 max-w-full">{roomName}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {current.tableNumber && (
          <div className="px-5 py-3 border-t border-zinc-800">
            <button onClick={() => onSelect({ roomId: null, roomName: null, tableId: null, tableNumber: null })} className="w-full py-2 text-sm text-zinc-500 hover:text-red-400 transition-colors">
              Stol tanlovini bekor qilish
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}
