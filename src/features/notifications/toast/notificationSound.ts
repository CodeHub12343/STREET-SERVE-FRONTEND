'use client';

/**
 * ═══ The arrival cue. ═══
 *
 * **Synthesised, not a file.** A two-note cue is a few lines of WebAudio and no network request, no
 * cache entry, and no 30KB asset blocking on a phone that is probably on mobile data. It also means
 * the sound cannot 404 in production, which is the usual way notification audio dies quietly.
 *
 * The character brief — very short, soft, modern, non-intrusive — maps onto three concrete choices:
 *
 *  • **A rising perfect fifth** (C6 → G6). Rising reads as "something arrived"; falling reads as
 *    "something finished or failed". A fifth is consonant enough to bear hearing forty times a day,
 *    which is the actual bar for a notification sound.
 *  • **Sine waves, ~180ms total.** No harmonics to grate, and short enough that it never competes
 *    with whatever the person is listening to.
 *  • **A real attack/decay envelope.** An oscillator started and stopped abruptly produces a click
 *    at both ends — the single thing that makes synthesised audio sound cheap.
 *
 * Critical (fraud, security) gets a third note and slightly more level. Still quiet: urgency is
 * carried by the visual state, and a loud sound in a pocket at 3am is not urgency, it is a reason
 * to turn notifications off entirely.
 */

const SOUND_PREF_KEY = 'streetserve.notificationSound';

/** One shared context. Browsers cap how many a page may create, and we need exactly one. */
let ctx: AudioContext | null = null;

/**
 * Autoplay policy: a context created before any user gesture starts `suspended`, and playing into
 * it is silent. So the context is created lazily on first PLAY attempt, and if it is suspended we
 * resume it — which succeeds once the user has interacted with the page at least once. No prompt,
 * no error, just silence until they have touched the app, which is the correct behaviour.
 */
function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null; // no WebAudio — the toast is still fully usable without it
  ctx ??= new Ctor();
  return ctx;
}

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  // Default ON, but a stored "off" always wins. Absence of a preference is not a preference.
  return window.localStorage.getItem(SOUND_PREF_KEY) !== 'off';
}

export function setNotificationSoundEnabled(on: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOUND_PREF_KEY, on ? 'on' : 'off');
}

/** One note with a proper envelope — the ramps are what stop it clicking. */
function tone(
  ac: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  peak: number,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startAt);

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + 0.012); // fast attack, no click
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration); // natural tail

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/**
 * Play the arrival cue. Never throws and never blocks — a notification must still arrive on a
 * device where audio is unavailable, muted, or blocked by policy.
 */
export function playNotificationSound(priority: 'informational' | 'important' | 'critical'): void {
  if (!isNotificationSoundEnabled()) return;
  /**
   * Someone who has asked for less motion has usually asked for a calmer interface generally.
   * Treated as a signal to stay quiet too, which costs nothing and is what they almost certainly
   * meant.
   */
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const ac = audioContext();
  if (!ac) return;

  const start = () => {
    const t = ac.currentTime;
    // Deliberately low. This sits under conversation and music rather than over them.
    const level = priority === 'critical' ? 0.09 : priority === 'important' ? 0.07 : 0.055;

    tone(ac, 1046.5, t, 0.09, level); // C6
    tone(ac, 1568.0, t + 0.075, 0.13, level * 0.85); // G6 — a rising fifth
    // A third note ONLY for critical, so the difference is audible without being louder.
    if (priority === 'critical') tone(ac, 2093.0, t + 0.16, 0.14, level * 0.8); // C7
  };

  if (ac.state === 'suspended') {
    // Resolves once the page has had a user gesture; silently ignored before that.
    void ac.resume().then(start).catch(() => undefined);
    return;
  }
  start();
}
