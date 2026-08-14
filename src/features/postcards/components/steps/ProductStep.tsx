'use client';

/**
 * Step 1 — which postcard, and which class of mail.
 *
 * Two things are said plainly here that buyers otherwise discover late:
 *
 *  • **you design one side.** A mailed postcard always prints two; the back carries the address
 *    block and is composed for you. "One side" was always about what you supply, and saying so on
 *    the first screen prevents someone designing a back that has nowhere to go.
 *  • **some sizes only mail First Class.** A vendor constraint rather than an upsell, so the option
 *    simply is not offered rather than being offered and then rejected at checkout.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import type { MailClass, PostcardProduct } from '../../types';

const MAIL_CLASS_COPY: Record<MailClass, { label: string; detail: string }> = {
  standard: {
    label: 'Standard',
    detail: 'Cheaper per card. Usually arrives in about 1–3 weeks.',
  },
  first_class: {
    label: 'First Class',
    detail: 'Costs more per card. Usually arrives in a few days.',
  },
};

export function ProductStep({
  products,
  selectedSku,
  busy,
  locked,
  onChoose,
}: {
  products: PostcardProduct[];
  selectedSku?: string;
  busy: boolean;
  /** Once an order exists its size is fixed — changing it would invalidate priced artwork. */
  locked: boolean;
  onChoose: (sku: string, mailClass: MailClass) => void;
}) {
  const [sku, setSku] = useState<string | undefined>(selectedSku ?? products[0]?.sku);
  const product = products.find((p) => p.sku === sku);
  const [mailClass, setMailClass] = useState<MailClass>(
    product?.mailClasses[0] ?? 'standard',
  );

  function pick(next: PostcardProduct): void {
    setSku(next.sku);
    // A size that does not offer the chosen class must not silently keep it selected.
    if (!next.mailClasses.includes(mailClass)) setMailClass(next.mailClasses[0]!);
  }

  return (
    <section aria-labelledby="pc-product-heading">
      <Heading id="pc-product-heading">Choose your postcard</Heading>
      <Note>
        You design the front. The back carries the address and is set up for you, so you only need
        to supply one image.
      </Note>

      <Fieldset>
        <Legend>Size</Legend>
        <Grid>
          {products.map((p) => {
            const active = p.sku === sku;
            return (
              <Card key={p.sku} $active={active}>
                <input
                  type="radio"
                  name="postcard-size"
                  value={p.sku}
                  checked={active}
                  disabled={locked && p.sku !== selectedSku}
                  onChange={() => pick(p)}
                />
                <CardBody>
                  <CardTitle>{p.label}</CardTitle>
                  <CardMeta>
                    {p.trim} inches · {p.minQuantity.toLocaleString()}–
                    {p.maxQuantity.toLocaleString()} cards
                  </CardMeta>
                  {p.mailClasses.length === 1 ? (
                    <CardMeta>{MAIL_CLASS_COPY[p.mailClasses[0]!].label} only</CardMeta>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      </Fieldset>

      {product ? (
        <Fieldset>
          <Legend>How it travels</Legend>
          <Grid>
            {product.mailClasses.map((mc) => (
              <Card key={mc} $active={mc === mailClass}>
                <input
                  type="radio"
                  name="postcard-mail-class"
                  value={mc}
                  checked={mc === mailClass}
                  onChange={() => setMailClass(mc)}
                />
                <CardBody>
                  <CardTitle>{MAIL_CLASS_COPY[mc].label}</CardTitle>
                  <CardMeta>{MAIL_CLASS_COPY[mc].detail}</CardMeta>
                </CardBody>
              </Card>
            ))}
          </Grid>
        </Fieldset>
      ) : null}

      <Actions>
        <Button
          onClick={() => sku && onChoose(sku, mailClass)}
          disabled={!sku || busy}
          loading={busy}
        >
          Continue
        </Button>
      </Actions>
    </section>
  );
}

const Heading = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[2]}px;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.scale[3]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const Note = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[4]}px;
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ theme }) => theme.typography.scale[1]}px;
  line-height: ${({ theme }) => theme.typography.lineBody};
`;

/**
 * `fieldset` is the one element that ignores the app's shrink-to-fit assumptions.
 *
 * Browsers apply `min-inline-size: min-content` to it in the UA stylesheet, which no amount of
 * `min-width: 0` on ancestors can override — the fieldset simply refuses to be narrower than its
 * widest child. On a 390px phone the option cards' min-content width exceeded the viewport, so the
 * whole document gained a horizontal scroll and every page above it (title, stepper, topbar) was
 * pushed sideways. `DashboardShell` already sets `min-width: 0` and `overflow-x: clip`; they could
 * not help, because the overflow originated below them.
 *
 * The border/padding/margin reset is the UA default too: this fieldset was never styled, so it drew
 * a stray box around the option grid that no other grouping in the app has.
 */
const Fieldset = styled.fieldset`
  min-inline-size: 0;
  border: 0;
  padding: 0;
  margin: 0;
`;

const Legend = styled.legend`
  padding: 0;
  margin-bottom: ${({ theme }) => theme.space[2]}px;
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ theme }) => theme.typography.scale[0]}px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  grid-template-columns: 1fr;

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

/**
 * A real radio inside a label, rather than a div with a click handler. Keyboard arrow-key
 * navigation, grouping, and the announced checked state all come free and correct.
 */
const Card = styled.label<{ $active: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  align-items: flex-start;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.line2)};
  background: ${({ theme }) => theme.color.surfaceRaised};
  cursor: pointer;

  &:has(input:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:has(input:focus-visible) {
    outline: 2px solid ${({ theme }) => theme.color.accentPrimary};
    outline-offset: 2px;
  }
`;

const CardBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CardTitle = styled.span`
  color: ${({ theme }) => theme.color.textPrimary};
  font-weight: 600;
`;

const CardMeta = styled.span`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ theme }) => theme.typography.scale[0]}px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;
