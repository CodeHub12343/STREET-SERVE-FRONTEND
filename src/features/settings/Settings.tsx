'use client';

/**
 * C-37 Settings (docs/13 C-37) — account, per-category notifications (safety-critical un-mutable),
 * location precision, theme, language. Sign out clears the session + query cache + disconnects the
 * socket (AUTHENTICATION_IMPLEMENTATION.md §7).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { SettingsList, SettingsGroup, SettingsRow } from '@/components/layout/SettingsList';
import { Switch } from '@/components/primitives/Switch';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { Modal } from '@/components/primitives/Modal';
import { Input } from '@/components/primitives/Input';
import { useMe } from '@/lib/auth/useMe';
import { useAuthCompat } from '@/lib/auth/useAuthCompat';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { useThemeStore, type ThemePreference } from '@/stores/theme.store';
import { useUpdateProfile } from '@/features/identity';
import { useNotificationPrefs, usePushRegister } from '@/features/notifications';
import { Button } from '@/components/primitives/Button';

export function Settings() {
  const router = useRouter();
  const qc = useQueryClient();
  const { signOut } = useAuthCompat();
  const { principal } = useMe();
  const themePref = useThemeStore((s) => s.preference);
  const setThemePref = useThemeStore((s) => s.setPreference);
  const updateProfile = useUpdateProfile();
  const { prefs, isError: prefsError, update, categories } = useNotificationPrefs();
  const push = usePushRegister();
  const { show } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // Read from the principal. This was hardcoded `false`, so the row claimed "Approximate" for every
  // user while the backend default is 'exact' — a privacy control that misreported its own state.
  const locationPrecise = principal?.locationPrecision === 'exact';

  const doSignOut = async () => {
    await signOut();
    qc.clear();
    router.replace('/welcome');
  };

  return (
    <SettingsList>
      <SettingsGroup title="Account">
        {/* Was a dead read-only row that rendered a bare "—" for anyone whose display name was
            never set, with nowhere to go and no hint that it could be fixed. */}
        <SettingsRow
          label="Name"
          value={principal?.name ?? 'Add your name'}
          onClick={() => {
            setNameDraft(principal?.name ?? '');
            setEditingName(true);
          }}
        />
        <SettingsRow label="Verification" value={principal?.verificationTier ?? 'tier0'} onClick={() => router.push('/profile/verification')} />
      </SettingsGroup>

      <SettingsGroup title="Notifications">
        <SettingsRow
          label="Push notifications"
          value={push.state === 'subscribed' ? 'On' : push.state === 'denied' ? 'Blocked' : undefined}
          control={
            push.state !== 'subscribed' ? (
              <Button size="compact" variant="secondary" loading={push.state === 'requesting'} onClick={() => void push.enable()}>
                Enable
              </Button>
            ) : undefined
          }
        />
        {categories.map((c) => (
          <SettingsRow
            key={c.key}
            label={c.label}
            control={
              <Switch
                label={c.label}
                checked={c.locked ? true : prefs[c.key] !== false}
                // A switch that can't be saved must not look operable.
                disabled={c.locked || prefsError}
                onChange={(v) =>
                  update.mutate(
                    { [c.key]: v },
                    {
                      onError: (e) =>
                        show(
                          e instanceof AppApiError ? e.message : `Couldn’t change ${c.label}`,
                          'danger',
                        ),
                    },
                  )
                }
              />
            }
          />
        ))}
        {prefsError ? (
          <Locked role="alert">
            Couldn’t load your notification settings, so these can’t be changed right now.
          </Locked>
        ) : null}
        <Locked>Safety-critical alerts (payouts, disputes, verification) can’t be turned off.</Locked>
      </SettingsGroup>

      <SettingsGroup title="Privacy">
        <SettingsRow
          label="Precise location"
          value={locationPrecise ? 'Exact' : 'Approximate'}
          control={
            <Switch
              label="Precise location"
              checked={locationPrecise}
              onChange={(v) =>
                updateProfile.mutate(
                  { locationPrecision: v ? 'exact' : 'fuzzed' },
                  {
                    onError: (e) =>
                      show(
                        e instanceof AppApiError ? e.message : 'Couldn’t change location precision',
                        'danger',
                      ),
                  },
                )
              }
            />
          }
        />
        <Locked>
          {locationPrecise
            ? 'Businesses you interact with see your exact location.'
            : 'Your location is blurred before it’s shared.'}
        </Locked>
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <SettingsRow
          label="Theme"
          control={
            <SegmentedControl
              ariaLabel="Theme"
              value={themePref}
              onChange={(v) => setThemePref(v as ThemePreference)}
              segments={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
            />
          }
        />
        {/* The "Language" row was removed: it rendered a static "English" with no control behind
            it, so it read as a setting while nothing could change it. There is no i18n layer yet —
            when there is, this is where the picker belongs. */}
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow label="Sign out" destructive onClick={() => void doSignOut()} />
      </SettingsGroup>

      <Modal open={editingName} onClose={() => setEditingName(false)} title="Your name">
        <Form>
          <Input
            label="Display name"
            placeholder="e.g. Jake M."
            value={nameDraft}
            maxLength={120}
            onChange={(e) => setNameDraft(e.target.value)}
          />
          <Hint>This is what businesses and other people see when you order or message.</Hint>
          <Button
            fullWidth
            loading={updateProfile.isPending}
            disabled={nameDraft.trim().length === 0}
            onClick={() =>
              updateProfile.mutate(
                { displayName: nameDraft.trim() },
                {
                  onSuccess: () => {
                    setEditingName(false);
                    show('Name updated', 'success');
                  },
                  onError: (e) =>
                    show(
                      e instanceof AppApiError ? e.message : 'Couldn’t update your name',
                      'danger',
                    ),
                },
              )
            }
          >
            Save
          </Button>
        </Form>
      </Modal>
    </SettingsList>
  );
}

const Locked = styled.p`
  padding: ${({ theme }) => theme.space[2]}px ${({ theme }) => theme.space[3]}px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Form = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Hint = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;
