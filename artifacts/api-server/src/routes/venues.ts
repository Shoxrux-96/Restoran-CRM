import { Router, type IRouter } from "express";
import { db, venuesTable, usersTable, ordersTable, debtsTable, productsTable, customersTable, orderItemsTable } from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

router.get("/venues", requireAuth, async (req, res): Promise<void> => {
  const venues = await db.select().from(venuesTable).orderBy(venuesTable.createdAt);
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u]));
  res.json(
    venues.map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      address: v.address,
      phone: v.phone,
      adminId: v.adminId,
      adminName: v.adminId ? (userMap.get(v.adminId)?.name ?? userMap.get(v.adminId)?.username ?? null) : null,
      createdAt: v.createdAt.toISOString(),
    }))
  );
});

router.post("/venues", requireAuth, async (req, res): Promise<void> => {
  const me = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  if (me.role !== "owner") {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  const { name, type, address, phone } = req.body as {
    name?: string;
    type?: string;
    address?: string;
    phone?: string;
  };
  if (!name || !type) {
    res.status(400).json({ error: "name and type required" });
    return;
  }
  const [venue] = await db
    .insert(venuesTable)
    .values({ name, type: type as "cafe" | "restaurant", address: address ?? null, phone: phone ?? null })
    .returning();
  res.status(201).json({
    id: venue.id,
    name: venue.name,
    type: venue.type,
    address: venue.address,
    phone: venue.phone,
    adminId: venue.adminId,
    adminName: null,
    createdAt: venue.createdAt.toISOString(),
  });
});

router.get("/venues/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, id));
  if (!venue) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }
  let adminName: string | null = null;
  if (venue.adminId) {
    const [admin] = await db.select().from(usersTable).where(eq(usersTable.id, venue.adminId));
    adminName = admin?.name ?? admin?.username ?? null;
  }
  res.json({
    id: venue.id,
    name: venue.name,
    type: venue.type,
    address: venue.address,
    phone: venue.phone,
    adminId: venue.adminId,
    adminName,
    createdAt: venue.createdAt.toISOString(),
  });
});

router.patch("/venues/:id", requireAuth, async (req, res): Promise<void> => {
  const me = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  if (me.role !== "owner") {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  const id = parseId(req.params.id);
  const { name, type, address, phone } = req.body as {
    name?: string;
    type?: string;
    address?: string | null;
    phone?: string | null;
  };
  const [venue] = await db
    .update(venuesTable)
    .set({
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type: type as "cafe" | "restaurant" }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
    })
    .where(eq(venuesTable.id, id))
    .returning();
  if (!venue) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }
  res.json({
    id: venue.id,
    name: venue.name,
    type: venue.type,
    address: venue.address,
    phone: venue.phone,
    adminId: venue.adminId,
    adminName: null,
    createdAt: venue.createdAt.toISOString(),
  });
});

