import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "orders.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL DEFAULT '',
        customer_phone TEXT NOT NULL DEFAULT '',
        customer_address TEXT NOT NULL,
        customer_lat REAL,
        customer_lng REAL,
        address_notes TEXT,
        distance_km REAL NOT NULL,
        delivery_fee INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        total INTEGER NOT NULL,
        payment_id TEXT,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        order_status TEXT NOT NULL DEFAULT 'pending_payment',
        qr_string TEXT,
        notes TEXT,
        unique_code INTEGER NOT NULL DEFAULT 0,
        qris_fee INTEGER NOT NULL DEFAULT 0,
        voucher_id TEXT,
        voucher_discount INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        expires_at TEXT,
        paid_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        price INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_out_of_stock INTEGER NOT NULL DEFAULT 0,
        max_order_qty INTEGER NOT NULL DEFAULT 0,
        hpp INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS store_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        store_mode TEXT NOT NULL DEFAULT 'open',
        info_message TEXT NOT NULL DEFAULT '',
        maintenance_message TEXT NOT NULL DEFAULT 'Sedang dalam perbaikan. Silakan kembali nanti.',
        qris_enabled INTEGER NOT NULL DEFAULT 1,
        qris_fee_mode TEXT NOT NULL DEFAULT 'admin',
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS store_hours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week INTEGER NOT NULL,
        open_time TEXT NOT NULL DEFAULT '08:00',
        close_time TEXT NOT NULL DEFAULT '22:00',
        is_open INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS vouchers (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        discount_type TEXT NOT NULL,
        discount_value INTEGER NOT NULL,
        max_discount INTEGER,
        min_order INTEGER NOT NULL DEFAULT 0,
        quota INTEGER NOT NULL,
        used_count INTEGER NOT NULL DEFAULT 0,
        valid_from TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL REFERENCES orders(id),
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL REFERENCES orders(id),
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS hero_slides (
        id TEXT PRIMARY KEY,
        image TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        subtitle TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS product_addons (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS order_item_addons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_item_id INTEGER NOT NULL,
        addon_name TEXT NOT NULL,
        addon_price INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS partners (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        logo_url TEXT NOT NULL DEFAULT '',
        link_url TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
      CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, sort_order);
      CREATE INDEX IF NOT EXISTS idx_chat_order ON chat_messages(order_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_addons_product ON product_addons(product_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_order_item_addons ON order_item_addons(order_item_id);
    `);

    // Migration: add columns to existing tables if they don't exist
    try { db.exec("ALTER TABLE orders ADD COLUMN voucher_id TEXT"); } catch { /* already exists */ }
    try { db.exec("ALTER TABLE orders ADD COLUMN voucher_discount INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
    try { db.exec("ALTER TABLE products ADD COLUMN hpp INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
    try { db.exec("ALTER TABLE products ADD COLUMN promo_price INTEGER"); } catch { /* already exists */ }
    try { db.exec("ALTER TABLE products ADD COLUMN promo_end_date TEXT"); } catch { /* already exists */ }

    seedDefaultProducts();
    seedDefaultStoreSettings();
    seedDefaultHeroSlides();
  }
  return db;
}

export interface OrderRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat: number | null;
  customer_lng: number | null;
  address_notes: string | null;
  distance_km: number;
  delivery_fee: number;
  subtotal: number;
  total: number;
  payment_id: string | null;
  payment_status: string;
  order_status: string;
  qr_string: string | null;
  notes: string | null;
  unique_code: number;
  qris_fee: number;
  voucher_id: string | null;
  voucher_discount: number;
  created_at: string;
  expires_at: string | null;
  paid_at: string | null;
  updated_at: string;
}

export interface OrderItemRow {
  id: number;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  notes: string | null;
}

export function createOrder(
  order: Omit<OrderRow, "created_at" | "updated_at" | "paid_at">,
  items: Omit<OrderItemRow, "id">[]
): OrderRow & { items: (OrderItemRow & { addons: OrderItemAddonRow[] })[] } {
  const db = getDb();

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, customer_name, customer_phone, customer_address, customer_lat, customer_lng, address_notes, distance_km, delivery_fee, subtotal, total, payment_id, payment_status, order_status, qr_string, notes, unique_code, qris_fee, voucher_id, voucher_discount, expires_at)
    VALUES (@id, @customer_name, @customer_phone, @customer_address, @customer_lat, @customer_lng, @address_notes, @distance_km, @delivery_fee, @subtotal, @total, @payment_id, @payment_status, @order_status, @qr_string, @notes, @unique_code, @qris_fee, @voucher_id, @voucher_discount, @expires_at)
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, price, quantity, notes)
    VALUES (@order_id, @product_id, @product_name, @price, @quantity, @notes)
  `);

  const transaction = db.transaction(() => {
    insertOrder.run(order);
    for (const item of items) {
      insertItem.run(item);
    }
  });

  transaction();

  return getOrder(order.id)!;
}

export function getOrder(id: string): (OrderRow & { items: (OrderItemRow & { addons: OrderItemAddonRow[] })[] }) | null {
  const db = getDb();
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as
    | OrderRow
    | undefined;
  if (!order) return null;

  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(id) as OrderItemRow[];

  const itemIds = items.map((i) => i.id);
  const allAddons = itemIds.length > 0 ? getOrderItemAddons(itemIds) : [];

  const itemsWithAddons = items.map((item) => ({
    ...item,
    addons: allAddons.filter((a) => a.order_item_id === item.id),
  }));

  return { ...order, items: itemsWithAddons };
}

export function updateOrderPayment(
  orderId: string,
  paymentId: string,
  qrString: string,
  expiresAt: string
): void {
  const db = getDb();
  db.prepare(
    `UPDATE orders SET payment_id = ?, qr_string = ?, expires_at = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`
  ).run(paymentId, qrString, expiresAt, orderId);
}

export function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: string,
  orderStatus?: string
): void {
  const db = getDb();
  if (orderStatus) {
    db.prepare(
      `UPDATE orders SET payment_status = ?, order_status = ?, paid_at = CASE WHEN ? = 'success' THEN datetime('now', 'localtime') ELSE paid_at END, updated_at = datetime('now', 'localtime') WHERE id = ?`
    ).run(paymentStatus, orderStatus, paymentStatus, orderId);
  } else {
    db.prepare(
      `UPDATE orders SET payment_status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`
    ).run(paymentStatus, orderId);
  }
}

export function updateOrderStatus(orderId: string, status: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE orders SET order_status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`
  ).run(status, orderId);
}

export function getActiveOrdersCount(): number {
  const db = getDb();
  const result = db
    .prepare(
      "SELECT COUNT(*) as count FROM orders WHERE order_status IN ('confirmed', 'preparing')"
    )
    .get() as { count: number };
  return result.count;
}

export function getOrderQueue(orderId: string): number {
  const db = getDb();
  const result = db
    .prepare(
      `SELECT COUNT(*) as position FROM orders 
       WHERE order_status IN ('confirmed', 'preparing') 
       AND created_at < (SELECT created_at FROM orders WHERE id = ?)
       AND id != ?`
    )
    .get(orderId, orderId) as { position: number };
  return result.position;
}

// ─── Products ────────────────────────────────────────────────────────

export interface ProductRow {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  is_active: number;
  sort_order: number;
  is_out_of_stock: number;
  max_order_qty: number;
  hpp: number;
  promo_price: number | null;
  promo_end_date: string | null;
  created_at: string;
}

export function getActiveProducts(): ProductRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC")
    .all() as ProductRow[];
}

export function getAllProducts(): ProductRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM products ORDER BY sort_order ASC, created_at ASC")
    .all() as ProductRow[];
}

export function getProduct(id: string): ProductRow | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as ProductRow | undefined;
  return row ?? null;
}

export function createProduct(product: {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  sort_order?: number;
  is_out_of_stock?: number;
  max_order_qty?: number;
  hpp?: number;
}): ProductRow {
  const db = getDb();
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM products")
    .get() as { max_order: number };

  db.prepare(
    `INSERT INTO products (id, name, price, description, image, sort_order, is_out_of_stock, max_order_qty, hpp)
     VALUES (@id, @name, @price, @description, @image, @sort_order, @is_out_of_stock, @max_order_qty, @hpp)`
  ).run({
    ...product,
    sort_order: product.sort_order ?? maxOrder.max_order + 1,
    is_out_of_stock: product.is_out_of_stock ?? 0,
    max_order_qty: product.max_order_qty ?? 0,
    hpp: product.hpp ?? 0,
  });

  return getProduct(product.id)!;
}

export function updateProduct(
  id: string,
  fields: Partial<Pick<ProductRow, "name" | "price" | "description" | "image" | "is_active" | "sort_order" | "is_out_of_stock" | "max_order_qty" | "hpp" | "promo_price" | "promo_end_date">>
): ProductRow | null {
  const db = getDb();
  const existing = getProduct(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = @${key}`);
      values[key] = value;
    }
  }

  if (updates.length === 0) return existing;

  db.prepare(`UPDATE products SET ${updates.join(", ")} WHERE id = @id`).run(values);
  return getProduct(id);
}

