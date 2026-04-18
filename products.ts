import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db";
import { requireAdmin } from "../middleware/auth";

const router = Router();

const listQuerySchema = z.object({
  category: z.string().optional(),
  search:   z.string().optional(),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(12),
});

// GET /api/products  — public
router.get("/products", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query params" });
      return;
    }
    const { category, search, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (category) conditions.push(eq(schema.productsTable.category, category));
    if (search) {
      conditions.push(
        sql`(${schema.productsTable.name} ilike ${`%${search}%`} OR ${schema.productsTable.nameAr} ilike ${`%${search}%`})`
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [products, totalRows] = await Promise.all([
      db.select().from(schema.productsTable)
        .where(where).orderBy(desc(schema.productsTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(schema.productsTable).where(where),
    ]);

    res.json({
      products: products.map(serializeProduct),
      total:    Number(totalRows[0]?.count ?? 0),
      page,
      limit,
    });
  } catch (err) { next(err); }
});

// GET /api/products/featured  — public
router.get("/products/featured", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const featured = await db.select().from(schema.productsTable)
      .where(eq(schema.productsTable.isFeatured, true))
      .orderBy(desc(schema.productsTable.createdAt)).limit(6);
    res.json(featured.map(serializeProduct));
  } catch (err) { next(err); }
});

// GET /api/products/stats  — admin only
router.get("/products/stats", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalRow] = await db.select({ count: count() }).from(schema.productsTable);
    const [inStockRow] = await db.select({ count: count() }).from(schema.productsTable)
      .where(eq(schema.productsTable.inStock, true));
    const categoryRows = await db
      .select({ category: schema.productsTable.category, count: count() })
      .from(schema.productsTable).groupBy(schema.productsTable.category);

    res.json({
      totalProducts: Number(totalRow?.count ?? 0),
      inStock:       Number(inStockRow?.count ?? 0),
      byCategory:    categoryRows.map((r) => ({ category: r.category, count: Number(r.count) })),
    });
  } catch (err) { next(err); }
});

// GET /api/products/:id  — public
router.get("/products/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [product] = await db.select().from(schema.productsTable)
      .where(eq(schema.productsTable.id, id));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(serializeProduct(product));
  } catch (err) { next(err); }
});

// POST /api/products  — admin only
router.post("/products", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.insertProductSchema.safeParse(req.body as unknown);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid product data", details: parsed.error.flatten() });
      return;
    }
    const [product] = await db.insert(schema.productsTable)
      .values({ ...parsed.data, price: String(parsed.data.price) })
      .returning();
    res.status(201).json(serializeProduct(product!));
  } catch (err) { next(err); }
});

// PUT /api/products/:id  — admin only
router.put("/products/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = schema.insertProductSchema.partial().safeParse(req.body as unknown);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid product data", details: parsed.error.flatten() });
      return;
    }
    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.price !== undefined) updateData["price"] = String(parsed.data.price);

    const [product] = await db.update(schema.productsTable)
      .set(updateData as Partial<typeof schema.productsTable.$inferInsert>)
      .where(eq(schema.productsTable.id, id)).returning();
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(serializeProduct(product));
  } catch (err) { next(err); }
});

// DELETE /api/products/:id  — admin only
router.delete("/products/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(schema.productsTable).where(eq(schema.productsTable.id, id));
    res.status(204).send();
  } catch (err) { next(err); }
});

function serializeProduct(p: typeof schema.productsTable.$inferSelect) {
  return {
    ...p,
    price:     Number(p.price),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
