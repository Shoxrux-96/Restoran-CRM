import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  useListRooms,
  useListProducts,
  getListRoomsQueryKey,
  getListProductsQueryKey,
  getListOpenOrdersQueryKey,
  useListOpenOrders,
  useCreateOpenOrder,
  useUpdateOpenOrder,
  useCancelOpenOrder,
  type Product,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, Plus, Minus, Trash2, Save, X, ShoppingCart, CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CartItem = {
  product: Product;
  quantity: number;
};

type TableInfo = {
  id: number;
  number: number;
  name: string | null;
  roomId: number | null;
  roomName: string | null;
  isOccupied?: boolean;
  openOrderId?: number | null;
};

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

export default function WaiterOrder() {
  const { tableId: tableIdStr } = useParams<{ tableId: string }>();
  const tableId = parseInt(tableIdStr ?? "0", 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [saved, setSaved] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: rooms } = useListRooms(venueId, {
    query: { enabled: !!venueId, queryKey: getListRoomsQueryKey(venueId) },
  });

  const { data: products } = useListProducts(venueId, {
    query: { enabled: !!venueId, queryKey: getListProductsQueryKey(venueId) },
  });

  const { data: openOrders } = useListOpenOrders(venueId, {
    query: { enabled: !!venueId, queryKey: getListOpenOrdersQueryKey(venueId) },
  });

  const createOpenOrder = useCreateOpenOrder();
  const updateOpenOrder = useUpdateOpenOrder();
  const cancelOpenOrder = useCancelOpenOrder();

  /* ── Table info ── */
  const tableInfo: TableInfo | null = (() => {
    if (!rooms || !tableId) return null;
    for (const room of rooms as any[]) {
      const t = (room.tables ?? []).find((tbl: any) => tbl.id === tableId);
      if (t) {
        return {
          id: t.id,
          number: t.number,
          name: t.name ?? null,
          roomId: room.id,
          roomName: room.name,
          isOccupied: t.isOccupied ?? false,
          openOrderId: t.openOrderId ?? null,
        };
      }
    }
    return null;
  })();

  /* ── Existing open order for this table ── */
  const existingOrder = openOrders?.find((o) => o.tableId === tableId) ?? null;

  /* ── Load existing order into cart on mount ── */
  useEffect(() => {
    if (!existingOrder || !products) return;
    const newCart: CartItem[] = existingOrder.items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        return { product, quantity: item.quantity };
      })
      .filter(Boolean) as CartItem[];
    setCart(newCart);
  }, [existingOrder?.id, products?.length]);

  /* ── Product search ── */
  const filteredProducts = (products ?? []).filter(
    (p) =>
      p.isAvailable &&
      (!search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category?.toLowerCase() ?? "").includes(search.toLowerCase()))
  );

  const addProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSearch("");
    setShowSearch(false);
  };

  const changeQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  /* ── Save order ── */
  const handleSave = async () => {
    if (cart.length === 0) {
      toast({ title: "Mahsulot qo'shing", variant: "destructive" });
      return;
    }

    const items = cart.map((i) => ({ productId: i.product.id, quantity: i.quantity }));

    if (existingOrder) {
      updateOpenOrder.mutate(
        { venueId, orderId: existingOrder.id, data: { items } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListRoomsQueryKey(venueId) });
            qc.invalidateQueries({ queryKey: getListOpenOrdersQueryKey(venueId) });
            setSaved(true);
            setTimeout(() => setLocation("/waiter/tables"), 1200);
          },
          onError: () => toast({ title: "Saqlashda xatolik", variant: "destructive" }),
        }
      );
    } else {
      createOpenOrder.mutate(
        {
          venueId,
          data: {
            tableId,
            tableNumber: tableInfo?.number ?? null,
            roomId: tableInfo?.roomId ?? null,
            roomName: tableInfo?.roomName ?? null,
            items,
          },
        },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListRoomsQueryKey(venueId) });
            qc.invalidateQueries({ queryKey: getListOpenOrdersQueryKey(venueId) });
            setSaved(true);
            setTimeout(() => setLocation("/waiter/tables"), 1200);
          },
          onError: (err: any) => {
            const msg = err?.data?.error ?? "Buyurtma yaratishda xatolik";
            toast({ title: msg, variant: "destructive" });
          },
        }
      );
    }
  };

  /* ── Cancel order ── */
  const handleCancel = () => {
    if (!existingOrder) {
      setLocation("/waiter/tables");
      return;
    }
    if (!confirm("Bu buyurtmani bekor qilasizmi?")) return;
    cancelOpenOrder.mutate(
      { venueId, orderId: existingOrder.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListRoomsQueryKey(venueId) });
          qc.invalidateQueries({ queryKey: getListOpenOrdersQueryKey(venueId) });
          setLocation("/waiter/tables");
        },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  if (saved) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-900">
        <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
        <p className="text-xl font-bold text-foreground">Buyurtma saqlandi!</p>
        <p className="text-muted-foreground mt-1">Stollar sahifasiga qaytilmoqda...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation("/waiter/tables")}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {tableInfo ? `Stol #${tableInfo.number}` : "Buyurtma"}
            {tableInfo?.name ? ` · ${tableInfo.name}` : ""}
          </h1>
          {tableInfo?.roomName && (
            <p className="text-sm text-muted-foreground">{tableInfo.roomName}</p>
          )}
        </div>
        {existingOrder && (
          <span className="text-xs bg-red-900/40 text-red-300 border border-red-800 px-2 py-1 rounded-full">
            Ochiq buyurtma
          </span>
        )}
      </div>

      {/* Product search */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Mahsulot qo'shish</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            placeholder="Mahsulot nomini qidiring..."
            className="w-full pl-9 pr-4 py-2.5 bg-input border border-border text-foreground rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setShowSearch(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Product list */}
        {(showSearch || search) && (
          <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg">
            {filteredProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-3">Mahsulot topilmadi</p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{product.name}</p>
                    {product.category && (
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-400">
                      {fmt(product.price)} so'm
                    </p>
                    <Plus className="h-3.5 w-3.5 text-muted-foreground ml-auto mt-0.5" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Buyurtma ({cart.length} mahsulot)
          </h2>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Mahsulot qo'shing</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 bg-zinc-900 rounded-lg px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(item.product.price)} × {item.quantity} = {fmt(item.product.price * item.quantity)} so'm
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => changeQty(item.product.id, -1)}
                    className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-md text-foreground"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => changeQty(item.product.id, 1)}
                    className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-md text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="w-7 h-7 flex items-center justify-center bg-red-900/30 hover:bg-red-900/60 rounded-md text-red-400 ml-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Jami:</span>
              <span className="text-xl font-bold text-foreground">{fmt(total)} so'm</span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {existingOrder && (
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={cancelOpenOrder.isPending}
            className="border-red-800 text-red-400 hover:bg-red-900/20 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Bekor qilish
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setLocation("/waiter/tables")}
          className="border-border text-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>
        <Button
          onClick={handleSave}
          disabled={cart.length === 0 || createOpenOrder.isPending || updateOpenOrder.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-foreground font-semibold"
        >
          <Save className="h-4 w-4 mr-2" />
          {createOpenOrder.isPending || updateOpenOrder.isPending
            ? "Saqlanmoqda..."
            : existingOrder
            ? "Yangilash"
            : "Saqlash"}
        </Button>
      </div>
    </div>
  );
}
