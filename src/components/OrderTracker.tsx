interface OrderTrackerProps {
  currentStatus: string;
  estimatedMinutes?: number;
  isPickup?: boolean;
  timestamps?: {
    confirmed_at?: string | null;
    preparing_at?: string | null;
    ready_at?: string | null;
    delivering_at?: string | null;
    delivered_at?: string | null;
  };
}

const DELIVERY_STEPS = [
  { key: "confirmed", tsKey: "confirmed_at", label: "Pesanan Diterima", icon: "check_circle", description: "Pesanan kamu sudah diterima" },
  { key: "preparing", tsKey: "preparing_at", label: "Sedang Dimasak", icon: "restaurant", description: "Pesanan sedang diproses di dapur" },
  { key: "ready", tsKey: "ready_at", label: "Siap Dikirim", icon: "package_2", description: "Pesanan siap dan menunggu kurir" },
  { key: "delivering", tsKey: "delivering_at", label: "Sedang Diantar", icon: "delivery_dining", description: "Kurir sedang menuju lokasi kamu" },
  { key: "delivered", tsKey: "delivered_at", label: "Selesai", icon: "task_alt", description: "Pesanan telah sampai" },
] as const;

const PICKUP_STEPS = [
  { key: "confirmed", tsKey: "confirmed_at", label: "Pesanan Diterima", icon: "check_circle", description: "Pesanan kamu sudah diterima" },
  { key: "preparing", tsKey: "preparing_at", label: "Sedang Dimasak", icon: "restaurant", description: "Pesanan sedang diproses di dapur" },
  { key: "ready", tsKey: "ready_at", label: "Siap Diambil", icon: "shopping_bag", description: "Pesanan siap, silakan ambil di toko" },
  { key: "delivered", tsKey: "delivered_at", label: "Selesai", icon: "task_alt", description: "Pesanan telah diambil" },
] as const;

function formatTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

export default function OrderTracker({
  currentStatus,
  estimatedMinutes,
  isPickup = false,
  timestamps,
}: OrderTrackerProps) {
  const STEPS = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="space-y-0">
      {/* Estimated Time Card */}
      {estimatedMinutes !== undefined && estimatedMinutes > 0 && (
        <section className="bg-surface-container rounded-3xl p-8 relative overflow-hidden mb-8 animate-fade-in-up">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <p className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant mb-2">Waktu Kedatangan</p>
            <h2 className="font-headline text-4xl font-extrabold text-primary tracking-tighter">Estimasi: ~{estimatedMinutes} menit</h2>
            <div className="mt-6 h-2 w-full bg-surface-container-highest rounded-full overflow-hidden flex gap-1">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full"
                style={{ width: `${Math.min(100, ((currentIndex + 1) / STEPS.length) * 100)}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Vertical Status Stepper */}
      <section className="space-y-0 relative">
        <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-outline-variant/20" />

        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;
          const ts = timestamps?.[step.tsKey as keyof typeof timestamps];
          const timeStr = formatTime(ts);

          return (
            <div
              key={step.key}
              className={`relative flex items-start gap-6 ${i < STEPS.length - 1 ? "pb-10" : ""} ${isFuture ? "opacity-40" : ""} animate-fade-in-up`}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {/* Step circle */}
              <div
                className={`z-10 w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-surface-container-lowest ${
                  isCompleted
                    ? "bg-primary-container"
                    : isCurrent
                      ? "bg-primary shadow-[0_0_20px_rgba(91,219,111,0.3)] animate-pulse-glow"
                      : "bg-surface-container-highest"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl ${
                    isCompleted
                      ? "text-on-primary-container"
                      : isCurrent
                        ? "text-on-primary"
                        : "text-on-surface-variant"
                  }`}
                  style={isCurrent ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {isCompleted ? "check" : step.icon}
                </span>
              </div>

              {/* Step content */}
              <div className="pt-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-headline font-bold ${
                      isCurrent ? "text-primary" : "text-on-surface"
                    }`}
                  >
                    {step.label}
                  </h3>
                  {timeStr && (isCompleted || isCurrent) && (
                    <span className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-mono">
                      {timeStr}
                    </span>
                  )}
                </div>
                <p className={`text-sm font-medium ${isCurrent ? "text-on-surface" : "text-on-surface-variant"}`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
