"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/products", {
        headers: { "x-admin-key": password },
      });

      if (res.ok) {
        sessionStorage.setItem("himeal_admin_key", password);
        router.push("/admin/dashboard");
      } else {
        setError("Password salah");
      }
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-primary tracking-[-0.04em] font-headline uppercase">
            HI MEAL!
          </h1>
          <p className="text-sm text-on-surface-variant font-body">Admin Panel</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleLogin} className="botanical-card rounded-3xl p-8 space-y-6">
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-lg pointer-events-none">
                lock
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password admin"
                className="w-full pl-12 pr-4 py-4 bg-surface-container border-none rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-error font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-4 bg-primary text-on-primary font-headline font-bold rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <p className="text-center text-xs text-outline">
          <a href="/" className="hover:text-primary transition-colors">
            &larr; Kembali ke beranda
          </a>
        </p>
      </div>
    </div>
  );
}
