import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, productsTable, debtsTable, usersTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

function parsePaymentSplit(raw: string | null): Record<string, number> | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/* ── GET all open orders for a venue ── */
router.get("/venues/:venueId/open-orders", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);

  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.venueId, venueId), eq(ordersTable.status, "open")))
    .orderBy(ordersTable.createdAt);

  if (orders.length === 0) {
    res.json([]);
    return;
  }

  const orderIds = orders.map((o) => o.id);
  const allItems = await db
    .select()
    .from(orderItemsTable)
    .where(inArray(orderItemsTable.orderId, orderIds));

  const itemsByOrder = new Map<number, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  const waiterIds = [...new Set(orders.map((o) => o.waiterId).filter((id): id is number => id !== null))];
  const waiters = waiterIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, waiterIds))
    : [];
  const waiterMap = new Map(waiters.map((w) => [w.id, w.name || w.username]));

  res.json(
    orders.map((o) => ({
      id: o.id,
      venueId: o.venueId,
      tableId: o.tableId,
      tableNumber: o.tableNumber,
      roomId: o.roomId,
      roomName: o.roomName,
      waiterId: o.waiterId,
      waiterName: o.waiterId ? (waiterMap.get(o.waiterId) ?? null) : null,
      totalAmount: parseFloat(o.totalAmount),
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      items: (itemsByOrder.get(o.id) ?? []).map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unitPrice),
        discountPct: parseFloat(i.discountPct ?? "0"),
        total: parseFloat(i.total),
      })),
    }))
  );
});

/* ── POST create an open order ── */
router.post("/venues/:venueId/open-orders", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const me = (req as typeof req & { user: { id: number; role: string } }).user;

  const {
    tableId, tableNumber, roomId, roomName, items, notes,
  } = req.body as {
    tableId?: number | null;
    tableNumber?: number | null;
    roomId?: number | null;
    roomName?: string | null;
    items?: Array<{ productId: number; quantity: number; discountPct?: number }>;
    notes?: string;
  };

  if (!items || items.length === 0) {
    res.status(400).json({ error: "items required" });
    return;
  }

  if (tableId) {
    const existing = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.venueId, venueId), eq(ordersTable.tableId, tableId), eq(ordersTable.status, "open")));
    if (existing.length > 0) {
      res.status(409).json({ error: "Bu stolda allaqachon ochiq buyurtma bor", orderId: existing[0].id });
      return;
    }
  }

  const productIds = items.map((i) => i.productId);
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalAmount = 0;
  const itemValues: Array<{
    orderId: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    discountPct: string;
    total: string;
  }> = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const unitPrice = parseFloat(product.price);
    const discount = item.discountPct ?? 0;
    const lineTotal = unitPrice * item.quantity * (1 - discount / 100);
    totalAmount += lineTotal;
    itemValues.push({
      orderId: 0,
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: String(unitPrice),
      discountPct: String(discount),
      total: String(lineTotal),
    });
  }

  const [order] = await db.insert(ordersTable).values({
    venueId,
    waiterId: me.id,
    tableId: tableId ?? null,
    tableNumber: tableNumber ?? null,
    roomId: roomId ?? null,
    roomName: roomName ?? null,
    totalAmount: String(totalAmount),
    paymentType: "cash",
    status: "open",
    notes: notes ?? null,
  }).returning();

  const withOrderId = itemValues.map((i) => ({ ...i, orderId: order.id }));
  const insertedItems = await db.insert(orderItemsTable).values(withOrderId).returning();

  res.status(201).json({
    id: order.id,
    venueId: order.venueId,
    tableId: order.tableId,
    tableNumber: order.tableNumber,
    roomId: order.roomId,
    roomName: order.roomName,
    waiterId: order.waiterId,
    totalAmount: parseFloat(order.totalAmount),
    status: order.status,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    items: insertedItems.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: parseFloat(i.unitPrice),
      discountPct: parseFloat(i.discountPct ?? "0"),
      total: parseFloat(i.total),
    })),
  });
});

