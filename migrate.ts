import "dotenv/config";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("[MIGRATE] Starting migration...");

    await client.query(`
      CREATE TYPE IF NOT EXISTS order_status AS ENUM (
        'pending','confirmed','processing','shipped','delivered','cancelled','refunded'
      );
      CREATE TYPE IF NOT EXISTS payment_status AS ENUM (
        'pending','paid','failed','refunded'
      );
      CREATE TYPE IF NOT EXISTS payment_method AS ENUM (
        'tap','card','cash_on_delivery'
      );
      CREATE TYPE IF NOT EXISTS product_condition AS ENUM (
        'new','used','rare','refurbished'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id               SERIAL PRIMARY KEY,
        name             TEXT NOT NULL,
        name_ar          TEXT NOT NULL,
        description      TEXT,
        description_ar   TEXT,
        price            NUMERIC(10,2) NOT NULL,
        category         TEXT NOT NULL,
        condition        product_condition NOT NULL DEFAULT 'used',
        image_url        TEXT,
        in_stock         BOOLEAN NOT NULL DEFAULT true,
        is_featured      BOOLEAN NOT NULL DEFAULT false,
        stock_quantity   INTEGER NOT NULL DEFAULT 1,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id            SERIAL PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name          TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL,
        phone      TEXT NOT NULL,
        address    TEXT,
        city       TEXT,
        country    TEXT NOT NULL DEFAULT 'SA',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id               SERIAL PRIMARY KEY,
        order_number     TEXT NOT NULL UNIQUE,
        customer_id      INTEGER NOT NULL REFERENCES customers(id),
        status           order_status NOT NULL DEFAULT 'pending',
        total_amount     NUMERIC(10,2) NOT NULL,
        currency         TEXT NOT NULL DEFAULT 'SAR',
        notes            TEXT,
        shipping_address TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id          SERIAL PRIMARY KEY,
        order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id  INTEGER NOT NULL REFERENCES products(id),
        quantity    INTEGER NOT NULL DEFAULT 1,
        unit_price  NUMERIC(10,2) NOT NULL,
        total_price NUMERIC(10,2) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id               SERIAL PRIMARY KEY,
        order_id         INTEGER NOT NULL REFERENCES orders(id),
        method           payment_method NOT NULL,
        status           payment_status NOT NULL DEFAULT 'pending',
        amount           NUMERIC(10,2) NOT NULL,
        currency         TEXT NOT NULL DEFAULT 'SAR',
        tap_charge_id    TEXT,
        tap_reference    TEXT,
        gateway_response TEXT,
        paid_at          TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_in_stock  ON products(in_stock);
      CREATE INDEX IF NOT EXISTS idx_orders_customer    ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_payments_order     ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status    ON payments(status);
    `);

    // Seed default admin (only if none exists)
    const { rows } = await client.query("SELECT id FROM admins LIMIT 1");
    if (rows.length === 0) {
      const email    = process.env.ADMIN_EMAIL    ?? "admin@store.com";
      const password = process.env.ADMIN_PASSWORD ?? "Admin@12345";
      const hash     = await bcrypt.hash(password, 12);
      await client.query(
        "INSERT INTO admins (email, password_hash, name) VALUES ($1, $2, $3)",
        [email, hash, "Admin"]
      );
      console.log(`[MIGRATE] ✅ Admin created: ${email} / ${password}`);
      console.log("[MIGRATE] ⚠️  Change the password immediately after first login!");
    }

    console.log("[MIGRATE] ✅ Migration complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error("[MIGRATE] ❌ Failed:", err);
  process.exit(1);
});
