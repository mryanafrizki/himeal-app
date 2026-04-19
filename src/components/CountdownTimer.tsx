"use client";

import { useState, useEffect, useCallback } from "react";

interface CountdownTimerProps {
  expiresAt: string;
  onExpire: () => void;
}

function getTimeLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function CountdownTimer({
  expiresAt,
  onExpire,
}: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => getTimeLeft(expiresAt));

  const handleExpire = useCallback(() => {
    onExpire();
  }, [onExpire]);

  useEffect(() => {
    setSecondsLeft(getTimeLeft(expiresAt));

    const interval = setInterval(() => {
      const remaining = getTimeLeft(expiresAt);
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, handleExpire]);

  const isUrgent = secondsLeft < 120;
  const isExpired = secondsLeft <= 0;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Timer display */}
      <div
        className={`
          rounded-xl border px-6 py-3 text-center font-mono transition-colors duration-300
          ${
            isExpired
              ? "border-destructive/30 bg-destructive/10"
              : isUrgent
                ? "border-destructive/30 bg-destructive/5"
                : "border-primary/30 bg-primary/5"
          }
        `}
      >
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {isExpired ? "Waktu habis" : "Sisa waktu pembayaran"}
        </p>
        <p
          className={`
            mt-1 text-3xl font-bold tabular-nums tracking-tight
            ${isExpired ? "text-destructive" : isUrgent ? "text-destructive" : "text-primary-light"}
          `}
        >
          {formatTime(secondsLeft)}
        </p>
      </div>

      {/* Urgency hint */}
      {isUrgent && !isExpired && (
        <p className="text-xs text-destructive">
          Segera selesaikan pembayaran
        </p>
      )}
    </div>
  );
}
