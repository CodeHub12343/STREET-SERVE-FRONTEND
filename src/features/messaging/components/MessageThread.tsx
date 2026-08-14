'use client';

/**
 * C-33 Message thread (docs/13 C-33) — ConversationView with a business-context banner, message
 * bubbles, and a rate-limited composer. Sends are optimistic; demo simulates a reply.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ArrowLeft, Send } from 'lucide-react';
import { ConversationView } from '@/components/layout/ConversationView';
import { IconButton } from '@/components/primitives/IconButton';
import { Input } from '@/components/primitives/Input';
import { Button } from '@/components/primitives/Button';
import { formatRelativeMinutes } from '@/lib/format';
import { useThreads, useThread, useSendMessage, useMarkThreadRead } from '../hooks/useMessaging';
import { useThreadSocket } from '../hooks/useThreadSocket';
import { PresenceAvatar } from './PresenceAvatar';

export function MessageThread({ threadId }: { threadId: string }) {
  const router = useRouter();
  const { data: threads } = useThreads();
  const thread = threads?.find((t) => t.id === threadId);
  const { data: messages = [] } = useThread(threadId);
  const send = useSendMessage(threadId);
  const markRead = useMarkThreadRead(threadId);
  useThreadSocket(threadId); // live delivery of the other side's replies
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Reading the conversation is what clears its badge. Fire once per thread, and only when there
  // is something unread — not on every render or every incoming message.
  const unread = thread?.unread ?? 0;
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;
  useEffect(() => {
    if (unread > 0) markReadRef.current.mutate();
  }, [threadId, unread]);

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    send.mutate(body);
  };

  // The name at the top is the COUNTERPARTY — the business (customer side) or the customer (business
  // side) — never the reader's own business. `businessName` was the same on both sides; this isn't.
  const title = thread?.counterpartyName ?? thread?.businessName ?? 'Conversation';
  const online = Boolean(thread?.online);
  const presenceLabel = online
    ? 'Active now'
    : thread?.lastSeen
      ? `Last seen ${formatRelativeMinutes(thread.lastSeen)}`
      : undefined;

  // "Seen" belongs under my most recent delivered message only (WhatsApp-style), not every bubble.
  const lastMine = [...messages].reverse().find((m) => m.from === 'me' && !m.pending);
  const lastMineSeen = Boolean(lastMine?.readAt);

  return (
    <Screen>
      <ConversationView
        banner={
          <Banner>
            <IconButton label="Back" icon={<ArrowLeft size={18} />} onClick={() => router.push('/messages')} />
            <PresenceAvatar name={title} src={thread?.avatarUrl} size={38} online={online} />
            <Names>
              <strong>{title}</strong>
              {presenceLabel ? <Presence $online={online}>{presenceLabel}</Presence> : null}
            </Names>
          </Banner>
        }
        composer={
          <Composer>
            <Input
              aria-label="Message"
              placeholder="Message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <Button aria-label="Send" size="compact" disabled={!text.trim()} onClick={submit}>
              <Send size={16} />
            </Button>
          </Composer>
        }
      >
        {messages.map((m) => (
          <Bubble key={m.id} $mine={m.from === 'me'} $pending={Boolean(m.pending)}>
            {m.body}
          </Bubble>
        ))}
        {lastMine ? (
          <Receipt>{lastMine.pending ? 'Sending…' : lastMineSeen ? 'Seen' : 'Sent'}</Receipt>
        ) : null}
        <div ref={endRef} />
      </ConversationView>
    </Screen>
  );
}

const Screen = styled.div`
  height: 100dvh;
  max-width: 560px;
  margin: 0 auto;
`;
const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Names = styled.div`
  display: grid;
  gap: 1px;
  min-width: 0;
  strong {
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
const Presence = styled.span<{ $online: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $online }) =>
    $online
      ? `color-mix(in srgb, ${theme.color.statusLive} 55%, ${theme.color.textPrimary})`
      : theme.color.textTertiary};
`;
const Receipt = styled.span`
  align-self: flex-end;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textTertiary};
  margin-top: -4px;
`;
const Composer = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${({ theme }) => theme.space[2]}px;
  align-items: center;
`;
const Bubble = styled.div<{ $mine: boolean; $pending: boolean }>`
  align-self: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
  max-width: 78%;
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 14px;
  opacity: ${({ $pending }) => ($pending ? 0.6 : 1)};
  color: ${({ theme, $mine }) => ($mine ? '#fff' : theme.color.textPrimary)};
  background: ${({ theme, $mine }) => ($mine ? theme.color.accentPrimary : theme.color.surfaceRaised2)};
`;
