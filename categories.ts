import { Router, type Request, type Response, type NextFunction } from "express";
import { count } from "drizzle-orm";
import { db, schema } from "../lib/db";

const router = Router();

const CATEGORY_NAMES: Record<string, { en: string; ar: string }> = {
  "ford-parts":          { en: "Ford Parts",          ar: "قطع فورد"       },
  "police-collectibles": { en: "Police Collectibles",  ar: "نوادر بوليسية"  },
};

router.get("/categories", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select({ category: schema.productsTable.category, count: count() })
      .from(schema.productsTable)
      .groupBy(schema.productsTable.category);

    const categories = rows.map((r) => ({
      id:     r.category,
      name:   CATEGORY_NAMES[r.category]?.en ?? r.category,
      nameAr: CATEGORY_NAMES[r.category]?.ar ?? r.category,
      count:  Number(r.count),
    }));

    res.json(categories);
  } catch (err) { next(err); }
});

export default router;
