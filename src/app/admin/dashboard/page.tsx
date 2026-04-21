"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  original_price: number;
  quantity: number;
  notes: string | null;
}

interface Order {
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
  voucher_id: string | null;
  voucher_discount: number;
  voucher_code: string | null;
  payment_status: string;
  order_status: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  items: OrderItem[];
}

type Tab = "menu" | "pesanan";
type PaymentSubTab = "success" | "pending" | "cancelled";

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

function statusLabel(status: string, isPickup?: boolean): string {
  if (status === "ready") return isPickup ? "Siap Diambil" : "Siap Dikirim";
  const labels: Record<string, string> = {
    ...ORDER_STATUS_LABELS,
    ready: "Siap Dikirim",
  };
  return labels[status] || status;
}

function isPickupOrder(order: Order): boolean {
  return order.customer_address.startsWith("Pickup") || order.customer_address.startsWith("Takeaway") || order.delivery_fee === 0;
}

/** Action button config per status — pickup-aware */
function getActionButtons(status: string, pickup: boolean): { label: string; icon: string; nextStatus: string; variant: "primary" | "danger" }[] {
  switch (status) {
    case "confirmed":
      return [
        { label: "Terima & Proses", icon: "skillet", nextStatus: "preparing", variant: "primary" },
        { label: "Cancel", icon: "close", nextStatus: "cancelled", variant: "danger" },
      ];
    case "preparing":
      return [
        { label: pickup ? "Siap Diambil" : "Siap Dikirim", icon: pickup ? "shopping_bag" : "package_2", nextStatus: "ready", variant: "primary" },
        { label: "Cancel", icon: "close", nextStatus: "cancelled", variant: "danger" },
      ];
    case "ready":
      return pickup
        ? [
            { label: "Selesai (Diambil)", icon: "task_alt", nextStatus: "delivered", variant: "primary" },
            { label: "Cancel", icon: "close", nextStatus: "cancelled", variant: "danger" },
          ]
        : [
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

/** Inline chat panel for admin order cards */
function AdminChatPanel({ orderId, adminKey }: { orderId: string; adminKey: string }) {
  const [messages, setMessages] = useState<{ id: number; sender: string; message: string; created_at: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/${orderId}/chat?after=0`, { headers: { "x-admin-key": adminKey } });
      if (!res.ok) return;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setMessages(arr);
      if (!open) {
        setUnread(arr.filter((m: { sender: string }) => m.sender === "user").length);
      }
    } catch { /* ignore */ }
  }, [orderId, adminKey, open]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 8000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnread(0);
    }
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await fetch(`/api/order/${orderId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ message: input.trim(), sender: "admin" }),
      });
      setInput("");
      await fetchMessages();
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  return (
    <div className="border-t border-outline-variant/15 mt-2 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors w-full"
      >
        <span className="material-symbols-outlined text-sm">chat</span>
        <span className="font-bold">Chat</span>
        {unread > 0 && (
          <span className="bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
        )}
        <span className="material-symbols-outlined text-sm ml-auto">{open ? "expand_less" : "expand_more"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="max-h-48 overflow-y-auto space-y-1.5 px-1">
            {messages.length === 0 && (
              <p className="text-xs text-outline text-center py-3">Belum ada pesan</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-1.5 rounded-xl text-xs ${
                  msg.sender === "admin"
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-container-highest text-on-surface"
                }`}>
                  <p>{msg.message}</p>
                  <p className="text-[9px] opacity-60 mt-0.5">
                    {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ketik pesan..."
              className="flex-1 px-3 py-2 bg-surface-container border-none rounded-lg text-xs text-on-surface focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="px-3 py-2 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pagination state per tab
  const [paidPage, setPaidPage] = useState(1);
  const [paidTotalPages, setPaidTotalPages] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);
  const [cancelledTotalPages, setCancelledTotalPages] = useState(1);
  const ORDERS_PER_PAGE = 20;

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
      const res = await fetch(`/api/admin/orders?payment_status=success&page=${paidPage}&limit=${ORDERS_PER_PAGE}`, {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setPaidOrders(Array.isArray(data) ? data : data.orders || []);
      if (data.totalPages !== undefined) setPaidTotalPages(data.totalPages);
    } catch { /* ignore */ }
  }, [adminKey, router, paidPage]);

  const fetchPendingOrders = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/orders?payment_status=pending&page=${pendingPage}&limit=${ORDERS_PER_PAGE}`, {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setPendingOrders(Array.isArray(data) ? data : data.orders || []);
      if (data.totalPages !== undefined) setPendingTotalPages(data.totalPages);
    } catch { /* ignore */ }
  }, [adminKey, router, pendingPage]);

  const fetchCancelledOrders = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/orders?payment_status=cancelled&page=${cancelledPage}&limit=${ORDERS_PER_PAGE}`, {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setCancelledOrders(Array.isArray(data) ? data : data.orders || []);
      if (data.totalPages !== undefined) setCancelledTotalPages(data.totalPages);
    } catch { /* ignore */ }
  }, [adminKey, router, cancelledPage]);

  const fetchAllOrders = useCallback(async () => {
    await Promise.all([fetchPaidOrders(), fetchPendingOrders(), fetchCancelledOrders()]);
  }, [fetchPaidOrders, fetchPendingOrders, fetchCancelledOrders]);

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

  const orders = paymentSubTab === "success" ? paidOrders : paymentSubTab === "pending" ? pendingOrders : cancelledOrders;
  const currentPage = paymentSubTab === "success" ? paidPage : paymentSubTab === "pending" ? pendingPage : cancelledPage;
  const currentTotalPages = paymentSubTab === "success" ? paidTotalPages : paymentSubTab === "pending" ? pendingTotalPages : cancelledTotalPages;
  const setCurrentPage = paymentSubTab === "success" ? setPaidPage : paymentSubTab === "pending" ? setPendingPage : setCancelledPage;
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
        <div className="flex justify-between items-center px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">HI MEAL!</span>
            <span className="text-[10px] bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Admin</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-error transition-colors">
            <span className="material-symbols-outlined text-lg">logout</span>
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
        {/* Compact Nav Bar */}
        <div className="overflow-x-auto hide-scrollbar border-t border-outline-variant/10">
          <div className="flex items-center gap-1 px-6 py-2 max-w-7xl mx-auto min-w-max">
            {[
              { href: "/admin/dashboard", icon: "dashboard", label: "Dashboard", active: true },
              { href: "/admin/hero-slides", icon: "slideshow", label: "Slides" },
              { href: "/admin/addons", icon: "add_circle", label: "Add-ons" },
              { href: "/admin/partners", icon: "handshake", label: "Partners" },
              { href: "/admin/vouchers", icon: "confirmation_number", label: "Voucher" },
              { href: "/admin/revenue", icon: "payments", label: "Revenue" },
              { href: "/admin/feedback", icon: "feedback", label: "Feedback" },
              { href: "/admin/settings", icon: "settings", label: "Pengaturan" },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  item.active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto space-y-6">
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
                  onClick={() => { setPaymentSubTab("success"); setPaidPage(1); }}
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
                  onClick={() => { setPaymentSubTab("pending"); setPendingPage(1); }}
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
                <button
                  onClick={() => { setPaymentSubTab("cancelled"); setCancelledPage(1); }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    paymentSubTab === "cancelled"
                      ? "bg-red-900/40 text-red-300"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    Dibatalkan
                    {cancelledOrders.length > 0 && (
                      <span className="bg-red-900/40 text-red-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {cancelledOrders.length}
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
                const pickup = isPickupOrder(order);
                const actions = paymentSubTab === "success" ? getActionButtons(order.order_status, pickup) : [];
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
                          {pickup && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-teal-900/40 text-teal-300">Pickup</span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusColor(order.order_status)}`}>
                            {statusLabel(order.order_status, pickup)}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          <span className="font-mono text-outline">#{order.id.slice(0, 6)}</span> &middot; {dateStr} {timeStr}
                          {isCancelled && order.updated_at && (
                            <span className="text-error ml-1">&middot; Dibatalkan {new Date(order.updated_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-headline font-black text-primary text-lg">
                          {formatCurrency(order.total)}
                        </p>
                        {/* Countdown for pending payment */}
                    {order.payment_status === "pending" && order.order_status !== "cancelled" && order.expires_at && (
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
                          <div className="text-right">
                            {item.original_price > 0 && item.original_price > item.price ? (
                              <>
                                <span className="text-xs text-on-surface-variant line-through">{formatCurrency(item.original_price * item.quantity)}</span>
                                <span className="text-on-surface-variant ml-1">{formatCurrency(item.price * item.quantity)}</span>
                              </>
                            ) : (
                              <span className="text-on-surface-variant">{formatCurrency(item.price * item.quantity)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {order.delivery_fee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">Ongkir ({order.distance_km} km)</span>
                          <span className="text-on-surface-variant">{formatCurrency(order.delivery_fee)}</span>
                        </div>
                      )}
                      {order.voucher_discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-primary">
                            Diskon Voucher
                            {order.voucher_code && (
                              <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{order.voucher_code}</span>
                            )}
                          </span>
                          <span className="text-primary">-{formatCurrency(order.voucher_discount)}</span>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <div className="text-xs text-outline">
                      <span className="material-symbols-outlined text-xs align-middle mr-1">location_on</span>
                      {order.customer_lat && order.customer_lng ? (
                        <a
                          href={`https://maps.google.com/maps?q=${order.customer_lat},${order.customer_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {order.customer_address}
                        </a>
                      ) : (
                        <span>{order.customer_address}</span>
                      )}
                      {order.address_notes && (
                        <span className="block text-outline/60 mt-0.5 italic">{order.address_notes}</span>
                      )}
                    </div>

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

                    {/* Chat Panel */}
                    {paymentSubTab === "success" && !isCancelled && (
                      <AdminChatPanel orderId={order.id} adminKey={adminKey} />
                    )}
                  </div>
                );
              })}

              {orders.length === 0 && (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 block">
                    {paymentSubTab === "success" ? "inbox" : paymentSubTab === "pending" ? "hourglass_empty" : "cancel"}
                  </span>
                  <p className="font-body">
                    {paymentSubTab === "success"
                      ? "Belum ada pesanan yang sudah dibayar."
                      : paymentSubTab === "pending"
                      ? "Tidak ada pesanan menunggu pembayaran."
                      : "Tidak ada pesanan yang dibatalkan."}
                  </p>
                </div>
              )}

              {/* Pagination Controls */}
              {currentTotalPages > 1 && (
                <div className="flex justify-between items-center pt-4">
                  <p className="text-xs text-outline font-medium">Halaman {currentPage} dari {currentTotalPages}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="w-8 h-8 rounded bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-secondary disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button
                      onClick={() => setCurrentPage((p: number) => Math.min(currentTotalPages, p + 1))}
                      disabled={currentPage >= currentTotalPages}
                      className="w-8 h-8 rounded bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-secondary hover:bg-primary-container hover:text-on-primary transition-colors disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
