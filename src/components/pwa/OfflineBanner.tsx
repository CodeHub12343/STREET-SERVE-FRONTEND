'use client';

/**
 * Global offline / queued-actions indicator (PWA_IMPLEMENTATION.md §4). Shows when offline, and how
 * many actions are queued to sync. Also mounts the auto-flush on reconnect.
 */
import styled, { keyframes } from 'styled-components';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineQueue } from '@/lib/pwa/useOfflineQueue';

export function OfflineBanner() {
  const { online, pending, items } = useOfflineQueue();
  const syncing = items.some((i) => i.status === 'syncing');

  if (online && pending === 0) return null;

  return (
    <Bar $offline={!online} role="status" aria-live="polite">
      {!online ? (
        <>
          <WifiOff size={15} aria-hidden /> You’re offline{pending > 0 ? ` — ${pending} action(s) queued` : ''}
        </>
      ) : (
        <>
          <Spin $spin={syncing}>
            <RefreshCw size={15} aria-hidden />
          </Spin>
          {syncing ? 'Syncing queued actions…' : `${pending} action(s) waiting to sync`}
        </>
      )}
    </Bar>
  );
}

const spin = keyframes`to { transform: rotate(360deg); }`;
const Bar = styled.div<{ $offline: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: ${({ theme, $offline }) => ($offline ? theme.color.textTertiary : theme.color.statusWarning)};
`;
const Spin = styled.span<{ $spin: boolean }>`
  display: inline-flex;
  animation: ${({ $spin }) => ($spin ? spin : 'none')} 1s linear infinite;
`;