export function deleteProduct(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
  return result.changes > 0;
}

function seedDefaultProducts(): void {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
  if (count.count > 0) return;

  const insert = db.prepare(
    `INSERT INTO products (id, name, price, description, image, sort_order)
     VALUES (@id, @name, @price, @description, @image, @sort_order)`
  );

  const transaction = db.transaction(() => {
    insert.run({
      id: "grilled-chicken-salad",
      name: "Grilled Chicken Salad",
      price: 20000,
      description: "Fresh mixed greens topped with tender grilled chicken breast, cherry tomatoes, and our signature dressing.",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80",
      sort_order: 1,
    });
    insert.run({
      id: "grilled-chicken-kebab",
      name: "Grilled Chicken Kebab",
      price: 16000,
      description: "Juicy grilled chicken skewers wrapped in warm flatbread with fresh vegetables and garlic sauce.",
      image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&h=400&fit=crop&q=80",
      sort_order: 2,
    });
  });

  transaction();
}

// ─── Orders (admin) ──────────────────────────────────────────────────

export function getAllOrders(): (OrderRow & { items: OrderItemRow[] })[] {
  const db = getDb();
  const orders = db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC")
    .all() as OrderRow[];

  return orders.map((order) => {
    const items = db
      .prepare("SELECT * FROM order_items WHERE order_id = ?")
      .all(order.id) as OrderItemRow[];
    return { ...order, items };
  });
}

