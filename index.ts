import { Router, type Request, type Response } from "express";
import authRouter       from "./auth";
import productsRouter   from "./products";
import categoriesRouter from "./categories";
import ordersRouter     from "./orders";
import paymentsRouter   from "./payments";

const router = Router();

router.get("/healthz", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" });
});

router.use(authRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(ordersRouter);
router.use(paymentsRouter);

export default router;
