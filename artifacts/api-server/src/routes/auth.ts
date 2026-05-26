import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, venuesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  let venueName: string | null = null;
  if (user.venueId) {
    const [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, user.venueId));
    venueName = venue?.name ?? null;
  }

  const token = signToken(user.id);
  res.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      venueId: user.venueId,
      venueName,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  let venueName: string | null = null;
  if (user.venueId) {
    const [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, user.venueId));
    venueName = venue?.name ?? null;
  }
  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    venueId: user.venueId,
    venueName,
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ ok: true });
});

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const me = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  if (me.role !== "owner") {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  const venues = await db.select().from(venuesTable);
  const venueMap = new Map(venues.map((v) => [v.id, v.name]));
  res.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      venueId: u.venueId,
      venueName: u.venueId ? (venueMap.get(u.venueId) ?? null) : null,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

router.post("/users", requireAuth, async (req, res): Promise<void> => {
  const me = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  if (me.role !== "owner") {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  const { username, password, name, role, venueId } = req.body as {
    username?: string;
    password?: string;
    name?: string;
    role?: string;
    venueId?: number | null;
  };
  if (!username || !password || !role) {
    res.status(400).json({ error: "username, password, role required" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 8);
  const [user] = await db
    .insert(usersTable)
    .values({ username, passwordHash, name: name ?? null, role: role as "owner" | "admin", venueId: venueId ?? null })
    .returning();
  res.status(201).json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    venueId: user.venueId,
    venueName: null,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
