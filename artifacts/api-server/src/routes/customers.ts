import { Router, type IRouter } from "express";
import { db, customersTable, debtsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

router.get("/venues/:venueId/customers", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const customers = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.venueId, venueId))
    .orderBy(customersTable.name);

  const debts = await db
    .select({
      customerId: debtsTable.customerId,
      total: sql<string>`COALESCE(SUM(${debtsTable.amount} - ${debtsTable.paidAmount}), 0)`,
    })
    .from(debtsTable)
    .where(and(eq(debtsTable.venueId, venueId), eq(debtsTable.status, "unpaid")))
    .groupBy(debtsTable.customerId);

  const debtMap = new Map(debts.map((d) => [d.customerId, parseFloat(d.total)]));

  res.json(
    customers.map((c) => ({
      id: c.id,
      venueId: c.venueId,
      name: c.name,
      phone: c.phone,
      totalDebt: debtMap.get(c.id) ?? 0,
      createdAt: c.createdAt.toISOString(),
    }))
  );
});

router.post("/venues/:venueId/customers", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const { name, phone } = req.body as { name?: string; phone?: string };
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const [customer] = await db
    .insert(customersTable)
    .values({ venueId, name, phone: phone ?? null })
    .returning();
  res.status(201).json({
    id: customer.id,
    venueId: customer.venueId,
    name: customer.name,
    phone: customer.phone,
    totalDebt: 0,
    createdAt: customer.createdAt.toISOString(),
  });
});

router.get("/venues/:venueId/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(and(eq(customersTable.id, id), eq(customersTable.venueId, venueId)));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  const [debtRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${debtsTable.amount} - ${debtsTable.paidAmount}), 0)` })
    .from(debtsTable)
    .where(and(eq(debtsTable.customerId, id), eq(debtsTable.status, "unpaid")));
  res.json({
    id: customer.id,
    venueId: customer.venueId,
    name: customer.name,
    phone: customer.phone,
    totalDebt: parseFloat(debtRow?.total ?? "0"),
    createdAt: customer.createdAt.toISOString(),
  });
});

export default router;
