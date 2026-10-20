type AudioContextClass = typeof AudioContext;

let context: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (context) return context;
  // Older Safari only has the prefixed version; test environments have neither.
  const prefixed = (window as Window & { webkitAudioContext?: AudioContextClass })
    .webkitAudioContext;
  const Ctor: AudioContextClass | undefined =
    typeof AudioContext !== 'undefined' ? AudioContext : prefixed;
  if (!Ctor) return null;
  try {
    context = new Ctor();
    return context;
  } catch {
    return null;
  }
}

/**
 * A short, gentle sound after the student reports a result: a rising chime for
 * "right" and a soft two-note tone for "wrong" (never a harsh buzzer).
 * Generated with the Web Audio API, so there are no sound files to load.
 * Does nothing if audio is unavailable.
 */
export function playResultSound(correct: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const notes = correct ? [523.25, 659.25, 783.99] : [392.0, 329.63];
    const start = ctx.currentTime;
    notes.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const t = start + i * 0.11;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(t);
      oscillator.stop(t + 0.25);
    });
  } catch {
    // Sound is a nice extra; never let it break practice.
  }
}
