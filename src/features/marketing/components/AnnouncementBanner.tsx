'use client';

/**
 * Announcement banner (IA §3.2) — single dismissible line, persistence in localStorage,
 * status-colored left edge per the Banner spec (docs/06 §2.6d). Renders nothing until mounted
 * so the dismissed state never flashes.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { marketingConfig } from '../marketing.config';

export function AnnouncementBanner() {
  const { message, dismissKey } = marketingConfig.announcement;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(dismissKey) !== '1');
    } catch {
      setVisible(true);
    }
  }, [dismissKey]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(dismissKey, '1');
    } catch {
      /* private mode — dismiss for this view only */
    }
  };

  return (
    <Root>
      <Message>{message}</Message>
      <Dismiss type="button" onClick={dismiss} aria-label="Dismiss announcement">
        ✕
      </Dismiss>
    </Root>
  );
}

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: 8px 44px 8px 16px;
  position: relative;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  box-shadow: inset 3px 0 0 ${({ theme }) => theme.color.accentSecondary};
`;

const Message = styled.p`
  font-size: 13px;
  font-weight: 600;
  text-align: center;
`;

const Dismiss = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  border-radius: ${({ theme }) => theme.radius.control}px;
  color: ${({ theme }) => theme.color.textSecondary};
  cursor: pointer;
  font-size: 12px;
  &:hover {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
