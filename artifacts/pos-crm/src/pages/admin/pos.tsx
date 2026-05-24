import { useState, useRef, useEffect } from "react";
import {
  useListProducts,
  useListCustomers,
  useCreateCustomer,
  useCreateOrder,
  getListCustomersQueryKey,
  getListProductsQueryKey,
  type Product,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle,
  ChevronUp,
  X,
  Percent,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Unit = "dona" | "kg" | "litr" | "porsiya" | "qadoq";
const UNITS: Unit[] = ["dona", "kg", "litr", "porsiya", "qadoq"];

type PayType = "naxt" | "karta" | "qarz";

type CartItem = {
  product: Product;
  quantity: number;
  discount: number; // percent 0-100
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
  customerName?: string;
  cashierName?: string;
  date: Date;
};

function itemTotal(item: CartItem) {
  const base = item.product.price * item.quantity;
  return base - (base * item.discount) / 100;
}

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

/* ── Thermal Receipt (separate printable div) ─────────────── */
function ThermalReceipt({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=320,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Chek #${data.orderId}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 72mm; padding: 4px; color: #000; background: #fff; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .lg { font-size: 15px; }
        .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .row { display: flex; justify-content: space-between; gap: 4px; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
        .small { font-size: 10px; }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const dateStr = data.date.toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-zinc-800">Sotuv amalga oshdi!</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt preview */}
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          <div
            ref={receiptRef}
            className="font-mono text-xs text-black space-y-1"
            style={{ fontFamily: "'Courier New', monospace", fontSize: "12px" }}
          >
            {/* Header */}
            <div className="center bold lg">{data.venueName}</div>
            <div className="center small" style={{ textAlign: "center", fontSize: "10px" }}>
              RestoCRM sotuv tizimi
            </div>
            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
            <div className="row" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Chek: #{data.orderId}</span>
              <span>{dateStr}</span>
            </div>
            {data.cashierName && (
              <div>Kassir: {data.cashierName}</div>
            )}
            {data.customerName && (
              <div>Mijoz: {data.customerName}</div>
            )}
            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

            {/* Items */}
            {data.items.map((item, i) => {
              const lineTotal = itemTotal(item);
              return (
                <div key={i} style={{ marginBottom: "4px" }}>
                  <div className="bold" style={{ fontWeight: "bold" }}>
                    {i + 1}. {item.product.name}
                  </div>
                  <div
                    className="row"
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>
                      {item.quantity} {item.unit} × {fmt(item.product.price)} so'm
                      {item.discount > 0 ? ` (-${item.discount}%)` : ""}
                    </span>
                    <span>{fmt(lineTotal)} so'm</span>
                  </div>
                </div>
              );
            })}

            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

            {/* Totals */}
            {data.totalDiscount > 0 && (
              <>
                <div
                  className="row"
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Jami (chegirmasiz):</span>
                  <span>{fmt(data.subtotal)} so'm</span>
                </div>
                <div
                  className="row"
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Chegirma:</span>
                  <span>-{fmt(data.totalDiscount)} so'm</span>
                </div>
              </>
            )}

            <div
              className="total-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              <span>JAMI:</span>
              <span>{fmt(data.total)} so'm</span>
            </div>

            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

            <div
              className="row"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>To'lov turi:</span>
              <span className="bold" style={{ fontWeight: "bold" }}>
                {data.payType === "naxt" ? "Naqd pul" : data.payType === "karta" ? "Bank kartasi" : "Qarzga"}
              </span>
            </div>

            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
            <div className="center small" style={{ textAlign: "center", fontSize: "10px", marginTop: "6px" }}>
              Xarid uchun rahmat!
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-4 py-3 border-t">
          <Button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Printer className="h-4 w-4 mr-2" />
            Chek chiqarish
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-300">
            Yopish
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Debt Panel (slides from bottom) ─────────────────────── */
function DebtPanel({
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
  onConfirm: (info: { customerId?: number; customerName: string; phone: string; deadline: string; amount: number }) => void;
  onCancel: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [amount, setAmount] = useState(String(Math.round(total)));
  const createCustomer = useCreateCustomer();
  const { toast } = useToast();

  useEffect(() => {
    setAmount(String(Math.round(total)));
  }, [total]);

  const selectedCustomer = customers.find((c) => String(c.id) === selectedId);

  const handleConfirm = async () => {
    if (mode === "existing") {
      if (!selectedId) {
        toast({ title: "Mijozni tanlang", variant: "destructive" });
        return;
      }
      onConfirm({
        customerId: Number(selectedId),
        customerName: selectedCustomer?.name ?? "",
        phone: selectedCustomer?.phone ?? "",
        deadline,
        amount: Number(amount),
      });
    } else {
      if (!name.trim()) {
        toast({ title: "Ism kiriting", variant: "destructive" });
        return;
      }
      // Create new customer first
      createCustomer.mutate(
        { venueId, data: { name: name.trim(), phone: phone.trim() || undefined } },
        {
          onSuccess: (newCustomer) => {
            qc.invalidateQueries({ queryKey: getListCustomersQueryKey(venueId) });
            onConfirm({
              customerId: newCustomer.id,
              customerName: newCustomer.name,
              phone: newCustomer.phone ?? "",
              deadline,
              amount: Number(amount),
            });
          },
          onError: () => toast({ title: "Xatolik", variant: "destructive" }),
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={onCancel}>
      <div
        className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl shadow-2xl p-5 max-w-lg mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ChevronUp className="h-5 w-5 text-zinc-400" />
            <h3 className="text-lg font-bold text-white">Qarzga Sotuv</h3>
          </div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("existing")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "existing"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            Mavjud mijoz
          </button>
          <button
            onClick={() => setMode("new")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
              mode === "new"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Yangi mijoz
          </button>
        </div>

        <div className="space-y-3">
          {mode === "existing" ? (
            <div>
              <Label className="text-zinc-300 text-sm">Mijoz tanlang</Label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">— Mijozni tanlang —</option>
                {customers.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
              {selectedCustomer?.phone && (
                <p className="text-xs text-zinc-400 mt-1">{selectedCustomer.phone}</p>
              )}
            </div>
          ) : (
            <>
              <div>
                <Label className="text-zinc-300 text-sm">Ism *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mijoz ismi"
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm">Telefon raqami</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998901234567"
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-300 text-sm">Qarz muddati</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">Qarz summasi (so'm)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-zinc-400 text-sm">Jami:</span>
            <span className="text-lg font-bold text-red-400">{fmt(Number(amount) || 0)} so'm</span>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={createCustomer.isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold mt-1"
          >
            {createCustomer.isPending ? "Saqlanmoqda..." : "Qarzga Sotish"}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Main POS Page ────────────────────────────────────────── */
export default function AdminPos() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const { data: products } = useListProducts(venueId, { query: { enabled: !!venueId, queryKey: getListProductsQueryKey(venueId) } });
  const { data: customers } = useListCustomers(venueId, { query: { enabled: !!venueId, queryKey: getListCustomersQueryKey(venueId) } });
  const createOrder = useCreateOrder();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payType, setPayType] = useState<PayType>("naxt");
  const [showDebtPanel, setShowDebtPanel] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const availableProducts = (products ?? []).filter((p) => p.isAvailable);

  const suggestions = search.length > 0
    ? availableProducts.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalDiscount = cart.reduce((s, i) => s + (i.product.price * i.quantity * i.discount) / 100, 0);
  const total = subtotal - totalDiscount;

  const addProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, discount: 0, unit: "dona" }];
    });
    setSearch("");
    setShowSuggestions(false);
    searchRef.current?.focus();
  };

  const updateItem = (productId: number, field: Partial<Omit<CartItem, "product">>) => {
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, ...field } : i))
    );
  };

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPayType("naxt");
    qc.invalidateQueries();
  };

  const placeOrder = (opts: {
    customerId?: number;
    customerName?: string;
    notes?: string;
    apiPayType: "cash" | "debt";
  }) => {
    createOrder.mutate(
      {
        venueId,
        data: {
          customerId: opts.customerId ?? null,
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
          paymentType: opts.apiPayType,
          notes: opts.notes,
        },
      },
      {
        onSuccess: (order) => {
          setReceipt({
            orderId: order.id,
            venueName: user?.venueName ?? "Kafe",
            items: [...cart],
            subtotal,
            totalDiscount,
            total,
            payType,
            customerName: opts.customerName,
            cashierName: user?.name ?? user?.username,
            date: new Date(),
          });
          clearCart();
          setShowDebtPanel(false);
        },
        onError: () => toast({ title: "Xatolik yuz berdi", variant: "destructive" }),
      }
    );
  };

  const handlePayClick = (type: PayType) => {
    if (!cart.length) return;
    setPayType(type);
    if (type === "qarz") {
      setShowDebtPanel(true);
    } else {
      placeOrder({ apiPayType: "cash", notes: type === "karta" ? "Karta orqali to'landi" : undefined });
    }
  };

  const handleDebtConfirm = (info: {
    customerId?: number;
    customerName: string;
    phone: string;
    deadline: string;
    amount: number;
  }) => {
    placeOrder({
      customerId: info.customerId,
      customerName: info.customerName,
      apiPayType: "debt",
      notes: `Qarz muddati: ${info.deadline}${info.phone ? `, Tel: ${info.phone}` : ""}`,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] gap-0 overflow-hidden -m-6 md:-m-8">
      {/* Top bar */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <ShoppingBag className="h-5 w-5 text-blue-500 shrink-0" />
        <h1 className="text-white font-bold text-lg">Sotuv Kassa</h1>
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Mahsulot nomini yozing..."
                className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 text-base"
                autoComplete="off"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setShowSuggestions(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 z-30 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-700 transition-colors text-left"
                  >
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
          <div
            className="flex-1 overflow-y-auto p-4"
            onClick={() => setShowSuggestions(false)}
          >
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
                    <div
                      key={item.product.id}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl p-3"
                    >
                      {/* Item header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs text-zinc-600 mr-1">{idx + 1}.</span>
                          <span className="text-white font-semibold">{item.product.name}</span>
                          <span className="text-xs text-zinc-500 ml-2">{item.product.category}</span>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-red-500 hover:bg-red-500/10 rounded p-1 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Quantity */}
                        <div className="flex items-center bg-zinc-800 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateItem(item.product.id, { quantity: Math.max(1, item.quantity - 1) })}
                            className="px-2 py-1.5 text-zinc-300 hover:bg-zinc-700 transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const v = Math.max(1, parseInt(e.target.value) || 1);
                              updateItem(item.product.id, { quantity: v });
                            }}
                            className="w-10 text-center bg-transparent text-white text-sm font-semibold focus:outline-none"
                          />
                          <button
                            onClick={() => updateItem(item.product.id, { quantity: item.quantity + 1 })}
                            className="px-2 py-1.5 text-zinc-300 hover:bg-zinc-700 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Unit */}
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(item.product.id, { unit: e.target.value as Unit })}
                          className="bg-zinc-800 border-none text-zinc-300 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>

                        {/* Discount */}
                        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-1.5">
                          <Percent className="h-3.5 w-3.5 text-zinc-400" />
                          <input
                            type="number"
                            value={item.discount}
                            min={0}
                            max={100}
                            onChange={(e) => {
                              const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              updateItem(item.product.id, { discount: v });
                            }}
                            className="w-10 text-center bg-transparent text-zinc-300 text-sm focus:outline-none"
                            placeholder="0"
                          />
                          <span className="text-zinc-500 text-xs">chegirma</span>
                        </div>

                        {/* Line total */}
                        <div className="ml-auto text-right">
                          {item.discount > 0 && (
                            <p className="text-xs text-zinc-500 line-through">
                              {fmt(item.product.price * item.quantity)} so'm
                            </p>
                          )}
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
              <span>Mahsulotlar soni:</span>
              <span className="text-white">{cart.reduce((s, i) => s + i.quantity, 0)} ta</span>
            </div>
            {totalDiscount > 0 && (
              <>
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Jami (chegirmasiz):</span>
                  <span className="text-zinc-300">{fmt(subtotal)} so'm</span>
                </div>
                <div className="flex justify-between text-sm text-green-500">
                  <span>Chegirma:</span>
                  <span>−{fmt(totalDiscount)} so'm</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-xl font-bold border-t border-zinc-800 pt-2 mt-1">
              <span className="text-zinc-200">Jami:</span>
              <span className="text-white">{fmt(total)} so'm</span>
            </div>
          </div>

          {/* Payment buttons */}
          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">To'lov turi</p>

              <button
                onClick={() => handlePayClick("naxt")}
                disabled={!cart.length || createOrder.isPending}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
                  cart.length
                    ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                }`}
              >
                💵 Naqd Pul
              </button>

              <button
                onClick={() => handlePayClick("karta")}
                disabled={!cart.length || createOrder.isPending}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
                  cart.length
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                }`}
              >
                💳 Karta
              </button>

              <button
                onClick={() => handlePayClick("qarz")}
                disabled={!cart.length || createOrder.isPending}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
                  cart.length
                    ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                }`}
              >
                📝 Qarzga
              </button>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="w-full py-2 text-sm text-zinc-600 hover:text-red-400 transition-colors"
              >
                Savatni tozalash
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Debt panel overlay */}
      {showDebtPanel && (
        <DebtPanel
          total={total}
          customers={customers ?? []}
          venueId={venueId}
          onConfirm={handleDebtConfirm}
          onCancel={() => setShowDebtPanel(false)}
          qc={qc}
        />
      )}

      {/* Receipt modal */}
      {receipt && (
        <ThermalReceipt
          data={receipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
