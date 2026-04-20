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
  expires_at: string | null;
  items: OrderItem[];
}

type Tab = "menu" | "pesanan";
type PaymentSubTab = "success" | "pending";

const STATUS_FLOW: OrderStatus[] = ["confirmed", "preparing", "ready" as OrderStatus, "delivering", "delivered"];

function statusColor(status: string): string {
  switch (status) {
    case "pending_payment": return "bg-yellow-900/40 text-yellow-300";
    case "payment_expired": return "bg-red-900/40 text-red-300";
    case "confirmed": return "bg-blue-900/40 text-blue-300";
    case "preparing": return "bg-orange-900/40 text-orange-300";
    case "ready": return "bg-teal-900/40 text-teal-300";
    case "delivering": return "bg-purple-900/40 text-purple-300";
    case "delivered": return "bg-green-900/40 text-green-300";
    case "cancelled": return "bg-red-900/40 text-red-300";
    default: return "bg-surface-container-highest text-on-surface-variant";
  }
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ...ORDER_STATUS_LABELS,
    ready: "Siap Dikirim",
  };
  return labels[status] || status;
}

/** Action button config per status */
function getActionButtons(status: string): { label: string; icon: string; nextStatus: string; variant: "primary" | "danger" }[] {
  switch (status) {
    case "confirmed":
      return [
        { label: "Terima & Proses", icon: "skillet", nextStatus: "preparing", variant: "primary" },
        { label: "Cancel", icon: "close", nextStatus: "cancelled", variant: "danger" },
      ];
    case "preparing":
      return [
        { label: "Siap Dikirim", icon: "package_2", nextStatus: "ready", variant: "primary" },
        { label: "Cancel", icon: "close", nextStatus: "cancelled", variant: "danger" },
      ];
    case "ready":
      return [
        { label: "Kirim", icon: "delivery_dining", nextStatus: "delivering", variant: "primary" },
        { label: "Cancel", icon: "close", nextStatus: "cancelled", variant: "danger" },
      ];
    case "delivering":
      return [
        { label: "Selesai", icon: "task_alt", nextStatus: "delivered", variant: "primary" },
      ];
    default:
      return [];
  }
}