export function getOrdersPaginated(options: {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
  paymentStatus?: string;
}): { orders: (OrderRow & { items: OrderItemRow[] })[]; total: number } {
  const db = getDb();
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.status) {
    conditions.push("order_status = ?");
    params.push(options.status);
  }
  if (options.paymentStatus && options.paymentStatus !== "all") {
    conditions.push("payment_status = ?");
    params.push(options.paymentStatus);
  }
  if (options.from) {
    conditions.push("created_at >= ?");
    params.push(options.from + " 00:00:00");
  }
  if (options.to) {
    conditions.push("created_at <= ?");
    params.push(options.to + " 23:59:59");
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countResult = db.prepare(`SELECT COUNT(*) as count FROM orders ${where}`).get(...params) as { count: number };

  const orders = db
    .prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as OrderRow[];

  const ordersWithItems = orders.map((order) => {
    const items = db
      .prepare("SELECT * FROM order_items WHERE order_id = ?")
      .all(order.id) as OrderItemRow[];
    return { ...order, items };
  });

  return { orders: ordersWithItems, total: countResult.count };
}

// ─── QRIS Info ───────────────────────────────────────────────────────

export function updateOrderQrisInfo(
  orderId: string,
  uniqueCode: number,
  qrisFee: number
): void {
  const db = getDb();
  db.prepare(
    `UPDATE orders SET unique_code = ?, qris_fee = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`
  ).run(uniqueCode, qrisFee, orderId);
}

// ─── Store Settings ──────────────────────────────────────────────────

export interface StoreSettingsRow {
  id: number;
  store_mode: string;
  info_message: string;
  maintenance_message: string;
  qris_enabled: number;
  qris_fee_mode: string;
  updated_at: string;
}

export interface StoreHoursRow {
  id: number;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: number;
}

function seedDefaultStoreSettings(): void {
  const db = getDb();
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM store_settings").get() as { count: number };
  if (settingsCount.count === 0) {
    db.prepare(
      `INSERT INTO store_settings (id, store_mode, info_message, maintenance_message, qris_enabled, qris_fee_mode)
       VALUES (1, 'open', '', 'Sedang dalam perbaikan. Silakan kembali nanti.', 1, 'admin')`
    ).run();
  }

  const hoursCount = db.prepare("SELECT COUNT(*) as count FROM store_hours").get() as { count: number };
  if (hoursCount.count === 0) {
    const insert = db.prepare(
      `INSERT INTO store_hours (day_of_week, open_time, close_time, is_open) VALUES (?, ?, ?, ?)`
    );
    const transaction = db.transaction(() => {
      // 0=Sunday, 1=Monday, ..., 6=Saturday
      for (let day = 0; day < 7; day++) {
        const isOpen = day === 0 ? 0 : 1; // Sunday closed
        insert.run(day, "08:00", "22:00", isOpen);
      }
    });
    transaction();
  }
}

