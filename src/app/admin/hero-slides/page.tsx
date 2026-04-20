"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  sort_order: number;
  is_active: number;
  created_at: string;
}

export default function AdminHeroSlidesPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [image, setImage] = useState("");
  const [sortOrder, setSortOrder] = useState("");

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) { router.push("/admin"); return; }
    setAdminKey(key);
  }, [router]);

  const fetchSlides = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/hero-slides", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setSlides(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminKey, router]);

  useEffect(() => { fetchSlides(); }, [fetchSlides]);

  const resetForm = () => {
    setTitle(""); setSubtitle(""); setImage(""); setSortOrder("");
    setEditingId(null); setShowForm(false);
  };

  const startEdit = (s: HeroSlide) => {
    setEditingId(s.id);
    setTitle(s.title);
    setSubtitle(s.subtitle);
    setImage(s.image);
    setSortOrder(String(s.sort_order));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!image.trim()) { toast.error("URL gambar wajib diisi"); return; }

    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        image: image.trim(),
        sort_order: sortOrder ? Number(sortOrder) : 0,
      };

      const url = editingId ? `/api/admin/hero-slides/${editingId}` : "/api/admin/hero-slides";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? "Slide diperbarui" : "Slide ditambahkan");
        resetForm();
        fetchSlides();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal menyimpan slide");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus slide ini?")) return;
    try {
      await fetch(`/api/admin/hero-slides/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      toast.success("Slide dihapus");
      fetchSlides();
    } catch {
      toast.error("Gagal menghapus slide");
    }
  };

  const toggleActive = async (slide: HeroSlide) => {
    try {
      await fetch(`/api/admin/hero-slides/${slide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ is_active: slide.is_active ? 0 : 1 }),
      });
      fetchSlides();
    } catch {
      toast.error("Gagal mengubah status");
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
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">Kelola Hero Slides</span>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-lg">{showForm ? "close" : "add"}</span>
            {showForm ? "Tutup" : "Tambah Slide"}
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="botanical-card rounded-2xl p-6 space-y-5 animate-scale-in">
            <h3 className="font-headline font-bold text-on-surface">{editingId ? "Edit Slide" : "Tambah Slide Baru"}</h3>

            {/* Title */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Judul *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Menu Baru Minggu Ini"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Deskripsi singkat slide..."
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">URL Gambar *</label>
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
              <div className="h-40 rounded-2xl overflow-hidden bg-surface-container">
                <img
                  src={image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}

            {/* Sort Order */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Urutan</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
              />
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

        {/* Slides List */}
        <div className="space-y-3">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className={`botanical-card rounded-2xl overflow-hidden animate-fade-in-up ${!slide.is_active ? "opacity-50" : ""}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Image Preview Banner */}
              {slide.image && (
                <div className="h-32 bg-surface-container">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-headline font-bold text-on-surface truncate">{slide.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        slide.is_active ? "bg-primary/10 text-primary" : "bg-error-container/30 text-error"
                      }`}>
                        {slide.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    {slide.subtitle && (
                      <p className="text-sm text-on-surface-variant mt-1 truncate">{slide.subtitle}</p>
                    )}
                    <p className="text-xs text-outline mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">sort</span>
                      Urutan: {slide.sort_order}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button
                      onClick={() => toggleActive(slide)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
                      title={slide.is_active ? "Nonaktifkan" : "Aktifkan"}
                    >
                      <span className="material-symbols-outlined text-lg text-on-surface-variant" style={{ fontVariationSettings: slide.is_active ? "'FILL' 1" : "'FILL' 0" }}>
                        {slide.is_active ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                    <button
                      onClick={() => startEdit(slide)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-lg text-on-surface-variant">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(slide.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container/30 transition-colors"
                      title="Hapus"
                    >
                      <span className="material-symbols-outlined text-lg text-error">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {slides.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block">slideshow</span>
              <p className="font-body">Belum ada slide. Tambahkan slide pertama!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
