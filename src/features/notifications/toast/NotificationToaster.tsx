'use client';

/**
 * ═══ THE REAL-TIME TOAST LAYER ═══
 *
 * The inbox was the only place a notification existed. `useNotificationSocket` received `notify` and
 * refetched the list — so unless you happened to be looking at the notifications screen, a payout
 * going on hold or a checkout needing approval produced nothing but a number quietly changing on a
 * bell you were not looking at. This is the layer that tells you something happened, at the moment
 * it happens, wherever you are.
 *
 * ── Why a separate component from `ToastProvider` ──
 *
 * They look similar and mean opposite things. `ToastProvider` confirms something YOU did ("Notice
 * given", "Payment received") — it is bottom-anchored, near the thumb that caused it, and it is
 * always expected. This is something the SYSTEM did, unprompted, and it is never expected. Sharing
 * one component would force the two to share position, duration, sound and priority rules, and they
 * genuinely disagree about all four.
 *
 * ── The stacking model: one card, with depth ──
 *
 * Three concepts were on the table:
 *
 *   A. A vertical list of toasts. Rejected: four stacked cards is a wall, it pushes the newest one
 *      furthest from the eye, and on a small phone it covers the entire top half of the screen.
 *   B. One toast, newest replaces oldest. Rejected: bursts are common here (a settlement fans out
 *      several notifications at once) and this silently destroys all but the last.
 *   C. **One card with the others peeking behind it, and a count.** Chosen. The newest is always the
 *      one you read, the shoulders show that more arrived, and the count says how many. Bounded at
 *      two visible shoulders regardless of how many are queued, so a burst of twelve looks the same
 *      as a burst of three — deliberately, because past "there are several" the exact number is not
 *      information you can act on from a toast.
 *
 * The inbox remains the complete record. The toast is a signal, never storage: everything it shows
 * is already on its way into the list behind it.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import styled, { css, keyframes } from 'styled-components';
import {
  Hand,
  Receipt,
  Coins,
  ShieldAlert,
  BadgeCheck,
  MessageCircle,
  Bell,
  X,
} from 'lucide-react';
import { playNotificationSound } from './notificationSound';

/** Mirrors the inbox's categories, so one notification looks like itself in both places. */
export type ToastCategory =
  | 'wave'
  | 'order'
  | 'payout'
  | 'dispute'
  | 'verification'
  | 'message'
  | 'system';

export type ToastPriority = 'informational' | 'important' | 'critical';

export interface IncomingNotification {
  category: ToastCategory;
  title: string;
  body: string;
  deeplink?: string | null;
}

interface QueuedToast extends IncomingNotification {
  key: number;
  priority: ToastPriority;
  at: number;
}

const ICON: Record<ToastCategory, ReactNode> = {
  wave: <Hand size={17} />,
  order: <Receipt size={17} />,
  payout: <Coins size={17} />,
  dispute: <ShieldAlert size={17} />,
  verification: <BadgeCheck size={17} />,
  message: <MessageCircle size={17} />,
  system: <Bell size={17} />,
};

/**
 * Priority is derived from the category, not passed in.
 *
 * A caller that can choose its own urgency will, eventually, make everything urgent — and a system
 * where everything is urgent has no urgency at all. Deriving it centrally means "what counts as
 * important" is one decision in one place, reviewable as a whole.
 */
export function priorityOf(category: ToastCategory): ToastPriority {
  switch (category) {
    case 'dispute':
      // Money is being clawed back and there is a clock on responding.
      return 'critical';
    case 'payout':
    case 'verification':
      // Something is blocked and will stay blocked until the person acts.
      return 'important';
    default:
      return 'informational';
  }
}

/** How long each tier stays. Longer when there is more to read and more at stake. */
const DURATION: Record<ToastPriority, number> = {
  informational: 4600,
  important: 6200,
  /** Critical does not auto-dismiss at all — see `startTimer`. */
  critical: 0,
};

interface ToasterApi {
  /** Show an incoming notification. Deduped against an identical one still on screen. */
  notify: (n: IncomingNotification) => void;
}

const ToasterContext = createContext<ToasterApi>({ notify: () => undefined });
export const useNotificationToast = (): ToasterApi => useContext(ToasterContext);

