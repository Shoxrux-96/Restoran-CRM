import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useListVenues,
  getListUsersQueryKey,
  type UserInputRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OwnerUsers() {
  const { data: users, isLoading } = useListUsers();
  const { data: venues } = useListVenues();
  const createUser = useCreateUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "admin" as UserInputRole,
    venueId: "",
  });

  const handleCreate = () => {
    createUser.mutate(
      {
        data: {
          username: form.username,
          password: form.password,
          name: form.name || undefined,
          role: form.role,
          venueId: form.venueId ? Number(form.venueId) : null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setOpen(false);
          setForm({ username: "", password: "", name: "", role: "admin", venueId: "" });
          toast({ title: "Foydalanuvchi qo'shildi" });
        },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Foydalanuvchilar</h1>
          <p className="text-zinc-400 mt-1">Barcha admin va owner'lar</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Yangi Foydalanuvchi
        </Button>
      </div>

      {isLoading ? (
        <div className="text-zinc-400">Yuklanmoqda...</div>
      ) : !users?.length ? (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">Foydalanuvchi topilmadi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="bg-zinc-950 border-zinc-800">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{u.name || u.username}</p>
                    <p className="text-sm text-zinc-400">@{u.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {u.venueName && (
                    <span className="text-sm text-zinc-400">{u.venueName}</span>
                  )}
                  <Badge
                    className={u.role === "owner" ? "bg-purple-600/20 text-purple-400 border-purple-800" : "bg-blue-600/20 text-blue-400 border-blue-800"}
                    variant="outline"
                  >
                    {u.role === "owner" ? "Egasi" : "Admin"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Yangi Foydalanuvchi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ism</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="To'liq ism" className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
            <div>
              <Label>Foydalanuvchi nomi</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username" className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
            <div>
              <Label>Parol</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Parol" className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
            <div>
              <Label>Roli</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserInputRole })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Egasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === "admin" && (
              <div>
                <Label>Filial (ixtiyoriy)</Label>
                <Select value={form.venueId} onValueChange={(v) => setForm({ ...form, venueId: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                    <SelectValue placeholder="Filial tanlang" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {venues?.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.username || !form.password || createUser.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createUser.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
