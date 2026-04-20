"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function FeedbackPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim()) { toast.error("Subjek wajib diisi"); return; }
    if (!email.trim()) { toast.error("Email wajib diisi"); return; }
    if (!message.trim()) { toast.error("Pesan wajib diisi"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), email: email.trim(), message: message.trim() }),
      });
      if (res.ok) {
        setSubmitted(true);
        toast.success("Terima kasih atas masukan Anda!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal mengirim feedback");
      }
    } catch {
      toast.error("Terjadi kesalahan, coba lagi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="font-body text-on-surface antialiased min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-6 h-16 bg-[#0C1410]/70 backdrop-blur-2xl bg-gradient-to-b from-background to-transparent">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="hover:opacity-80 transition-opacity text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline font-bold tracking-tight text-lg text-primary">Kritik dan Saran</h1>
        </div>
      </header>

      <main className="min-h-screen pt-24 pb-32 px-6 max-w-2xl mx-auto">
        {/* Hero Decorative Element */}
        <div className="mb-12 relative overflow-hidden rounded-xl h-48 bg-surface-container animate-fade-in">
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-surface-container to-tertiary/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute bottom-6 left-8">
            <p className="font-headline text-3xl font-extrabold tracking-tight text-primary">Suara Anda Berharga.</p>
            <p className="text-on-surface-variant font-medium mt-1">Bantu kami menciptakan pengalaman kuliner terbaik.</p>
          </div>
        </div>

        {submitted ? (
          <div className="bg-surface-container rounded-[1.5rem] p-8 text-center space-y-6 animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-xl text-on-surface">Pesan Terkirim!</h3>
              <p className="text-on-surface-variant mt-2">Terima kasih atas masukan Anda. Kami akan terus meningkatkan layanan.</p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-primary-container text-on-primary-container px-8 py-3 rounded-full font-headline font-bold text-sm transition-all active:scale-95"
            >
              Kembali ke Menu
            </button>
          </div>
        ) : (
          <section className="bg-surface-container rounded-[1.5rem] p-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="space-y-8">
              {/* Subject */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant tracking-wide">
                  <span className="material-symbols-outlined text-xs">subject</span>
                  SUBJEK
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-6 text-on-surface placeholder:text-outline-variant transition-all focus:ring-1 focus:ring-primary/30"
                  placeholder="Apa yang ingin Anda sampaikan?"
                />
              </div>

              {/* Email */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant tracking-wide">
                  <span className="material-symbols-outlined text-xs">alternate_email</span>
                  ALAMAT EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-6 text-on-surface placeholder:text-outline-variant transition-all focus:ring-1 focus:ring-primary/30"
                  placeholder="nama@email.com"
                />
              </div>

              {/* Message */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant tracking-wide">
                    <span className="material-symbols-outlined text-xs">chat_bubble</span>
                    PESAN
                  </label>
                  <span className="text-[10px] font-medium text-outline">{message.length}/500</span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-6 text-on-surface placeholder:text-outline-variant transition-all resize-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Tuliskan pesan Anda di sini..."
                  rows={5}
                />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-secondary-container to-primary py-5 rounded-full text-on-primary font-bold text-lg active:scale-[0.98] transition-transform duration-300 shadow-lg shadow-primary/10 disabled:opacity-50"
              >
                {submitting ? "Mengirim..." : "Kirim"}
              </button>
            </div>
          </section>
        )}

        {/* Footer Text */}
        <footer className="mt-8 text-center px-4">
          <p className="text-xs text-on-surface-variant leading-relaxed opacity-60">
            Terima kasih atas masukan Anda. Kami akan terus meningkatkan layanan.
          </p>
        </footer>
      </main>
    </div>
  );
}