export function NotificationToaster({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [queue, setQueue] = useState<QueuedToast[]>([]);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextKey = useRef(0);
  /** Where a drag started, and how far it has moved. Null when not dragging. */
  const dragFrom = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  const top = queue[0] ?? null;
  const behind = Math.min(2, Math.max(0, queue.length - 1));

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /** Retract, then drop the card once the exit animation has actually finished. */
  const dismissTop = useCallback(() => {
    clearTimer();
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      setDragY(0);
      setQueue((q) => q.slice(1));
    }, 220);
  }, [clearTimer]);

  /**
   * Critical notifications never time out. A fraud alert that vanished while the phone was face
   * down has told nobody anything — it has to be dismissed deliberately, or opened.
   */
  const startTimer = useCallback(
    (t: QueuedToast) => {
      clearTimer();
      const ms = DURATION[t.priority];
      if (ms > 0) timer.current = setTimeout(dismissTop, ms);
    },
    [clearTimer, dismissTop],
  );

  useEffect(() => {
    if (top) startTimer(top);
    return clearTimer;
    // Keyed on the card itself: a new top card restarts the clock, a re-render does not.
  }, [top?.key, startTimer, clearTimer, top]);

  const notify = useCallback((n: IncomingNotification) => {
    const priority = priorityOf(n.category);
    setQueue((q) => {
      /**
       * Duplicate suppression. Retries and multi-device fan-out can deliver the same notification
       * twice within a second, and showing it twice makes the product look broken rather than busy.
       */
      if (q.some((x) => x.title === n.title && x.body === n.body)) return q;

      const entry: QueuedToast = { ...n, priority, key: nextKey.current++, at: Date.now() };
      /**
       * Priority ordering, without starving anything. A critical arrival jumps to the front of the
       * queue — but only ahead of things not yet seen, and it never removes them. Everything still
       * gets its turn; urgent things simply get theirs first.
       */
      if (priority === 'critical') return [entry, ...q];
      return [...q, entry];
    });
    playNotificationSound(priority);
  }, []);

  const api = useMemo<ToasterApi>(() => ({ notify }), [notify]);

  const open = () => {
    const t = top;
    dismissTop();
    if (t?.deeplink) router.push(t.deeplink);
  };

  return (
    <ToasterContext.Provider value={api}>
      {children}

      {/*
        `polite` for ordinary arrivals, `assertive` only for critical. Assertive interrupts whatever
        a screen-reader user is currently reading, which is the right call for a fraud alert and
        rude for a payment receipt.
      */}
      <Layer
        role="status"
        aria-live={top?.priority === 'critical' ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        {top ? (
          <Stack>
            {/*
              The shoulders. Purely decorative — the count below is what actually communicates
              "there are more", because a stack of edges is a visual hint and not information.
            */}
            {Array.from({ length: behind }).map((_, i) => (
              <Shoulder key={i} $depth={i + 1} aria-hidden />
            ))}

            <Card
              $priority={top.priority}
              $leaving={leaving}
              $dragY={dragY}
              onClick={open}
              onPointerDown={(e) => {
                dragFrom.current = e.clientY;
                clearTimer(); // touching it pauses the clock — you are reading it
              }}
              onPointerMove={(e) => {
                if (dragFrom.current === null) return;
                // Upward only. Dragging down would fight the page scroll underneath.
                setDragY(Math.min(0, e.clientY - dragFrom.current));
              }}
              onPointerUp={() => {
                const moved = dragY;
                dragFrom.current = null;
                if (moved < -44) dismissTop();
                else {
                  setDragY(0);
                  startTimer(top); // put it back and restart the clock
                }
              }}
              onPointerCancel={() => {
                dragFrom.current = null;
                setDragY(0);
                startTimer(top);
              }}
            >
              <Icon $priority={top.priority} aria-hidden>
                {ICON[top.category]}
              </Icon>
              <Text>
                <TitleRow>
                  <Title>{top.title}</Title>
                  {/*
                    Priority is never carried by colour alone — critical says so in words, so it
                    survives colour-blindness and a greyscale screenshot.
                  */}
                  {top.priority === 'critical' ? <Flag>Urgent</Flag> : null}
                </TitleRow>
                {/* One line, clamped. The full text is in the inbox; this is the headline. */}
                <Body>{top.body}</Body>
              </Text>

              {queue.length > 1 ? <Count aria-hidden>+{queue.length - 1}</Count> : null}

              <Dismiss
                type="button"
                aria-label="Dismiss notification"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissTop();
                }}
              >
                <X size={15} />
              </Dismiss>
            </Card>

            {/*
              Said in text as well as drawn, so it reaches a screen reader — the shoulders behind the
              card are invisible to one.
            */}
            {queue.length > 1 ? (
              <More>
                {queue.length - 1} more notification{queue.length - 1 === 1 ? '' : 's'}
              </More>
            ) : null}
          </Stack>
        ) : null}
      </Layer>
    </ToasterContext.Provider>
  );
}

/* ─────────────────────────── motion ─────────────────────────── */

/**
 * Enter: fast out of the gate, long deceleration, and a single ~6px settle. The overshoot is what
 * makes it read as a physical object arriving rather than an element appearing — but one settle
 * only. Anything springier starts to feel like a toy, which is wrong for a screen that mostly
 * carries money and deadlines.
 */
