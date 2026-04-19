"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  is_active: number;
  sort_order: number;
  created_at: string;
}

interface OrderItem {
  id: number;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  notes: string | null;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  distance_km: number;
  delivery_fee: number;
  subtotal: number;
  total: number;
  payment_status: string;
  order_status: string;
  created_at: string;
  items: OrderItem[];
}

type Tab = "menu" | "pesanan";

const STATUS_FLOW: OrderStatus[] = ["confirmed", "preparing", "delivering", "delivered"];

function statusColor(status: string): string {
  switch (status) {
    case "pending_payment": return "bg-yellow-900/40 text-yellow-300";
    case "payment_expired": return "bg-red-900/40 text-red-300";
    case "confirmed": return "bg-blue-900/40 text-blue-300";
    case "preparing": return "bg-orange-900/40 text-orange-300";
    case "delivering": return "bg-purple-900/40 text-purple-300";
    case "delivered": return "bg-green-900/40 text-green-300";
    case "cancelled": return "bg-red-900/40 text-red-300";
    default: return "bg-surface-container-highest text-on-surface-variant";
  }
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("menu");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminKey, setAdminKey] = useState("");

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) {
      router.push("/admin");
      return;
    }
    setAdminKey(key);
  }, [router]);

  const fetchProducts = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/products", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setProducts(data);
    } catch { /* ignore */ }
  }, [adminKey, router]);

  const fetchOrders = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/orders", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setOrders(data);
    } catch { /* ignore */ }
  }, [adminKey, router]);

  useEffect(() => {
    if (!adminKey) return;
    setLoading(true);
    Promise.all([fetchProducts(), fetchOrders()]).finally(() => setLoading(false));
  }, [adminKey, fetchProducts, fetchOrders]);

  // Auto-refresh orders every 30s
  useEffect(() => {
    if (!adminKey || tab !== "pesanan") return;
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [adminKey, tab, fetchOrders]);

  const toggleActive = async (product: Product) => {
    await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ is_active: product.is_active ? 0 : 1 }),
    });
    fetchProducts();
  };

  const deleteProductHandler = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
    fetchProducts();
  };

  const updateOrderStatusHandler = async (orderId: string, status: string) => {
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  };

  const getNextStatus = (current: string): string | null => {
    const idx = STATUS_FLOW.indexOf(current as OrderStatus);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[idx + 1];
  };

  const handleLogout = () => {
    sessionStorage.removeItem("himeal_admin_key");
    router.push("/admin");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-on-surface-variant font-body">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#10150f]/90 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex justify-between items-center px-6 py-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">
              HI MEAL!
            </span>
            <span className="text-xs bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Admin
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Keluar
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 bg-surface-container rounded-2xl p-1.5">
          <button
            onClick={() => setTab("menu")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              tab === "menu"
                ? "bg-primary-container text-on-primary-container shadow-lg"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: tab === "menu" ? "'FILL' 1" : "'FILL' 0" }}>
              restaurant_menu
            </span>
            Menu
          </button>
          <button
            onClick={() => setTab("pesanan")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              tab === "pesanan"
                ? "bg-primary-container text-on-primary-container shadow-lg"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: tab === "pesanan" ? "'FILL' 1" : "'FILL' 0" }}>
              receipt_long
            </span>
            Pesanan
            {orders.filter((o) => ["confirmed", "preparing", "delivering"].includes(o.order_status)).length > 0 && (
              <span className="bg-tertiary text-on-tertiary text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {orders.filter((o) => ["confirmed", "preparing", "delivering"].includes(o.order_status)).length}
              </span>
            )}
          </button>
        </div>

        {/* Menu Tab */}
        {tab === "menu" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-headline font-bold text-on-surface">
                Daftar Menu ({products.length})
              </h2>
              <button
                onClick={() => router.push("/admin/products/new")}
                className="flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Tambah Menu
              </button>
            </div>

            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`botanical-card rounded-2xl p-4 flex gap-4 items-center transition-opacity ${
                    !product.is_active ? "opacity-50" : ""
                  }`}
                >
                  {/* Thumbnail */}
                  {product.image && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-surface-container">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline font-bold text-on-surface truncate">
                        {product.name}
                      </h3>
                      {!product.is_active && (
                        <span className="text-[10px] bg-error-container text-on-error-container px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-primary font-bold font-headline">
                      {formatCurrency(product.price)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(product)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
                      title={product.is_active ? "Nonaktifkan" : "Aktifkan"}
                    >
                      <span className="material-symbols-outlined text-lg text-on-surface-variant" style={{ fontVariationSettings: product.is_active ? "'FILL' 1" : "'FILL' 0" }}>
                        {product.is_active ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                    <button
                      onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-lg text-on-surface-variant">edit</span>
                    </button>
                    <button
                      onClick={() => deleteProductHandler(product.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container/30 transition-colors"
                      title="Hapus"
                    >
                      <span className="material-symbols-outlined text-lg text-error">delete</span>
                    </button>
                  </div>
                </div>
              ))}

              {products.length === 0 && (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 block">restaurant</span>
                  <p className="font-body">Belum ada menu. Tambahkan menu pertama!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pesanan Tab */}
        {tab === "pesanan" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-headline font-bold text-on-surface">
                Semua Pesanan ({orders.length})
              </h2>
              <button
                onClick={fetchOrders}
                className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Refresh
              </button>
            </div>

            <div className="space-y-3">
              {orders.map((order) => {
                const nextStatus = getNextStatus(order.order_status);
                const createdDate = new Date(order.created_at);
                const timeStr = createdDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                const dateStr = createdDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

                return (
                  <div key={order.id} className="botanical-card rounded-2xl p-5 space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-headline font-bold text-on-surface">
                            {order.customer_name || "Tanpa Nama"}
                          </h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusColor(order.order_status)}`}>
                            {ORDER_STATUS_LABELS[order.order_status as OrderStatus] || order.order_status}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          #{order.id} &middot; {dateStr} {timeStr}
                        </p>
                      </div>
                      <p className="font-headline font-black text-primary text-lg">
                        {formatCurrency(order.total)}
                      </p>
                    </div>

                    {/* Items */}
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">
                            {item.quantity}x {item.product_name}
                            {item.notes && <span className="text-outline ml-1">({item.notes})</span>}
                          </span>
                          <span className="text-on-surface-variant">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      {order.delivery_fee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">Ongkir ({order.distance_km} km)</span>
                          <span className="text-on-surface-variant">{formatCurrency(order.delivery_fee)}</span>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <p className="text-xs text-outline truncate">
                      <span className="material-symbols-outlined text-xs align-middle mr-1">location_on</span>
                      {order.customer_address}
                    </p>

                    {/* Phone */}
                    <div className="flex items-center gap-4">
                      <a
                        href={`https://wa.me/${order.customer_phone.replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">phone</span>
                        {order.customer_phone}
                      </a>
                    </div>

                    {/* Status Action */}
                    {nextStatus && (
                      <button
                        onClick={() => updateOrderStatusHandler(order.id, nextStatus)}
                        className="w-full py-2.5 bg-primary-container text-on-primary-container font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        {ORDER_STATUS_LABELS[nextStatus as OrderStatus]}
                      </button>
                    )}
                  </div>
                );
              })}

              {orders.length === 0 && (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                  <p className="font-body">Belum ada pesanan.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
