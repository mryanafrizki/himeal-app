"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0C1410",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        color: "#F0F5ED",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: "3rem", color: "#FF6B6B" }}
      >
        error
      </span>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
        Terjadi Kesalahan
      </h2>
      <p style={{ fontSize: "0.875rem", color: "#8FA89A", textAlign: "center", maxWidth: "20rem" }}>
        {error.message || "Halaman tidak dapat dimuat. Silakan coba lagi."}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#2D7A3E",
            color: "#F0F5ED",
            border: "none",
            borderRadius: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Coba Lagi
        </button>
        <a
          href="/"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#1E2E26",
            color: "#8FA89A",
            border: "none",
            borderRadius: "0.75rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Kembali
        </a>
      </div>
    </div>
  );
}
