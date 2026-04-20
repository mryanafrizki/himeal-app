"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";

interface RevenueData {
  gross: number;
  hpp: number;
  net: number;
  orderCount: number;
  grossChange: number;
  hppChange: number;
}

interface RevenueOrder {
  id: string;
  customer_name: string;
  total: number;
  hpp: number;
  profit: number;
  order_status: string;
  created_at: string;
  items_summary: string;
}

type Period = "daily" | "weekly" | "monthly" | "all";

function statusBadge(status: string) {
  switch (status) {
    case "delivered": return "bg-primary/10 text-primary";
    case "preparing": case "confirmed": return "bg-secondary-container/30 text-secondary";
    case "delivering": return "bg-tertiary-container/30 text-tertiary";
    case "cancelled": return "bg-error-container/30 text-error";
    default: return "bg-surface-container-highest text-on-surface-variant";
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    delivered: "Selesai", preparing: "Diproses", confirmed: "Diterima",
    delivering: "Diantar", cancelled: "Dibatalkan", ready: "Siap",
  };
  return labels[status] || status;
}

export default function AdminRevenuePage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [period, setPeriod] = useState<Period>("daily");
  const [revenue, setRevenue] = useState<RevenueData>({ gross: 0, hpp: 0, net: 0, orderCount: 0, grossChange: 0, hppChange: 0 });
  const [orders, setOrders] = useState<RevenueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chartData, setChartData] = useState<{ label: string; gross: number; net: number }[]>([]);

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) { router.push("/admin"); return; }
    setAdminKey(key);
  }, [router]);

  const fetchRevenue = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/revenue?period=${period}`, { headers: { "x-admin-key": adminKey } });
      if (res.status === 401) { router.push("/admin"); return; }
      if (res.ok) {
        const data = await res.json();
        const s = data.stats || data.summary || {};
        setRevenue({
          gross: s.grossRevenue ?? s.gross ?? 0,
          hpp: s.totalHpp ?? s.hpp ?? 0,
          net: s.netRevenue ?? s.net ?? 0,
          orderCount: s.orderCount ?? 0,
          grossChange: s.grossChange ?? 0,
          hppChange: s.hppChange ?? 0,
        });
        setChartData(data.chartData || data.chart || []);
      }
    } catch { /* ignore */ }
  }, [adminKey, period, router]);

  const fetchOrders = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/orders?payment_status=success&page=${page}&limit=5`, { headers: { "x-admin-key": adminKey } });
      if (res.status === 401) { router.push("/admin"); return; }
      if (res.ok) {
        const data = await res.json();
        const orderList = Array.isArray(data) ? data : data.orders || [];
        setOrders(orderList.map((o: Record<string, unknown>) => ({
          id: o.id as string,
          customer_name: (o.customer_name as string) || "Tanpa Nama",
          total: o.total as number,
          hpp: Math.round((o.total as number) * 0.4),
          profit: Math.round((o.total as number) * 0.6),
          order_status: o.order_status as string,
          created_at: o.created_at as string,
          items_summary: Array.isArray(o.items) ? (o.items as Array<{ quantity: number; product_name: string }>).map((i) => `${i.quantity}x ${i.product_name}`).join(", ") : "",
        })));
        setTotalPages(data.totalPages || 1);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminKey, page, router]);

  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // SVG Chart
  const maxVal = Math.max(...chartData.map((d) => d.gross), 1);
  const chartW = 900;
  const chartH = 200;
  const grossPath = chartData.length > 1
    ? chartData.map((d, i) => {
        const x = (i / (chartData.length - 1)) * chartW;
        const y = chartH - (d.gross / maxVal) * (chartH - 20);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      }).join(" ")
    : "";
  const netPath = chartData.length > 1
    ? chartData.map((d, i) => {
        const x = (i / (chartData.length - 1)) * chartW;
        const y = chartH - (d.net / maxVal) * (chartH - 20);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      }).join(" ")
    : "";

  const profitMargin = revenue.gross > 0 ? Math.round((revenue.net / revenue.gross) * 100) : 0;

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
            <button onClick={() => router.push("/admin/dashboard")} className="hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined text-primary">arrow_back</span>
            </button>
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">Analisis Pendapatan</span>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {/* Period Filter */}
        <div className="flex items-center gap-4 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/10 w-fit">
          {(["daily", "weekly", "monthly", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p ? "bg-surface-container-highest text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {p === "daily" ? "Harian" : p === "weekly" ? "Mingguan" : p === "monthly" ? "Bulanan" : "Semua"}
            </button>
          ))}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gross */}
          <div className="bg-surface-container p-6 rounded-xl border-l-4 border-primary relative overflow-hidden animate-fade-in-up">
            <p className="text-xs text-secondary font-medium mb-2 uppercase tracking-wider">Pendapatan Kotor</p>
            <h3 className="text-3xl font-extrabold text-primary tracking-tighter font-headline">{formatCurrency(revenue.gross)}</h3>
            {revenue.grossChange !== 0 && (
              <p className="text-xs text-on-surface-variant mt-3 flex items-center gap-1">
                <span className={`material-symbols-outlined text-xs ${revenue.grossChange > 0 ? "text-primary" : "text-error"}`}>
                  {revenue.grossChange > 0 ? "trending_up" : "trending_down"}
                </span>
                <span className={`font-semibold ${revenue.grossChange > 0 ? "text-primary" : "text-error"}`}>
                  {revenue.grossChange > 0 ? "+" : ""}{revenue.grossChange}%
                </span> dari periode lalu
              </p>
            )}
          </div>

          {/* HPP */}
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/15 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <p className="text-xs text-on-surface-variant font-medium mb-2 uppercase tracking-wider">Total HPP</p>
            <h3 className="text-3xl font-extrabold text-on-surface tracking-tighter font-headline">{formatCurrency(revenue.hpp)}</h3>
            {revenue.hppChange !== 0 && (
              <p className="text-xs text-on-surface-variant mt-3 flex items-center gap-1">
                <span className={`material-symbols-outlined text-xs ${revenue.hppChange < 0 ? "text-primary" : "text-error"}`}>
                  {revenue.hppChange < 0 ? "trending_down" : "trending_up"}
                </span>
                <span className={`font-semibold ${revenue.hppChange < 0 ? "text-primary" : "text-error"}`}>
                  {revenue.hppChange}%
                </span> efisiensi biaya
              </p>
            )}
          </div>

          {/* Net */}
          <div className="bg-primary-container p-6 rounded-xl relative overflow-hidden shadow-2xl shadow-primary/5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <p className="text-xs text-on-primary font-bold mb-2 uppercase tracking-wider">Pendapatan Bersih</p>
            <h3 className="text-3xl font-extrabold text-on-primary tracking-tighter font-headline">{formatCurrency(revenue.net)}</h3>
            <p className="text-xs text-on-primary/80 mt-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">verified</span>
              Margin Profit {profitMargin}%
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-8xl text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/10 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold font-headline">Tren Performa Keuangan</h3>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-xs font-medium text-on-surface-variant">Kotor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-tertiary" />
                  <span className="text-xs font-medium text-on-surface-variant">Bersih</span>
                </div>
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${chartW} ${chartH + 30}`} className="w-full h-48">
                {/* Grid lines */}
                {[0, 0.33, 0.66, 1].map((f) => (
                  <line key={f} x1="0" x2={chartW} y1={chartH - f * (chartH - 20)} y2={chartH - f * (chartH - 20)} stroke="#2E4A38" strokeOpacity="0.3" />
                ))}
                {/* Gross line */}
                <path d={grossPath} fill="none" stroke="#5BDB6F" strokeWidth="3" strokeLinecap="round" />
                {/* Net line */}
                <path d={netPath} fill="none" stroke="#FFD166" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="8 4" />
                {/* X-axis labels */}
                {chartData.map((d, i) => (
                  <text key={i} x={(i / (chartData.length - 1)) * chartW} y={chartH + 20} fill="#5A7A66" fontSize="10" textAnchor="middle" fontWeight="bold">
                    {d.label}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="px-6 py-5 flex justify-between items-center border-b border-outline-variant/10">
            <h3 className="text-lg font-bold font-headline">Rincian Transaksi</h3>
            <span className="text-xs text-on-surface-variant">{revenue.orderCount} pesanan</span>
          </div>

          {/* Mobile-friendly card list */}
          <div className="divide-y divide-outline-variant/10">
            {orders.map((order) => {
              const date = new Date(order.created_at);
              return (
                <div key={order.id} className="px-6 py-4 hover:bg-surface-container-highest/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs text-secondary font-mono">#{order.id}</span>
                      <p className="font-headline font-bold text-on-surface text-sm">{order.customer_name}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusBadge(order.order_status)}`}>
                      {statusLabel(order.order_status)}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-2">{order.items_summary}</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant">{date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    <div className="flex gap-4">
                      <span className="text-on-surface font-semibold">{formatCurrency(order.total)}</span>
                      <span className="text-primary font-bold">{formatCurrency(order.profit)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {orders.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block">payments</span>
              <p className="font-body">Belum ada transaksi.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center">
              <p className="text-xs text-outline font-medium">Halaman {page} dari {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="w-8 h-8 rounded bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-secondary disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="w-8 h-8 rounded bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-secondary hover:bg-primary-container hover:text-on-primary transition-colors disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
