'use client';

/**
 * Voices from the street (Section Breakdown §8). Honesty rule: no fabricated quotes — the
 * section renders nothing until real testimonials exist (marketingConfig.showTestimonials, D4).
 */
import styled from 'styled-components';
import { marketingConfig } from '../../marketing.config';
import { SectionShell } from '../SectionShell';

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  city: string;
}

/** Populated from real pilot participants at launch; empty pre-launch by design. */
const quotes: Testimonial[] = [];

export function Testimonials() {
  if (!marketingConfig.showTestimonials || quotes.length === 0) return null;
  return (
    <SectionShell id="testimonials" eyebrow="Testimonials" title="Voices from the street." align="center">
      <Row>
        {quotes.map((t) => (
          <Card key={t.name}>
            <Quote>“{t.quote}”</Quote>
            <Attribution>
              <strong>{t.name}</strong> · {t.role} · {t.city}
            </Attribution>
          </Card>
        ))}
      </Row>
    </SectionShell>
  );
}

const Row = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Card = styled.figure`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  text-align: left;
`;

const Quote = styled.blockquote`
  font-size: 16px;
  line-height: 1.5;
`;

const Attribution = styled.figcaption`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
