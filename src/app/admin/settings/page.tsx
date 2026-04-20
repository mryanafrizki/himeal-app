"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";

type StoreMode = "open" | "closed" | "info" | "maintenance";
type FeePayer = "admin" | "user";

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

interface Settings {
  store_mode: StoreMode;
  info_message: string;
  maintenance_message: string;
  operating_hours: Record<string, DaySchedule>;
  qris_active: boolean;
  qris_fee_payer: FeePayer;
}

const DAYS = [
  { key: "senin", label: "Senin" },
  { key: "selasa", label: "Selasa" },
  { key: "rabu", label: "Rabu" },
  { key: "kamis", label: "Kamis" },
  { key: "jumat", label: "Jumat" },
  { key: "sabtu", label: "Sabtu" },
  { key: "minggu", label: "Minggu" },
] as const;

const STORE_MODES: { key: StoreMode; label: string; icon: string; activeColor: string }[] = [
  { key: "open", label: "Open", icon: "check_circle", activeColor: "border-primary bg-primary/10 text-primary" },
  { key: "closed", label: "Closed", icon: "block", activeColor: "border-error bg-error/10 text-error" },
  { key: "info", label: "Info", icon: "info", activeColor: "border-blue-400 bg-blue-400/10 text-blue-400" },
  { key: "maintenance", label: "Maintenance", icon: "build", activeColor: "border-amber-400 bg-amber-400/10 text-amber-400" },
];

const DEFAULT_SETTINGS: Settings = {
  store_mode: "open",
  info_message: "",
  maintenance_message: "",
  operating_hours: Object.fromEntries(
    DAYS.map((d) => [d.key, { enabled: d.key !== "minggu", open: "08:00", close: "22:00" }])
  ),
  qris_active: true,
  qris_fee_payer: "admin",
};

const QRIS_FEE_RATE = 0.007;

