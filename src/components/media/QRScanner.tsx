'use client';

/**
 * QRScanner (docs/07 camera+QR) — scans a station/product QR with html5-qrcode via getUserMedia in
 * production; in demo mode (or as a fallback) it offers "simulate scan" + manual entry so the
 * consignment flow completes without a camera. Reports the decoded code.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { isMapDemo } from '@/lib/env';

export function QRScanner({ onScan, expectedCode = 'SS-QR-DEMO' }: { onScan: (code: string) => void; expectedCode?: string }) {
  const readerRef = useRef<HTMLDivElement>(null);
  const [manual, setManual] = useState('');
  const [cameraError, setCameraError] = useState(false);

  // Real camera scanning (skipped in demo — no camera in that context).
  useEffect(() => {
    if (isMapDemo || !readerRef.current) return;
    let stop: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled || !readerRef.current) return;
        const scanner = new Html5Qrcode(readerRef.current.id);
        /**
         * Stopping is idempotent AND synchronously guarded.
         *
         * A successful scan stopped the scanner and then called `onScan`, which sets state in the
         * parent — and the parent swaps branches, unmounting this component. The effect cleanup then
         * called stop a SECOND time on an already-stopped scanner.
         *
         * html5-qrcode throws "Cannot stop, scanner is not running or paused." SYNCHRONOUSLY in that
         * case, so `.catch()` on the return value never saw it: there is no promise to attach to
         * when the throw happens before one is returned. The error escaped into React's render and
         * took the whole checkout screen to the error boundary — after a successful scan, which is
         * the one moment the seller must not lose.
         *
         * The flag prevents the second call; the try/catch means a version that changes its mind
         * about when stopping is legal still cannot blank the screen.
         */
        let stopped = false;
        stop = () => {
          if (stopped) return;
          stopped = true;
          try {
            void scanner.stop().catch(() => undefined);
          } catch {
            // Already stopped, or never started. Nothing to clean up either way.
          }
        };
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 240 },
          (decoded) => {
            stop?.();
            onScan(decoded);
          },
          undefined,
        );
      } catch {
        if (!cancelled) setCameraError(true);
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Wrap>
      {isMapDemo ? (
        <Viewfinder $demo>
          <QrCode size={48} aria-hidden />
          <p>Point at the QR code</p>
          <Button size="compact" onClick={() => onScan(expectedCode)}>
            Simulate scan
          </Button>
        </Viewfinder>
      ) : cameraError ? (
        <Viewfinder $demo>
          <QrCode size={48} aria-hidden />
          <p>Camera unavailable — enter the code below.</p>
        </Viewfinder>
      ) : (
        <Reader id="qr-reader" ref={readerRef} />
      )}

      <Manual>
        <Input aria-label="Enter code manually" placeholder="Or enter code manually" value={manual} onChange={(e) => setManual(e.target.value)} />
        <Button variant="secondary" size="compact" disabled={!manual.trim()} onClick={() => onScan(manual.trim())}>
          Use code
        </Button>
      </Manual>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Viewfinder = styled.div<{ $demo?: boolean }>`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[7]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 2px dashed ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textSecondary};
  p {
    font-size: 14px;
  }
`;
const Reader = styled.div`
  border-radius: ${({ theme }) => theme.radius.card}px;
  overflow: hidden;
  min-height: 240px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const Manual = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${({ theme }) => theme.space[2]}px;
  align-items: end;
`;
