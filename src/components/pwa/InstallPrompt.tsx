'use client';

/**
 * Install prompt (PWA_IMPLEMENTATION.md §2). Captures `beforeinstallprompt` and surfaces a tasteful
 * "Add to Home Screen" affordance; on iOS (no event) it shows the Share-sheet hint. Dismissal is
 * remembered so it doesn't nag.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'ss-install-dismissed';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    // iOS never fires the event; show the manual hint after a beat.
    const t = isIos() ? setTimeout(() => setShow(true), 4000) : undefined;
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      if (t) clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (!show) return null;

  return (
    <Card role="dialog" aria-label="Install StreetServe">
      <Close type="button" aria-label="Dismiss" onClick={dismiss}>
        <X size={16} />
      </Close>
      <Icon aria-hidden>{deferred ? <Download size={22} /> : <Share size={22} />}</Icon>
      <div>
        <Title>Add StreetServe to your home screen</Title>
        {deferred ? (
          <Body>Install for one-tap access, offline maps, and push alerts.</Body>
        ) : (
          <Body>Tap the Share button, then “Add to Home Screen.”</Body>
        )}
      </div>
      {deferred ? (
        <Button size="compact" onClick={() => void install()}>
          Install
        </Button>
      ) : null}
    </Card>
  );
}

const Card = styled.div`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(90px + env(safe-area-inset-bottom, 0px));
  z-index: 1050;
  width: min(92vw, 440px);
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  box-shadow: ${({ theme }) => theme.color.shadow};
`;
const Close = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.color.textTertiary};
  cursor: pointer;
`;
const Icon = styled.span`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: ${({ theme }) => theme.radius.control}px;
  color: ${({ theme }) => theme.color.accentPrimary};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.accentPrimary} 14%, transparent)`};
`;
const Title = styled.p`
  font-weight: 700;
  font-size: 14px;
`;
const Body = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
