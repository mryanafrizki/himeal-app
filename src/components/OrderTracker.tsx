interface OrderTrackerProps {
  currentStatus: string;
  estimatedMinutes?: number;
}

const STEPS = [
  { key: "confirmed", label: "Pesanan Diterima" },
  { key: "preparing", label: "Sedang Dimasak" },
  { key: "delivering", label: "Sedang Diantar" },
  { key: "delivered", label: "Selesai" },
] as const;

function getStepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 7.5L5.5 10L11 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OrderTracker({
  currentStatus,
  estimatedMinutes,
}: OrderTrackerProps) {
  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Status Pesanan
        </h3>
        {estimatedMinutes !== undefined && estimatedMinutes > 0 && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-light">
            ~{estimatedMinutes} menit
          </span>
        )}
      </div>

      {/* Vertical stepper */}
      <div className="space-y-0">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Indicator column */}
              <div className="flex flex-col items-center">
                {/* Dot / check */}
                <div
                  className={`
                    flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all
                    ${
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-primary bg-primary/20 text-primary-light"
                          : "border-border bg-secondary text-muted-foreground"
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : (
                    <span className="text-[10px] font-bold">{i + 1}</span>
                  )}
                </div>

                {/* Connecting line */}
                {i < STEPS.length - 1 && (
                  <div
                    className={`
                      w-0.5 flex-1 min-h-[28px] transition-colors
                      ${isCompleted ? "bg-primary" : "bg-border"}
                    `}
                  />
                )}
              </div>

              {/* Label */}
              <div className={`pb-5 ${i === STEPS.length - 1 ? "pb-0" : ""}`}>
                <p
                  className={`
                    pt-1 text-sm font-medium transition-colors
                    ${
                      isCompleted
                        ? "text-primary-light"
                        : isCurrent
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }
                  `}
                >
                  {step.label}
                </p>
                {isCurrent && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Sedang berlangsung
                    </span>
                  </div>
                )}
                {isFuture && isCurrent === false && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground/50">
                    Menunggu
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
