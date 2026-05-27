import { useState } from "react";
import {
  useListRooms,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  getListRoomsQueryKey,
  type Room,
  type Table,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  DoorOpen,
  Table2,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Extended table type with occupation status ── */
type TableWithStatus = Table & {
  isOccupied?: boolean;
  openOrderId?: number | null;
  openOrderTotal?: number | null;
};
type RoomWithStatus = Omit<Room, "tables"> & { tables?: TableWithStatus[] };

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

/* ── Helpers ──────────────────────────────────────────────── */
const emptyRoomForm = { name: "", description: "" };
const emptyTableForm = { number: "", name: "", capacity: "4", roomId: "" };

/* ── Main Page ────────────────────────────────────────────── */
export default function AdminRooms() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: roomsRaw, isLoading } = useListRooms(venueId, {
    query: { enabled: !!venueId, queryKey: getListRoomsQueryKey(venueId), refetchInterval: 20_000 },
  });
  const rooms = (roomsRaw ?? []) as RoomWithStatus[];

  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();
  const createTable = useCreateTable();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();

  /* Room modal state */
  const [roomModal, setRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);

  /* Table modal state */
  const [tableModal, setTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableForm, setTableForm] = useState(emptyTableForm);
  const [tableParentRoomId, setTableParentRoomId] = useState<number | null>(null);

  /* Expanded rooms */
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpanded = (id: number) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListRoomsQueryKey(venueId) });

  /* ── Room handlers ── */
  const openCreateRoom = () => {
    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
    setRoomModal(true);
  };

  const openEditRoom = (r: Room) => {
    setEditingRoom(r);
    setRoomForm({ name: r.name, description: r.description ?? "" });
    setRoomModal(true);
  };

  const handleSaveRoom = () => {
    if (!roomForm.name.trim()) {
      toast({ title: "Xona nomini kiriting", variant: "destructive" });
      return;
    }
    if (editingRoom) {
      updateRoom.mutate(
        { venueId, id: editingRoom.id, data: { name: roomForm.name.trim(), description: roomForm.description || undefined } },
        {
          onSuccess: () => { invalidate(); setRoomModal(false); toast({ title: "Xona yangilandi" }); },
          onError: () => toast({ title: "Xatolik", variant: "destructive" }),
        }
      );
    } else {
      createRoom.mutate(
        { venueId, data: { name: roomForm.name.trim(), description: roomForm.description || undefined } },
        {
          onSuccess: (r) => {
            invalidate();
            setRoomModal(false);
            setExpanded((prev) => new Set(prev).add(r.id));
            toast({ title: "Xona qo'shildi" });
          },
          onError: () => toast({ title: "Xatolik", variant: "destructive" }),
        }
      );
    }
  };

  const handleDeleteRoom = (r: Room) => {
    if (!confirm(`"${r.name}" xonasini va undagi barcha stollarni o'chirasizmi?`)) return;
    deleteRoom.mutate(
      { venueId, id: r.id },
      {
        onSuccess: () => { invalidate(); toast({ title: "Xona o'chirildi" }); },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  const handleToggleRoom = (r: Room) => {
    updateRoom.mutate(
      { venueId, id: r.id, data: { isActive: !r.isActive } },
      { onSuccess: invalidate, onError: () => toast({ title: "Xatolik", variant: "destructive" }) }
    );
  };

  /* ── Table handlers ── */
  const openCreateTable = (roomId: number | null) => {
    setEditingTable(null);
    setTableParentRoomId(roomId);
    const usedNumbers = rooms.flatMap((r) => r.tables ?? []).map((t) => t.number);
    const nextNum = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
    setTableForm({ number: String(nextNum), name: "", capacity: "4", roomId: roomId ? String(roomId) : "" });
    setTableModal(true);
  };

  const openEditTable = (t: Table) => {
    setEditingTable(t);
    setTableParentRoomId(t.roomId ?? null);
    setTableForm({
      number: String(t.number),
      name: t.name ?? "",
      capacity: String(t.capacity ?? 4),
      roomId: t.roomId ? String(t.roomId) : "",
    });
    setTableModal(true);
  };

  const handleSaveTable = () => {
    const num = parseInt(tableForm.number);
    if (!num || num < 1) {
      toast({ title: "Stol raqamini kiriting", variant: "destructive" });
      return;
    }
    const data = {
      number: num,
      name: tableForm.name.trim() || undefined,
      capacity: parseInt(tableForm.capacity) || 4,
      roomId: tableForm.roomId ? parseInt(tableForm.roomId) : null,
    };
    if (editingTable) {
      updateTable.mutate(
        { venueId, id: editingTable.id, data },
        {
          onSuccess: () => { invalidate(); setTableModal(false); toast({ title: "Stol yangilandi" }); },
          onError: () => toast({ title: "Xatolik", variant: "destructive" }),
        }
      );
    } else {
      createTable.mutate(
        { venueId, data },
        {
          onSuccess: () => { invalidate(); setTableModal(false); toast({ title: "Stol qo'shildi" }); },
          onError: () => toast({ title: "Xatolik", variant: "destructive" }),
        }
      );
    }
  };

  const handleDeleteTable = (t: Table) => {
    if (!confirm(`Stol #${t.number} ni o'chirasizmi?`)) return;
    deleteTable.mutate(
      { venueId, id: t.id },
      {
        onSuccess: () => { invalidate(); toast({ title: "Stol o'chirildi" }); },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  const handleToggleTable = (t: Table) => {
    updateTable.mutate(
      { venueId, id: t.id, data: { isActive: !t.isActive } },
      { onSuccess: invalidate, onError: () => toast({ title: "Xatolik", variant: "destructive" }) }
    );
  };

  /* ── Render ── */
  const allTables = rooms.flatMap((r) => r.tables ?? []);
  const unassignedTables = allTables.filter((t) => !t.roomId);
  const occupiedCount = allTables.filter((t) => t.isOccupied).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Xonalar va Stollar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {rooms.length} ta xona · {allTables.length} ta stol
            {occupiedCount > 0 && (
              <span className="ml-2 text-red-400 font-medium">{occupiedCount} ta band</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground hover:bg-accent"
            onClick={() => openCreateTable(null)}
          >
            <Table2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Stol qo'shish</span>
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-foreground" onClick={openCreateRoom}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Xona qo'shish</span>
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Bo'sh stol
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />Band (ochiq buyurtma)
        </span>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-center py-16">Yuklanmoqda...</div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <DoorOpen className="h-16 w-16 mb-3 opacity-30" />
          <p className="text-lg font-medium">Xona yo'q</p>
          <p className="text-sm mt-1">Birinchi xonangizni qo'shing</p>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-foreground" onClick={openCreateRoom}>
            <Plus className="h-4 w-4 mr-2" />
            Xona qo'shish
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const isOpen = expanded.has(room.id);
            const tables = (room.tables ?? []) as TableWithStatus[];
            const occupiedInRoom = tables.filter((t) => t.isOccupied).length;
            return (
              <div
                key={room.id}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                {/* Room header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleExpanded(room.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <DoorOpen className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold text-foreground">{room.name}</span>
                    {room.description && (
                      <span className="text-xs text-muted-foreground ml-1">— {room.description}</span>
                    )}
                    <Badge
                      variant="outline"
                      className="ml-2 text-xs border-border text-muted-foreground"
                    >
                      {tables.length} stol
                    </Badge>
                    {occupiedInRoom > 0 && (
                      <Badge variant="outline" className="text-xs border-red-700/60 text-red-400 bg-red-900/20">
                        {occupiedInRoom} band
                      </Badge>
                    )}
                    {!room.isActive && (
                      <Badge variant="outline" className="text-xs border-red-800 text-red-400">
                        Nofaol
                      </Badge>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={room.isActive}
                      onCheckedChange={() => handleToggleRoom(room)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCreateTable(room.id)}
                      className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 px-2"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Stol
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditRoom(room)}
                      className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 p-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRoom(room)}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Tables grid */}
                {isOpen && (
                  <div className="border-t border-border px-4 py-4">
                    {tables.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Table2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Stol yo'q</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 border-border text-muted-foreground hover:bg-accent"
                          onClick={() => openCreateTable(room.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Stol qo'shish
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {tables
                          .sort((a, b) => a.number - b.number)
                          .map((table) => (
                            <TableCard
                              key={table.id}
                              table={table}
                              onEdit={() => openEditTable(table)}
                              onDelete={() => handleDeleteTable(table)}
                              onToggle={() => handleToggleTable(table)}
                            />
                          ))}
                        <button
                          onClick={() => openCreateTable(room.id)}
                          className="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-blue-600 hover:text-blue-500 transition-colors"
                        >
                          <Plus className="h-5 w-5 mb-1" />
                          <span className="text-xs">Qo'shish</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned tables */}
          {unassignedTables.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Table2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">Xonasiz stollar</span>
                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                  {unassignedTables.length} ta
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
                {unassignedTables
                  .sort((a, b) => a.number - b.number)
                  .map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      onEdit={() => openEditTable(table)}
                      onDelete={() => handleDeleteTable(table)}
                      onToggle={() => handleToggleTable(table)}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Room Modal */}
      <Dialog open={roomModal} onOpenChange={setRoomModal}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{editingRoom ? "Xonani tahrirlash" : "Yangi xona"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-zinc-300">Xona nomi *</Label>
              <Input
                value={roomForm.name}
                onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Masalan: Asosiy zal, VIP xona..."
                className="mt-1.5 bg-input border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Tavsif (ixtiyoriy)</Label>
              <Input
                value={roomForm.description}
                onChange={(e) => setRoomForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Xona haqida qo'shimcha ma'lumot"
                className="mt-1.5 bg-input border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomModal(false)} className="border-border text-foreground">
              Bekor qilish
            </Button>
            <Button
              onClick={handleSaveRoom}
              disabled={createRoom.isPending || updateRoom.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-foreground"
            >
              {editingRoom ? "Saqlash" : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Modal */}
      <Dialog open={tableModal} onOpenChange={setTableModal}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{editingTable ? "Stolni tahrirlash" : "Yangi stol"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Stol raqami *</Label>
                <Input
                  type="number"
                  value={tableForm.number}
                  onChange={(e) => setTableForm((f) => ({ ...f, number: e.target.value }))}
                  min={1}
                  className="mt-1.5 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Sig'im (o'rin soni)</Label>
                <Input
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm((f) => ({ ...f, capacity: e.target.value }))}
                  min={1}
                  className="mt-1.5 bg-input border-border text-foreground"
                />
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Stol nomi (ixtiyoriy)</Label>
              <Input
                value={tableForm.name}
                onChange={(e) => setTableForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Masalan: Burchak stoli, Terrasa..."
                className="mt-1.5 bg-input border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Xona</Label>
              <select
                value={tableForm.roomId}
                onChange={(e) => setTableForm((f) => ({ ...f, roomId: e.target.value }))}
                className="w-full mt-1.5 bg-input border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="">— Xona tanlang (ixtiyoriy) —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableModal(false)} className="border-border text-foreground">
              Bekor qilish
            </Button>
            <Button
              onClick={handleSaveTable}
              disabled={createTable.isPending || updateTable.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-foreground"
            >
              {editingTable ? "Saqlash" : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Table Card Component ─────────────────────────────────── */
function TableCard({
  table,
  onEdit,
  onDelete,
  onToggle,
}: {
  table: TableWithStatus;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const isOccupied = table.isOccupied ?? false;

  return (
    <div
      className={`relative group flex flex-col items-center justify-center h-28 rounded-xl border-2 transition-all ${
        !table.isActive
          ? "border-border bg-zinc-950 opacity-50"
          : isOccupied
          ? "border-red-500/60 bg-red-950/20"
          : "border-border bg-zinc-900 hover:border-blue-600/60"
      }`}
    >
      {/* Occupation status dot */}
      {table.isActive && (
        <div
          className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${
            isOccupied ? "bg-red-500 animate-pulse" : "bg-emerald-500"
          }`}
        />
      )}

      <span className={`text-2xl font-bold ${isOccupied ? "text-red-200" : "text-white"}`}>
        #{table.number}
      </span>
      {table.name && (
        <span className="text-xs text-muted-foreground mt-0.5 px-1 truncate max-w-full">{table.name}</span>
      )}
      {table.capacity && (
        <div className="flex items-center gap-1 text-muted-foreground mt-1">
          <Users className="h-3 w-3" />
          <span className="text-xs">{table.capacity}</span>
        </div>
      )}
      {isOccupied && table.openOrderTotal && (
        <span className="text-xs text-red-300 font-medium mt-1">
          {fmt(table.openOrderTotal)} so'm
        </span>
      )}

      {/* Hover actions */}
      <div className="absolute inset-0 rounded-xl bg-zinc-900/95 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-blue-600 text-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-yellow-600 text-foreground hover:text-foreground transition-colors"
        >
          <Switch
            checked={table.isActive}
            onCheckedChange={onToggle}
            className="h-3 w-6 data-[state=checked]:bg-blue-600"
          />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-600 text-foreground hover:text-foreground transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
