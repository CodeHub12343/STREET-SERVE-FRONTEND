'use client';

/**
 * Modal / Dialog (docs/06 §2.6) — centered confirmation surface with scrim, Escape-to-close,
 * focus move-in/restore, and a focus trap. Most actions are toast-confirmed; reserve this for
 * genuine confirmations (e.g. destructive actions).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { IconButton } from './IconButton';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      requestAnimationFrame(() => panelRef.current?.focus());
    } else if (openerRef.current instanceof HTMLElement) {
      openerRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') trapFocus(e, panelRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  /** Portalled for the same reason as Sheet: a transformed ancestor captures `position: fixed`. */
  return createPortal(
    <Overlay onClick={onClose}>
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <Header>
          <h2>{title}</h2>
          <IconButton label="Close" icon={<X size={18} />} onClick={onClose} />
        </Header>
        <Body>{children}</Body>
        {footer ? <Footer>{footer}</Footer> : null}
      </Panel>
    </Overlay>,
    document.body,
  );
}

function trapFocus(e: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusables = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusables.length === 0) return;
  const first = focusables[0]!;
  const last = focusables[focusables.length - 1]!;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 950;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space[5]}px;
  background: rgba(0, 0, 0, 0.4);
`;
const Panel = styled.div`
  width: 100%;
  max-width: 440px;
  max-height: 85dvh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-radius: ${({ theme }) => theme.radius.card}px;
  box-shadow: ${({ theme }) => theme.color.shadow};
`;
const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px;
  h2 {
    font-size: 18px;
  }
`;
const Body = styled.div`
  overflow-y: auto;
  padding: 0 ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[4]}px;
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
const Footer = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
