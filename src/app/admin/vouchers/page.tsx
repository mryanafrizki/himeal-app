"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";

interface Voucher {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_discount: number | null;
  min_order: number;
  quota: number;
  used_count: number;
  start_date: string;
  end_date: string;
  is_active: number;
  created_at: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "HM-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function AdminVouchersPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [quota, setQuota] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) { router.push("/admin"); return; }
    setAdminKey(key);
  }, [router]);

  const fetchVouchers = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/vouchers", { headers: { "x-admin-key": adminKey } });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setVouchers(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminKey, router]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const resetForm = () => {
    setCode(""); setDiscountType("percentage"); setDiscountValue(""); setMaxDiscount("");
    setMinOrder(""); setQuota(""); setStartDate(""); setEndDate("");
    setEditingId(null); setShowForm(false);
  };

  const startEdit = (v: Voucher) => {
    setEditingId(v.id);
    setCode(v.code);
    setDiscountType(v.discount_type);
    setDiscountValue(String(v.discount_value));
    setMaxDiscount(v.max_discount ? String(v.max_discount) : "");
    setMinOrder(String(v.min_order));
    setQuota(String(v.quota));
    setStartDate(v.start_date.split("T")[0]);
    setEndDate(v.end_date.split("T")[0]);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!code.trim()) { toast.error("Kode voucher wajib diisi"); return; }
    if (!discountValue || Number(discountValue) <= 0) { toast.error("Nilai diskon wajib diisi"); return; }
    if (!quota || Number(quota) <= 0) { toast.error("Kuota wajib diisi"); return; }
    if (!startDate || !endDate) { toast.error("Tanggal wajib diisi"); return; }

    setSaving(true);
    try {
      const body = {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        min_order: minOrder ? Number(minOrder) : 0,
        quota: Number(quota),
        start_date: startDate,
        end_date: endDate,
      };

      const url = editingId ? `/api/admin/vouchers/${editingId}` : "/api/admin/vouchers";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? "Voucher diperbarui" : "Voucher dibuat");
        resetForm();
        fetchVouchers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal menyimpan voucher");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus voucher ini?")) return;
    try {
      await fetch(`/api/admin/vouchers/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      toast.success("Voucher dihapus");
      fetchVouchers();
    } catch {
      toast.error("Gagal menghapus voucher");
    }
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
      <header className="sticky top-0 z-50 bg-[#0C1410]/90 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex justify-between items-center px-6 py-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin/dashboard")} className="hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined text-primary">arrow_back</span>
            </button>
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">Kelola Voucher</span>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-lg">{showForm ? "close" : "add"}</span>
            {showForm ? "Tutup" : "Buat Voucher Baru"}
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="botanical-card rounded-2xl p-6 space-y-5 animate-scale-in">
            <h3 className="font-headline font-bold text-on-surface">{editingId ? "Edit Voucher" : "Buat Voucher Baru"}</h3>

            {/* Code */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Kode Voucher</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="HM-XXXXXX"
                  className="flex-1 px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm font-mono font-bold text-on-surface focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setCode(generateCode())}
                  className="px-4 py-3 bg-surface-container-highest rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Discount Type */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Tipe Diskon</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType("percentage")}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                    discountType === "percentage" ? "bg-primary-container text-on-primary-container" : "bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  Persentase (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("fixed")}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                    discountType === "fixed" ? "bg-primary-container text-on-primary-container" : "bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  Nominal (Rp)
                </button>
              </div>
            </div>

            {/* Value + Max Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
                  Nilai {discountType === "percentage" ? "(%)" : "(Rp)"}
                </label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "10" : "5000"}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
                />
              </div>
              {discountType === "percentage" && (
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Maks. Diskon (Rp)</label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="10000"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Min Order + Quota */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Min. Order (Rp)</label>
                <input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Kuota</label>
                <input
                  type="number"
                  value={quota}
                  onChange={(e) => setQuota(e.target.value)}
                  placeholder="100"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Mulai</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Berakhir</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Save */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-headline font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : editingId ? "Perbarui" : "Simpan"}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-3 bg-surface-container-highest rounded-xl text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Voucher List */}
        <div className="space-y-3">
          {vouchers.map((v, i) => {
            const now = new Date();
            const start = new Date(v.start_date);
            const end = new Date(v.end_date);
            const isExpired = now > end;
            const isUpcoming = now < start;
            const usagePercent = v.quota > 0 ? Math.round((v.used_count / v.quota) * 100) : 0;

            return (
              <div
                key={v.id}
                className={`botanical-card rounded-2xl p-5 space-y-3 animate-fade-in-up ${isExpired ? "opacity-50" : ""}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-lg text-primary tracking-wider">{v.code}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isExpired ? "bg-error-container/30 text-error" :
                        isUpcoming ? "bg-tertiary-container/30 text-tertiary" :
                        v.is_active ? "bg-primary/10 text-primary" : "bg-surface-container-highest text-on-surface-variant"
                      }`}>
                        {isExpired ? "Kedaluwarsa" : isUpcoming ? "Akan Datang" : v.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {v.discount_type === "percentage"
                        ? `${v.discount_value}%${v.max_discount ? ` (maks ${formatCurrency(v.max_discount)})` : ""}`
                        : formatCurrency(v.discount_value)
                      }
                      {v.min_order > 0 && ` | Min. order ${formatCurrency(v.min_order)}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(v)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg text-on-surface-variant">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container/30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg text-error">delete</span>
                    </button>
                  </div>
                </div>

                {/* Quota progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Terpakai: {v.used_count}/{v.quota}</span>
                    <span>{usagePercent}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Date range */}
                <p className="text-xs text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">calendar_today</span>
                  {new Date(v.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  {" - "}
                  {new Date(v.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            );
          })}

          {vouchers.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block">confirmation_number</span>
              <p className="font-body">Belum ada voucher. Buat voucher pertama!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
