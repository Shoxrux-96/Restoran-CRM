import { Router, type IRouter } from "express";
import { db, roomsTable, tablesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

/* ── ROOMS ──────────────────────────────────────────────── */

router.get("/venues/:venueId/rooms", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const rooms = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.venueId, venueId))
    .orderBy(roomsTable.id);

  const tables = await db
    .select()
    .from(tablesTable)
    .where(eq(tablesTable.venueId, venueId))
    .orderBy(tablesTable.number);

  res.json(
    rooms.map((r) => ({
      id: r.id,
      venueId: r.venueId,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      tables: tables
        .filter((t) => t.roomId === r.id)
        .map((t) => ({
          id: t.id,
          venueId: t.venueId,
          roomId: t.roomId,
          number: t.number,
          name: t.name,
          capacity: t.capacity,
          isActive: t.isActive,
          createdAt: t.createdAt.toISOString(),
        })),
    }))
  );
});

router.post("/venues/:venueId/rooms", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const { name, description } = req.body as { name?: string; description?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: "name required" });
    return;
  }

  const [room] = await db
    .insert(roomsTable)
    .values({ venueId, name: name.trim(), description: description ?? null, isActive: true })
    .returning();

  res.status(201).json({
    id: room.id,
    venueId: room.venueId,
    name: room.name,
    description: room.description,
    isActive: room.isActive,
    createdAt: room.createdAt.toISOString(),
    tables: [],
  });
});

router.patch("/venues/:venueId/rooms/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);
  const { name, description, isActive } = req.body as { name?: string; description?: string; isActive?: boolean };

  const updates: Partial<{ name: string; description: string | null; isActive: boolean }> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (isActive !== undefined) updates.isActive = isActive;

  const [room] = await db
    .update(roomsTable)
    .set(updates)
    .where(and(eq(roomsTable.id, id), eq(roomsTable.venueId, venueId)))
    .returning();

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const tables = await db
    .select()
    .from(tablesTable)
    .where(eq(tablesTable.roomId, id))
    .orderBy(tablesTable.number);

  res.json({
    id: room.id,
    venueId: room.venueId,
    name: room.name,
    description: room.description,
    isActive: room.isActive,
    createdAt: room.createdAt.toISOString(),
    tables: tables.map((t) => ({
      id: t.id,
      venueId: t.venueId,
      roomId: t.roomId,
      number: t.number,
      name: t.name,
      capacity: t.capacity,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

router.delete("/venues/:venueId/rooms/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);

  await db.delete(tablesTable).where(and(eq(tablesTable.roomId, id), eq(tablesTable.venueId, venueId)));
  await db.delete(roomsTable).where(and(eq(roomsTable.id, id), eq(roomsTable.venueId, venueId)));

  res.status(204).end();
});

/* ── TABLES ─────────────────────────────────────────────── */

router.get("/venues/:venueId/tables", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const tables = await db
    .select()
    .from(tablesTable)
    .where(eq(tablesTable.venueId, venueId))
    .orderBy(tablesTable.number);

  res.json(
    tables.map((t) => ({
      id: t.id,
      venueId: t.venueId,
      roomId: t.roomId,
      number: t.number,
      name: t.name,
      capacity: t.capacity,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
    }))
  );
});

router.post("/venues/:venueId/tables", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const { roomId, number, name, capacity } = req.body as {
    roomId?: number | null;
    number?: number;
    name?: string;
    capacity?: number;
  };

  if (!number) {
    res.status(400).json({ error: "number required" });
    return;
  }

  const [table] = await db
    .insert(tablesTable)
    .values({
      venueId,
      roomId: roomId ?? null,
      number,
      name: name ?? null,
      capacity: capacity ?? 4,
      isActive: true,
    })
    .returning();

  res.status(201).json({
    id: table.id,
    venueId: table.venueId,
    roomId: table.roomId,
    number: table.number,
    name: table.name,
    capacity: table.capacity,
    isActive: table.isActive,
    createdAt: table.createdAt.toISOString(),
  });
});

router.patch("/venues/:venueId/tables/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);
  const { roomId, number, name, capacity, isActive } = req.body as {
    roomId?: number | null;
    number?: number;
    name?: string | null;
    capacity?: number;
    isActive?: boolean;
  };

  const updates: Partial<{ roomId: number | null; number: number; name: string | null; capacity: number; isActive: boolean }> = {};
  if (roomId !== undefined) updates.roomId = roomId;
  if (number !== undefined) updates.number = number;
  if (name !== undefined) updates.name = name;
  if (capacity !== undefined) updates.capacity = capacity;
  if (isActive !== undefined) updates.isActive = isActive;

  const [table] = await db
    .update(tablesTable)
    .set(updates)
    .where(and(eq(tablesTable.id, id), eq(tablesTable.venueId, venueId)))
    .returning();

  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }

  res.json({
    id: table.id,
    venueId: table.venueId,
    roomId: table.roomId,
    number: table.number,
    name: table.name,
    capacity: table.capacity,
    isActive: table.isActive,
    createdAt: table.createdAt.toISOString(),
  });
});

router.delete("/venues/:venueId/tables/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);

  await db.delete(tablesTable).where(and(eq(tablesTable.id, id), eq(tablesTable.venueId, venueId)));

  res.status(204).end();
});

export default router;
