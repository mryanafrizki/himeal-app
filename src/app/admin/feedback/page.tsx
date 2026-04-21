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

interface ReviewItem {
  id: number;
  order_id: string;
  rating: number;
  comment: string | null;
  customer_name: string;
  created_at: string;
}

type TabType = "feedback" | "ulasan";

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("feedback");

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackTotal, setFeedbackTotal] = useState(0);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);

  useEffect(() => {
    const key = sessionStorage.getItem("himeal_admin_key");
    if (!key) { router.push("/admin"); return; }
    setAdminKey(key);
  }, [router]);

  const fetchFeedback = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/feedback?page=${feedbackPage}&limit=10`, { headers: { "x-admin-key": adminKey } });
      if (res.status === 401) { router.push("/admin"); return; }
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(Array.isArray(data) ? data : data.feedback || []);
        setFeedbackTotalPages(data.totalPages || 1);
        setFeedbackTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    finally { setFeedbackLoading(false); }
  }, [adminKey, feedbackPage, router]);

  const fetchReviews = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/reviews?page=${reviewsPage}&limit=10`, { headers: { "x-admin-key": adminKey } });
      if (res.status === 401) { router.push("/admin"); return; }
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setReviewsTotalPages(data.totalPages || 1);
        setReviewsTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    finally { setReviewsLoading(false); }
  }, [adminKey, reviewsPage, router]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);
  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const loading = activeTab === "feedback" ? feedbackLoading : reviewsLoading;

  if (loading && !adminKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-on-surface-variant font-body">Memuat...</div>
      </div>
    );
  }

  function renderStars(rating: number) {
    const stars: React.ReactNode[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? "text-yellow-400" : "text-outline/40"}>
          {"\u2605"}
        </span>
      );
    }
    return <span className="text-lg tracking-wide">{stars}</span>;
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
            <span className="text-xl font-black text-primary tracking-[-0.04em] font-headline uppercase">Feedback & Ulasan</span>
          </div>
          <span className="text-xs text-on-surface-variant">
            {activeTab === "feedback" ? `${feedbackTotal} pesan` : `${reviewsTotal} ulasan`}
          </span>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 max-w-5xl mx-auto px-6">
          <button
            onClick={() => setActiveTab("feedback")}
            className={`px-5 py-2.5 text-sm font-bold font-headline tracking-wide transition-colors border-b-2 ${
              activeTab === "feedback"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Feedback
          </button>
          <button
            onClick={() => setActiveTab("ulasan")}
            className={`px-5 py-2.5 text-sm font-bold font-headline tracking-wide transition-colors border-b-2 ${
              activeTab === "ulasan"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Ulasan
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-5xl mx-auto space-y-3">
        {/* ─── Feedback Tab ─── */}
        {activeTab === "feedback" && (
          <>
            {feedbackLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-on-surface-variant font-body">Memuat...</div>
              </div>
            ) : (
              <>
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

                {/* Feedback Pagination */}
                {feedbackTotalPages > 1 && (
                  <div className="flex justify-between items-center pt-4">
                    <p className="text-xs text-outline font-medium">Halaman {feedbackPage} dari {feedbackTotalPages}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
                        disabled={feedbackPage <= 1}
                        className="w-8 h-8 rounded bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-secondary disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>
                      <button
                        onClick={() => setFeedbackPage((p) => Math.min(feedbackTotalPages, p + 1))}
                        disabled={feedbackPage >= feedbackTotalPages}
                        className="w-8 h-8 rounded bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-secondary hover:bg-primary-container hover:text-on-primary transition-colors disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ─── Ulasan Tab ─── */}
        {activeTab === "ulasan" && (
          <>
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-on-surface-variant font-body">Memuat...</div>
              </div>
            ) : (
              <>
                {reviews.map((review, i) => {
                  const date = new Date(review.created_at);
                  const dateStr = date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

                  return (
                    <div
                      key={review.id}
                      className="botanical-card rounded-2xl overflow-hidden animate-fade-in-up"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-headline font-bold text-on-surface">{review.customer_name}</h3>
                            <p className="text-xs text-on-surface-variant mt-0.5">Order #{review.order_id}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-[10px] text-outline">{dateStr}</p>
                          </div>
                        </div>
                        <div className="mt-1 mb-2">
                          {renderStars(review.rating)}
                        </div>
                        {review.comment && (
                          <p className="text-sm text-on-surface-variant leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {reviews.length === 0 && (
                  <div className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-2 block">reviews</span>
                    <p className="font-body">Belum ada ulasan.</p>
                  </div>
                )}

                {/* Reviews Pagination */}
                {reviewsTotalPages > 1 && (
                  <div className="flex justify-between items-center pt-4">
                    <p className="text-xs text-outline font-medium">Halaman {reviewsPage} dari {reviewsTotalPages}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                        disabled={reviewsPage <= 1}
                        className="w-8 h-8 rounded bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-secondary disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>
                      <button
                        onClick={() => setReviewsPage((p) => Math.min(reviewsTotalPages, p + 1))}
                        disabled={reviewsPage >= reviewsTotalPages}
                        className="w-8 h-8 rounded bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-secondary hover:bg-primary-container hover:text-on-primary transition-colors disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
