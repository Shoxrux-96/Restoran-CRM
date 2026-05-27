import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListRooms,
  getListRoomsQueryKey,
  type Room,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, DoorOpen, Users, Clock } from "lucide-react";

type TableWithStatus = {
  id: number; venueId: number; roomId: number | null; number: number;
  name: string | null; capacity: number | null; isActive: boolean;
  createdAt: string; isOccupied?: boolean;
  openOrderId?: number | null; openOrderTotal?: number | null;
};
type RoomWithStatus = Omit<Room, "tables"> & { tables?: TableWithStatus[] };

export default function WaiterTables() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const { data: rooms, isLoading, refetch } = useListRooms(venueId, {
    query: { enabled: !!venueId, queryKey: getListRoomsQueryKey(venueId), refetchInterval: 20_000 },
  });

  const typedRooms = (rooms ?? []) as RoomWithStatus[];
  const allTables = typedRooms.flatMap((r) => r.tables ?? []);
  const occupiedCount = allTables.filter((t) => t.isOccupied).length;
  const freeCount = allTables.filter((t) => t.isActive && !t.isOccupied).length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    qc.invalidateQueries({ queryKey: getListRoomsQueryKey(venueId) });
    setLastRefresh(new Date());
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleTableClick = (table: TableWithStatus) => {
    if (!table.isActive) return;
    setLocation(`/waiter/table/${table.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Xona va Stollar</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 truncate">{user?.venueName ?? "Filial"}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">{freeCount} bo'sh</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-muted-foreground">{occupiedCount} band</span>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Yangilash</span>
          </button>
        </div>
      </div>

      {/* Mobile stats */}
      <div className="flex sm:hidden items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">{freeCount} bo'sh</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-muted-foreground">{occupiedCount} band</span>
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground/70 ml-auto">
          <Clock className="h-3 w-3" />
          {lastRefresh.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Last refresh (desktop) */}
      <p className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
        <Clock className="h-3 w-3" />
        Oxirgi yangilanish: {lastRefresh.toLocaleTimeString("uz-UZ")}
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="space-y-3 text-center">
            <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm">Yuklanmoqda...</p>
          </div>
        </div>
      ) : typedRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <DoorOpen className="h-14 w-14 mb-3 opacity-20" />
          <p className="text-base font-medium">Xona yo'q</p>
          <p className="text-sm mt-1 text-center px-4">Admin tomonidan xona va stollar qo'shilmagan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {typedRooms.filter((r) => r.isActive).map((room) => {
            const tables = (room.tables ?? []).filter((t) => t.isActive);
            const roomFree = tables.filter((t) => !t.isOccupied).length;
            const roomBusy = tables.filter((t) => t.isOccupied).length;
            return (
              <div key={room.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Room header */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 bg-card/80">
                  <DoorOpen className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="font-semibold text-foreground text-sm">{room.name}</span>
                  {room.description && (
                    <span className="text-xs text-muted-foreground hidden sm:inline truncate">— {room.description}</span>
                  )}
                  <div className="ml-auto flex items-center gap-3 text-xs">
                    <span className="text-emerald-400 font-medium">{roomFree} bo'sh</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-red-400 font-medium">{roomBusy} band</span>
                  </div>
                </div>

                {/* Tables grid */}
                <div className="p-3 sm:p-4">
                  {tables.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">Stol yo'q</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3">
                      {tables.sort((a, b) => a.number - b.number).map((table) => (
                        <WaiterTableCard key={table.id} table={table} onClick={() => handleTableClick(table)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WaiterTableCard({ table, onClick }: { table: TableWithStatus; onClick: () => void }) {
  const isOccupied = table.isOccupied ?? false;
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 transition-all active:scale-95 cursor-pointer touch-manipulation
        h-24 sm:h-28
        ${isOccupied
          ? "border-red-500/60 bg-red-950/30 hover:border-red-400 hover:bg-red-950/50"
          : "border-emerald-600/50 bg-emerald-950/20 hover:border-emerald-400 hover:bg-emerald-950/40"
        }`}
    >
      {/* Status dot */}
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isOccupied ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />

      {/* Table number */}
      <span className={`text-xl sm:text-2xl font-bold ${isOccupied ? "text-red-200" : "text-emerald-200"}`}>
        #{table.number}
      </span>

      {table.name && (
        <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 px-1 truncate max-w-full">{table.name}</span>
      )}

      {table.capacity && (
        <div className="flex items-center gap-0.5 mt-0.5">
          <Users className="h-2.5 w-2.5 text-muted-foreground/70" />
          <span className="text-[10px] text-muted-foreground/70">{table.capacity}</span>
        </div>
      )}

      {isOccupied && table.openOrderTotal ? (
        <div className="absolute bottom-1.5 left-0 right-0 px-1 text-center">
          <span className="text-[10px] sm:text-xs font-semibold text-red-300 bg-red-900/60 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            {new Intl.NumberFormat("uz-UZ").format(Math.round(table.openOrderTotal))} s'm
          </span>
        </div>
      ) : !isOccupied ? (
        <div className="absolute bottom-1.5 left-0 right-0 text-center">
          <span className="text-[10px] text-emerald-600 font-medium">Bo'sh</span>
        </div>
      ) : null}
    </button>
  );
}
