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
    <div className="flex flex-col items-center">
      <p className="font-label text-sm text-on-surface-variant font-medium">Waktu tersisa</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="material-symbols-outlined text-primary-container text-lg">schedule</span>
        <span
          className={`font-headline font-bold text-2xl tracking-wider ${
            isExpired
              ? "text-error"
              : isUrgent
                ? "text-error"
                : "text-primary-container"
          }`}
        >
          {formatTime(secondsLeft)}
        </span>
      </div>
      {isUrgent && !isExpired && (
        <p className="text-xs text-error mt-2">Segera selesaikan pembayaran</p>
      )}
    </div>
  );
}