export function getStoreSettings(): StoreSettingsRow {
  const db = getDb();
  return db.prepare("SELECT * FROM store_settings WHERE id = 1").get() as StoreSettingsRow;
}

export function updateStoreSettings(data: {
  store_mode?: string;
  info_message?: string;
  maintenance_message?: string;
  qris_enabled?: number;
  qris_fee_mode?: string;
}): StoreSettingsRow {
  const db = getDb();
  const updates: string[] = [];
  const values: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      updates.push(`${key} = @${key}`);
      values[key] = value;
    }
  }

  if (updates.length > 0) {
    updates.push(`updated_at = datetime('now', 'localtime')`);
    db.prepare(`UPDATE store_settings SET ${updates.join(", ")} WHERE id = 1`).run(values);
  }

  return getStoreSettings();
}

export function getStoreHours(): StoreHoursRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM store_hours ORDER BY day_of_week ASC").all() as StoreHoursRow[];
}

export function updateStoreHours(
  hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isOpen: number }>
): StoreHoursRow[] {
  const db = getDb();
  const update = db.prepare(
    `UPDATE store_hours SET open_time = ?, close_time = ?, is_open = ? WHERE day_of_week = ?`
  );
  const transaction = db.transaction(() => {
    for (const h of hours) {
      update.run(h.openTime, h.closeTime, h.isOpen, h.dayOfWeek);
    }
  });
  transaction();
  return getStoreHours();
}

export function isStoreOpen(): { isOpen: boolean; reason?: string } {
  const settings = getStoreSettings();

  if (settings.store_mode === "maintenance") {
    return { isOpen: false, reason: "maintenance" };
  }
  if (settings.store_mode === "closed") {
    return { isOpen: false, reason: "closed" };
  }
  if (settings.store_mode === "force_open") {
    return { isOpen: true };
  }

  // mode = 'open' → check schedule
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday
  const hours = getStoreHours();
  const todayHours = hours.find((h) => h.day_of_week === dayOfWeek);

  if (!todayHours || !todayHours.is_open) {
    return { isOpen: false, reason: "day_closed" };
  }

  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (currentTime < todayHours.open_time || currentTime >= todayHours.close_time) {
    return { isOpen: false, reason: "outside_hours" };
  }

  return { isOpen: true };
}

// ─── Revenue ─────────────────────────────────────────────────────────

export function getRevenueStats(from?: string, to?: string): {
  grossRevenue: number;
  totalHpp: number;
  netRevenue: number;
  orderCount: number;
} {
  const db = getDb();
  const conditions: string[] = ["o.order_status = 'delivered'"];
  const params: unknown[] = [];

  if (from) {
    conditions.push("o.created_at >= ?");
    params.push(from + " 00:00:00");
  }
  if (to) {
    conditions.push("o.created_at <= ?");
    params.push(to + " 23:59:59");
  }

  const where = conditions.join(" AND ");

  // Gross revenue = sum of subtotals (excluding delivery fee)
  const revenueResult = db.prepare(`
    SELECT COALESCE(SUM(o.subtotal), 0) as grossRevenue, COUNT(*) as orderCount
    FROM orders o WHERE ${where}
  `).get(...params) as { grossRevenue: number; orderCount: number };

  // Total HPP = sum of (item qty * product hpp) for delivered orders
  const hppResult = db.prepare(`
    SELECT COALESCE(SUM(oi.quantity * COALESCE(p.hpp, 0)), 0) as totalHpp
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE ${where}
  `).get(...params) as { totalHpp: number };

  return {
    grossRevenue: revenueResult.grossRevenue,
    totalHpp: hppResult.totalHpp,
    netRevenue: revenueResult.grossRevenue - hppResult.totalHpp,
    orderCount: revenueResult.orderCount,
  };
}

