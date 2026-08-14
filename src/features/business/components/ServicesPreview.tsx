'use client';

/**
 * The services section of a customer profile (BP-6) — the counterpart to MenuPreview for
 * businesses that sell time rather than product. A barber had nowhere to show what they do.
 *
 * Presented as image-led cards. What a service LOOKS like is most of the buying decision — a
 * haircut, a valet, a cleaned kitchen — and the data was already there (`photo_url` on the service,
 * returned by the API as `photoUrl`); only this component ignored it, leaving a flat text list of
 * name/duration/price that read like a spreadsheet row. Businesses without photos still render
 * cleanly via a typed placeholder rather than an empty box.
 */
import styled from 'styled-components';
import { Clock, Sparkles } from 'lucide-react';
import { formatCents } from '@/lib/money';
import type { PublicService } from '../hooks/useBusiness';

export function ServicesPreview({ services }: { services: PublicService[] }) {
  if (services.length === 0) {
    return <Empty>No services listed yet.</Empty>;
  }
  return (
    <List>
      {services.slice(0, 4).map((s) => (
        <Card key={s.id}>
          {s.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <Thumb src={s.photoUrl} alt="" loading="lazy" />
          ) : (
            <ThumbFallback aria-hidden>
              <Sparkles size={18} />
            </ThumbFallback>
          )}
          <Info>
            <Name>{s.name}</Name>
            <Meta>
              <Clock size={12} aria-hidden /> {s.durationMin} min
            </Meta>
          </Info>
          <Price className="tnum">{formatCents(s.priceCents)}</Price>
        </Card>
      ))}
      {services.length > 4 ? <More>+{services.length - 4} more</More> : null}
    </List>
  );
}

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Card = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[2]}px;
  padding-right: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Thumb = styled.img`
  width: 56px;
  height: 56px;
  flex: none;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const ThumbFallback = styled.div`
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  flex: none;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Info = styled.div`
  display: grid;
  gap: 3px;
  min-width: 0;
  flex: 1;
`;
const Name = styled.p`
  font-size: 14px;
  font-weight: 700;
  /* Long service names wrap rather than shove the price off the card on a narrow phone. */
  overflow-wrap: anywhere;
`;
const Meta = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Price = styled.p`
  flex: none;
  font-size: 15px;
  font-weight: 800;
`;
const Empty = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const More = styled.p`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
  padding-left: 2px;
`;
