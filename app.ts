import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes/index";
import { errorHandler, notFound } from "./middleware/error";

const app = express();

// ─── Trust Proxy (required for Railway/Render reverse proxies) ────────────────
app.set("trust proxy", 1);

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o: string) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials:    true,
}));

// ─── Rate Limiting — specific routes BEFORE general ──────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many login attempts, please try again later" },
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many checkout attempts, please try again later" },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      300,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests, please try again later" },
});

// Specific before general — order is critical
app.use("/api/auth/login",        authLimiter);
app.use("/api/payments/checkout", checkoutLimiter);
app.use("/api",                   generalLimiter);

// ─── Webhook: capture raw body BEFORE json middleware ────────────────────────
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req: Request, _res: Response, next: NextFunction) => {
    if (Buffer.isBuffer(req.body)) {
      try { req.body = JSON.parse(req.body.toString("utf8")) as unknown; }
      catch { req.body = {}; }
    }
    next();
  },
);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── 404 + Error (must be last) ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
