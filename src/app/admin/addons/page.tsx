"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";

interface Addon {
  id: string;
  product_id: string;
  product_name?: string;
  name: string;
  price: number;
  is_active: number;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

export default function AdminAddonsPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [addons, setAddons] = useState<Addon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) { router.push("/admin"); return; }
    setAdminKey(key);
  }, [router]);

  const fetchAddons = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/addons", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setAddons(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, [adminKey, router]);

  const fetchProducts = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/products", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) return;
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, [adminKey]);

  useEffect(() => {
    if (!adminKey) return;
    Promise.all([fetchAddons(), fetchProducts()]).finally(() => setLoading(false));
  }, [adminKey, fetchAddons, fetchProducts]);

  const resetForm = () => {
    setProductId(""); setName(""); setPrice("");
    setEditingId(null); setShowForm(false);
  };

  const startEdit = (a: Addon) => {
    setEditingId(a.id);
    setProductId(a.product_id);
    setName(a.name);
    setPrice(String(a.price));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nama add-on wajib diisi"); return; }
    if (!price || Number(price) <= 0) { toast.error("Harga wajib diisi"); return; }
    if (!editingId && !productId) { toast.error("Pilih produk terlebih dahulu"); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        price: Number(price),
      };
      if (!editingId) body.product_id = productId;

      const url = editingId ? `/api/admin/addons/${editingId}` : "/api/admin/addons";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? "Add-on diperbarui" : "Add-on ditambahkan");
        resetForm();
        fetchAddons();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal menyimpan add-on");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus add-on ini?")) return;
    try {
      await fetch(`/api/admin/addons/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      toast.success("Add-on dihapus");
      fetchAddons();
    } catch {
      toast.error("Gagal menghapus add-on");
    }
  };

  const toggleActive = async (addon: Addon) => {
    try {
      await fetch(`/api/admin/addons/${addon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ is_active: addon.is_active ? 0 : 1 }),
      });
      fetchAddons();
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  // Group addons by product
  const groupedAddons = addons.reduce<Record<string, { productName: string; items: Addon[] }>>((acc, addon) => {
    const key = addon.product_id;
    if (!acc[key]) {
      const product = products.find((p) => p.id === key);
      acc[key] = { productName: addon.product_name || product?.name || "Produk Tidak Dikenal", items: [] };
    }
    acc[key].items.push(addon);
    return acc;
  }, {});

  const priceNum = Number(price);

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
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">Kelola Add-ons</span>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-lg">{showForm ? "close" : "add"}</span>
            {showForm ? "Tutup" : "Tambah Add-on"}
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="botanical-card rounded-2xl p-6 space-y-5 animate-scale-in">
            <h3 className="font-headline font-bold text-on-surface">{editingId ? "Edit Add-on" : "Tambah Add-on Baru"}</h3>

            {/* Product Select */}
            {!editingId && (
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Produk *</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
                >
                  <option value="">Pilih produk...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Nama Add-on *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Extra Cheese"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Harga (Rp) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="5000"
                min="0"
                step="500"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
              />
              {priceNum > 0 && (
                <p className="text-xs text-primary font-medium">{formatCurrency(priceNum)}</p>
              )}
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

        {/* Grouped Add-ons List */}
        {Object.entries(groupedAddons).map(([, group]) => (
          <div key={group.productName} className="space-y-3">
            {/* Product Section Header */}
            <div className="flex items-center gap-2 pt-2">
              <span className="material-symbols-outlined text-primary text-lg">restaurant_menu</span>
              <h3 className="font-headline font-bold text-on-surface text-sm uppercase tracking-wider">{group.productName}</h3>
              <span className="text-xs text-on-surface-variant">({group.items.length})</span>
            </div>

            {group.items.map((addon, i) => (
              <div
                key={addon.id}
                className={`botanical-card rounded-2xl p-4 flex gap-4 items-center animate-fade-in-up ${!addon.is_active ? "opacity-50" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">add_circle</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-headline font-bold text-on-surface truncate">{addon.name}</h4>
                    {!addon.is_active && (
                      <span className="text-[10px] bg-error-container/30 text-error px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-primary font-bold font-headline">{formatCurrency(addon.price)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(addon)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
                    title={addon.is_active ? "Nonaktifkan" : "Aktifkan"}
                  >
                    <span className="material-symbols-outlined text-lg text-on-surface-variant" style={{ fontVariationSettings: addon.is_active ? "'FILL' 1" : "'FILL' 0" }}>
                      {addon.is_active ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                  <button
                    onClick={() => startEdit(addon)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-lg text-on-surface-variant">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(addon.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container/30 transition-colors"
                    title="Hapus"
                  >
                    <span className="material-symbols-outlined text-lg text-error">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {addons.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 block">playlist_add</span>
            <p className="font-body">Belum ada add-on. Tambahkan add-on pertama!</p>
          </div>
        )}
      </main>
    </div>
  );
}
