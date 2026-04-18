import {
  pgTable, serial, text, numeric, boolean,
  timestamp, integer, pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum("order_status", [
  "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending", "paid", "failed", "refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "tap", "card", "cash_on_delivery",
]);

export const conditionEnum = pgEnum("product_condition", [
  "new", "used", "rare", "refurbished",
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const productsTable = pgTable("products", {
  id:            serial("id").primaryKey(),
  name:          text("name").notNull(),
  nameAr:        text("name_ar").notNull(),
  description:   text("description"),
  descriptionAr: text("description_ar"),
  price:         numeric("price", { precision: 10, scale: 2 }).notNull(),
  category:      text("category").notNull(),
  condition:     conditionEnum("condition").notNull().default("used"),
  imageUrl:      text("image_url"),
  inStock:       boolean("in_stock").notNull().default(true),
  isFeatured:    boolean("is_featured").notNull().default(false),
  stockQuantity: integer("stock_quantity").notNull().default(1),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export const adminsTable = pgTable("admins", {
  id:           serial("id").primaryKey(),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name:         text("name").notNull(),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const customersTable = pgTable("customers", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  email:     text("email").notNull(),
  phone:     text("phone").notNull(),
  address:   text("address"),
  city:      text("city"),
  country:   text("country").notNull().default("SA"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ordersTable = pgTable("orders", {
  id:              serial("id").primaryKey(),
  orderNumber:     text("order_number").notNull().unique(),
  customerId:      integer("customer_id").notNull().references(() => customersTable.id),
  status:          orderStatusEnum("status").notNull().default("pending"),
  totalAmount:     numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency:        text("currency").notNull().default("SAR"),
  notes:           text("notes"),
  shippingAddress: text("shipping_address"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id:         serial("id").primaryKey(),
  orderId:    integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId:  integer("product_id").notNull().references(() => productsTable.id),
  quantity:   integer("quantity").notNull().default(1),
  unitPrice:  numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const paymentsTable = pgTable("payments", {
  id:              serial("id").primaryKey(),
  orderId:         integer("order_id").notNull().references(() => ordersTable.id),
  method:          paymentMethodEnum("method").notNull(),
  status:          paymentStatusEnum("status").notNull().default("pending"),
  amount:          numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency:        text("currency").notNull().default("SAR"),
  tapChargeId:     text("tap_charge_id"),
  tapReference:    text("tap_reference"),
  gatewayResponse: text("gateway_response"),
  paidAt:          timestamp("paid_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const customersRelations = relations(customersTable, ({ many }) => ({
  orders: many(ordersTable),
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields:     [ordersTable.customerId],
    references: [customersTable.id],
  }),
  items:    many(orderItemsTable),
  payments: many(paymentsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order:   one(ordersTable,   { fields: [orderItemsTable.orderId],   references: [ordersTable.id] }),
  product: one(productsTable, { fields: [orderItemsTable.productId], references: [productsTable.id] }),
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  order: one(ordersTable, { fields: [paymentsTable.orderId], references: [ordersTable.id] }),
}));

// ─── Insert Schemas ───────────────────────────────────────────────────────────

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
  id: true, createdAt: true,
});

export const createOrderSchema = z.object({
  customer: z.object({
    name:    z.string().min(2),
    email:   z.string().email(),
    phone:   z.string().min(9),
    address: z.string().optional(),
    city:    z.string().optional(),
  }),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity:  z.number().int().positive(),
  })).min(1),
  notes:           z.string().optional(),
  shippingAddress: z.string().optional(),
  paymentMethod:   z.enum(["tap", "card", "cash_on_delivery"]),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Product     = typeof productsTable.$inferSelect;
export type Customer    = typeof customersTable.$inferSelect;
export type Order       = typeof ordersTable.$inferSelect;
export type OrderItem   = typeof orderItemsTable.$inferSelect;
export type Payment     = typeof paymentsTable.$inferSelect;
export type Admin       = typeof adminsTable.$inferSelect;
export type CreateOrder = z.infer<typeof createOrderSchema>;
