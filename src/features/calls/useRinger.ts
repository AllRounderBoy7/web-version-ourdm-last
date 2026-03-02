const audio = typeof Audio !== "undefined" ? new Audio("/sounds/ring.wav") : null;
if (audio) {
  audio.loop = true;
  audio.preload = "auto";
}

export function useRinger() {
  const start = () => {
    audio?.play().catch(() => {});
  };
  const stop = () => {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  };
  return { start, stop };
}
