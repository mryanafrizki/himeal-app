"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  logo_url: string;
  link_url: string;
  sort_order: number;
  is_active: number;
  created_at: string;
}

export default function AdminPartnersPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [link, setLink] = useState("");
  const [sortOrder, setSortOrder] = useState("");

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) { router.push("/admin"); return; }
    setAdminKey(key);
  }, [router]);

  const fetchPartners = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/partners", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setPartners(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminKey, router]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const resetForm = () => {
    setName(""); setLogo(""); setLink(""); setSortOrder("");
    setEditingId(null); setShowForm(false);
  };

  const startEdit = (p: Partner) => {
    setEditingId(p.id);
    setName(p.name);
    setLogo(p.logo_url);
    setLink(p.link_url || "");
    setSortOrder(String(p.sort_order));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nama partner wajib diisi"); return; }
    if (!logo.trim()) { toast.error("URL logo wajib diisi"); return; }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        logo_url: logo.trim(),
        link_url: link.trim() || "",
        sort_order: sortOrder ? Number(sortOrder) : 0,
      };

      const url = editingId ? `/api/admin/partners/${editingId}` : "/api/admin/partners";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? "Partner diperbarui" : "Partner ditambahkan");
        resetForm();
        fetchPartners();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal menyimpan partner");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus partner ini?")) return;
    try {
      await fetch(`/api/admin/partners/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      toast.success("Partner dihapus");
      fetchPartners();
    } catch {
      toast.error("Gagal menghapus partner");
    }
  };

  const toggleActive = async (partner: Partner) => {
    try {
      await fetch(`/api/admin/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ is_active: partner.is_active ? 0 : 1 }),
      });
      fetchPartners();
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
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">Kelola Partners</span>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-lg">{showForm ? "close" : "add"}</span>
            {showForm ? "Tutup" : "Tambah Partner"}
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="botanical-card rounded-2xl p-6 space-y-5 animate-scale-in">
            <h3 className="font-headline font-bold text-on-surface">{editingId ? "Edit Partner" : "Tambah Partner Baru"}</h3>

            {/* Name */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Nama Partner *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: GrabFood"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Logo URL */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">URL Logo *</label>
              <input
                type="url"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Logo Preview */}
            {logo && (
              <div className="flex items-center gap-4 p-4 bg-surface-container rounded-xl">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0">
                  <img
                    src={logo}
                    alt="Logo preview"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <span className="text-xs text-on-surface-variant">Preview logo</span>
              </div>
            )}

            {/* Link URL */}
            <div className="space-y-2">
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">Link URL (Opsional)</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://partner-website.com"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary"
              />
            </div>

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

        {/* Partners List */}
        <div className="space-y-3">
          {partners.map((partner, i) => (
            <div
              key={partner.id}
              className={`botanical-card rounded-2xl p-4 flex gap-4 items-center animate-fade-in-up ${!partner.is_active ? "opacity-50" : ""}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Logo */}
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0">
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt={partner.name}
                    className="w-full h-full object-contain p-1.5"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span className="material-symbols-outlined text-surface-container text-2xl">handshake</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline font-bold text-on-surface truncate">{partner.name}</h3>
                  {!partner.is_active && (
                    <span className="text-[10px] bg-error-container/30 text-error px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">
                      Nonaktif
                    </span>
                  )}
                </div>
                {partner.link_url && (
                  <p className="text-xs text-primary truncate mt-0.5">{partner.link_url}</p>
                )}
                <p className="text-xs text-outline mt-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">sort</span>
                  Urutan: {partner.sort_order}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(partner)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
                  title={partner.is_active ? "Nonaktifkan" : "Aktifkan"}
                >
                  <span className="material-symbols-outlined text-lg text-on-surface-variant" style={{ fontVariationSettings: partner.is_active ? "'FILL' 1" : "'FILL' 0" }}>
                    {partner.is_active ? "visibility" : "visibility_off"}
                  </span>
                </button>
                <button
                  onClick={() => startEdit(partner)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
                  title="Edit"
                >
                  <span className="material-symbols-outlined text-lg text-on-surface-variant">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(partner.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container/30 transition-colors"
                  title="Hapus"
                >
                  <span className="material-symbols-outlined text-lg text-error">delete</span>
                </button>
              </div>
            </div>
          ))}

          {partners.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block">handshake</span>
              <p className="font-body">Belum ada partner. Tambahkan partner pertama!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
