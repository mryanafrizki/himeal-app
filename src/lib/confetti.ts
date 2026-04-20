import confetti from "canvas-confetti";

export function celebrate() {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

export function celebrateSmall() {
  confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
}