router.delete("/venues/:id", requireAuth, async (req, res): Promise<void> => {
  const me = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  if (me.role !== "owner") {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  const id = parseId(req.params.id);
  await db.delete(venuesTable).where(eq(venuesTable.id, id));
  res.sendStatus(204);
});

router.post("/venues/:id/assign-admin", requireAuth, async (req, res): Promise<void> => {
  const me = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  if (me.role !== "owner") {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  const id = parseId(req.params.id);
  const { userId } = req.body as { userId?: number };
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  await db.update(venuesTable).set({ adminId: userId }).where(eq(venuesTable.id, id));
  await db.update(usersTable).set({ venueId: id }).where(eq(usersTable.id, userId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    venueId: user.venueId,
    venueName: null,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/venues/:id/stats", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todaySalesRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)` })
    .from(ordersTable)
    .where(and(eq(ordersTable.venueId, id), eq(ordersTable.status, "completed"), gte(ordersTable.createdAt, today)));

  const [totalRevenueRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)` })
    .from(ordersTable)
    .where(and(eq(ordersTable.venueId, id), eq(ordersTable.status, "completed")));

  const [totalDebtsRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${debtsTable.amount} - ${debtsTable.paidAmount}), 0)` })
    .from(debtsTable)
    .where(and(eq(debtsTable.venueId, id), eq(debtsTable.status, "unpaid")));

  const [productCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(productsTable)
    .where(eq(productsTable.venueId, id));

  const [orderCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ordersTable)
    .where(eq(ordersTable.venueId, id));

  res.json({
    todaySales: parseFloat(todaySalesRow?.total ?? "0"),
    totalRevenue: parseFloat(totalRevenueRow?.total ?? "0"),
    totalDebts: parseFloat(totalDebtsRow?.total ?? "0"),
    productCount: Number(productCountRow?.count ?? 0),
    orderCount: Number(orderCountRow?.count ?? 0),
  });
});

router.get("/venues/:venueId/summary", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayRevenueRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)` })
    .from(ordersTable)
    .where(and(eq(ordersTable.venueId, venueId), eq(ordersTable.paymentType, "cash"), gte(ordersTable.createdAt, today)));

  const [todayOrderCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ordersTable)
    .where(and(eq(ordersTable.venueId, venueId), gte(ordersTable.createdAt, today)));

  const [totalDebtRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${debtsTable.amount} - ${debtsTable.paidAmount}), 0)` })
    .from(debtsTable)
    .where(and(eq(debtsTable.venueId, venueId), eq(debtsTable.status, "unpaid")));

  const [unpaidDebtCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(debtsTable)
    .where(and(eq(debtsTable.venueId, venueId), eq(debtsTable.status, "unpaid")));

  const topProductsRaw = await db
    .select({
      productId: orderItemsTable.productId,
      productName: orderItemsTable.productName,
      totalSold: sql<number>`SUM(${orderItemsTable.quantity})`,
      revenue: sql<string>`SUM(${orderItemsTable.total})`,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
    .where(eq(ordersTable.venueId, venueId))
    .groupBy(orderItemsTable.productId, orderItemsTable.productName)
    .orderBy(sql`SUM(${orderItemsTable.quantity}) DESC`)
    .limit(5);

  const recentOrders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.venueId, venueId))
    .orderBy(sql`${ordersTable.createdAt} DESC`)
    .limit(10);

  const customers = await db.select().from(customersTable).where(eq(customersTable.venueId, venueId));
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  res.json({
    todayRevenue: parseFloat(todayRevenueRow?.total ?? "0"),
    todayOrderCount: Number(todayOrderCountRow?.count ?? 0),
    totalDebt: parseFloat(totalDebtRow?.total ?? "0"),
    unpaidDebtCount: Number(unpaidDebtCountRow?.count ?? 0),
    topProducts: topProductsRaw.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      totalSold: Number(p.totalSold),
      revenue: parseFloat(p.revenue),
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      venueId: o.venueId,
      customerId: o.customerId,
      customerName: o.customerId ? (customerMap.get(o.customerId) ?? null) : null,
      totalAmount: parseFloat(o.totalAmount),
      paymentType: o.paymentType,
      status: o.status,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
    })),
  });
});

router.get("/owner/summary", requireAuth, async (req, res): Promise<void> => {
  const me = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  if (me.role !== "owner") {
    res.status(403).json({ error: "Owner access required" });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const venues = await db.select().from(venuesTable);
  const [totalRevenueRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)` })
    .from(ordersTable)
    .where(eq(ordersTable.paymentType, "cash"));

  const [totalDebtRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${debtsTable.amount} - ${debtsTable.paidAmount}), 0)` })
    .from(debtsTable)
    .where(eq(debtsTable.status, "unpaid"));

  const venueStats = await Promise.all(
    venues.map(async (v) => {
      const [todayRev] = await db
        .select({ total: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)` })
        .from(ordersTable)
        .where(and(eq(ordersTable.venueId, v.id), eq(ordersTable.paymentType, "cash"), gte(ordersTable.createdAt, today)));

      const [debt] = await db
        .select({ total: sql<string>`COALESCE(SUM(${debtsTable.amount} - ${debtsTable.paidAmount}), 0)` })
        .from(debtsTable)
        .where(and(eq(debtsTable.venueId, v.id), eq(debtsTable.status, "unpaid")));

      const [orders] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(ordersTable)
        .where(eq(ordersTable.venueId, v.id));

      return {
        venueId: v.id,
        venueName: v.name,
        todayRevenue: parseFloat(todayRev?.total ?? "0"),
        totalDebt: parseFloat(debt?.total ?? "0"),
        orderCount: Number(orders?.count ?? 0),
      };
    })
  );

  res.json({
    totalVenues: venues.length,
    totalRevenue: parseFloat(totalRevenueRow?.total ?? "0"),
    totalDebt: parseFloat(totalDebtRow?.total ?? "0"),
    venueStats,
  });
});

export default router;
