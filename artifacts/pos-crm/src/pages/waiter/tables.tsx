import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListRooms,
  getListRoomsQueryKey,
  type Room,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, DoorOpen, Users, Clock } from "lucide-react";

type TableWithStatus = {
  id: number;
  venueId: number;
  roomId: number | null;
  number: number;
  name: string | null;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
  isOccupied?: boolean;
  openOrderId?: number | null;
  openOrderTotal?: number | null;
};

type RoomWithStatus = Omit<Room, "tables"> & { tables?: TableWithStatus[] };

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

export default function WaiterTables() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { data: rooms, isLoading, refetch } = useListRooms(venueId, {
    query: {
      enabled: !!venueId,
      queryKey: getListRoomsQueryKey(venueId),
      refetchInterval: 20_000,
    },
  });

  const typedRooms = (rooms ?? []) as RoomWithStatus[];

  const allTables = typedRooms.flatMap((r) => r.tables ?? []);
  const occupiedCount = allTables.filter((t) => t.isOccupied).length;
  const freeCount = allTables.filter((t) => t.isActive && !t.isOccupied).length;

  const handleRefresh = async () => {
    await refetch();
    qc.invalidateQueries({ queryKey: getListRoomsQueryKey(venueId) });
    setLastRefresh(new Date());
  };

  const handleTableClick = (table: TableWithStatus) => {
    if (!table.isActive) return;
    setLocation(`/waiter/table/${table.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Xona va Stollar</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {user?.venueName ?? "Filial"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-zinc-400">{freeCount} bo'sh</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-zinc-400">{occupiedCount} band</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Yangilash
          </Button>
        </div>
      </div>

      {/* Last refresh */}
      <p className="text-xs text-zinc-600 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Oxirgi yangilanish: {lastRefresh.toLocaleTimeString("uz-UZ")}
      </p>

      {isLoading ? (
        <div className="text-center py-16 text-zinc-500">Yuklanmoqda...</div>
      ) : typedRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border border-dashed border-zinc-800 rounded-2xl">
          <DoorOpen className="h-16 w-16 mb-3 opacity-30" />
          <p className="text-lg font-medium">Xona yo'q</p>
          <p className="text-sm mt-1">Admin tomonidan xona va stollar qo'shilmagan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {typedRooms
            .filter((r) => r.isActive)
            .map((room) => {
              const tables = (room.tables ?? []).filter((t) => t.isActive);
              return (
                <div
                  key={room.id}
                  className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden"
                >
                  {/* Room header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60">
                    <DoorOpen className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold text-white">{room.name}</span>
                    {room.description && (
                      <span className="text-xs text-zinc-500">— {room.description}</span>
                    )}
                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                      {tables.length} stol
                    </Badge>
                    <div className="ml-auto flex gap-2 text-xs text-zinc-500">
                      <span className="text-emerald-500 font-medium">
                        {tables.filter((t) => !t.isOccupied).length} bo'sh
                      </span>
                      ·
                      <span className="text-red-400 font-medium">
                        {tables.filter((t) => t.isOccupied).length} band
                      </span>
                    </div>
                  </div>

                  {/* Tables grid */}
                  <div className="p-4">
                    {tables.length === 0 ? (
                      <p className="text-zinc-600 text-sm text-center py-4">Stol yo'q</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {tables
                          .sort((a, b) => a.number - b.number)
                          .map((table) => (
                            <WaiterTableCard
                              key={table.id}
                              table={table}
                              onClick={() => handleTableClick(table)}
                            />
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

/* ── Table card ── */
function WaiterTableCard({
  table,
  onClick,
}: {
  table: TableWithStatus;
  onClick: () => void;
}) {
  const isOccupied = table.isOccupied ?? false;

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center h-28 rounded-xl border-2 transition-all active:scale-95 ${
        isOccupied
          ? "border-red-500/60 bg-red-950/30 hover:border-red-400 hover:bg-red-950/50"
          : "border-emerald-600/50 bg-emerald-950/20 hover:border-emerald-400 hover:bg-emerald-950/40"
      }`}
    >
      {/* Status dot */}
      <div
        className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${
          isOccupied ? "bg-red-500 animate-pulse" : "bg-emerald-500"
        }`}
      />

      {/* Table number */}
      <span className={`text-2xl font-bold ${isOccupied ? "text-red-200" : "text-emerald-200"}`}>
        #{table.number}
      </span>

      {table.name && (
        <span className="text-xs text-zinc-400 mt-0.5 px-1 truncate max-w-full">{table.name}</span>
      )}

      {table.capacity && (
        <div className="flex items-center gap-1 mt-1">
          <Users className="h-3 w-3 text-zinc-500" />
          <span className="text-xs text-zinc-500">{table.capacity}</span>
        </div>
      )}

      {isOccupied && table.openOrderTotal ? (
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <span className="text-xs font-semibold text-red-300 bg-red-900/50 px-2 py-0.5 rounded-full">
            {new Intl.NumberFormat("uz-UZ").format(Math.round(table.openOrderTotal))} so'm
          </span>
        </div>
      ) : (
        !isOccupied && (
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <span className="text-xs text-emerald-600">Bo'sh</span>
          </div>
        )
      )}
    </button>
  );
}
