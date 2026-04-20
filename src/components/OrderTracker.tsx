interface OrderTrackerProps {
  currentStatus: string;
  estimatedMinutes?: number;
}

const STEPS = [
  { key: "confirmed", label: "Pesanan Diterima", icon: "check_circle", description: "Pesanan kamu sudah diterima" },
  { key: "preparing", label: "Sedang Dimasak", icon: "restaurant", description: "Pesanan sedang diproses di dapur" },
  { key: "ready", label: "Siap Dikirim", icon: "package_2", description: "Pesanan siap dan menunggu kurir" },
  { key: "delivering", label: "Sedang Diantar", icon: "delivery_dining", description: "Kurir sedang menuju lokasi kamu" },
  { key: "delivered", label: "Selesai", icon: "task_alt", description: "Pesanan telah sampai" },
] as const;

function getStepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

export default function OrderTracker({
  currentStatus,
  estimatedMinutes,
}: OrderTrackerProps) {
  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="space-y-0">
      {/* Estimated Time Card */}
      {estimatedMinutes !== undefined && estimatedMinutes > 0 && (
        <section className="bg-[#111a11] rounded-3xl p-8 relative overflow-hidden mb-8">
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

          return (
            <div
              key={step.key}
              className={`relative flex items-start gap-6 ${i < STEPS.length - 1 ? "pb-10" : ""} ${isFuture ? "opacity-40" : ""}`}
            >
              {/* Step circle */}
              <div
                className={`z-10 w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-[#0a0f0a] ${
                  isCompleted
                    ? "bg-primary-container"
                    : isCurrent
                      ? "bg-primary shadow-[0_0_20px_rgba(157,211,170,0.3)]"
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
                <h3
                  className={`font-headline font-bold ${
                    isCurrent ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {step.label}
                </h3>
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
