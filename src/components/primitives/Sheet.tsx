'use client';

/**
 * Bottom Sheet (docs/06 §2.6f) — three snap points (peek / half / full), 32×4 drag handle, 16px
 * top radius, 40% scrim behind half/full. Drag-down or scrim-tap dismisses from peek/half; full
 * requires the header close (gesture rule). Escape always closes (a11y). role="dialog", focus
 * moves in on open and returns to the opener on close. Motion respects prefers-reduced-motion.
 *
 * Controlled: `open` + `onClose`; snap is managed internally starting at `initialSnap`.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';

export type Snap = 'peek' | 'half' | 'full';
const ORDER: Snap[] = ['peek', 'half', 'full'];

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  initialSnap?: Snap;
  peekHeight?: number;
  ariaLabel: string;
  /** Sticky action row pinned to the bottom at every snap. */
  footer?: ReactNode;
  /**
   * Let the content run under the drag handle to the panel's top edge (for a full-bleed cover/hero).
   * The handle becomes a translucent overlay centered over the content instead of sitting on its own
   * strip. Default false keeps the standard handle bar.
   */
  coverBleed?: boolean;
  children: ReactNode;
}

export function Sheet({
  open,
  onClose,
  initialSnap = 'half',
  peekHeight = 140,
  ariaLabel,
  footer,
  coverBleed = false,
  children,
}: SheetProps) {
  const [snap, setSnap] = useState<Snap>(initialSnap);
  const [vh, setVh] = useState(800);
  const [drag, setDrag] = useState(0); // live drag offset in px (0 when not dragging)
  const dragging = useRef(false);
  const startY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  /** Portalling touches the DOM, so it can only happen after mount — never during SSR. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Reset to the initial snap each time it opens; manage focus.
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      setSnap(initialSnap);
      requestAnimationFrame(() => sheetRef.current?.focus());
    } else if (openerRef.current instanceof HTMLElement) {
      openerRef.current.focus();
    }
  }, [open, initialSnap]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const snapHeight = useCallback(
    (s: Snap): number =>
      s === 'peek' ? peekHeight : s === 'half' ? Math.round(vh * 0.5) : Math.round(vh * 0.92),
    [peekHeight, vh],
  );

  // Size the panel to its VISIBLE height (anchored to the viewport bottom) rather than sliding a
  // full-height panel off-screen — otherwise the footer, pinned at the panel's bottom, lands below
  // the viewport. `drag` is the pointer delta: dragging down (positive) shrinks, up (negative) grows.
  const baseHeight = snapHeight(snap);
  const currentHeight = Math.min(vh, Math.max(0, baseHeight - drag));

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setDrag(e.clientY - startY.current);
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const settledHeight = baseHeight - drag;
    // Choose the snap whose visible height is nearest the released height.
    let nearest: Snap = snap;
    let best = Infinity;
    for (const s of ORDER) {
      const d = Math.abs(snapHeight(s) - settledHeight);
      if (d < best) {
        best = d;
        nearest = s;
      }
    }
    // Dragged well below peek → dismiss (except when the gesture starts at full).
    if (settledHeight < peekHeight - 80 && snap !== 'full') {
      setDrag(0);
      onClose();
      return;
    }
    setDrag(0);
    setSnap(nearest);
  };

  if (!open || !mounted) return null;

  /**
   * Portalled to `document.body`, and that is load-bearing rather than tidiness.
   *
   * A sheet opened from INSIDE another sheet — Chip in, from the Boost card on a business profile —
   * renders as a descendant of the parent's Panel. That Panel sets `transform: translateX(-50%)`,
   * and a transformed ancestor becomes the containing block for `position: fixed`, so the child's
   * Overlay stopped resolving against the viewport and started resolving against the parent panel.
   * The parent's `overflow: hidden` then clipped it: the nested sheet appeared with its whole top —
   * title, amount presets — cut off above the visible edge. Escaping the DOM subtree is the only
   * fix that survives; no amount of z-index or height reaches out of a transformed ancestor.
   */
  return createPortal(
    <Overlay>
      <Scrim onClick={() => snap !== 'full' && onClose()} aria-hidden $dim={snap !== 'peek'} />
      <Panel
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        $height={currentHeight}
        $dragging={dragging.current}
      >
        <Grip
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          role="separator"
          aria-label="Drag to resize"
          $overlay={coverBleed}
        >
          <Handle $overlay={coverBleed} />
        </Grip>
        <Content>{children}</Content>
        {footer ? <Footer>{footer}</Footer> : null}
      </Panel>
    </Overlay>,
    document.body,
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  /* Above the persistent OrbitNav dock (900/901) — an open sheet is a focused decision surface,
     so its own footer CTAs must win the bottom edge. Below Modal (950) and toasts (1000). */
  z-index: 920;
`;
const Scrim = styled.div<{ $dim: boolean }>`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: ${({ $dim }) => ($dim ? 1 : 0)};
  transition: opacity ${({ theme }) => theme.motion.sheet}ms
    ${({ theme }) => theme.motion.easeOut};
`;
const Panel = styled.div<{ $height: number; $dragging: boolean }>`
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  max-width: 560px;
  height: ${({ $height }) => $height}px;
  max-height: 100dvh;
  transition: ${({ $dragging, theme }) =>
    $dragging ? 'none' : `height ${theme.motion.sheet}ms ${theme.motion.easeOut}`};
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-top-left-radius: ${({ theme }) => theme.radius.card}px;
  border-top-right-radius: ${({ theme }) => theme.radius.card}px;
  box-shadow: ${({ theme }) => theme.color.shadow};
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const Grip = styled.div<{ $overlay: boolean }>`
  display: grid;
  place-items: center;
  padding: 10px 0 6px;
  cursor: grab;
  touch-action: none;
  ${({ $overlay }) =>
    $overlay &&
    css`
      /* Float the handle over the cover, centered so it never covers the hero's corner controls. */
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 160px;
      z-index: 3;
      padding: 12px 0 8px;
    `}
`;
const Handle = styled.div<{ $overlay: boolean }>`
  width: 32px;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme, $overlay }) =>
    $overlay ? 'rgba(255, 255, 255, 0.9)' : theme.color.line2};
  ${({ $overlay }) =>
    $overlay &&
    css`
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    `}
`;
const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[5]}px;
`;
const Footer = styled.div`
  flex: none;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[5]}px
    calc(${({ theme }) => theme.space[3]}px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;