export function getRevenueByPeriod(
  period: "daily" | "weekly" | "monthly",
  from?: string,
  to?: string
): { date: string; gross: number; net: number }[] {
  const db = getDb();
  const conditions: string[] = ["o.order_status = 'delivered'"];
  const params: unknown[] = [];

  if (from) {
    conditions.push("o.created_at >= ?");
    params.push(from + " 00:00:00");
  }
  if (to) {
    conditions.push("o.created_at <= ?");
    params.push(to + " 23:59:59");
  }

  const where = conditions.join(" AND ");

  let dateExpr: string;
  switch (period) {
    case "daily":
      dateExpr = "date(o.created_at)";
      break;
    case "weekly":
      dateExpr = "date(o.created_at, 'weekday 0', '-6 days')";
      break;
    case "monthly":
      dateExpr = "strftime('%Y-%m', o.created_at)";
      break;
  }

  const rows = db.prepare(`
    SELECT
      ${dateExpr} as date,
      SUM(o.subtotal) as gross,
      SUM(o.subtotal) - COALESCE((
        SELECT SUM(oi2.quantity * COALESCE(p2.hpp, 0))
        FROM order_items oi2
        LEFT JOIN products p2 ON p2.id = oi2.product_id
        WHERE oi2.order_id = o.id
      ), 0) as net
    FROM orders o
    WHERE ${where}
    GROUP BY ${dateExpr}
    ORDER BY date ASC
  `).all(...params) as { date: string; gross: number; net: number }[];

  // The correlated subquery above calculates per-order, but we need per-group.
  // Let's use a simpler approach with a join.
  const rows2 = db.prepare(`
    SELECT
      ${dateExpr} as date,
      SUM(o.subtotal) as gross
    FROM orders o
    WHERE ${where}
    GROUP BY ${dateExpr}
    ORDER BY date ASC
  `).all(...params) as { date: string; gross: number }[];

  // Get HPP per period
  const hppRows = db.prepare(`
    SELECT
      ${dateExpr} as date,
      SUM(oi.quantity * COALESCE(p.hpp, 0)) as hpp
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE ${where}
    GROUP BY ${dateExpr}
    ORDER BY date ASC
  `).all(...params) as { date: string; hpp: number }[];

  const hppMap = new Map(hppRows.map((r) => [r.date, r.hpp]));

  return rows2.map((r) => ({
    date: r.date,
    gross: r.gross,
    net: r.gross - (hppMap.get(r.date) || 0),
  }));
}

// ─── Vouchers ────────────────────────────────────────────────────────

export interface VoucherRow {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  min_order: number;
  quota: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: number;
  created_at: string;
}

export function getAllVouchers(): VoucherRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM vouchers ORDER BY created_at DESC").all() as VoucherRow[];
}

export function getVoucher(id: string): VoucherRow | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM vouchers WHERE id = ?").get(id) as VoucherRow | undefined;
  return row ?? null;
}

export function getVoucherByCode(code: string): VoucherRow | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM vouchers WHERE code = ?").get(code.toUpperCase()) as VoucherRow | undefined;
  return row ?? null;
}

export function createVoucher(data: {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount?: number | null;
  min_order: number;
  quota: number;
  valid_from: string;
  valid_until: string;
}): VoucherRow {
  const db = getDb();
  db.prepare(`
    INSERT INTO vouchers (id, code, discount_type, discount_value, max_discount, min_order, quota, valid_from, valid_until)
    VALUES (@id, @code, @discount_type, @discount_value, @max_discount, @min_order, @quota, @valid_from, @valid_until)
  `).run({
    ...data,
    code: data.code.toUpperCase(),
    max_discount: data.max_discount ?? null,
  });
  return getVoucher(data.id)!;
}

