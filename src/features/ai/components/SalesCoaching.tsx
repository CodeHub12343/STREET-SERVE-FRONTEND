'use client';

/**
 * S-12 Sales coaching (docs/12 §3, FR-9.3) — pick a customer objection, get a scripted response.
 * ConversationView layout; objection-keyed content library (rule-based).
 */
import { useState } from 'react';
import styled from 'styled-components';
import { ConversationView } from '@/components/layout/ConversationView';
import { Chip } from '@/components/primitives/Chip';
import { TabPage } from '@/components/layout/TabPage';
import { COACHING_OBJECTIONS } from '@/lib/demo';

export function SalesCoaching() {
  const [picked, setPicked] = useState<{ label: string; response: string }[]>([]);

  const pick = (key: string) => {
    const o = COACHING_OBJECTIONS.find((x) => x.key === key);
    if (o) setPicked((p) => [...p, { label: o.label, response: o.response }]);
  };

  return (
    <TabPage title="Sales coaching" backHref="/seller" backLabel="Back to seller home">
      <Wrap>
        <ConversationView
          banner={<Banner>Pick what a customer said — I’ll give you a line that works.</Banner>}
          composer={
            <Chips>
              {COACHING_OBJECTIONS.map((o) => (
                <Chip key={o.key} onClick={() => pick(o.key)}>{o.label}</Chip>
              ))}
            </Chips>
          }
        >
          {picked.length === 0 ? (
            <Hint>Tap an objection below to get a coached response.</Hint>
          ) : (
            picked.map((m, i) => (
              <Exchange key={i}>
                <Them>“{m.label}”</Them>
                <You>{m.response}</You>
              </Exchange>
            ))
          )}
        </ConversationView>
      </Wrap>
    </TabPage>
  );
}

const Wrap = styled.div`
  height: 70dvh;
`;
const Banner = styled.strong`
  font-size: 14px;
`;
const Hint = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
  text-align: center;
  margin-top: ${({ theme }) => theme.space[5]}px;
`;
const Chips = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  overflow-x: auto;
`;
const Exchange = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const Them = styled.div`
  align-self: flex-start;
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 14px;
  font-style: italic;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const You = styled.div`
  align-self: flex-end;
  max-width: 88%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  color: #fff;
  background: ${({ theme }) => theme.color.statusDiscount};
`;
