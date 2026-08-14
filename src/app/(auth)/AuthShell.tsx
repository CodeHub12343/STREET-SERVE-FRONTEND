'use client';

import type { ReactNode } from 'react';
import styled from 'styled-components';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <Wrap>
      <Inner>{children}</Inner>
    </Wrap>
  );
}

const Wrap = styled.div`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space[5]}px;
`;
const Inner = styled.div`
  width: 100%;
  max-width: 440px;
  display: grid;
  gap: ${({ theme }) => theme.space[5]}px;
`;
