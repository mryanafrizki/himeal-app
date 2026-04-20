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

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
      CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, sort_order);
    `);

    seedDefaultProducts();
    seedDefaultStoreSettings();
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
): OrderRow {
  const db = getDb();

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, customer_name, customer_phone, customer_address, customer_lat, customer_lng, address_notes, distance_km, delivery_fee, subtotal, total, payment_id, payment_status, order_status, qr_string, notes, unique_code, qris_fee, expires_at)
    VALUES (@id, @customer_name, @customer_phone, @customer_address, @customer_lat, @customer_lng, @address_notes, @distance_km, @delivery_fee, @subtotal, @total, @payment_id, @payment_status, @order_status, @qr_string, @notes, @unique_code, @qris_fee, @expires_at)
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

export function getOrder(id: string): (OrderRow & { items: OrderItemRow[] }) | null {
  const db = getDb();
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as
    | OrderRow
    | undefined;
  if (!order) return null;

  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(id) as OrderItemRow[];

  return { ...order, items };
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
}): ProductRow {
  const db = getDb();
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM products")
    .get() as { max_order: number };

  db.prepare(
    `INSERT INTO products (id, name, price, description, image, sort_order, is_out_of_stock, max_order_qty)
     VALUES (@id, @name, @price, @description, @image, @sort_order, @is_out_of_stock, @max_order_qty)`
  ).run({
    ...product,
    sort_order: product.sort_order ?? maxOrder.max_order + 1,
    is_out_of_stock: product.is_out_of_stock ?? 0,
    max_order_qty: product.max_order_qty ?? 0,
  });

  return getProduct(product.id)!;
}

export function updateProduct(
  id: string,
  fields: Partial<Pick<ProductRow, "name" | "price" | "description" | "image" | "is_active" | "sort_order" | "is_out_of_stock" | "max_order_qty">>
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
