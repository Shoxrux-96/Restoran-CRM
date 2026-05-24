import { Router, type IRouter } from "express";
import { db, ordersTable, customersTable, debtsTable, productsTable, orderItemsTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

router.get("/venues/:venueId/orders", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.venueId, venueId))
    .orderBy(sql`${ordersTable.createdAt} DESC`);

  const customers = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.venueId, venueId));
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  res.json(
    orders.map((o) => ({
      id: o.id,
      venueId: o.venueId,
      customerId: o.customerId,
      customerName: o.customerId ? (customerMap.get(o.customerId) ?? null) : null,
      totalAmount: parseFloat(o.totalAmount),
      paymentType: o.paymentType,
      status: o.status,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
    }))
  );
});

router.post("/venues/:venueId/orders", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const { customerId, items, paymentType, notes } = req.body as {
    customerId?: number | null;
    items?: Array<{ productId: number; quantity: number }>;
    paymentType?: string;
    notes?: string;
  };

  if (!items || items.length === 0 || !paymentType) {
    res.status(400).json({ error: "items and paymentType required" });
    return;
  }

  const productIds = items.map((i) => i.productId);
  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalAmount = 0;
  const orderItemValues: Array<{
    orderId: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    total: string;
  }> = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const unitPrice = parseFloat(product.price);
    const total = unitPrice * item.quantity;
    totalAmount += total;
    orderItemValues.push({
      orderId: 0,
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: String(unitPrice),
      total: String(total),
    });
  }

  const status = paymentType === "debt" ? "debt" : "completed";
  const [order] = await db
    .insert(ordersTable)
    .values({
      venueId,
      customerId: customerId ?? null,
      totalAmount: String(totalAmount),
      paymentType: paymentType as "cash" | "debt",
      status: status as "completed" | "debt",
      notes: notes ?? null,
    })
    .returning();

  const itemsWithOrderId = orderItemValues.map((i) => ({ ...i, orderId: order.id }));
  const insertedItems = await db.insert(orderItemsTable).values(itemsWithOrderId).returning();

  if (paymentType === "debt" && customerId) {
    await db.insert(debtsTable).values({
      venueId,
      customerId,
      orderId: order.id,
      amount: String(totalAmount),
      paidAmount: "0",
      status: "unpaid",
    });
  }

  let customerName: string | null = null;
  if (customerId) {
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId));
    customerName = customer?.name ?? null;
  }

  res.status(201).json({
    id: order.id,
    venueId: order.venueId,
    customerId: order.customerId,
    customerName,
    totalAmount: parseFloat(order.totalAmount),
    paymentType: order.paymentType,
    status: order.status,
    notes: order.notes,
    items: insertedItems.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: parseFloat(i.unitPrice),
      total: parseFloat(i.total),
    })),
    createdAt: order.createdAt.toISOString(),
  });
});

router.get("/venues/:venueId/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.venueId, venueId)));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, id));


  let customerName: string | null = null;
  if (order.customerId) {
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, order.customerId));
    customerName = customer?.name ?? null;
  }

  res.json({
    id: order.id,
    venueId: order.venueId,
    customerId: order.customerId,
    customerName,
    totalAmount: parseFloat(order.totalAmount),
    paymentType: order.paymentType,
    status: order.status,
    notes: order.notes,
    items: items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: parseFloat(i.unitPrice),
      total: parseFloat(i.total),
    })),
    createdAt: order.createdAt.toISOString(),
  });
});

export default router;