export function updateVoucher(
  id: string,
  fields: Partial<Pick<VoucherRow, "code" | "discount_type" | "discount_value" | "max_discount" | "min_order" | "quota" | "valid_from" | "valid_until" | "is_active">>
): VoucherRow | null {
  const db = getDb();
  const existing = getVoucher(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = @${key}`);
      values[key] = key === "code" && typeof value === "string" ? value.toUpperCase() : value;
    }
  }

  if (updates.length === 0) return existing;

  db.prepare(`UPDATE vouchers SET ${updates.join(", ")} WHERE id = @id`).run(values);
  return getVoucher(id);
}

export function deleteVoucher(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM vouchers WHERE id = ?").run(id);
  return result.changes > 0;
}

export function validateVoucher(
  code: string,
  orderTotal: number
): { valid: boolean; voucher?: VoucherRow; discount?: number; error?: string } {
  const voucher = getVoucherByCode(code);
  if (!voucher) {
    return { valid: false, error: "Kode voucher tidak ditemukan" };
  }
  if (!voucher.is_active) {
    return { valid: false, error: "Voucher tidak aktif" };
  }

  const now = new Date();
  const nowStr = now.toISOString().slice(0, 19).replace("T", " ");
  // Compare using local date strings
  const nowDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (nowDate < voucher.valid_from.slice(0, 10)) {
    return { valid: false, error: "Voucher belum berlaku" };
  }
  if (nowDate > voucher.valid_until.slice(0, 10)) {
    return { valid: false, error: "Voucher sudah kedaluwarsa" };
  }
  if (voucher.used_count >= voucher.quota) {
    return { valid: false, error: "Kuota voucher sudah habis" };
  }
  if (orderTotal < voucher.min_order) {
    return { valid: false, error: `Minimum pembelian Rp ${voucher.min_order.toLocaleString("id-ID")}` };
  }

  // Calculate discount
  let discount: number;
  if (voucher.discount_type === "percentage") {
    discount = Math.floor(orderTotal * voucher.discount_value / 100);
    if (voucher.max_discount && discount > voucher.max_discount) {
      discount = voucher.max_discount;
    }
  } else {
    // fixed
    discount = voucher.discount_value;
  }

  // Don't let discount exceed order total
  if (discount > orderTotal) {
    discount = orderTotal;
  }

  // 0 discount = invalid
  if (discount <= 0) {
    return { valid: false, error: "Kode voucher tidak valid untuk pesanan ini" };
  }

  return { valid: true, voucher, discount };
}

export function applyVoucher(voucherId: string): void {
  const db = getDb();
  db.prepare("UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?").run(voucherId);
}

// ─── Chat Messages ───────────────────────────────────────────────────

export interface ChatMessageRow {
  id: number;
  order_id: string;
  sender: string;
  message: string;
  created_at: string;
}

export function getChatMessages(orderId: string, afterId?: number): ChatMessageRow[] {
  const db = getDb();
  if (afterId) {
    return db
      .prepare("SELECT * FROM chat_messages WHERE order_id = ? AND id > ? ORDER BY created_at ASC")
      .all(orderId, afterId) as ChatMessageRow[];
  }
  return db
    .prepare("SELECT * FROM chat_messages WHERE order_id = ? ORDER BY created_at ASC")
    .all(orderId) as ChatMessageRow[];
}

export function createChatMessage(orderId: string, sender: string, message: string): ChatMessageRow {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO chat_messages (order_id, sender, message) VALUES (?, ?, ?)"
  ).run(orderId, sender, message);
  return db.prepare("SELECT * FROM chat_messages WHERE id = ?").get(result.lastInsertRowid) as ChatMessageRow;
}

export function getUnreadChatCount(orderId: string, sender: string): number {
  const db = getDb();
  // Count messages from the opposite sender
  const oppositeSender = sender === "admin" ? "user" : "admin";
  const result = db.prepare(
    "SELECT COUNT(*) as count FROM chat_messages WHERE order_id = ? AND sender = ?"
  ).get(orderId, oppositeSender) as { count: number };
  return result.count;
}

// ─── Reviews ─────────────────────────────────────────────────────────

export interface ReviewRow {
  id: number;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export function createReview(orderId: string, rating: number, comment?: string): ReviewRow {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO reviews (order_id, rating, comment) VALUES (?, ?, ?)"
  ).run(orderId, rating, comment ?? null);
  return db.prepare("SELECT * FROM reviews WHERE id = ?").get(result.lastInsertRowid) as ReviewRow;
}

export function getReview(orderId: string): ReviewRow | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM reviews WHERE order_id = ?").get(orderId) as ReviewRow | undefined;
  return row ?? null;
}

export function getAverageRating(): number {
  const db = getDb();
  const result = db.prepare("SELECT COALESCE(AVG(rating), 0) as avg FROM reviews").get() as { avg: number };
  return Math.round(result.avg * 10) / 10;
}

export function getRecentReviews(limit: number = 10): (ReviewRow & { customer_name: string })[] {
  const db = getDb();
  return db.prepare(`
    SELECT r.*, o.customer_name
    FROM reviews r
    JOIN orders o ON o.id = r.order_id
    ORDER BY r.created_at DESC
    LIMIT ?
  `).all(limit) as (ReviewRow & { customer_name: string })[];
}

// ─── Feedback ────────────────────────────────────────────────────────

export interface FeedbackRow {
  id: number;
  subject: string;
  email: string;
  message: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function createFeedback(data: {
  subject: string;
  email: string;
  message: string;
  ip_address?: string | null;
  user_agent?: string | null;
}): FeedbackRow {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO feedback (subject, email, message, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)"
  ).run(data.subject, data.email, data.message, data.ip_address ?? null, data.user_agent ?? null);
  return db.prepare("SELECT * FROM feedback WHERE id = ?").get(result.lastInsertRowid) as FeedbackRow;
}

export function getAllFeedback(page: number = 1, limit: number = 20): { feedback: FeedbackRow[]; total: number } {
  const db = getDb();
  const offset = (page - 1) * limit;
  const countResult = db.prepare("SELECT COUNT(*) as count FROM feedback").get() as { count: number };
  const rows = db.prepare("SELECT * FROM feedback ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset) as FeedbackRow[];
  return { feedback: rows, total: countResult.count };
}

export function getFeedbackRateLimit(ip: string, hours: number = 1): number {
  const db = getDb();
  const result = db.prepare(
    "SELECT COUNT(*) as count FROM feedback WHERE ip_address = ? AND created_at >= datetime('now', 'localtime', ?)"
  ).get(ip, `-${hours} hours`) as { count: number };
  return result.count;
}

// ─── Product Promo Helper ────────────────────────────────────────────

export function getEffectivePrice(product: ProductRow): number {
  if (
    product.promo_price != null &&
    product.promo_end_date != null
  ) {
    const now = new Date();
    const end = new Date(product.promo_end_date);
    if (end > now) {
      return product.promo_price;
    }
  }
  return product.price;
}

// ─── Hero Slides ─────────────────────────────────────────────────────

export interface HeroSlideRow {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  sort_order: number;
  is_active: number;
  created_at: string;
}

function seedDefaultHeroSlides(): void {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as count FROM hero_slides").get() as { count: number };
  if (count.count > 0) return;

  const insert = db.prepare(
    `INSERT INTO hero_slides (id, image, title, subtitle, sort_order)
     VALUES (@id, @image, @title, @subtitle, @sort_order)`
  );

  const transaction = db.transaction(() => {
    insert.run({
      id: "slide-default-1",
      title: "Elite Performance Fuel",
      subtitle: "Curated Nutrition for Champions",
      image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&h=400&fit=crop&q=80",
      sort_order: 1,
    });
    insert.run({
      id: "slide-default-2",
      title: "Fresh & Healthy",
      subtitle: "Good Food, Good Mood",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=400&fit=crop&q=80",
      sort_order: 2,
    });
  });

  transaction();
}

export function getActiveHeroSlides(): HeroSlideRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM hero_slides WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC")
    .all() as HeroSlideRow[];
}

export function getAllHeroSlides(): HeroSlideRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM hero_slides ORDER BY sort_order ASC, created_at ASC")
    .all() as HeroSlideRow[];
}

export function createHeroSlide(slide: {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  sort_order?: number;
}): HeroSlideRow {
  const db = getDb();
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM hero_slides")
    .get() as { max_order: number };

  db.prepare(
    `INSERT INTO hero_slides (id, image, title, subtitle, sort_order)
     VALUES (@id, @image, @title, @subtitle, @sort_order)`
  ).run({
    ...slide,
    sort_order: slide.sort_order ?? maxOrder.max_order + 1,
  });

  return db.prepare("SELECT * FROM hero_slides WHERE id = ?").get(slide.id) as HeroSlideRow;
}

export function updateHeroSlide(
  id: string,
  fields: Partial<Pick<HeroSlideRow, "image" | "title" | "subtitle" | "sort_order" | "is_active">>
): HeroSlideRow | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM hero_slides WHERE id = ?").get(id) as HeroSlideRow | undefined;
  if (!existing) return null;

  const updates: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = @${key}`);
      values[key] = value;
    }
  }

  if (updates.length === 0) return existing;

  db.prepare(`UPDATE hero_slides SET ${updates.join(", ")} WHERE id = @id`).run(values);
  return db.prepare("SELECT * FROM hero_slides WHERE id = ?").get(id) as HeroSlideRow;
}

