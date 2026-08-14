'use client';

/**
 * H-06 Check-in station (Phase 6). The screen a hub leaves running at its counter.
 *
 * This replaces the printed QR poster, and the difference is the whole point: the old code was a
 * single static secret, so anyone who photographed it once could reserve stock remotely forever.
 * The code shown here is an HMAC over a 30-second window — a photo of it is worthless almost
 * immediately, which restores the QR's job of proving the seller was physically present.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import QRCode from 'qrcode';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Banner } from '@/components/feedback/Banner';
import { useStationToken } from '../hooks/useHub';

export function HubStation({ hubId }: { hubId: string }) {
  const { data, isLoading, isError } = useStationToken(hubId);
  const [copied, setCopied] = useState(false);

  const copyCode = (token: string) => {
    void navigator.clipboard
      ?.writeText(token)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  };

  if (isLoading) {
    return (
      <TabPage title="Check-in station">
        <Skeleton $h="320px" $radius={16} />
      </TabPage>
    );
  }
  if (isError || !data) {
    return (
      <TabPage title="Check-in station">
        <ErrorState title="Couldn’t load your check-in code" message="Please try again." />
      </TabPage>
    );
  }

  return (
    <TabPage
      title="Check-in station"
      actions={
        <BackLink href="/hub">
          <ArrowLeft size={16} aria-hidden />
          Hub dashboard
        </BackLink>
      }
    >
      {/* This screen has no next step by design — it's a terminal display. Say so, so an operator
          landing here doesn't think they're stuck mid-flow. */}
      <Lead>You’re all set — leave this open at your counter.</Lead>

      {data.staticQrStillAccepted ? (
        <Banner tone="warning" title="Your old printed code still works">
          Anyone who photographed the poster can still reserve stock remotely. Display this screen at
          your counter instead, then ask us to turn the printed code off.
        </Banner>
      ) : null}

      <Card>
        <QrCanvas value={data.token} />
        <Live>
          <Dot aria-hidden />
          Refreshes every {data.rotateSeconds}s
        </Live>
        <Help>Sellers scan this to check inventory in and out.</Help>

        {/* Same rotating token, as text — for a seller whose camera won't scan (they use checkout's
            "enter code manually"), and for one-device testing. No less secure than the QR: both are
            the same code and expire together. */}
        <CodeBlock>
          <CodeLabel>Manual entry code</CodeLabel>
          <CodeRow>
            <Token>{data.token}</Token>
            <CopyBtn type="button" onClick={() => copyCode(data.token)} aria-label="Copy check-in code">
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </CopyBtn>
          </CodeRow>
        </CodeBlock>
      </Card>

      <Note>
        Leave this screen open at your counter. Don’t print or photograph it — the code changes
        constantly, which is what stops someone taking stock without being here.
      </Note>
    </TabPage>
  );
}

/** Renders the rotating token as a scannable QR. Redraws whenever the token changes. */
function QrCanvas({ value }: { value: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    // Large and high-contrast: read off a screen, across a counter, often in poor light.
    void QRCode.toCanvas(ref.current, value, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  }, [value]);
  return <Canvas ref={ref} aria-label="Hub check-in QR code" role="img" />;
}

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
  &:hover {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Lead = styled.p`
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textPrimary};
  text-align: center;
`;
const Card = styled.div`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Canvas = styled.canvas`
  width: 300px;
  max-width: 100%;
  height: auto;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: #fff;
  padding: ${({ theme }) => theme.space[3]}px;
`;
const Live = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.statusLive};
`;
const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.statusLive};
  animation: pulse 2s ease-in-out infinite;
  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
const Help = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  text-align: center;
`;
const CodeBlock = styled.div`
  width: 100%;
  display: grid;
  gap: 6px;
  margin-top: ${({ theme }) => theme.space[2]}px;
  padding-top: ${({ theme }) => theme.space[3]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line2};
`;
const CodeLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const CodeRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Token = styled.code`
  flex: 1;
  min-width: 0;
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  padding: ${({ theme }) => theme.space[2]}px ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textPrimary};
  user-select: all;
  overflow-wrap: anywhere;
  word-break: break-word;
`;
const CopyBtn = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textPrimary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;
const Note = styled.p`
  margin-top: ${({ theme }) => theme.space[4]}px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  text-align: center;
`;
