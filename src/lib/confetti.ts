export async function celebrate() {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

export async function celebrateSmall() {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
}
