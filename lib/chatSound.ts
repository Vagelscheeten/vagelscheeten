// Kurzer Hinweiston für neue Chat-Nachrichten (Web Audio API, kein Asset nötig).
// Funktioniert auch auf Mobile, sofern der Audio-Kontext einmal durch eine
// Nutzer-Interaktion entsperrt wurde (iOS/Android Autoplay-Policy).

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Audio-Kontext (re)aktivieren – muss aus einer Nutzer-Interaktion heraus passieren. */
export function unlockChatSound() {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

let armed = false;
/** Einmalig globale Gesten-Listener registrieren, die den Ton entsperren. */
export function armChatSound() {
  if (armed || typeof window === 'undefined') return;
  armed = true;
  const handler = () => unlockChatSound();
  window.addEventListener('pointerdown', handler, { once: true });
  window.addEventListener('touchend', handler, { once: true });
  window.addEventListener('keydown', handler, { once: true });
}

/** Kurzen Hinweiston abspielen. */
export function playChatSound() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.36);
  } catch {
    /* ignore */
  }
}
