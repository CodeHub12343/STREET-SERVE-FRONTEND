'use client';

/**
 * EmptyState (docs/06 §1 "empty state as a sales tool") — always actionable, never a dead end.
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Root>
      {icon ? <Icon aria-hidden>{icon}</Icon> : null}
      <Title>{title}</Title>
      {description ? <Desc>{description}</Desc> : null}
      {action ? <Action>{action}</Action> : null}
    </Root>
  );
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[7]}px ${({ theme }) => theme.space[5]}px;
  max-width: 420px;
  margin: 0 auto;
`;
const Icon = styled.div`
  font-size: 40px;
`;
const Title = styled.h3`
  font-size: 18px;
`;
const Desc = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
const Action = styled.div`
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
