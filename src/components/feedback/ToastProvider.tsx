'use client';

/**
 * App-wide toast/snackbar (docs/06 §2.6d): transient (~4s), bottom-anchored, one-at-a-time feel.
 * Minimal, accessible (role="status", aria-live) foundation; richer variants land in Milestone 1.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styled from 'styled-components';

type ToastTone = 'default' | 'success' | 'warning' | 'danger';
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}
interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => undefined });
export const useToast = (): ToastApi => useContext(ToastContext);

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = 'default') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), DEFAULT_DURATION);
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Region role="status" aria-live="polite">
        {toasts.map((t) => (
          <ToastCard key={t.id} $tone={t.tone}>
            {t.message}
          </ToastCard>
        ))}
      </Region>
    </ToastContext.Provider>
  );
}

const Region = styled.div`
  position: fixed;
  left: 50%;
  bottom: calc(78px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]}px;
  pointer-events: none;
`;

const ToastCard = styled.div<{ $tone: ToastTone }>`
  pointer-events: auto;
  max-width: min(92vw, 420px);
  padding: ${({ theme }) => `${theme.space[3]}px ${theme.space[4]}px`};
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textPrimary};
  border-left: 3px solid
    ${({ theme, $tone }) =>
      $tone === 'success'
        ? theme.color.statusLive
        : $tone === 'warning'
          ? theme.color.statusWarning
          : $tone === 'danger'
            ? theme.color.statusDanger
            : theme.color.accentSecondary};
  box-shadow: ${({ theme }) => theme.color.shadow};
  font-size: 14px;
`;
