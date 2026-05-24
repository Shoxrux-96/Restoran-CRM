import { Router, type IRouter } from "express";
import { db, debtsTable, customersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

router.get("/venues/:venueId/debts", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const debts = await db
    .select()
    .from(debtsTable)
    .where(eq(debtsTable.venueId, venueId))
    .orderBy(debtsTable.createdAt);

  const customers = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.venueId, venueId));
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  res.json(
    debts.map((d) => {
      const customer = d.customerId ? customerMap.get(d.customerId) : null;
      const amount = parseFloat(d.amount);
      const paidAmount = parseFloat(d.paidAmount);
      return {
        id: d.id,
        venueId: d.venueId,
        customerId: d.customerId,
        customerName: customer?.name ?? "Unknown",
        customerPhone: customer?.phone ?? null,
        orderId: d.orderId,
        amount,
        paidAmount,
        remaining: amount - paidAmount,
        status: d.status,
        paidAt: d.paidAt ? d.paidAt.toISOString() : null,
        createdAt: d.createdAt.toISOString(),
      };
    })
  );
});

router.patch("/venues/:venueId/debts/:id/pay", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);
  const { amount } = req.body as { amount?: number };

  if (amount == null || amount <= 0) {
    res.status(400).json({ error: "amount required and must be positive" });
    return;
  }

  const [debt] = await db
    .select()
    .from(debtsTable)
    .where(and(eq(debtsTable.id, id), eq(debtsTable.venueId, venueId)));

  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  const totalAmount = parseFloat(debt.amount);
  const alreadyPaid = parseFloat(debt.paidAmount);
  const newPaid = Math.min(alreadyPaid + amount, totalAmount);
  const remaining = totalAmount - newPaid;
  const newStatus = remaining <= 0 ? "paid" : "partial";
  const paidAt = newStatus === "paid" ? new Date() : debt.paidAt;

  const [updated] = await db
    .update(debtsTable)
    .set({
      paidAmount: String(newPaid),
      status: newStatus as "paid" | "partial",
      paidAt,
    })
    .where(eq(debtsTable.id, id))
    .returning();

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, updated.customerId));

  res.json({
    id: updated.id,
    venueId: updated.venueId,
    customerId: updated.customerId,
    customerName: customer?.name ?? "Unknown",
    customerPhone: customer?.phone ?? null,
    orderId: updated.orderId,
    amount: parseFloat(updated.amount),
    paidAmount: parseFloat(updated.paidAmount),
    remaining: parseFloat(updated.amount) - parseFloat(updated.paidAmount),
    status: updated.status,
    paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
