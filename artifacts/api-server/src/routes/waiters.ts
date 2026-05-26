import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

/* ── GET list waiters for a venue ── */
router.get("/venues/:venueId/waiters", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const me = (req as typeof req & { user: { role: string; venueId: number | null } }).user;

  if (me.role !== "admin" && me.role !== "owner") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const waiters = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.venueId, venueId), eq(usersTable.role, "waiter")));

  res.json(
    waiters.map((w) => ({
      id: w.id,
      username: w.username,
      name: w.name,
      venueId: w.venueId,
      createdAt: w.createdAt.toISOString(),
    }))
  );
});

/* ── POST create a waiter ── */
router.post("/venues/:venueId/waiters", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const me = (req as typeof req & { user: { role: string; venueId: number | null } }).user;

  if (me.role !== "admin" && me.role !== "owner") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { username, password, name } = req.body as {
    username?: string;
    password?: string;
    name?: string;
  };

  if (!username?.trim() || !password) {
    res.status(400).json({ error: "username va password kerak" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username.trim()));
  if (existing.length > 0) {
    res.status(409).json({ error: "Bu username band" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 8);
  const [waiter] = await db.insert(usersTable).values({
    username: username.trim(),
    passwordHash,
    name: name?.trim() ?? null,
    role: "waiter",
    venueId,
  }).returning();

  res.status(201).json({
    id: waiter.id,
    username: waiter.username,
    name: waiter.name,
    venueId: waiter.venueId,
    createdAt: waiter.createdAt.toISOString(),
  });
});

/* ── DELETE remove a waiter ── */
router.delete("/venues/:venueId/waiters/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);
  const me = (req as typeof req & { user: { role: string } }).user;

  if (me.role !== "admin" && me.role !== "owner") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  await db.delete(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.venueId, venueId), eq(usersTable.role, "waiter")));

  res.status(204).end();
});

export default router;
