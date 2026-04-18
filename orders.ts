import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db";
import { requireAdmin, type AuthRequest } from "../middleware/auth";
import { generateOrderNumber } from "../lib/order-number";

const router = Router();

type ProductRow = typeof schema.productsTable.$inferSelect;

const updateStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]),
});

// POST /api/orders  — public (customer checkout)
router.post("/orders", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.createOrderSchema.safeParse(req.body as unknown);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid order data", details: parsed.error.flatten() });
      return;
    }
    const { customer, items, notes, shippingAddress, paymentMethod } = parsed.data;

    // Fetch and validate all products
    const productRows = await Promise.all(
      items.map((item) =>
        db.select().from(schema.productsTable)
          .where(eq(schema.productsTable.id, item.productId))
          .then((r) => r[0] as ProductRow | undefined)
      )
    );

    for (let i = 0; i < productRows.length; i++) {
      const product = productRows[i];
      const item    = items[i]!;
      if (!product) {
        res.status(400).json({ error: `Product ${item.productId} not found` });
        return;
      }
      if (!product.inStock || product.stockQuantity < item.quantity) {
        res.status(400).json({ error: `Product "${product.name}" is out of stock` });
        return;
      }
    }

    // Total
    const totalAmount = items.reduce((sum, item, idx) => {
      const price = Number((productRows[idx] as ProductRow).price);
      return sum + price * item.quantity;
    }, 0);

    // Upsert customer by email
    let [existingCustomer] = await db.select().from(schema.customersTable)
      .where(eq(schema.customersTable.email, customer.email.toLowerCase()));

    if (!existingCustomer) {
      const [newCustomer] = await db.insert(schema.customersTable)
        .values({ ...customer, email: customer.email.toLowerCase() })
        .returning();
      existingCustomer = newCustomer!;
    }

    // Create order
    const [order] = await db.insert(schema.ordersTable).values({
      orderNumber:     generateOrderNumber(),
      customerId:      existingCustomer.id,
      status:          "pending",
      totalAmount:     String(totalAmount),
      currency:        "SAR",
      notes:           notes ?? null,
      shippingAddress: shippingAddress ?? customer.address ?? null,
    }).returning();

    // Create order items
    const orderItems = await db.insert(schema.orderItemsTable).values(
      items.map((item, idx) => {
        const product = productRows[idx] as ProductRow;
        return {
          orderId:    order!.id,
          productId:  item.productId,
          quantity:   item.quantity,
          unitPrice:  String(product.price),
          totalPrice: String(Number(product.price) * item.quantity),
        };
      })
    ).returning();

    // Create pending payment record
    const [payment] = await db.insert(schema.paymentsTable).values({
      orderId:  order!.id,
      method:   paymentMethod,
      status:   "pending",
      amount:   String(totalAmount),
      currency: "SAR",
    }).returning();

    res.status(201).json({
      order:    serializeOrder(order!),
      customer: existingCustomer,
      items:    orderItems,
      payment:  serializePayment(payment!),
    });
  } catch (err) { next(err); }
});

// GET /api/orders  — admin only
router.get("/orders", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    void (req as AuthRequest).admin; // assert auth
    const rows = await db
      .select({ order: schema.ordersTable, customer: schema.customersTable })
      .from(schema.ordersTable)
      .leftJoin(schema.customersTable, eq(schema.ordersTable.customerId, schema.customersTable.id))
      .orderBy(desc(schema.ordersTable.createdAt));

    res.json(rows.map(({ order, customer }) => ({ ...serializeOrder(order), customer })));
  } catch (err) { next(err); }
});

// GET /api/orders/:id  — admin only
router.get("/orders/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [row] = await db
      .select({ order: schema.ordersTable, customer: schema.customersTable })
      .from(schema.ordersTable)
      .leftJoin(schema.customersTable, eq(schema.ordersTable.customerId, schema.customersTable.id))
      .where(eq(schema.ordersTable.id, id));

    if (!row) { res.status(404).json({ error: "Order not found" }); return; }

    const itemRows = await db
      .select({ item: schema.orderItemsTable, product: schema.productsTable })
      .from(schema.orderItemsTable)
      .leftJoin(schema.productsTable, eq(schema.orderItemsTable.productId, schema.productsTable.id))
      .where(eq(schema.orderItemsTable.orderId, id));

    const payments = await db.select().from(schema.paymentsTable)
      .where(eq(schema.paymentsTable.orderId, id));

    res.json({
      ...serializeOrder(row.order),
      customer: row.customer,
      items:    itemRows.map(({ item, product }) => ({ ...item, product })),
      payments: payments.map(serializePayment),
    });
  } catch (err) { next(err); }
});

// PATCH /api/orders/:id/status  — admin only
router.patch("/orders/:id/status", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const parsed = updateStatusSchema.safeParse(req.body as unknown);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid status value" });
      return;
    }

    const [order] = await db.update(schema.ordersTable)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(schema.ordersTable.id, id))
      .returning();

    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(serializeOrder(order));
  } catch (err) { next(err); }
});

// ─── Serializers ──────────────────────────────────────────────────────────────

function serializeOrder(o: typeof schema.ordersTable.$inferSelect) {
  return {
    ...o,
    totalAmount: Number(o.totalAmount),
    createdAt:   o.createdAt.toISOString(),
    updatedAt:   o.updatedAt.toISOString(),
  };
}

function serializePayment(p: typeof schema.paymentsTable.$inferSelect) {
  return {
    ...p,
    amount:    Number(p.amount),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    paidAt:    p.paidAt?.toISOString() ?? null,
  };
}

export default router;