/* ── PATCH update items of an open order ── */
router.patch("/venues/:venueId/open-orders/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);

  const { items, notes } = req.body as {
    items?: Array<{ productId: number; quantity: number; discountPct?: number }>;
    notes?: string;
  };

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.venueId, venueId), eq(ordersTable.status, "open")));

  if (!order) {
    res.status(404).json({ error: "Ochiq buyurtma topilmadi" });
    return;
  }

  if (!items || items.length === 0) {
    res.status(400).json({ error: "items required" });
    return;
  }

  const productIds = items.map((i) => i.productId);
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalAmount = 0;
  const itemValues: Array<{
    orderId: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    discountPct: string;
    total: string;
  }> = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const unitPrice = parseFloat(product.price);
    const discount = item.discountPct ?? 0;
    const lineTotal = unitPrice * item.quantity * (1 - discount / 100);
    totalAmount += lineTotal;
    itemValues.push({
      orderId: id,
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: String(unitPrice),
      discountPct: String(discount),
      total: String(lineTotal),
    });
  }

  await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  const insertedItems = await db.insert(orderItemsTable).values(itemValues).returning();

  const [updated] = await db.update(ordersTable).set({
    totalAmount: String(totalAmount),
    notes: notes !== undefined ? notes : order.notes,
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, id)).returning();

  res.json({
    id: updated.id,
    venueId: updated.venueId,
    tableId: updated.tableId,
    tableNumber: updated.tableNumber,
    roomId: updated.roomId,
    roomName: updated.roomName,
    totalAmount: parseFloat(updated.totalAmount),
    status: updated.status,
    notes: updated.notes,
    createdAt: updated.createdAt.toISOString(),
    items: insertedItems.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: parseFloat(i.unitPrice),
      discountPct: parseFloat(i.discountPct ?? "0"),
      total: parseFloat(i.total),
    })),
  });
});

/* ── POST pay/close an open order ── */
router.post("/venues/:venueId/open-orders/:id/pay", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);

  const { paymentType, paymentSplit, customerId, notes, items } = req.body as {
    paymentType?: string;
    paymentSplit?: Record<string, number>;
    customerId?: number | null;
    notes?: string;
    items?: Array<{ productId: number; quantity: number; discountPct?: number }>;
  };

  if (!paymentType) {
    res.status(400).json({ error: "paymentType required" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.venueId, venueId), eq(ordersTable.status, "open")));

  if (!order) {
    res.status(404).json({ error: "Ochiq buyurtma topilmadi" });
    return;
  }

  let finalTotal = parseFloat(order.totalAmount);

  if (items && items.length > 0) {
    const productIds = items.map((i) => i.productId);
    const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
    const productMap = new Map(products.map((p) => [p.id, p]));

    let newTotal = 0;
    const itemValues: Array<{
      orderId: number;
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: string;
      discountPct: string;
      total: string;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        res.status(400).json({ error: `Product ${item.productId} not found` });
        return;
      }
      const unitPrice = parseFloat(product.price);
      const discount = item.discountPct ?? 0;
      const lineTotal = unitPrice * item.quantity * (1 - discount / 100);
      newTotal += lineTotal;
      itemValues.push({
        orderId: id,
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: String(unitPrice),
        discountPct: String(discount),
        total: String(lineTotal),
      });
    }

    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    await db.insert(orderItemsTable).values(itemValues);
    finalTotal = newTotal;
  }

  const hasDebt = paymentType === "debt" || (paymentSplit && (paymentSplit.debt ?? 0) > 0);
  const newStatus = hasDebt ? "debt" : "completed";

  const [updated] = await db.update(ordersTable).set({
    status: newStatus as "completed" | "debt",
    paymentType: paymentType as "cash" | "card" | "transfer" | "debt",
    paymentSplit: paymentSplit ? JSON.stringify(paymentSplit) : null,
    customerId: customerId ?? null,
    notes: notes ?? order.notes,
    totalAmount: String(finalTotal),
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, id)).returning();

  const debtAmount = paymentSplit?.debt ?? (paymentType === "debt" ? finalTotal : 0);
  if (debtAmount > 0 && customerId) {
    await db.insert(debtsTable).values({
      venueId,
      customerId,
      orderId: id,
      amount: String(debtAmount),
      paidAmount: "0",
      status: "unpaid",
    });
  }

  res.json({
    id: updated.id,
    venueId: updated.venueId,
    customerId: updated.customerId,
    tableId: updated.tableId,
    tableNumber: updated.tableNumber,
    roomId: updated.roomId,
    roomName: updated.roomName,
    totalAmount: parseFloat(updated.totalAmount),
    paymentType: updated.paymentType,
    paymentSplit: parsePaymentSplit(updated.paymentSplit),
    status: updated.status,
    notes: updated.notes,
    createdAt: updated.createdAt.toISOString(),
  });
});

/* ── DELETE cancel an open order ── */
router.delete("/venues/:venueId/open-orders/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.venueId, venueId), eq(ordersTable.status, "open")));

  if (!order) {
    res.status(404).json({ error: "Ochiq buyurtma topilmadi" });
    return;
  }

  await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  await db.delete(ordersTable).where(eq(ordersTable.id, id));

  res.status(204).end();
});

export default router;
