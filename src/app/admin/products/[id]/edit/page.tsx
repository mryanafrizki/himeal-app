"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  is_active: number;
  sort_order: number;
  promo_price: number | null;
  promo_end_date: string | null;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Promo state
  const [promoActive, setPromoActive] = useState(false);
  const [promoPrice, setPromoPrice] = useState("");
  const [promoEndDate, setPromoEndDate] = useState("");

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) { router.push("/admin"); return; }
    setAdminKey(key);
  }, [router]);

  useEffect(() => {
    if (!adminKey) return;

    (async () => {
      try {
        const res = await fetch("/api/admin/products", {
          headers: { "x-admin-key": adminKey },
        });
        if (res.status === 401) { router.push("/admin"); return; }
        const products: Product[] = await res.json();
        const product = products.find((p) => p.id === id);
        if (!product) {
          router.push("/admin/dashboard");
          return;
        }
        setName(product.name);
        setPrice(String(product.price));
        setDescription(product.description);
        setImage(product.image);
        if (product.promo_price && product.promo_end_date) {
          setPromoActive(true);
          setPromoPrice(String(product.promo_price));
          // Convert ISO date to datetime-local format
          const endDate = new Date(product.promo_end_date);
          const localStr = endDate.getFullYear() + "-" +
            String(endDate.getMonth() + 1).padStart(2, "0") + "-" +
            String(endDate.getDate()).padStart(2, "0") + "T" +
            String(endDate.getHours()).padStart(2, "0") + ":" +
            String(endDate.getMinutes()).padStart(2, "0");
          setPromoEndDate(localStr);
        }
      } catch {
        setError("Gagal memuat data produk");
      } finally {
        setLoading(false);
      }
    })();
  }, [adminKey, id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        price: parseInt(price, 10),
        description: description.trim(),
        image: image.trim(),
      };

      if (promoActive && promoPrice && promoEndDate) {
        body.promoPrice = parseInt(promoPrice, 10);
        body.promoEndDate = new Date(promoEndDate).toISOString();
      } else {
        body.promoPrice = null;
        body.promoEndDate = null;
      }

      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });

      if (res.status === 401) { router.push("/admin"); return; }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal menyimpan");
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Hapus produk ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });

      if (res.status === 401) { router.push("/admin"); return; }
      router.push("/admin/dashboard");
    } catch {
      setError("Gagal menghapus produk");
    } finally {
      setDeleting(false);
    }
  };

  const priceNum = parseInt(price, 10);

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
        <div className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-headline font-bold text-on-surface">Edit Menu</h1>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-error hover:text-error/80 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            {deleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
              Nama Menu *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Grilled Chicken Salad"
              className="w-full px-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
              Harga (Rp) *
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="20000"
              min="1000"
              step="500"
              className="w-full px-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary"
              required
            />
            {priceNum > 0 && (
              <p className="text-xs text-primary font-medium">{formatCurrency(priceNum)}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
              Deskripsi
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat menu..."
              rows={3}
              className="w-full px-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
              URL Gambar
            </label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Image Preview */}
          {image && (
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
                Preview
              </label>
              <div className="h-48 rounded-2xl overflow-hidden bg-surface-container">
                <img
                  src={image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
          )}

          {/* Promo Section */}
          <div className="space-y-4 pt-4 border-t border-outline-variant/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">local_offer</span>
                <h3 className="font-headline font-bold text-on-surface">Promo</h3>
              </div>
              <button
                type="button"
                onClick={() => setPromoActive(!promoActive)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  promoActive ? "bg-primary" : "bg-surface-container-highest"
                }`}
              >
                <span
                  className={`absolute top-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                    promoActive ? "left-[26px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              {promoActive ? "Promo aktif — harga promo akan ditampilkan ke pelanggan" : "Aktifkan untuk menampilkan harga promo"}
            </p>

            {promoActive && (
              <div className="space-y-4 animate-scale-in">
                {/* Promo Price */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
                    Harga Promo (Rp) *
                  </label>
                  <input
                    type="number"
                    value={promoPrice}
                    onChange={(e) => setPromoPrice(e.target.value)}
                    placeholder="15000"
                    min="0"
                    step="500"
                    className="w-full px-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary"
                  />
                  {Number(promoPrice) > 0 && (
                    <p className="text-xs text-primary font-medium">{formatCurrency(Number(promoPrice))}</p>
                  )}
                </div>

                {/* Promo End Date */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
                    Berakhir Pada *
                  </label>
                  <input
                    type="datetime-local"
                    value={promoEndDate}
                    onChange={(e) => setPromoEndDate(e.target.value)}
                    className="w-full px-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Promo Preview */}
                {Number(promoPrice) > 0 && priceNum > 0 && (
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <p className="text-[10px] font-bold text-primary tracking-widest uppercase mb-3">Preview Harga</p>
                    <div className="flex items-center gap-3">
                      <span className="text-on-surface-variant line-through text-sm">{formatCurrency(priceNum)}</span>
                      <span className="text-primary font-headline font-black text-xl">{formatCurrency(Number(promoPrice))}</span>
                      {priceNum > Number(promoPrice) && (
                        <span className="text-[10px] bg-error/20 text-error px-2 py-0.5 rounded-full font-bold">
                          -{Math.round(((priceNum - Number(promoPrice)) / priceNum) * 100)}%
                        </span>
                      )}
                    </div>
                    {promoEndDate && (
                      <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        Berakhir: {new Date(promoEndDate).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-error font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim() || !price}
            className="w-full py-4 bg-primary text-on-primary font-headline font-bold rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </main>
    </div>
  );
}