export function deleteHeroSlide(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM hero_slides WHERE id = ?").run(id);
  return result.changes > 0;
}

// ─── Product Add-ons ─────────────────────────────────────────────────

export interface ProductAddonRow {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_active: number;
  sort_order: number;
  created_at: string;
}

export function getAddonsForProduct(productId: string): ProductAddonRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM product_addons WHERE product_id = ? AND is_active = 1 ORDER BY sort_order ASC, created_at ASC")
    .all(productId) as ProductAddonRow[];
}

export function getAllAddons(): ProductAddonRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM product_addons ORDER BY product_id, sort_order ASC, created_at ASC")
    .all() as ProductAddonRow[];
}

export function getAddon(id: string): ProductAddonRow | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM product_addons WHERE id = ?").get(id) as ProductAddonRow | undefined;
  return row ?? null;
}

export function createAddon(addon: {
  id: string;
  product_id: string;
  name: string;
  price: number;
  sort_order?: number;
}): ProductAddonRow {
  const db = getDb();
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM product_addons WHERE product_id = ?")
    .get(addon.product_id) as { max_order: number };

  db.prepare(
    `INSERT INTO product_addons (id, product_id, name, price, sort_order)
     VALUES (@id, @product_id, @name, @price, @sort_order)`
  ).run({
    ...addon,
    sort_order: addon.sort_order ?? maxOrder.max_order + 1,
  });

  return db.prepare("SELECT * FROM product_addons WHERE id = ?").get(addon.id) as ProductAddonRow;
}

