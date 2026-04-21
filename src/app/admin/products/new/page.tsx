"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";

export default function NewProductPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) { router.push("/admin"); return; }
    setAdminKey(key);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({
          name: name.trim(),
          price: parseInt(price, 10),
          description: description.trim(),
          image: image.trim(),
        }),
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

  const priceNum = parseInt(price, 10);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0C1410]/90 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex items-center gap-3 px-6 py-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-headline font-bold text-on-surface">Tambah Menu</h1>
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

          {/* Image Upload / URL */}
          <div className="space-y-3">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
              Gambar
            </label>

            {/* Upload button */}
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-low rounded-xl text-sm cursor-pointer hover:bg-surface-container transition-colors border border-dashed border-outline-variant/30 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <span className="material-symbols-outlined text-lg text-primary">upload</span>
                <span className="text-on-surface-variant">{uploading ? "Mengupload..." : "Upload Gambar"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { toast.error("Ukuran file maksimal 2MB"); return; }
                    setUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append("file", file);
                      const res = await fetch("/api/admin/upload", { method: "POST", headers: { "x-admin-key": adminKey }, body: fd });
                      const data = await res.json();
                      if (res.ok && data.url) { setImage(data.url); toast.success("Gambar berhasil diupload"); }
                      else { toast.error(data.error || "Upload gagal"); }
                    } catch { toast.error("Upload gagal"); }
                    finally { setUploading(false); e.target.value = ""; }
                  }}
                />
              </label>
            </div>

            {/* Or paste URL */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-outline-variant/20" />
              <span className="text-[10px] text-outline uppercase tracking-widest">atau tempel URL</span>
              <div className="flex-1 h-px bg-outline-variant/20" />
            </div>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
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

          {error && (
            <p className="text-sm text-error font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim() || !price}
            className="w-full py-4 bg-primary text-on-primary font-headline font-bold rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Menyimpan..." : "Simpan Menu"}
          </button>
        </form>
      </main>
    </div>
  );
}