export default function AdminSettingsPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) {
      router.push("/admin");
      return;
    }
    setAdminKey(key);
  }, [router]);

  const fetchSettings = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) { router.push("/admin"); return; }
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        const h = data.hours || [];
        // Map API camelCase response to local snake_case Settings
        const hours: Record<string, DaySchedule> = {};
        const dayMap = [6, 0, 1, 2, 3, 4, 5]; // API dayOfWeek (0=Sun) → DAYS index
        for (const dh of h) {
          const dayKey = DAYS[dayMap[dh.dayOfWeek]]?.key;
          if (dayKey) hours[dayKey] = { enabled: dh.isOpen, open: dh.openTime, close: dh.closeTime };
        }
        setSettings((prev) => ({
          ...prev,
          store_mode: s.storeMode || prev.store_mode,
          info_message: s.infoMessage ?? prev.info_message,
          maintenance_message: s.maintenanceMessage ?? prev.maintenance_message,
          qris_active: s.qrisEnabled ?? prev.qris_active,
          qris_fee_payer: s.qrisFeeMode || prev.qris_fee_payer,
          operating_hours: { ...prev.operating_hours, ...hours },
        }));
      }
    } catch {
      /* use defaults */
    } finally {
      setLoading(false);
    }
  }, [adminKey, router]);

  useEffect(() => {
    if (adminKey) fetchSettings();
  }, [adminKey, fetchSettings]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateDaySchedule = (dayKey: string, field: keyof DaySchedule, value: boolean | string) => {
    setSettings((prev) => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [dayKey]: { ...prev.operating_hours[dayKey], [field]: value },
      },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify(settings),
      });
      if (res.status === 401) { router.push("/admin"); return; }
      if (res.ok) {
        toast.success("Pengaturan berhasil disimpan");
        setDirty(false);
      } else {
        toast.error("Gagal menyimpan pengaturan");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setSaving(false);
    }
  };

  // QRIS preview calculation
  const previewNominal = 50000;
  const previewFee = Math.ceil(previewNominal * QRIS_FEE_RATE);
  const previewUniqueCode = 42;
  const previewTotal = settings.qris_fee_payer === "user"
    ? previewNominal + previewFee + previewUniqueCode
    : previewNominal + previewUniqueCode;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-on-surface-variant font-body">Memuat pengaturan...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0C1410]/90 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex justify-between items-center px-6 py-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="hover:opacity-80 transition-opacity active:scale-95"
            >
              <span className="material-symbols-outlined text-primary">arrow_back</span>
            </button>
            <div>
              <h1 className="font-headline font-bold text-lg text-primary tracking-tight">Pengaturan</h1>
              <span className="font-label text-[10px] tracking-wider text-on-surface-variant opacity-70 uppercase">
                System Configuration
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">
              HI MEAL!
            </span>
            <span className="text-xs bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Admin
            </span>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Store Mode + QRIS */}
          <div className="lg:col-span-5 space-y-6">
            {/* STORE MODE */}
            <section className="bg-surface-container rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">storefront</span>
                <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface">Store Mode</h3>
              </div>

              {/* Mode buttons - 2x2 grid */}
              <div className="grid grid-cols-2 gap-3">
                {STORE_MODES.map((mode) => {
                  const isActive = settings.store_mode === mode.key;
                  return (
                    <button
                      key={mode.key}
                      onClick={() => updateSetting("store_mode", mode.key)}
                      className={`flex items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all font-bold text-sm ${
                        isActive
                          ? mode.activeColor
                          : "border-transparent bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-lg"
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {mode.icon}
                      </span>
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              {/* Message textareas */}
              <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1 uppercase tracking-wider">
                    Info Message
                  </label>
                  <textarea
                    value={settings.info_message}
                    onChange={(e) => updateSetting("info_message", e.target.value)}
                    className="w-full bg-surface-container-lowest rounded-xl p-4 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-primary/40 resize-none"
                    placeholder="Pesan info untuk pelanggan..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1 uppercase tracking-wider">
                    Maintenance Message
                  </label>
                  <textarea
                    value={settings.maintenance_message}
                    onChange={(e) => updateSetting("maintenance_message", e.target.value)}
                    className="w-full bg-surface-container-lowest rounded-xl p-4 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-primary/40 resize-none"
                    placeholder="Pesan maintenance untuk pelanggan..."
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* QRIS SETTINGS */}
            <section className="bg-surface-container rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">qr_code_2</span>
                <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface">QRIS Settings</h3>
              </div>

              {/* QRIS Active toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary-container/20 border border-primary/20">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: settings.qris_active ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {settings.qris_active ? "check_circle" : "cancel"}
                  </span>
                  <span className="text-sm font-semibold text-on-surface">QRIS Aktif</span>
                </div>
                <button
                  onClick={() => updateSetting("qris_active", !settings.qris_active)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.qris_active ? "bg-primary" : "bg-surface-container-highest"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.qris_active ? "left-[26px]" : "left-[2px]"
                    }`}
                  />
                </button>
              </div>

              {/* Fee payer radio */}
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">Biaya Transaksi</p>
                <div className="grid grid-cols-1 gap-3">
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                      settings.qris_fee_payer === "admin"
                        ? "border-primary/50 bg-primary/5"
                        : "border-transparent bg-surface-container-low hover:bg-surface-container-highest"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fee_payer"
                      checked={settings.qris_fee_payer === "admin"}
                      onChange={() => updateSetting("qris_fee_payer", "admin")}
                      className="w-4 h-4 text-primary bg-surface-container-highest border-outline-variant focus:ring-primary"
                    />
                    <span className="text-sm font-semibold">Biaya ditanggung Admin</span>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                      settings.qris_fee_payer === "user"
                        ? "border-primary/50 bg-primary/5"
                        : "border-transparent bg-surface-container-low hover:bg-surface-container-highest"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fee_payer"
                      checked={settings.qris_fee_payer === "user"}
                      onChange={() => updateSetting("qris_fee_payer", "user")}
                      className="w-4 h-4 text-primary bg-surface-container-highest border-outline-variant focus:ring-primary"
                    />
                    <span className="text-sm font-semibold">Biaya ditanggung User</span>
                  </label>
                </div>
              </div>

              {/* Calculation Preview */}
              <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-[80px]">calculate</span>
                </div>
                <p className="text-[10px] font-bold text-primary tracking-widest uppercase mb-4">Preview Kalkulasi</p>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Nominal</span>
                    <span className="text-on-surface">{formatCurrency(previewNominal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Fee (0.7%)</span>
                    <span className={settings.qris_fee_payer === "user" ? "text-primary" : "text-on-surface-variant line-through"}>
                      {settings.qris_fee_payer === "user" ? "+" : ""} {formatCurrency(previewFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Kode Unik</span>
                    <span className="text-on-surface">{formatCurrency(previewUniqueCode)}</span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-outline-variant/20 flex justify-between text-lg font-bold text-primary">
                    <span className="font-headline tracking-tighter">Total</span>
                    <span className="font-headline tracking-tighter">{formatCurrency(previewTotal)}</span>
                  </div>
                  {settings.qris_fee_payer === "admin" && (
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      * Fee {formatCurrency(previewFee)} ditanggung admin, tidak dibebankan ke user
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Operating Hours */}
          <div className="lg:col-span-7">
            <section className="bg-surface-container rounded-2xl p-6 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface">Jam Operasional</h3>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/10">
                      <th className="pb-4 px-4 w-28">Hari</th>
                      <th className="pb-4 px-4 w-16">Status</th>
                      <th className="pb-4 px-4">Buka</th>
                      <th className="pb-4 px-4">Tutup</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {DAYS.map((day) => {
                      const schedule = settings.operating_hours[day.key] || { enabled: false, open: "08:00", close: "22:00" };
                      const isWeekend = day.key === "sabtu" || day.key === "minggu";
                      return (
                        <tr key={day.key} className="group hover:bg-surface-container-low transition-colors">
                          <td className={`py-4 px-4 font-bold text-sm ${
                            !schedule.enabled ? "text-error" : isWeekend ? "text-primary" : "text-on-surface"
                          }`}>
                            {day.label}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => updateDaySchedule(day.key, "enabled", !schedule.enabled)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                schedule.enabled ? "bg-primary" : "bg-surface-container-highest"
                              }`}
                            >
                              <span
                                className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-transform ${
                                  schedule.enabled ? "left-[22px]" : "left-[2px]"
                                }`}
                              />
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="time"
                              value={schedule.enabled ? schedule.open : ""}
                              onChange={(e) => updateDaySchedule(day.key, "open", e.target.value)}
                              disabled={!schedule.enabled}
                              className={`w-24 bg-surface-container-lowest rounded-lg text-sm p-2 text-center transition-opacity ${
                                !schedule.enabled ? "opacity-30 cursor-not-allowed" : "focus:ring-1 focus:ring-primary/30"
                              }`}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="time"
                              value={schedule.enabled ? schedule.close : ""}
                              onChange={(e) => updateDaySchedule(day.key, "close", e.target.value)}
                              disabled={!schedule.enabled}
                              className={`w-24 bg-surface-container-lowest rounded-lg text-sm p-2 text-center transition-opacity ${
                                !schedule.enabled ? "opacity-30 cursor-not-allowed" : "focus:ring-1 focus:ring-primary/30"
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Timezone info */}
              <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary shrink-0">auto_schedule</span>
                <div>
                  <p className="text-sm font-bold text-primary">Timezone: Asia/Jakarta (GMT+7)</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Jam operasional mempengaruhi ketersediaan pemesanan. Pastikan waktu akurat untuk menghindari pembatalan pesanan.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Sticky Save Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0C1410]/90 backdrop-blur-xl border-t border-outline-variant/20 z-40">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`w-full py-4 font-bold rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              dirty
                ? "bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-[0_8px_32px_rgba(91,219,111,0.2)]"
                : "bg-surface-container-highest text-on-surface-variant cursor-not-allowed"
            }`}
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                Menyimpan...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                {dirty ? "Simpan Perubahan" : "Tidak Ada Perubahan"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
