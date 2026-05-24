import { Router, type IRouter } from "express";
import { db, productsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

function mapProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    venueId: p.venueId,
    name: p.name,
    price: parseFloat(p.price),
    category: p.category,
    description: p.description,
    isAvailable: p.isAvailable,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/venues/:venueId/products", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.venueId, venueId))
    .orderBy(productsTable.category, productsTable.name);
  res.json(products.map(mapProduct));
});

router.post("/venues/:venueId/products", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const { name, price, category, description, isAvailable } = req.body as {
    name?: string;
    price?: number;
    category?: string;
    description?: string;
    isAvailable?: boolean;
  };
  if (!name || price == null || !category) {
    res.status(400).json({ error: "name, price, category required" });
    return;
  }
  const [product] = await db
    .insert(productsTable)
    .values({
      venueId,
      name,
      price: String(price),
      category,
      description: description ?? null,
      isAvailable: isAvailable !== false,
    })
    .returning();
  res.status(201).json(mapProduct(product));
});

router.patch("/venues/:venueId/products/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);
  const { name, price, category, description, isAvailable } = req.body as {
    name?: string;
    price?: number;
    category?: string;
    description?: string | null;
    isAvailable?: boolean;
  };
  const [product] = await db
    .update(productsTable)
    .set({
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: String(price) }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(isAvailable !== undefined && { isAvailable }),
    })
    .where(and(eq(productsTable.id, id), eq(productsTable.venueId, venueId)))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(mapProduct(product));
});

router.delete("/venues/:venueId/products/:id", requireAuth, async (req, res): Promise<void> => {
  const venueId = parseId(req.params.venueId);
  const id = parseId(req.params.id);
  await db.delete(productsTable).where(and(eq(productsTable.id, id), eq(productsTable.venueId, venueId)));
  res.sendStatus(204);
});

export default router;
