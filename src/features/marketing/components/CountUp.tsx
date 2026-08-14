'use client';

/**
 * CountUp (animation spec §5) — 900ms ease-out count-up in tabular numerals, fired once when
 * 50% visible. Reduced motion renders the final value instantly (§7). Width is stable because
 * the parent renders `.tnum` and the final value is the widest frame.
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

const DURATION_MS = 900;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(reduced ? value : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el || started.current) return;

    let raf = 0;
    const run = () => {
      started.current = true;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / DURATION_MS);
        setDisplay(Math.round(easeOut(p) * value));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === 'undefined') {
      setDisplay(value);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].intersectionRatio >= 0.5) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, reduced]);

  return (
    <span ref={ref} className="tnum">
      {display.toLocaleString('en-US')}
    </span>
  );
}
