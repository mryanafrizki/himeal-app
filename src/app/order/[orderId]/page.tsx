"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  formatCurrency,
  ORDER_STATUS_LABELS,
  PREP_TIME_MINUTES,
  AVG_DELIVERY_SPEED_KMH,
  type OrderStatus,
} from "@/lib/constants";
import { celebrate } from "@/lib/confetti";
import OrderTracker from "@/components/OrderTracker";
import WhatsAppButton from "@/components/WhatsAppButton";

interface OrderData {
  id: string;
  customer_address: string;
  distance_km: number;
  delivery_fee: number;
  subtotal: number;
  total: number;
  order_status: OrderStatus;
  payment_status: string;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
    notes: string | null;
    product_image?: string;
  }>;
}

interface ChatMessage {
  id: number;
  message: string;
  sender: "user" | "admin";
  created_at: string;
}

interface ReviewData {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface QueueData {
  position: number;
  activeOrders: number;
}

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rating state
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<ReviewData | null>(null);
  const [reviewLoaded, setReviewLoaded] = useState(false);

  const retryCountRef = useRef(0);
  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/${orderId}`);
      if (!res.ok) {
        // Retry up to 3 times before giving up (order might still be updating)
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          setTimeout(() => fetchOrder(), 2000);
          return;
        }
        toast.error("Pesanan tidak ditemukan");
        router.replace("/");
        return;
      }
      retryCountRef.current = 0;
      const raw = await res.json();
      const data: OrderData = { ...raw, items: Array.isArray(raw.items) ? raw.items : [] };
      // Fire confetti when order transitions to delivered
      if (data.order_status === "delivered" && prevStatusRef.current && prevStatusRef.current !== "delivered") {
        celebrate();
      }
      prevStatusRef.current = data.order_status;
      setOrder(data);

      // Calculate estimated time
      if (
        data.order_status === "confirmed" ||
        data.order_status === "preparing"
      ) {
        const deliveryTimeMin =
          (data.distance_km / AVG_DELIVERY_SPEED_KMH) * 60;
        const prepTime = PREP_TIME_MINUTES;
        setEstimatedMinutes(Math.ceil(prepTime + deliveryTimeMin));
      } else if (data.order_status === "delivering") {
        const deliveryTimeMin =
          (data.distance_km / AVG_DELIVERY_SPEED_KMH) * 60;
        setEstimatedMinutes(Math.ceil(deliveryTimeMin));
      } else {
        setEstimatedMinutes(null);
      }

      // Stop polling if delivered or cancelled
      if (
        data.order_status === "delivered" ||
        data.order_status === "cancelled"
      ) {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch {
      toast.error("Gagal memuat data pesanan");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Poll for status updates
  useEffect(() => {
    pollingRef.current = setInterval(fetchOrder, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchOrder]);

  // FEAT-10: Chat polling
  const isOrderActive = order && !["delivered", "cancelled"].includes(order.order_status);

  const fetchChat = useCallback(async () => {
    try {
      const lastId = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].id : 0;
      const res = await fetch(`/api/order/${orderId}/chat?after=${lastId}`);
      if (!res.ok) return;
      const raw = await res.json();
      const data: ChatMessage[] = Array.isArray(raw) ? raw : [];
      if (data.length > 0) {
        setChatMessages((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          const existingIds = new Set(arr.map((m) => m.id));
          const newMsgs = data.filter((m) => !existingIds.has(m.id));
          return newMsgs.length > 0 ? [...arr, ...newMsgs] : arr;
        });
      }
    } catch { /* ignore */ }
  }, [orderId, chatMessages]);

  useEffect(() => {
    if (!isOrderActive) return;
    // Initial fetch
    fetch(`/api/order/${orderId}/chat?after=0`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setChatMessages(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [orderId, isOrderActive]);

  useEffect(() => {
    if (!isOrderActive) {
      if (chatPollingRef.current) clearInterval(chatPollingRef.current);
      return;
    }
    chatPollingRef.current = setInterval(fetchChat, 5000);
    return () => {
      if (chatPollingRef.current) clearInterval(chatPollingRef.current);
    };
  }, [isOrderActive, fetchChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatSending) return;
    setChatSending(true);
    try {
      const res = await fetch(`/api/order/${orderId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput.trim(), sender: "user" }),
      });
      if (res.ok) {
        const msg: ChatMessage = await res.json();
        setChatMessages((prev) => [...prev, msg]);
        setChatInput("");
      }
    } catch {
      toast.error("Gagal mengirim pesan");
    } finally {
      setChatSending(false);
    }
  };

  // FEAT-8: Rating
  useEffect(() => {
    if (!order || order.order_status !== "delivered") return;
    fetch(`/api/order/${orderId}/review`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const review = data?.review || data;
        if (review && review.id) {
          setExistingReview(review);
          setRating(review.rating);
          setReviewComment(review.comment || "");
        }
        setReviewLoaded(true);
      })
      .catch(() => setReviewLoaded(true));
  }, [order?.order_status, orderId]);

  const submitReview = async () => {
    if (rating === 0) {
      toast.error("Pilih rating terlebih dahulu");
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/order/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: reviewComment.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setExistingReview(data?.review || data);
        toast.success("Terima kasih atas ulasan Anda!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal mengirim ulasan");
      }
    } catch {
      toast.error("Gagal mengirim ulasan");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/order/${orderId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link disalin");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-on-surface-variant">Pesanan tidak ditemukan</p>
          <button
            onClick={() => router.replace("/")}
            className="text-primary underline text-sm"
          >
            Kembali ke menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="font-body selection:bg-primary-container selection:text-on-primary-container">
      {/* TopAppBar */}
      <header className="bg-[#0C1410]/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-outline-variant/15">
        <div className="flex justify-between items-center px-6 h-20 w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="hover:opacity-80 transition-opacity active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined text-primary">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <h1 className="font-headline tracking-tight font-bold text-lg text-primary">Status Pesanan</h1>
              <span className="font-label text-[10px] tracking-wider text-on-surface-variant opacity-70">Order #{orderId}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto space-y-8">
        {/* Status Tracker */}
        <OrderTracker
          currentStatus={order.order_status}
          estimatedMinutes={estimatedMinutes ?? undefined}
          isPickup={order.customer_address.startsWith("Pickup") || order.customer_address.startsWith("Takeaway")}
        />

        {/* FEAT-8: Rating Section (when delivered) */}
        {order.order_status === "delivered" && reviewLoaded && (
          <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 animate-fade-in-up">
            <h4 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              {existingReview ? "Ulasan Anda" : "Beri Rating"}
            </h4>

            {/* Stars */}
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => !existingReview && setRating(star)}
                  disabled={!!existingReview}
                  className={`transition-all duration-200 ${existingReview ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95"}`}
                >
                  <span
                    className={`material-symbols-outlined text-3xl ${
                      star <= rating ? "text-tertiary" : "text-outline-variant"
                    }`}
                    style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>

            {/* Comment */}
            {!existingReview ? (
              <>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value.slice(0, 500))}
                  placeholder="Tulis komentar (opsional, maks 500 karakter)"
                  rows={3}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary resize-none mb-2"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-outline">{reviewComment.length}/500</span>
                  <button
                    onClick={submitReview}
                    disabled={reviewSubmitting || rating === 0}
                    className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-full font-headline font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    {reviewSubmitting ? "Mengirim..." : "Kirim Ulasan"}
                  </button>
                </div>
              </>
            ) : (
              <div>
                {existingReview.comment && (
                  <p className="text-on-surface-variant text-sm leading-relaxed">{existingReview.comment}</p>
                )}
                <p className="text-[10px] text-outline mt-2">
                  Dikirim {new Date(existingReview.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            )}
          </section>
        )}

        {/* FEAT-10: Chat Section (when order is active) */}
        {isOrderActive && (
          <section className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">chat</span>
              <h4 className="font-headline font-bold text-on-surface">Chat Pesanan</h4>
            </div>

            {/* Messages */}
            <div className="max-h-80 overflow-y-auto px-4 py-4 space-y-4 hide-scrollbar">
              {chatMessages.length === 0 && (
                <p className="text-center text-on-surface-variant text-sm py-8">Belum ada pesan. Kirim pesan ke admin.</p>
              )}
              {chatMessages.map((msg) => {
                const isUser = msg.sender === "user";
                const time = new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%] ${isUser ? "self-end ml-auto" : ""}`}>
                    <div className={`p-3.5 rounded-tl-lg rounded-tr-xl ${isUser ? "rounded-bl-xl bg-secondary-container" : "rounded-br-xl bg-surface-container-highest"} shadow-md`}>
                      <p className={`text-sm leading-relaxed ${isUser ? "text-on-secondary-container" : "text-on-surface"}`}>{msg.message}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[10px] font-medium uppercase tracking-tighter text-on-surface-variant">{isUser ? "Anda" : "Admin"}</span>
                      <span className="w-1 h-1 rounded-full bg-surface-variant" />
                      <span className="text-[10px] font-medium text-on-surface-variant">{time}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-outline-variant/10 flex items-center gap-3">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Ketik pesan..."
                rows={1}
                className="flex-grow bg-surface-container-low border-none rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={sendChat}
                disabled={chatSending || !chatInput.trim()}
                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-[0_8px_16px_rgba(91,219,111,0.2)] active:scale-95 transition-transform duration-300 disabled:opacity-40"
              >
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
            </div>
          </section>
        )}

        {/* Chat closed message */}
        {order && ["delivered", "cancelled"].includes(order.order_status) && chatMessages.length > 0 && (
          <div className="text-center py-3">
            <span className="text-xs text-outline bg-surface-container px-4 py-2 rounded-full">Chat ditutup</span>
          </div>
        )}

        {/* Order Summary Card */}
        <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h4 className="font-headline font-bold text-lg mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            Ringkasan Pesanan
          </h4>
          <div className="space-y-4">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-surface-container-high overflow-hidden shrink-0">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-container/20 to-surface-container" />
                    )}
                  </div>
                  <div>
                    <p className="font-headline font-bold text-on-surface">{item.product_name}</p>
                    <p className="text-sm text-on-surface-variant">x{item.quantity}</p>
                    {item.notes && (
                      <p className="text-xs text-on-surface-variant mt-0.5">{item.notes}</p>
                    )}
                  </div>
                </div>
                <span className="font-headline font-bold text-on-surface">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/15 flex justify-between items-center">
            <span className="font-label text-sm uppercase tracking-widest text-on-surface-variant">Total Pembayaran</span>
            <span className="font-headline text-2xl font-black text-primary">{formatCurrency(order.total)}</span>
          </div>
        </section>

        {/* Address */}
        <section className="bg-surface-container-low rounded-3xl p-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <p className="text-[10px] uppercase font-label tracking-wider text-on-surface-variant mb-2">Alamat Pengantaran</p>
          <p className="font-headline font-bold text-on-surface">{order.customer_address}</p>
          <p className="text-sm text-on-surface-variant mt-1">{order.distance_km} km</p>
        </section>
      </main>

      {/* Bottom Action Area */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#0C1410]/90 backdrop-blur-2xl px-6 pt-4 pb-8 border-t border-outline-variant/15 z-50">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <WhatsAppButton
            message={`Halo HiMeal, saya ingin menanyakan pesanan ${orderId}`}
          />
          <button
            onClick={copyLink}
            className="w-full h-14 bg-transparent border border-outline-variant/30 rounded-full flex items-center justify-center gap-3 hover:bg-surface-container transition-colors active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-on-surface-variant">content_copy</span>
            <span className="font-headline font-bold text-on-surface">Salin Link</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
