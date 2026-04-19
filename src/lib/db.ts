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
        customer_address TEXT NOT NULL,
        customer_lat REAL NOT NULL,
        customer_lng REAL NOT NULL,
        distance_km REAL NOT NULL,
        delivery_fee INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        total INTEGER NOT NULL,
        payment_id TEXT,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        order_status TEXT NOT NULL DEFAULT 'pending_payment',
        qr_string TEXT,
        notes TEXT,
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

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
      CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    `);
  }
  return db;
}

export interface OrderRow {
  id: string;
  customer_address: string;
  customer_lat: number;
  customer_lng: number;
  distance_km: number;
  delivery_fee: number;
  subtotal: number;
  total: number;
  payment_id: string | null;
  payment_status: string;
  order_status: string;
  qr_string: string | null;
  notes: string | null;
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
    INSERT INTO orders (id, customer_address, customer_lat, customer_lng, distance_km, delivery_fee, subtotal, total, payment_id, payment_status, order_status, qr_string, notes, expires_at)
    VALUES (@id, @customer_address, @customer_lat, @customer_lng, @distance_km, @delivery_fee, @subtotal, @total, @payment_id, @payment_status, @order_status, @qr_string, @notes, @expires_at)
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