function CountdownToExpiry({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const now = Date.now();
      const exp = new Date(expiresAt).getTime();
      const diff = exp - now;
      if (diff <= 0) {
        setRemaining("Kedaluwarsa");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, "0")}`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const isExpired = remaining === "Kedaluwarsa";

  return (
    <span className={`text-xs font-mono font-bold ${isExpired ? "text-error" : "text-yellow-300"}`}>
      {isExpired ? (
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">timer_off</span>
          Kedaluwarsa
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">timer</span>
          {remaining}
        </span>
      )}
    </span>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("menu");
  const [paymentSubTab, setPaymentSubTab] = useState<PaymentSubTab>("success");
  const [products, setProducts] = useState<Product[]>([]);
  const [paidOrders, setPaidOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const fetchPaidOrders = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/orders?payment_status=success", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setPaidOrders(Array.isArray(data) ? data : data.orders || []);
    } catch { /* ignore */ }
  }, [adminKey, router]);

  const fetchPendingOrders = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/orders?payment_status=pending", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setPendingOrders(Array.isArray(data) ? data : data.orders || []);
    } catch { /* ignore */ }
  }, [adminKey, router]);

  const fetchAllOrders = useCallback(async () => {
    await Promise.all([fetchPaidOrders(), fetchPendingOrders()]);
  }, [fetchPaidOrders, fetchPendingOrders]);

  useEffect(() => {
    if (!adminKey) return;
    setLoading(true);
    Promise.all([fetchProducts(), fetchAllOrders()]).finally(() => setLoading(false));
  }, [adminKey, fetchProducts, fetchAllOrders]);

  // Auto-refresh orders every 15s when on pesanan tab
  useEffect(() => {
    if (!adminKey || tab !== "pesanan") return;
    const interval = setInterval(fetchAllOrders, 15000);
    return () => clearInterval(interval);
  }, [adminKey, tab, fetchAllOrders]);

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
    setActionLoading(`${orderId}-${status}`);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ status }),
      });
      await fetchAllOrders();
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("himeal_admin_key");
    router.push("/admin");
  };

  const orders = paymentSubTab === "success" ? paidOrders : pendingOrders;
  const activeOrderCount = paidOrders.filter((o) =>
    ["confirmed", "preparing", "ready", "delivering"].includes(o.order_status)
  ).length;

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
      <header className="sticky top-0 z-50 bg-[#0C1410]/90 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex justify-between items-center px-6 py-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">
              HI MEAL!
            </span>
            <span className="text-xs bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => router.push("/admin/vouchers")}
              className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-base">confirmation_number</span>
              <span className="hidden sm:inline">Voucher</span>
            </button>
            <button
              onClick={() => router.push("/admin/revenue")}
              className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-base">payments</span>
              <span className="hidden sm:inline">Revenue</span>
            </button>
            <button
              onClick={() => router.push("/admin/feedback")}
              className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-base">feedback</span>
              <span className="hidden sm:inline">Feedback</span>
            </button>
            <button
              onClick={() => router.push("/admin/settings")}
              className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-base">settings</span>
              <span className="hidden sm:inline">Pengaturan</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Keluar
            </button>
          </div>
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
            {activeOrderCount > 0 && (
              <span className="bg-tertiary text-on-tertiary text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {activeOrderCount}
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
            {/* Payment Sub-tabs */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-surface-container-lowest rounded-xl p-1">
                <button
                  onClick={() => setPaymentSubTab("success")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    paymentSubTab === "success"
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">paid</span>
                    Sudah Dibayar
                    {paidOrders.length > 0 && (
                      <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {paidOrders.length}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setPaymentSubTab("pending")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    paymentSubTab === "pending"
                      ? "bg-yellow-900/40 text-yellow-300"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    Menunggu Pembayaran
                    {pendingOrders.length > 0 && (
                      <span className="bg-yellow-900/40 text-yellow-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {pendingOrders.length}
                      </span>
                    )}
                  </span>
                </button>
              </div>
              <button
                onClick={fetchAllOrders}
                className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
              </button>
            </div>

            <div className="space-y-3">
              {orders.map((order) => {
                const createdDate = new Date(order.created_at);
                const timeStr = createdDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                const dateStr = createdDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
                const actions = paymentSubTab === "success" ? getActionButtons(order.order_status) : [];
                const isDelivered = order.order_status === "delivered";
                const isCancelled = order.order_status === "cancelled";

                return (
                  <div key={order.id} className="botanical-card rounded-2xl p-5 space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-headline font-bold text-on-surface">
                            {order.customer_name || "Tanpa Nama"}
                          </h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusColor(order.order_status)}`}>
                            {statusLabel(order.order_status)}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          #{order.id} &middot; {dateStr} {timeStr}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-headline font-black text-primary text-lg">
                          {formatCurrency(order.total)}
                        </p>
                        {/* Countdown for pending payment */}
                        {paymentSubTab === "pending" && order.expires_at && (
                          <CountdownToExpiry expiresAt={order.expires_at} />
                        )}
                      </div>
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

                    {/* Status badges for terminal states */}
                    {isDelivered && (
                      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-green-900/20 border border-green-800/20">
                        <span className="material-symbols-outlined text-green-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                        <span className="text-sm font-bold text-green-300">Selesai</span>
                      </div>
                    )}
                    {isCancelled && (
                      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-red-900/20 border border-red-800/20">
                        <span className="material-symbols-outlined text-red-400 text-lg">cancel</span>
                        <span className="text-sm font-bold text-red-300">Dibatalkan</span>
                      </div>
                    )}

                    {/* Progressive Action Buttons */}
                    {actions.length > 0 && (
                      <div className="flex gap-2 pt-1">
                        {actions.map((action) => {
                          const isLoading = actionLoading === `${order.id}-${action.nextStatus}`;
                          return (
                            <button
                              key={action.nextStatus}
                              onClick={() => updateOrderStatusHandler(order.id, action.nextStatus)}
                              disabled={isLoading}
                              className={`flex-1 py-2.5 font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 ${
                                action.variant === "primary"
                                  ? "bg-primary-container text-on-primary-container"
                                  : "bg-error-container/30 text-error hover:bg-error-container/50"
                              }`}
                            >
                              <span className="material-symbols-outlined text-lg">
                                {isLoading ? "progress_activity" : action.icon}
                              </span>
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {orders.length === 0 && (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 block">
                    {paymentSubTab === "success" ? "inbox" : "hourglass_empty"}
                  </span>
                  <p className="font-body">
                    {paymentSubTab === "success"
                      ? "Belum ada pesanan yang sudah dibayar."
                      : "Tidak ada pesanan menunggu pembayaran."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
