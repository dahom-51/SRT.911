import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT ?? 3001);

// Validate required env vars on startup
const required = ["DATABASE_URL", "JWT_SECRET", "CORS_ORIGIN"];
const missing  = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`[STARTUP] Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT} (${process.env.NODE_ENV ?? "development"})`);
});

// Graceful shutdown
const shutdown = () => {
  console.log("[SERVER] Shutting down gracefully...");
  server.close(() => {
    console.log("[SERVER] Closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT",  shutdown);