export function updateAddon(
  id: string,
  fields: Partial<Pick<ProductAddonRow, "name" | "price" | "is_active" | "sort_order">>
): ProductAddonRow | null {
  const db = getDb();
  const existing = getAddon(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = @${key}`);
      values[key] = value;
    }
  }

  if (updates.length === 0) return existing;

  db.prepare(`UPDATE product_addons SET ${updates.join(", ")} WHERE id = @id`).run(values);
  return getAddon(id);
}

export function deleteAddon(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM product_addons WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getAddonsByIds(ids: string[]): ProductAddonRow[] {
  if (ids.length === 0) return [];
  const db = getDb();
  const placeholders = ids.map(() => "?").join(", ");
  return db
    .prepare(`SELECT * FROM product_addons WHERE id IN (${placeholders})`)
    .all(...ids) as ProductAddonRow[];
}

// ─── Order Item Addons ───────────────────────────────────────────────

export interface OrderItemAddonRow {
  id: number;
  order_item_id: number;
  addon_name: string;
  addon_price: number;
  quantity: number;
}

export function createOrderItemAddons(
  orderItemId: number,
  addons: Array<{ addon_name: string; addon_price: number; quantity: number }>
): void {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO order_item_addons (order_item_id, addon_name, addon_price, quantity)
     VALUES (?, ?, ?, ?)`
  );
  for (const a of addons) {
    insert.run(orderItemId, a.addon_name, a.addon_price, a.quantity);
  }
}

export function getOrderItemAddons(orderItemIds: number[]): OrderItemAddonRow[] {
  if (orderItemIds.length === 0) return [];
  const db = getDb();
  const placeholders = orderItemIds.map(() => "?").join(", ");
  return db
    .prepare(`SELECT * FROM order_item_addons WHERE order_item_id IN (${placeholders})`)
    .all(...orderItemIds) as OrderItemAddonRow[];
}

// ─── Partners ────────────────────────────────────────────────────────

export interface PartnerRow {
  id: string;
  name: string;
  logo_url: string;
  link_url: string;
  sort_order: number;
  is_active: number;
  created_at: string;
}

export function getActivePartners(): PartnerRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM partners WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC")
    .all() as PartnerRow[];
}

export function getAllPartners(): PartnerRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM partners ORDER BY sort_order ASC, created_at ASC")
    .all() as PartnerRow[];
}

export function getPartner(id: string): PartnerRow | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM partners WHERE id = ?").get(id) as PartnerRow | undefined;
  return row ?? null;
}

export function createPartner(partner: {
  id: string;
  name: string;
  logo_url: string;
  link_url?: string;
  sort_order?: number;
}): PartnerRow {
  const db = getDb();
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM partners")
    .get() as { max_order: number };

  db.prepare(
    `INSERT INTO partners (id, name, logo_url, link_url, sort_order)
     VALUES (@id, @name, @logo_url, @link_url, @sort_order)`
  ).run({
    ...partner,
    link_url: partner.link_url ?? "",
    sort_order: partner.sort_order ?? maxOrder.max_order + 1,
  });

  return db.prepare("SELECT * FROM partners WHERE id = ?").get(partner.id) as PartnerRow;
}

export function updatePartner(
  id: string,
  fields: Partial<Pick<PartnerRow, "name" | "logo_url" | "link_url" | "sort_order" | "is_active">>
): PartnerRow | null {
  const db = getDb();
  const existing = getPartner(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = @${key}`);
      values[key] = value;
    }
  }

  if (updates.length === 0) return existing;

  db.prepare(`UPDATE partners SET ${updates.join(", ")} WHERE id = @id`).run(values);
  return getPartner(id);
}

export function deletePartner(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM partners WHERE id = ?").run(id);
  return result.changes > 0;
}
