import { useState } from "react";
import {
  useListProducts,
  useListCustomers,
  useCreateOrder,
  type OrderInputPaymentType,
  type Product,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Minus, Trash2, Printer, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CartItem = { product: Product; quantity: number };

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(n);
}

export default function AdminPos() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const { data: products } = useListProducts(venueId, { query: { enabled: !!venueId } });
  const { data: customers } = useListCustomers(venueId, { query: { enabled: !!venueId } });
  const createOrder = useCreateOrder();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<OrderInputPaymentType>("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [receipt, setReceipt] = useState<{ id: number; total: number; items: CartItem[]; payment: string; customer?: string } | null>(null);

  const categories = [...new Set(products?.filter(p => p.isAvailable).map((p) => p.category) ?? [])];
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = (products ?? []).filter((p) => {
    if (!p.isAvailable) return false;
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0));
  };

  const placeOrder = () => {
    if (!cart.length) return;
    if (paymentType === "debt" && !customerId) {
      toast({ title: "Qarz uchun mijozni tanlang", variant: "destructive" });
      return;
    }

    createOrder.mutate(
      {
        venueId,
        data: {
          customerId: customerId ? Number(customerId) : null,
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          paymentType,
        },
      },
      {
        onSuccess: (order) => {
          const customerName = customers?.find((c) => c.id === Number(customerId))?.name;
          setReceipt({ id: order.id, total, items: [...cart], payment: paymentType, customer: customerName });
          setCart([]);
          setCustomerId("");
          setPaymentType("cash");
          qc.invalidateQueries();
        },
        onError: () => toast({ title: "Xatolik yuz berdi", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={activeCategory === "all" ? "default" : "outline"}
            onClick={() => setActiveCategory("all")}
            className={activeCategory === "all" ? "bg-blue-600" : "border-zinc-700 text-zinc-400"}
          >
            Barchasi
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? "default" : "outline"}
              onClick={() => setActiveCategory(cat)}
              className={activeCategory === cat ? "bg-blue-600" : "border-zinc-700 text-zinc-400"}
            >
              {cat}
            </Button>
          ))}
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mahsulot qidirish..."
          className="bg-zinc-950 border-zinc-800"
        />

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p) => {
              const inCart = cart.find((i) => i.product.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    inCart ? "bg-blue-600/10 border-blue-600" : "bg-zinc-950 border-zinc-800 hover:border-blue-700"
                  }`}
                >
                  <p className="font-medium text-white text-sm leading-tight">{p.name}</p>
                  <p className="text-xs text-zinc-400 mt-1">{p.category}</p>
                  <p className="text-blue-400 font-bold mt-2 text-sm">{fmt(p.price)} so'm</p>
                  {inCart && (
                    <Badge className="mt-2 bg-blue-600/20 text-blue-400 border-blue-800 text-xs">
                      x{inCart.quantity}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart */}
      <div className="w-80 flex flex-col bg-zinc-950 rounded-xl border border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-blue-500" />
          <h2 className="font-semibold text-white">Savat</h2>
          <Badge className="ml-auto bg-blue-600/20 text-blue-400">{cart.length}</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!cart.length ? (
            <p className="text-zinc-500 text-sm text-center py-8">Savat bo'sh</p>
          ) : cart.map((item) => (
            <div key={item.product.id} className="flex items-center gap-2 p-2 bg-zinc-900 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                <p className="text-xs text-zinc-400">{fmt(item.product.price)} so'm</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-sm text-white w-5 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700">
                  <Plus className="h-3 w-3" />
                </button>
                <button onClick={() => setCart(c => c.filter(i => i.product.id !== item.product.id))} className="w-6 h-6 rounded flex items-center justify-center text-red-500 hover:bg-red-500/10 ml-1">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800 space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span className="text-zinc-300">Jami:</span>
            <span className="text-white">{fmt(total)} so'm</span>
          </div>

          <div>
            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as OrderInputPaymentType)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="cash">💵 Naqd pul</SelectItem>
                <SelectItem value="debt">📝 Qarzga</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentType === "debt" && (
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Mijozni tanlang" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {paymentType === "cash" && (
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Mijoz (ixtiyoriy)" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="">Noma'lum mijoz</SelectItem>
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={placeOrder}
            disabled={!cart.length || createOrder.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {createOrder.isPending ? "Saqlanmoqda..." : "Buyurtmani Tugatish"}
          </Button>
        </div>
      </div>

      {/* Receipt Modal */}
      <Dialog open={!!receipt} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Buyurtma Qabul Qilindi
            </DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="font-mono text-sm space-y-4">
              <div className="text-center border-b border-zinc-700 pb-4">
                <p className="text-lg font-bold text-white">{user?.venueName}</p>
                <p className="text-xs text-zinc-400">Buyurtma #{receipt.id}</p>
                <p className="text-xs text-zinc-400">{new Date().toLocaleString("uz-UZ")}</p>
              </div>

              {receipt.customer && (
                <p className="text-zinc-300">Mijoz: <span className="text-white">{receipt.customer}</span></p>
              )}

              <div className="space-y-2">
                {receipt.items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-xs">
                    <span className="text-zinc-300">{item.product.name} x{item.quantity}</span>
                    <span className="text-white">{fmt(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-700 pt-3 flex justify-between font-bold text-lg">
                <span>JAMI:</span>
                <span className="text-green-400">{fmt(receipt.total)} so'm</span>
              </div>

              <div className="text-center">
                <Badge className={receipt.payment === "debt" ? "bg-red-600/20 text-red-400" : "bg-green-600/20 text-green-400"}>
                  {receipt.payment === "debt" ? "📝 Qarzga yozildi" : "💵 Naqd to'landi"}
                </Badge>
              </div>

              <Button
                onClick={() => setReceipt(null)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Yangi Buyurtma
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