const slideIn = keyframes`
  0%   { transform: translate3d(0, -140%, 0); opacity: 0; }
  62%  { transform: translate3d(0, 6px, 0);   opacity: 1; }
  100% { transform: translate3d(0, 0, 0);     opacity: 1; }
`;

/** Exit: straight back the way it came, faster than it arrived, no overshoot. Leaving is not an event. */
const slideOut = keyframes`
  from { transform: translate3d(0, 0, 0);     opacity: 1; }
  to   { transform: translate3d(0, -130%, 0); opacity: 0; }
`;

const Layer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1200; /* above the bottom-anchored action toasts, which sit at 1000 */
  display: flex;
  justify-content: center;
  /* Clears the notch and the status bar; never sits under system UI. */
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 12px 0;
  pointer-events: none; /* the page stays fully usable around it */
`;

const Stack = styled.div`
  position: relative;
  width: 100%;
  max-width: 460px; /* on a tablet it stays a notification, not a banner */
`;

const Shoulder = styled.div<{ $depth: number }>`
  position: absolute;
  left: ${({ $depth }) => $depth * 7}px;
  right: ${({ $depth }) => $depth * 7}px;
  top: ${({ $depth }) => $depth * 5}px;
  height: 100%;
  border-radius: 18px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  opacity: ${({ $depth }) => 0.55 - $depth * 0.16};
  z-index: -1;
`;

const Card = styled.div<{ $priority: ToastPriority; $leaving: boolean; $dragY: number }>`
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 14px;
  border-radius: 18px;
  cursor: pointer;
  touch-action: pan-x; /* we own vertical drag; horizontal still belongs to the page */
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  box-shadow:
    0 12px 32px -8px rgba(0, 0, 0, 0.28),
    0 2px 8px -2px rgba(0, 0, 0, 0.14);

  /* Urgency reads as a weighted left edge — legible before a single word is. */
  ${({ $priority, theme }) =>
    $priority !== 'informational' &&
    css`
      border-left: 3px solid
        ${$priority === 'critical' ? theme.color.statusDanger : theme.color.statusWarning};
    `}

  animation: ${({ $leaving }) => ($leaving ? slideOut : slideIn)}
    ${({ $leaving }) => ($leaving ? '200ms' : '420ms')}
    ${({ $leaving }) => ($leaving ? 'cubic-bezier(0.4, 0, 1, 1)' : 'cubic-bezier(0.16, 1, 0.3, 1)')}
    both;

  /* While dragging, follow the finger instead of animating. */
  ${({ $dragY }) =>
    $dragY !== 0 &&
    css`
      animation: none;
      transform: translate3d(0, ${$dragY}px, 0);
      opacity: ${Math.max(0.35, 1 + $dragY / 120)};
    `}

  /*
    Reduced motion: no travel at all, just a short fade. The notification still arrives, is still
    readable, and still leaves — motion was never carrying the meaning.
  */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: opacity 140ms linear;
    opacity: ${({ $leaving }) => ($leaving ? 0 : 1)};
    transform: none;
  }
`;

const Icon = styled.div<{ $priority: ToastPriority }>`
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  color: ${({ theme, $priority }) =>
    $priority === 'critical'
      ? theme.color.statusDanger
      : $priority === 'important'
        ? theme.color.statusWarning
        : theme.color.accentPrimary};
  background: ${({ theme, $priority }) =>
    `color-mix(in srgb, ${
      $priority === 'critical'
        ? theme.color.statusDanger
        : $priority === 'important'
          ? theme.color.statusWarning
          : theme.color.accentPrimary
    } 12%, transparent)`};
`;

const Text = styled.div`
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
`;
const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;
const Title = styled.p`
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  color: ${({ theme }) => theme.color.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Flag = styled.span`
  flex: none;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 999px;
  color: ${({ theme }) => theme.color.statusDanger};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDanger} 14%, transparent)`};
`;
const Body = styled.p`
  font-size: 12.5px;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.textSecondary};
  /* One line only — the toast is a headline, the inbox holds the full text. */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Count = styled.span`
  flex: none;
  align-self: center;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 7px;
  border-radius: 999px;
  color: ${({ theme }) => theme.color.textSecondary};
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const Dismiss = styled.button`
  flex: none;
  display: grid;
  place-items: center;
  /* 32px of touch target inside a visually smaller control — thumbs are not cursors. */
  width: 32px;
  height: 32px;
  margin: -4px -4px 0 0;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${({ theme }) => theme.color.textTertiary};
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const More = styled.p`
  margin-top: 10px;
  text-align: center;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textTertiary};
`;
