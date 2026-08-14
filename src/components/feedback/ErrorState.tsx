'use client';

/**
 * ErrorState (docs/06 §2.6d) — human-readable message + Retry (re-invokes the query/segment).
 */
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Root role="alert">
      <Title>{title}</Title>
      <Msg>{message}</Msg>
      {onRetry ? (
        <Button variant="secondary" size="compact" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
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
`;
const Title = styled.h3`
  font-size: 18px;
`;
const Msg = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
