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
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(n) + " so'm";
}

const emptyForm = { name: "", price: "", category: "", description: "", isAvailable: true };

export default function AdminProducts() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const { data: products, isLoading } = useListProducts(venueId, { query: { enabled: !!venueId } });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, price: String(p.price), category: p.category, description: p.description ?? "", isAvailable: p.isAvailable ?? true });
    setOpen(true);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: getListProductsQueryKey(venueId) });

  const handleSave = () => {
    const data = { name: form.name, price: Number(form.price), category: form.category, description: form.description || undefined, isAvailable: form.isAvailable };
    if (editing) {
      updateProduct.mutate({ id: editing.id, data }, {
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
    deleteProduct.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "O'chirildi" }); },
    });
  };

  const categories = [...new Set(products?.map((p) => p.category) ?? [])];

  return (
    <div className="space-y-6">
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

      {isLoading ? (
        <div className="text-zinc-400">Yuklanmoqda...</div>
      ) : !products?.length ? (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">Hali mahsulot yo'q</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">{cat}</h3>
              <div className="space-y-2">
                {products.filter((p) => p.category === cat).map((p) => (
                  <Card key={p.id} className="bg-zinc-950 border-zinc-800">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${p.isAvailable ? "bg-green-500" : "bg-zinc-600"}`} />
                        <div>
                          <p className="font-medium text-white">{p.name}</p>
                          {p.description && <p className="text-xs text-zinc-500">{p.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white">{fmt(p.price)}</span>
                        <Badge variant={p.isAvailable ? "default" : "secondary"} className={p.isAvailable ? "bg-green-600/20 text-green-400 border-green-800" : "bg-zinc-800 text-zinc-500"}>
                          {p.isAvailable ? "Mavjud" : "Yo'q"}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="text-zinc-400 hover:text-white">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>{editing ? "Mahsulotni Tahrirlash" : "Yangi Mahsulot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nomi</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Mahsulot nomi" className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
            <div>
              <Label>Narxi (so'm)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="15000" className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
            <div>
              <Label>Kategoriya</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ichimliklar, Taomlar..." className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
            <div>
              <Label>Tavsif (ixtiyoriy)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Qisqacha tavsif" className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isAvailable} onCheckedChange={(v) => setForm({ ...form, isAvailable: v })} />
              <Label>Mavjud</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name || !form.price || !form.category || createProduct.isPending || updateProduct.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
