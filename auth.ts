import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db";
import { signToken } from "../lib/jwt";
import { requireAdmin, type AuthRequest } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword:     z.string().min(8),
});

// POST /api/auth/login  — public
router.post("/auth/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body as unknown);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid email or password format" });
      return;
    }
    const { email, password } = parsed.data;

    const [admin] = await db.select().from(schema.adminsTable)
      .where(eq(schema.adminsTable.email, email.toLowerCase()));

    if (!admin) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({ adminId: admin.id, email: admin.email });
    res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch (err) { next(err); }
});

// GET /api/auth/me  — admin only
router.get("/auth/me", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const [admin] = await db
      .select({ id: schema.adminsTable.id, email: schema.adminsTable.email, name: schema.adminsTable.name })
      .from(schema.adminsTable)
      .where(eq(schema.adminsTable.id, authReq.admin!.adminId));

    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }
    res.json(admin);
  } catch (err) { next(err); }
});

// POST /api/auth/change-password  — admin only
router.post("/auth/change-password", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const parsed = changePasswordSchema.safeParse(req.body as unknown);
    if (!parsed.success) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }

    const [admin] = await db.select().from(schema.adminsTable)
      .where(eq(schema.adminsTable.id, authReq.admin!.adminId));

    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }

    const valid = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const hash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db.update(schema.adminsTable)
      .set({ passwordHash: hash })
      .where(eq(schema.adminsTable.id, authReq.admin!.adminId));

    res.json({ message: "Password updated successfully" });
  } catch (err) { next(err); }
});

export default router;
