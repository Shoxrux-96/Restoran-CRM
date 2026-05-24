import { useState } from "react";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
  type Product,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Pencil, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(n) + " so'm";
}

const CATEGORIES = [
  { value: "Taomlar", label: "🍽️ Taomlar (Блюда)" },
  { value: "Sho'rvalar", label: "🍜 Sho'rvalar (Супы)" },
  { value: "Salatlar", label: "🥗 Salatlar (Салаты)" },
  { value: "Ichimliklar", label: "🥤 Ichimliklar (Напитки)" },
  { value: "Shirinliklar", label: "🍰 Shirinliklar (Десерты)" },
  { value: "Muzqaymoqlar", label: "🍦 Muzqaymoqlar (Мороженое)" },
  { value: "Spirtli ichimliklar", label: "🍷 Spirtli ichimliklar (Алкоголь)" },
  { value: "Nonlar", label: "🍞 Nonlar va pishiriqlar (Хлеб)" },
  { value: "Lavashlar", label: "🫓 Lavashlar (Лаваши)" },
  { value: "Gamburgerlar", label: "🍔 Gamburgerlar (Бургеры)" },
  { value: "Pizzalar", label: "🍕 Pizzalar (Пицца)" },
  { value: "Sushilar", label: "🍣 Sushilar (Суши)" },
  { value: "Mazzalar", label: "🍡 Mazzalar (Закуски)" },
  { value: "Fastfood", label: "🌮 Fastfood" },
  { value: "Boshqa", label: "📦 Boshqa (Другое)" },
];

const UNITS = [
  { value: "dona", label: "dona (штука)" },
  { value: "porsiya", label: "porsiya (порция)" },
  { value: "stakan", label: "stakan (стакан)" },
  { value: "shisha", label: "shisha (бутылка)" },
  { value: "quti", label: "quti (коробка/банка)" },
  { value: "kg", label: "kg (кг)" },
  { value: "gram", label: "gram (грамм)" },
  { value: "litr", label: "litr (литр)" },
  { value: "ml", label: "ml (мл)" },
  { value: "kosa", label: "kosa (миска)" },
  { value: "tarelka", label: "tarelka (тарелка)" },
  { value: "piyola", label: "piyola (пиала)" },
  { value: "qadoq", label: "qadoq (пачка)" },
  { value: "lagan", label: "lagan (ляган)" },
  { value: "sm", label: "sm (см)" },
];

const emptyForm = {
  name: "",
  price: "",
  category: CATEGORIES[0].value,
  unit: UNITS[0].value,
  description: "",
  isAvailable: true,
};

export default function AdminProducts() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const { data: products, isLoading } = useListProducts(venueId, {
    query: { enabled: !!venueId, queryKey: getListProductsQueryKey(venueId) },
  });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      category: p.category,
      unit: (p as any).unit ?? UNITS[0].value,
      description: p.description ?? "",
      isAvailable: p.isAvailable ?? true,
    });
    setOpen(true);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: getListProductsQueryKey(venueId) });

  const handleSave = () => {
    if (!form.name.trim() || !form.price || !form.category) {
      toast({ title: "Barcha majburiy maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    const data = {
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category,
      description: form.description || undefined,
      isAvailable: form.isAvailable,
    };
    if (editing) {
      updateProduct.mutate({ venueId, id: editing.id, data }, {
        onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Yangilandi" }); },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      });
    } else {
      createProduct.mutate({ venueId, data }, {
        onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Mahsulot qo'shildi" }); },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    deleteProduct.mutate({ venueId, id }, {
      onSuccess: () => { invalidate(); toast({ title: "O'chirildi" }); },
      onError: () => toast({ title: "Xatolik", variant: "destructive" }),
    });
  };

  const filtered = (products ?? []).filter((p) => {
    const matchSearch = search.length === 0 || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const usedCategories = [...new Set(products?.map((p) => p.category) ?? [])];
  const groupedByCategory = usedCategories.map((cat) => ({
    cat,
    label: CATEGORIES.find((c) => c.value === cat)?.label ?? cat,
    items: filtered.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mahsulotlar</h1>
          <p className="text-zinc-400 mt-1">{products?.length ?? 0} ta mahsulot</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Yangi Mahsulot
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mahsulot qidiring..."
            className="pl-9 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="all">Barcha kategoriyalar</option>
          {usedCategories.map((c) => (
            <option key={c} value={c}>{CATEGORIES.find((x) => x.value === c)?.label ?? c}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-zinc-400 py-8 text-center">Yuklanmoqda...</div>
      ) : !products?.length ? (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">Hali mahsulot yo'q</p>
            <Button onClick={openCreate} className="mt-4 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Birinchi mahsulotni qo'shing
            </Button>
          </CardContent>
        </Card>
      ) : groupedByCategory.length === 0 ? (
        <div className="text-zinc-500 text-center py-10">Hech narsa topilmadi</div>
      ) : (
        <div className="space-y-5">
          {groupedByCategory.map(({ cat, label, items }) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-zinc-300">{label}</h3>
                <span className="text-xs text-zinc-600">{items.length} ta</span>
              </div>
              <div className="space-y-1.5">
                {items.map((p) => (
                  <Card key={p.id} className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-colors">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${p.isAvailable ? "bg-green-500" : "bg-zinc-600"}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-white">{p.name}</p>
                          {p.description && <p className="text-xs text-zinc-500 truncate">{p.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="font-semibold text-white">{fmt(p.price)}</span>
                        <Badge
                          variant="outline"
                          className={p.isAvailable
                            ? "bg-green-600/10 text-green-400 border-green-800 text-xs"
                            : "bg-zinc-800 text-zinc-500 border-zinc-700 text-xs"}
                        >
                          {p.isAvailable ? "Mavjud" : "Yo'q"}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="text-zinc-400 hover:text-white h-8 w-8">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-500/10 h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Mahsulotni Tahrirlash" : "Yangi Mahsulot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">Nomi *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Mahsulot nomi"
                className="bg-zinc-800 border-zinc-700 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Narxi (so'm) *</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="15000"
                  className="bg-zinc-800 border-zinc-700 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">O'lchov birligi</Label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Kategoriya *</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-zinc-300">Tavsif (ixtiyoriy)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Qisqacha tavsif"
                className="bg-zinc-800 border-zinc-700 mt-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isAvailable}
                onCheckedChange={(v) => setForm({ ...form, isAvailable: v })}
                className="data-[state=checked]:bg-green-600"
              />
              <Label className="text-zinc-300">Mavjud (sotuvda bor)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400">Bekor</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name || !form.price || !form.category || createProduct.isPending || updateProduct.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createProduct.isPending || updateProduct.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
