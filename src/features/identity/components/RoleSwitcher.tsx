'use client';

/**
 * Role switcher (AUTHENTICATION_IMPLEMENTATION.md §4) — one account, many surfaces. Shows the modes
 * the user's roles grant and lets them jump between surfaces; roles they don't hold yet appear as
 * "Become a…" entry points into the add-role flow. Not authorization — the backend still enforces.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ChevronDown, Check } from 'lucide-react';
import { Modal } from '@/components/primitives/Modal';
import { useMe } from '@/lib/auth/useMe';
import { useModeStore } from '@/stores/mode.store';
import type { AppMode } from '@/types';
import { useActiveMode } from '../hooks/useActiveMode';
import { ALL_MODES, MODE_META, SELF_GRANTABLE_MODES, holdsMode } from '../modes';

export function RoleSwitcher() {
  const router = useRouter();
  const { roles } = useMe();
  const activeMode = useActiveMode();
  const setMode = useModeStore((s) => s.setMode);
  const [open, setOpen] = useState(false);

  const has = (mode: AppMode) => holdsMode(roles, mode);
  // Show a mode you hold, or one you're allowed to add. Never offer a privileged role.
  const visibleModes = ALL_MODES.filter((m) => has(m) || SELF_GRANTABLE_MODES.includes(m));

  const choose = (mode: AppMode) => {
    setOpen(false);
    if (has(mode)) {
      setMode(mode);
      router.push(MODE_META[mode].home);
    } else {
      // Not held yet → add-role flow.
      router.push('/onboarding/role');
    }
  };

  return (
    <>
      <Trigger onClick={() => setOpen(true)} aria-haspopup="dialog">
        {MODE_META[activeMode].label}
        <ChevronDown size={16} aria-hidden />
      </Trigger>
      <Modal open={open} onClose={() => setOpen(false)} title="Switch mode">
        <List>
          {visibleModes.map((mode) => {
            const held = has(mode);
            return (
              <Row key={mode} $active={mode === activeMode} onClick={() => choose(mode)}>
                <span>{held ? MODE_META[mode].label : `Become a ${MODE_META[mode].label}`}</span>
                {mode === activeMode ? <Check size={16} aria-hidden /> : null}
              </Row>
            );
          })}
        </List>
      </Modal>
    </>
  );
}

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textPrimary};
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
`;
const List = styled.div`
  display: grid;
  gap: 4px;
`;
const Row = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 48px;
  padding: 0 ${({ theme }) => theme.space[3]}px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.control}px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  text-align: left;
  color: ${({ theme }) => theme.color.textPrimary};
  background: ${({ theme, $active }) => ($active ? theme.color.surfaceRaised2 : 'transparent')};
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;
