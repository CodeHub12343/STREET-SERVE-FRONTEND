'use client';

/**
 * Conversion context (roadmap LP-5) — one wizard instance for the whole landing page, openable
 * from any CTA (nav, hero, benefits, final CTA, sticky mobile bar). Handles the deep link
 * `?register=1[&role=…]` on load, keeps `?register=1` in the URL while open (shareable /
 * survives refresh), and fires `prereg_start` exactly once per open.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { track } from '../analytics';
import type { PreregRole } from './api';

const PreRegistrationWizard = dynamic(
  () => import('./PreRegistrationWizard').then((m) => m.PreRegistrationWizard),
  { ssr: false },
);

interface ConversionState {
  isOpen: boolean;
  open: (role?: PreregRole, source?: string) => void;
  close: () => void;
}

const Ctx = createContext<ConversionState>({
  isOpen: false,
  open: () => undefined,
  close: () => undefined,
});

export const useConversion = () => useContext(Ctx);

const VALID_ROLES: PreregRole[] = ['customer', 'seller', 'vendor', 'hub'];

function parseRole(value: string | null): PreregRole | undefined {
  return VALID_ROLES.includes(value as PreregRole) ? (value as PreregRole) : undefined;
}

export function ConversionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultRole, setDefaultRole] = useState<PreregRole | undefined>();
  const [utmCode, setUtmCode] = useState<string | undefined>();

  const open = useCallback((role?: PreregRole, source = 'unknown') => {
    setDefaultRole(role);
    setIsOpen(true);
    track('prereg_start', { role: role ?? null, source });
    const url = new URL(window.location.href);
    url.searchParams.set('register', '1');
    if (role) url.searchParams.set('role', role);
    window.history.replaceState(null, '', url);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('register');
    window.history.replaceState(null, '', url);
  }, []);

  // Deep link: ?register=1 opens on load; ?role= preselects (campaign links, benefits CTAs).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtmCode(params.get('utm') ?? params.get('utm_source') ?? undefined);
    if (params.get('register') === '1') {
      open(parseRole(params.get('role')), 'deep-link');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider value={{ isOpen, open, close }}>
      {children}
      {isOpen && (
        <PreRegistrationWizard defaultRole={defaultRole} utmCode={utmCode} onClose={close} />
      )}
    </Ctx.Provider>
  );
}
