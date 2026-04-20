"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface FeedbackItem {
  id: number;
  subject: string;
  email: string;
  message: string;
  created_at: string;
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) { router.push("/admin"); return; }
    setAdminKey(key);
  }, [router]);

  const fetchFeedback = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/feedback?page=${page}&limit=10`, { headers: { "x-admin-key": adminKey } });
      if (res.status === 401) { router.push("/admin"); return; }
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(Array.isArray(data) ? data : data.feedbacks || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminKey, page, router]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

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
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">Feedback</span>
          </div>
          <span className="text-xs text-on-surface-variant">{feedbacks.length} pesan</span>
        </div>
      </header>

      <main className="px-6 py-6 max-w-5xl mx-auto space-y-3">
        {feedbacks.map((fb, i) => {
          const isExpanded = expandedId === fb.id;
          const date = new Date(fb.created_at);
          const dateStr = date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
          const timeStr = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          const preview = fb.message.length > 80 ? fb.message.slice(0, 80) + "..." : fb.message;

          return (
            <div
              key={fb.id}
              className="botanical-card rounded-2xl overflow-hidden animate-fade-in-up cursor-pointer transition-all hover:border-primary/20"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => setExpandedId(isExpanded ? null : fb.id)}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline font-bold text-on-surface truncate">{fb.subject}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">{fb.email}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-[10px] text-outline">{dateStr}</p>
                    <p className="text-[10px] text-outline">{timeStr}</p>
                  </div>
                </div>

                {!isExpanded && (
                  <p className="text-sm text-on-surface-variant mt-2">{preview}</p>
                )}

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/15 animate-fade-in">
                    <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{fb.message}</p>
                    <div className="mt-4 flex gap-3">
                      <a
                        href={`mailto:${fb.email}?subject=Re: ${encodeURIComponent(fb.subject)}`}
                        className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-symbols-outlined text-sm">reply</span>
                        Balas via Email
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {feedbacks.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 block">feedback</span>
            <p className="font-body">Belum ada feedback.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-4">
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
      </main>
    </div>
  );
}
