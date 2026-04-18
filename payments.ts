import { Router, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// ─── Tap Payments Helper ──────────────────────────────────────────────────────

const TAP_BASE = "https://api.tap.company/v2";

interface TapChargeResponse {
  id:          string;
  status:      string;
  transaction: { url: string };
  metadata:    { orderId?: number; orderNumber?: string };
  reference:   { transaction?: string };
  [key: string]: unknown;
}

async function tapRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<TapChargeResponse> {
  const res = await fetch(`${TAP_BASE}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${process.env.TAP_SECRET_KEY!}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as TapChargeResponse & { message?: string };
  if (!res.ok) {
    const err = new Error(data.message ?? "Tap Payments error") as Error & { statusCode: number };
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

const checkoutSchema = z.object({
  orderId:     z.number().int().positive(),
  redirectUrl: z.string().url(),
});

// POST /api/payments/checkout  — public
router.post("/payments/checkout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body as unknown);
    if (!parsed.success) {
      res.status(400).json({ error: "orderId and redirectUrl are required" });
      return;
    }
    const { orderId, redirectUrl } = parsed.data;

    const [row] = await db
      .select({ order: schema.ordersTable, customer: schema.customersTable })
      .from(schema.ordersTable)
      .leftJoin(schema.customersTable, eq(schema.ordersTable.customerId, schema.customersTable.id))
      .where(eq(schema.ordersTable.id, orderId));

    if (!row?.order) { res.status(404).json({ error: "Order not found" }); return; }
    const { order, customer } = row;

    if (order.status !== "pending") {
      res.status(400).json({ error: "Order is no longer in pending state" });
      return;
    }

    const nameParts = (customer?.name ?? "Customer").split(" ");
    const charge = await tapRequest("POST", "/charges", {
      amount:             Number(order.totalAmount),
      currency:           order.currency,
      customer_initiated: true,
      threeDSecure:       true,
      save_card:          false,
      description:        `Order ${order.orderNumber}`,
      metadata:           { orderId: order.id, orderNumber: order.orderNumber },
      reference:          { transaction: order.orderNumber, order: order.orderNumber },
      receipt:            { email: true, sms: true },
      customer: {
        first_name: nameParts[0],
        last_name:  nameParts.slice(1).join(" ") || "-",
        email:      customer?.email ?? "",
        phone: {
          country_code: "966",
          number:        (customer?.phone ?? "").replace(/^(\+966|966|0)/, ""),
        },
      },
      source:   { id: "src_all" },
      post:     { url: `${process.env.BACKEND_URL}/api/payments/webhook` },
      redirect: { url: redirectUrl },
    });

    await db.update(schema.paymentsTable)
      .set({ tapChargeId: charge.id, updatedAt: new Date() })
      .where(eq(schema.paymentsTable.orderId, orderId));

    res.json({ chargeId: charge.id, paymentUrl: charge.transaction?.url });
  } catch (err) { next(err); }
});

// POST /api/payments/webhook  — Tap callback (no auth — validated via metadata)
router.post("/payments/webhook", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const charge = req.body as TapChargeResponse;
    const orderNumber =
      charge.metadata?.orderNumber ?? charge.reference?.transaction;

    if (!orderNumber) { res.status(200).json({ received: true }); return; }

    const [order] = await db.select().from(schema.ordersTable)
      .where(eq(schema.ordersTable.orderNumber, orderNumber));

    if (!order) { res.status(200).json({ received: true }); return; }

    const isCaptured = charge.status === "CAPTURED";
    const isFailed   = ["FAILED", "DECLINED", "CANCELLED", "EXPIRED"].includes(charge.status);

    await db.update(schema.paymentsTable).set({
      status:          isCaptured ? "paid" : isFailed ? "failed" : "pending",
      tapChargeId:     charge.id,
      gatewayResponse: JSON.stringify(charge),
      paidAt:          isCaptured ? new Date() : null,
      updatedAt:       new Date(),
    }).where(eq(schema.paymentsTable.orderId, order.id));

    if (isCaptured) {
      await db.update(schema.ordersTable)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(schema.ordersTable.id, order.id));
    }

    res.status(200).json({ received: true });
  } catch (err) { next(err); }
});

// GET /api/payments/status/:orderId  — public (polling after redirect)
router.get("/payments/status/:orderId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params["orderId"]);
    if (isNaN(orderId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [payment] = await db.select().from(schema.paymentsTable)
      .where(eq(schema.paymentsTable.orderId, orderId));

    if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

    // Re-check with Tap if still pending
    if (payment.status === "pending" && payment.tapChargeId) {
      try {
        const charge = await tapRequest("GET", `/charges/${payment.tapChargeId}`);
        if (charge.status === "CAPTURED") {
          await db.update(schema.paymentsTable)
            .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
            .where(eq(schema.paymentsTable.id, payment.id));
          await db.update(schema.ordersTable)
            .set({ status: "confirmed", updatedAt: new Date() })
            .where(eq(schema.ordersTable.id, orderId));
          payment.status = "paid";
        }
      } catch { /* ignore Tap errors on status polling */ }
    }

    res.json({
      orderId,
      status:   payment.status,
      amount:   Number(payment.amount),
      currency: payment.currency,
      paidAt:   payment.paidAt?.toISOString() ?? null,
    });
  } catch (err) { next(err); }
});

// GET /api/payments  — admin only
router.get("/payments", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select({ payment: schema.paymentsTable, order: schema.ordersTable })
      .from(schema.paymentsTable)
      .leftJoin(schema.ordersTable, eq(schema.paymentsTable.orderId, schema.ordersTable.id))
      .orderBy(schema.paymentsTable.createdAt);

    res.json(rows.map(({ payment, order }) => ({
      ...payment,
      amount:    Number(payment.amount),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      paidAt:    payment.paidAt?.toISOString() ?? null,
      order:     order
        ? { id: order.id, orderNumber: order.orderNumber, status: order.status, totalAmount: Number(order.totalAmount) }
        : null,
    })));
  } catch (err) { next(err); }
});

export default router;
