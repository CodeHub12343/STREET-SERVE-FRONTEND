'use client';

/**
 * The mode affordance for surfaces whose chrome has no room for the topbar RoleSwitcher — chiefly
 * the map, which is full-bleed and also the app's only PUBLIC screen.
 *
 * Why it lives in the orbit rather than on the map itself:
 *  - The orb already means "everywhere else in the app". Switching mode is that same intent at a
 *    larger scale, so it belongs in the same gesture instead of a second, competing control.
 *  - The map's top strip is already search + list + category tabs; a fourth control turns the one
 *    piece of chrome over a live map into a toolbar.
 *
 * It STATES the current mode, which is the part that makes the concept discoverable at all: before
 * this, nothing on the customer surface ever said "you are in Customer mode", so a user who had
 * just become a Street Seller had no reason to believe another surface existed.
 *
 * Renders nothing only when there is genuinely nowhere to go — meaning the account neither holds a
 * second mode nor may grant itself one. Holding a single mode is NOT that case: a customer who can
 * become a Street Seller has a destination, and hiding the control from them is what made the
 * feature invisible to everyone who had not already found it.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Check, ChevronRight } from 'lucide-react';
import { Sheet } from '@/components/primitives/Sheet';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/feedback/ToastProvider';
import { useMe } from '@/lib/auth/useMe';
import { useModeStore } from '@/stores/mode.store';
import { AppApiError } from '@/lib/api/errors';
import type { AppMode } from '@/types';
import { useAddRole } from '../hooks/useProfile';
import { useActiveMode } from '../hooks/useActiveMode';
import { ALL_MODES, MODE_META, SELF_GRANTABLE_MODES, holdsMode } from '../modes';

/** True when this account can actually go somewhere else — the only case worth showing UI for. */
export function useHasMultipleModes(): boolean {
  const { roles } = useMe();
  return ALL_MODES.filter((m) => holdsMode(roles, m)).length > 1;
}

export function ModeSwitchRow({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { show } = useToast();
  const { roles } = useMe();
  const addRole = useAddRole();
  // Derived from the route — the surface on screen, not the last button pressed.
  const activeMode = useActiveMode();
  const setMode = useModeStore((s) => s.setMode);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<AppMode | null>(null);

  const held = ALL_MODES.filter((m) => holdsMode(roles, m));
  // Held modes plus ones they may add — never advertise a privileged role that can only fail.
  const visible = ALL_MODES.filter((m) => held.includes(m) || SELF_GRANTABLE_MODES.includes(m));
  const activeMeta = MODE_META[activeMode];
  const ActiveIcon = activeMeta.icon;

  /**
   * Nothing to switch to → no control.
   *
   * Measured against `visible`, not `held`. The sheet lists modes the account HOLDS plus ones it may
   * grant itself, so a customer-only account has somewhere to go — "Become a Street Seller" — yet a
   * `held.length <= 1` test hid the control from precisely those users. That defeated the reason
   * this component exists (see the header): the person who has never switched is the one who needs
   * to learn another surface exists.
   */
  if (visible.length <= 1) return null;

  const go = (mode: AppMode) => {
    setPreview(null);
    setOpen(false);
    onNavigate?.();
    if (holdsMode(roles, mode)) {
      setMode(mode);
      router.push(MODE_META[mode].home);
      return;
    }
    addRole.mutate(MODE_META[mode].roles[0]!, {
      onSuccess: () => {
        setMode(mode);
        router.push(MODE_META[mode].home);
        show(`You're now set up as ${MODE_META[mode].label}`, 'success');
      },
      onError: (e) =>
        show(e instanceof AppApiError ? e.message : 'Could not add that role', 'danger'),
    });
  };

  const previewMeta = preview ? MODE_META[preview] : null;
  const PreviewIcon = previewMeta?.icon;

  return (
    <>
      <Row type="button" onClick={() => setOpen(true)}>
        <Bubble aria-hidden>
          <ActiveIcon size={16} />
        </Bubble>
        <Text>
          <Kicker>You’re in</Kicker>
          <Current>{activeMeta.label}</Current>
        </Text>
        <Switch>
          Switch <ChevronRight size={14} aria-hidden />
        </Switch>
      </Row>

      <Sheet open={open} onClose={() => setOpen(false)} ariaLabel="Switch mode" initialSnap="half">
        <List>
          {visible.map((mode) => {
            const meta = MODE_META[mode];
            const Icon = meta.icon;
            const isActive = mode === activeMode;
            const owned = holdsMode(roles, mode);
            return (
              <Item
                key={mode}
                type="button"
                $active={isActive}
                onClick={() => (isActive ? setOpen(false) : setPreview(mode))}
              >
                <Bubble $active={isActive} aria-hidden>
                  <Icon size={18} />
                </Bubble>
                <ItemText>
                  <ItemName>{owned ? meta.label : `Become a ${meta.label}`}</ItemName>
                  <ItemTag>{meta.tagline}</ItemTag>
                </ItemText>
                {isActive ? <ActiveTag>Active</ActiveTag> : <ChevronRight size={16} aria-hidden />}
              </Item>
            );
          })}
        </List>
      </Sheet>

      {/* The same preview the profile carousel shows — one mental model for "what is this mode". */}
      {previewMeta ? (
        <Sheet
          open
          onClose={() => setPreview(null)}
          ariaLabel={`${previewMeta.label} role preview`}
          initialSnap="half"
          footer={
            <Button fullWidth loading={addRole.isPending} onClick={() => go(preview!)}>
              {holdsMode(roles, preview!)
                ? `Switch to ${previewMeta.label}`
                : `Become a ${previewMeta.label}`}
            </Button>
          }
        >
          <PreviewBody>
            <PreviewHead>
              {PreviewIcon ? (
                <Bubble $active aria-hidden>
                  <PreviewIcon size={22} />
                </Bubble>
              ) : null}
              <div>
                <PreviewTitle>{previewMeta.label}</PreviewTitle>
                <ItemTag>{previewMeta.tagline}</ItemTag>
              </div>
            </PreviewHead>
            <Benefits>
              {previewMeta.benefits.map((b) => (
                <li key={b}>
                  <Check size={15} aria-hidden />
                  {b}
                </li>
              ))}
            </Benefits>
          </PreviewBody>
        </Sheet>
      ) : null}
    </>
  );
}

const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  max-width: 320px;
  padding: ${({ theme }) => theme.space[2]}px ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  box-shadow: ${({ theme }) => theme.color.shadow};
  cursor: pointer;
  text-align: left;
`;
const Bubble = styled.span<{ $active?: boolean }>`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  background: ${({ theme, $active }) =>
    $active ? theme.color.accentPrimary : theme.color.surfaceRaised2};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.color.textSecondary)};
`;
const Text = styled.span`
  display: grid;
  flex: 1;
  min-width: 0;
`;
const Kicker = styled.span`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Current = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Switch = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: none;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentPrimary};
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Item = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme, $active }) =>
    $active ? theme.color.surfaceRaised2 : theme.color.surfaceRaised};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.line)};
  color: ${({ theme }) => theme.color.textSecondary};
  cursor: pointer;
  text-align: left;
`;
const ItemText = styled.span`
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
`;
const ItemName = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const ItemTag = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const ActiveTag = styled.span`
  flex: none;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accentPrimary};
`;
const PreviewBody = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const PreviewHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const PreviewTitle = styled.p`
  font-size: 18px;
  font-weight: 800;
`;
const Benefits = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  svg {
    flex: none;
    margin-top: 2px;
    color: ${({ theme }) => theme.color.statusLive};
  }
`;
