"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";

interface Ingredient {
  id: string;
  product_id: string;
  name: string;
  amount: number;
  unit: string;
  bulk_price: number;
  bulk_amount: number;
  used_amount: number;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  hpp: number;
}

// Local row for editing (may not yet be saved)
interface IngredientRow {
  id: string;
  name: string;
  unit: string;
  bulk_amount: string;
  bulk_price: string;
  used_amount: string;
  _saved: boolean; // whether this row exists server-side
  _dirty: boolean; // whether this row has unsaved changes
}

function toRow(ing: Ingredient): IngredientRow {
  return {
    id: ing.id,
    name: ing.name,
    unit: ing.unit,
    bulk_amount: String(ing.bulk_amount),
    bulk_price: String(ing.bulk_price),
    used_amount: String(ing.used_amount),
    _saved: true,
    _dirty: false,
  };
}

function perUnit(row: IngredientRow): number {
  const ba = parseFloat(row.bulk_amount) || 0;
  const bp = parseFloat(row.bulk_price) || 0;
  return ba > 0 ? bp / ba : 0;
}

function rowHpp(row: IngredientRow): number {
  return perUnit(row) * (parseFloat(row.used_amount) || 0);
}

export default function HppCalculatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sellingPrice, setSellingPrice] = useState("");
  const [currentHpp, setCurrentHpp] = useState(0);

  // Temp counter for new row IDs (client-side only)
  const [tempCounter, setTempCounter] = useState(0);

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) { router.push("/admin"); return; }
    setAdminKey(key);
  }, [router]);

  // Fetch product info
  const fetchProduct = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/admin/products", { headers: { "x-admin-key": adminKey } });
      if (res.status === 401) { router.push("/admin"); return; }
      const products: Product[] = await res.json();
      const p = products.find((x) => x.id === id);
      if (!p) { router.push("/admin/dashboard"); return; }
      setProduct(p);
      setSellingPrice(String(p.price));
    } catch { /* ignore */ }
  }, [adminKey, id, router]);

  // Fetch ingredients
  const fetchIngredients = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/products/${id}/ingredients`, { headers: { "x-admin-key": adminKey } });
      if (res.status === 401) { router.push("/admin"); return; }
      if (res.ok) {
        const data = await res.json();
        setRows((data.ingredients || []).map(toRow));
        setCurrentHpp(data.currentHpp || 0);
      }
    } catch { /* ignore */ }
  }, [adminKey, id, router]);

  useEffect(() => {
    if (!adminKey) return;
    Promise.all([fetchProduct(), fetchIngredients()]).finally(() => setLoading(false));
  }, [adminKey, fetchProduct, fetchIngredients]);

  // Calculated totals
  const totalHpp = rows.reduce((sum, r) => sum + rowHpp(r), 0);
  const sell = parseFloat(sellingPrice) || 0;
  const profitAmount = sell - totalHpp;
  const profitPct = sell > 0 ? ((sell - totalHpp) / sell) * 100 : 0;
  const hppPct = sell > 0 ? (totalHpp / sell) * 100 : 0;

  // Row operations
  const updateRow = (idx: number, field: keyof IngredientRow, value: string) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value, _dirty: true } : r));
  };

  const addRow = () => {
    const newId = `_new_${tempCounter}`;
    setTempCounter((c) => c + 1);
    setRows((prev) => [
      ...prev,
      { id: newId, name: "", unit: "gr", bulk_amount: "", bulk_price: "", used_amount: "", _saved: false, _dirty: true },
    ]);
  };

  const deleteRow = async (idx: number) => {
    const row = rows[idx];
    if (row._saved) {
      // Delete from server
      try {
        const res = await fetch(`/api/admin/products/${id}/ingredients?ingredientId=${row.id}`, {
          method: "DELETE",
          headers: { "x-admin-key": adminKey },
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentHpp(data.newHpp ?? currentHpp);
          toast.success("Bahan dihapus");
        } else {
          toast.error("Gagal menghapus bahan");
          return;
        }
      } catch {
        toast.error("Gagal menghapus bahan");
        return;
      }
    }
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save all rows
  const handleSave = async () => {
    setSaving(true);
    let lastHpp = currentHpp;

    try {
      for (const row of rows) {
        if (!row._dirty) continue;
        if (!row.name.trim()) continue;

        const payload = {
          name: row.name.trim(),
          unit: row.unit,
          bulk_amount: parseFloat(row.bulk_amount) || 0,
          bulk_price: parseFloat(row.bulk_price) || 0,
          used_amount: parseFloat(row.used_amount) || 0,
          amount: parseFloat(row.used_amount) || 0,
        };

        if (row._saved) {
          // Update existing
          const res = await fetch(`/api/admin/products/${id}/ingredients`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
            body: JSON.stringify({ ingredientId: row.id, ...payload }),
          });
          if (res.ok) {
            const data = await res.json();
            lastHpp = data.newHpp ?? lastHpp;
          }
        } else {
          // Create new
          const res = await fetch(`/api/admin/products/${id}/ingredients`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json();
            lastHpp = data.newHpp ?? lastHpp;
          }
        }
      }

      setCurrentHpp(lastHpp);
      toast.success("HPP berhasil disimpan");
      // Refresh to get server-side IDs
      await fetchIngredients();
    } catch {
      toast.error("Gagal menyimpan HPP");
    } finally {
      setSaving(false);
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
        <div className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/admin/products/${id}/edit`)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-lg font-headline font-bold text-on-surface">Kalkulator HPP</h1>
              {product && (
                <p className="text-xs text-on-surface-variant">{product.name}</p>
              )}
            </div>
          </div>
          {product && (
            <div className="text-right">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Harga Jual</p>
              <p className="text-sm font-headline font-bold text-primary">{formatCurrency(product.price)}</p>
            </div>
          )}
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* Current HPP Badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">receipt_long</span>
            <span className="text-xs text-on-surface-variant">HPP Tersimpan:</span>
            <span className="text-sm font-headline font-bold text-on-surface">{formatCurrency(currentHpp)}</span>
          </div>
          {sell > 0 && currentHpp > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
              {Math.round((currentHpp / sell) * 100)}% dari harga jual
            </div>
          )}
        </div>

        {/* Ingredients Table */}
        <div className="botanical-card rounded-2xl overflow-hidden animate-fade-in-up">
          <div className="px-5 py-4 border-b border-outline-variant/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">grocery</span>
              <h2 className="font-headline font-bold text-on-surface">Daftar Bahan</h2>
            </div>
            <span className="text-xs text-on-surface-variant">{rows.length} bahan</span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Jenis</th>
                  <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Jumlah Beli</th>
                  <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Satuan</th>
                  <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Harga Beli</th>
                  <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Per Satuan</th>
                  <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Digunakan</th>
                  <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">HPP</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/8">
                {rows.map((row, idx) => (
                  <tr key={row.id} className="group hover:bg-surface-container-highest/20 transition-colors">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(idx, "name", e.target.value)}
                        placeholder="Nama bahan"
                        className="w-full px-2 py-1.5 bg-surface-container rounded-lg text-sm text-on-surface"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.bulk_amount}
                        onChange={(e) => updateRow(idx, "bulk_amount", e.target.value)}
                        placeholder="0"
                        min="0"
                        step="any"
                        className="w-24 px-2 py-1.5 bg-surface-container rounded-lg text-sm text-on-surface text-right"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.unit}
                        onChange={(e) => updateRow(idx, "unit", e.target.value)}
                        className="px-2 py-1.5 bg-surface-container rounded-lg text-sm text-on-surface"
                      >
                        <option value="gr">gr</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="ltr">ltr</option>
                        <option value="pcs">pcs</option>
                        <option value="bks">bks</option>
                        <option value="btl">btl</option>
                        <option value="sdm">sdm</option>
                        <option value="sdt">sdt</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.bulk_price}
                        onChange={(e) => updateRow(idx, "bulk_price", e.target.value)}
                        placeholder="0"
                        min="0"
                        step="any"
                        className="w-28 px-2 py-1.5 bg-surface-container rounded-lg text-sm text-on-surface text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-xs text-on-surface-variant font-mono">
                        {formatCurrency(Math.round(perUnit(row)))}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.used_amount}
                        onChange={(e) => updateRow(idx, "used_amount", e.target.value)}
                        placeholder="0"
                        min="0"
                        step="any"
                        className="w-24 px-2 py-1.5 bg-surface-container rounded-lg text-sm text-on-surface text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-sm font-bold text-primary font-mono">
                        {formatCurrency(Math.round(rowHpp(row)))}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => deleteRow(idx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-primary/20">
                    <td colSpan={6} className="px-4 py-3 text-right">
                      <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Total HPP</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-base font-black text-primary font-headline">{formatCurrency(Math.round(totalHpp))}</span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-outline-variant/10">
            {rows.map((row, idx) => (
              <div key={row.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(idx, "name", e.target.value)}
                    placeholder="Nama bahan"
                    className="flex-1 px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface font-medium"
                  />
                  <button
                    onClick={() => deleteRow(idx)}
                    className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-on-surface-variant block mb-1">Jml Beli</label>
                    <input
                      type="number"
                      value={row.bulk_amount}
                      onChange={(e) => updateRow(idx, "bulk_amount", e.target.value)}
                      placeholder="0"
                      min="0"
                      step="any"
                      className="w-full px-2 py-1.5 bg-surface-container rounded-lg text-xs text-on-surface text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-on-surface-variant block mb-1">Satuan</label>
                    <select
                      value={row.unit}
                      onChange={(e) => updateRow(idx, "unit", e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface-container rounded-lg text-xs text-on-surface"
                    >
                      <option value="gr">gr</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="ltr">ltr</option>
                      <option value="pcs">pcs</option>
                      <option value="bks">bks</option>
                      <option value="btl">btl</option>
                      <option value="sdm">sdm</option>
                      <option value="sdt">sdt</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-on-surface-variant block mb-1">Harga Beli</label>
                    <input
                      type="number"
                      value={row.bulk_price}
                      onChange={(e) => updateRow(idx, "bulk_price", e.target.value)}
                      placeholder="0"
                      min="0"
                      step="any"
                      className="w-full px-2 py-1.5 bg-surface-container rounded-lg text-xs text-on-surface text-right"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-on-surface-variant block mb-1">Per Satuan</label>
                    <p className="text-xs text-on-surface-variant font-mono px-2 py-1.5">{formatCurrency(Math.round(perUnit(row)))}</p>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-on-surface-variant block mb-1">Digunakan</label>
                    <input
                      type="number"
                      value={row.used_amount}
                      onChange={(e) => updateRow(idx, "used_amount", e.target.value)}
                      placeholder="0"
                      min="0"
                      step="any"
                      className="w-full px-2 py-1.5 bg-surface-container rounded-lg text-xs text-on-surface text-right"
                    />
                  </div>
                  <div className="text-right">
                    <label className="text-[9px] uppercase tracking-widest text-on-surface-variant block mb-1">HPP</label>
                    <p className="text-sm font-bold text-primary font-mono">{formatCurrency(Math.round(rowHpp(row)))}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Mobile total */}
            {rows.length > 0 && (
              <div className="px-4 py-3 flex items-center justify-between bg-primary/5">
                <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Total HPP</span>
                <span className="text-lg font-black text-primary font-headline">{formatCurrency(Math.round(totalHpp))}</span>
              </div>
            )}
          </div>

          {/* Empty state */}
          {rows.length === 0 && (
            <div className="text-center py-12 px-4">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-3 block">grocery</span>
              <p className="text-sm text-on-surface-variant mb-1">Belum ada bahan</p>
              <p className="text-xs text-on-surface-variant/60">Tambahkan bahan untuk menghitung HPP produk ini</p>
            </div>
          )}

          {/* Add row button */}
          <div className="px-4 py-3 border-t border-outline-variant/10">
            <button
              type="button"
              onClick={addRow}
              className="w-full py-2.5 rounded-xl border border-dashed border-primary/30 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Tambah Bahan
            </button>
          </div>
        </div>

        {/* Profit Simulator */}
        <div className="botanical-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="px-5 py-4 border-b border-outline-variant/15 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">analytics</span>
            <h2 className="font-headline font-bold text-on-surface">Simulasi Profit</h2>
          </div>

          <div className="p-5 space-y-5">
            {/* HPP */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-error/60"></span>
                <span className="text-sm text-on-surface-variant">HPP</span>
              </div>
              <span className="text-lg font-headline font-black text-on-surface">{formatCurrency(Math.round(totalHpp))}</span>
            </div>

            {/* Selling Price */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                <span className="text-sm text-on-surface-variant">Harga Jual</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-on-surface-variant">Rp</span>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  min="0"
                  step="500"
                  className="w-32 px-3 py-2 bg-surface-container rounded-xl text-sm text-on-surface text-right font-bold"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-outline-variant/15" />

            {/* Percentages */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-container-low">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Persentase HPP</p>
                <p className={`text-2xl font-headline font-black ${hppPct > 70 ? "text-error" : hppPct > 50 ? "text-yellow-400" : "text-on-surface"}`}>
                  {sell > 0 ? hppPct.toFixed(1) : "0"}%
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-low">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Persentase Profit</p>
                <p className={`text-2xl font-headline font-black ${profitPct < 30 ? "text-error" : profitPct < 50 ? "text-yellow-400" : "text-primary"}`}>
                  {sell > 0 ? profitPct.toFixed(1) : "0"}%
                </p>
              </div>
            </div>

            {/* Profit amount */}
            {sell > 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">Profit per Porsi</span>
                <span className={`text-xl font-headline font-black ${profitAmount >= 0 ? "text-primary" : "text-error"}`}>
                  {formatCurrency(Math.round(profitAmount))}
                </span>
              </div>
            )}

            {/* Visual bar */}
            {sell > 0 && totalHpp > 0 && (
              <div className="space-y-2">
                <div className="h-6 rounded-full overflow-hidden flex bg-surface-container-highest/30">
                  <div
                    className="h-full bg-error/50 transition-all duration-500 flex items-center justify-center"
                    style={{ width: `${Math.min(hppPct, 100)}%` }}
                  >
                    {hppPct >= 15 && (
                      <span className="text-[9px] font-bold text-white/80">HPP</span>
                    )}
                  </div>
                  <div
                    className="h-full bg-primary/50 transition-all duration-500 flex items-center justify-center"
                    style={{ width: `${Math.max(100 - Math.min(hppPct, 100), 0)}%` }}
                  >
                    {profitPct >= 15 && (
                      <span className="text-[9px] font-bold text-white/80">Profit</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-on-surface-variant">
                  <span>{formatCurrency(Math.round(totalHpp))}</span>
                  <span>{formatCurrency(Math.round(profitAmount))}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || rows.every((r) => !r._dirty)}
          className="w-full py-4 bg-primary text-on-primary font-headline font-bold rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          {saving ? "Menyimpan..." : "Simpan HPP"}
        </button>
      </main>
    </div>
  );
}
