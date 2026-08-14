'use client';

/**
 * Scroll-reveal system (animation spec §5): container opacity 0→1 + 16px rise over
 * motion.reveal(500ms), children stagger 70ms capped at 5 groups, triggered ONCE at 20%
 * visibility by ONE shared IntersectionObserver (spec §8 — not one observer per element).
 *
 * Reduced-motion contract (§7): reveals become opacity-only ≤100ms. SSR/no-JS safety: the
 * hidden state is applied by Framer at hydration only — the server HTML ships fully visible.
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { m, useReducedMotion, type Variants } from 'motion/react';

const EASE_DECELERATE = [0.2, 0, 0, 1] as const;
const STAGGER_S = 0.07;
const STAGGER_CAP = 5;

/* ---------- shared IntersectionObserver (one per config, module-level) ---------- */

type RevealCallback = () => void;
let sharedObserver: IntersectionObserver | null = null;
const targets = new WeakMap<Element, RevealCallback>();

function observe(el: Element, cb: RevealCallback): () => void {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio < 0.2) continue;
          const fire = targets.get(entry.target);
          if (fire) {
            fire();
            targets.delete(entry.target);
            sharedObserver?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 },
    );
  }
  targets.set(el, cb);
  sharedObserver.observe(el);
  return () => {
    targets.delete(el);
    sharedObserver?.unobserve(el);
  };
}

/** Once-only visibility via the shared observer. Starts visible when IO is unavailable. */
function useRevealOnce<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    // Already in view on mount (above-the-fold after hydration) → reveal immediately.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setShown(true);
      return;
    }
    return observe(el, () => setShown(true));
  }, []);

  return { ref, shown };
}

/* ---------- variants ---------- */

function containerVariants(reduced: boolean, stagger: boolean): Variants {
  if (reduced) {
    // y:0 included so a rise offset applied during the hydration render (reduced not yet
    // known) snaps home instead of sticking.
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.1 } },
    };
  }
  return {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: EASE_DECELERATE,
        ...(stagger ? { staggerChildren: STAGGER_S } : {}),
      },
    },
  };
}

function itemVariants(reduced: boolean, order?: number): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.1 } },
    };
  }
  return {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: EASE_DECELERATE,
        // Explicit order caps the stagger at 5 groups (spec §5): items 6+ ride group 5.
        ...(order !== undefined ? { delay: Math.min(order, STAGGER_CAP - 1) * STAGGER_S } : {}),
      },
    },
  };
}

/* ---------- components ---------- */

const InGroupContext = createContext(false);

export interface RevealProps {
  children: ReactNode;
  /** Stagger direct RevealItem children instead of moving as one block. */
  stagger?: boolean;
  /** Fires once when the reveal triggers (SectionShell uses this for section_view analytics). */
  onReveal?: () => void;
  className?: string;
}

/** Reveals its content once when 20% enters the viewport. */
export function Reveal({ children, stagger = false, onReveal, className }: RevealProps) {
  const reduced = useReducedMotion() ?? false;
  const { ref, shown } = useRevealOnce<HTMLDivElement>();
  const firedRef = useRef(false);
  useEffect(() => {
    if (shown && !firedRef.current) {
      firedRef.current = true;
      onReveal?.();
    }
  }, [shown, onReveal]);
  return (
    <m.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={shown ? 'visible' : 'hidden'}
      variants={containerVariants(reduced, stagger)}
    >
      <InGroupContext.Provider value={stagger}>{children}</InGroupContext.Provider>
    </m.div>
  );
}

export interface RevealItemProps {
  children: ReactNode;
  /** Stagger slot when used outside a `stagger` container (capped at 5). */
  order?: number;
  className?: string;
}

/** A staggered child — inherits the parent Reveal's timeline, or takes an explicit order. */
export function RevealItem({ children, order, className }: RevealItemProps) {
  const reduced = useReducedMotion() ?? false;
  const inGroup = useContext(InGroupContext);
  return (
    <m.div
      className={className}
      variants={itemVariants(reduced, inGroup ? undefined : order)}
    >
      {children}
    </m.div>
  );
}
