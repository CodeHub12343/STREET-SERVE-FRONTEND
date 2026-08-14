'use client';

/**
 * Tracker (docs/13 C-23) — a vertical stepper for lifecycle status (order pending → accepted →
 * ready → completed; dispute case status). The active step glows; done steps are checked; a
 * cancelled state can replace the rail entirely (handled by the caller).
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Check } from 'lucide-react';

export interface TrackerStep {
  key: string;
  label: string;
  description?: ReactNode;
}

export interface TrackerProps {
  steps: TrackerStep[];
  /** Index of the active (in-progress) step; steps before it are done. */
  activeIndex: number;
}

export function Tracker({ steps, activeIndex }: TrackerProps) {
  return (
    <List>
      {steps.map((step, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
        const isLast = i === steps.length - 1;
        return (
          <Item key={step.key} aria-current={state === 'active' ? 'step' : undefined}>
            <Marker>
              <Node $state={state}>{state === 'done' ? <Check size={13} /> : null}</Node>
              {!isLast ? <Connector $filled={i < activeIndex} /> : null}
            </Marker>
            <Body $state={state}>
              <Label>{step.label}</Label>
              {step.description ? <Desc>{step.description}</Desc> : null}
            </Body>
          </Item>
        );
      })}
    </List>
  );
}

const List = styled.ol`
  list-style: none;
  display: flex;
  flex-direction: column;
`;
const Item = styled.li`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Marker = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;
const Node = styled.span<{ $state: 'done' | 'active' | 'pending' }>`
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex: none;
  color: #fff;
  background: ${({ theme, $state }) =>
    $state === 'pending' ? theme.color.surfaceRaised2 : theme.color.statusLive};
  border: ${({ theme, $state }) =>
    $state === 'pending' ? `2px solid ${theme.color.line2}` : 'none'};
  box-shadow: ${({ theme, $state }) =>
    $state === 'active'
      ? `0 0 0 4px color-mix(in srgb, ${theme.color.statusLive} 24%, transparent)`
      : 'none'};
`;
const Connector = styled.span<{ $filled: boolean }>`
  width: 2px;
  flex: 1;
  min-height: 20px;
  margin: 2px 0;
  background: ${({ theme, $filled }) => ($filled ? theme.color.statusLive : theme.color.line2)};
`;
const Body = styled.div<{ $state: 'done' | 'active' | 'pending' }>`
  padding-bottom: ${({ theme }) => theme.space[4]}px;
  opacity: ${({ $state }) => ($state === 'pending' ? 0.55 : 1)};
`;
const Label = styled.p`
  font-size: 14px;
  font-weight: 700;
`;
const Desc = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
