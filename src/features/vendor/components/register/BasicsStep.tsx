'use client';

/**
 * V-01b — name, logo, operating hours, and service area.
 *
 * Two of these were broken before BP-3: hours existed in the database with no UI anywhere, and
 * the old step 2 collected a free-text "service area" that had no backend field and was silently
 * discarded. Both now persist (verified by re-reading GET /businesses/:id).
 *
 * The area control is a radius picker over the vendor's own position, not a map gesture: a map is
 * a progressive enhancement, never a requirement to finish registering (a11y — there must always
 * be a non-map path).
 */
import { useState } from 'react';
import styled from 'styled-components';
import { MapPin, Loader2, Upload } from 'lucide-react';
import { Input } from '@/components/primitives/Input';
import { Select } from '@/components/primitives/Select';
import { Switch } from '@/components/primitives/Switch';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { useToast } from '@/components/feedback/ToastProvider';
import { uploadImage } from '@/lib/upload';
import { requestPosition } from '@/lib/geo';
import { DAY_LABEL, RADIUS_OPTIONS, type HoursEntry } from '../../registration';

export interface BasicsStepProps {
  name: string;
  onName: (v: string) => void;
  logoUrl: string | undefined;
  onLogoUrl: (v: string | undefined) => void;
  hours: HoursEntry[];
  onHours: (v: HoursEntry[]) => void;
  center: [number, number] | undefined;
  onCenter: (v: [number, number] | undefined) => void;
  radiusM: number;
  onRadiusM: (v: number) => void;
  error?: string;
}

export function BasicsStep({
  name,
  onName,
  logoUrl,
  onLogoUrl,
  hours,
  onHours,
  center,
  onCenter,
  radiusM,
  onRadiusM,
  error,
}: BasicsStepProps) {
  const { show } = useToast();
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const dayEntry = (day: number) => hours.find((h) => h.day === day);

  const toggleDay = (day: number, on: boolean) => {
    onHours(
      on
        ? [...hours, { day, open: '09:00', close: '17:00' }].sort((a, b) => a.day - b.day)
        : hours.filter((h) => h.day !== day),
    );
  };

  const setTime = (day: number, field: 'open' | 'close', v: string) => {
    onHours(hours.map((h) => (h.day === day ? { ...h, [field]: v } : h)));
  };

  const locate = async () => {
    setLocating(true);
    try {
      // Accepts a recent cached fix before demanding a fresh one — see requestPosition().
      const pos = await requestPosition();
      onCenter([pos.coords.longitude, pos.coords.latitude]);
      show('Service area centred on your location', 'success');
    } catch (e) {
      /**
       * The error carries a `code` saying WHY, and collapsing all three into one message told a user
       * who had blocked the permission to "try again", which can never work — the browser will not
       * re-prompt once denied, so the button silently does nothing forever.
       *
       * 1 PERMISSION_DENIED · 2 POSITION_UNAVAILABLE · 3 TIMEOUT.
       */
      const code = (e as GeolocationPositionError | undefined)?.code;
      const message =
        code === 1
          ? 'Location is blocked for this site. Allow it in your browser’s settings, or set your area later in settings.'
          : code === 3
            ? 'Finding your location took too long — this often means no GPS signal indoors. Try near a window or outside, or set your area later in settings.'
            : 'We couldn’t get your location. You can set this later in settings.';
      show(message, 'warning');
    } finally {
      setLocating(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, 'business-logo');
      onLogoUrl(url);
      show('Logo uploaded', 'success');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not upload the logo', 'danger');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Wrap>
      <Input
        label="Business name"
        placeholder="Taco Loco"
        required
        value={name}
        error={error}
        onChange={(e) => onName(e.target.value)}
      />

      <Field>
        <FieldLabel>Logo</FieldLabel>
        <LogoRow>
          {logoUrl ? <LogoPreview src={logoUrl} alt="" /> : <LogoEmpty aria-hidden>🚚</LogoEmpty>}
          <HiddenInput
            id="logo-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button
            variant="secondary"
            size="compact"
            loading={uploading}
            onClick={() => document.getElementById('logo-file')?.click()}
          >
            <Upload size={14} /> {logoUrl ? 'Replace' : 'Add a photo'}
          </Button>
        </LogoRow>
        <Hint>This is your pin on the map. You can add it later.</Hint>
      </Field>

      <Field>
        <FieldLabel>Opening hours</FieldLabel>
        <Days>
          {DAY_LABEL.map((label, day) => {
            const entry = dayEntry(day);
            return (
              <DayRow key={day}>
                <DayToggle>
                  <Switch
                    checked={Boolean(entry)}
                    label={label}
                    onChange={(on) => toggleDay(day, on)}
                  />
                  <DayName>{label}</DayName>
                </DayToggle>
                {entry ? (
                  <Times>
                    <TimeInput
                      type="time"
                      aria-label={`${label} opening time`}
                      value={entry.open}
                      onChange={(e) => setTime(day, 'open', e.target.value)}
                    />
                    <span aria-hidden>–</span>
                    <TimeInput
                      type="time"
                      aria-label={`${label} closing time`}
                      value={entry.close}
                      onChange={(e) => setTime(day, 'close', e.target.value)}
                    />
                  </Times>
                ) : (
                  <Closed>Closed</Closed>
                )}
              </DayRow>
            );
          })}
        </Days>
      </Field>

      <Field>
        <FieldLabel>Where do you operate?</FieldLabel>
        <AreaRow>
          {/* `locate` is async; onClick expects void. `void` discards the promise explicitly —
              rejections are already handled inside locate(), so nothing is being swallowed here. */}
          <Button
            variant="secondary"
            size="compact"
            loading={locating}
            onClick={() => void locate()}
          >
            {locating ? <Loader2 size={14} /> : <MapPin size={14} />}
            {center ? 'Update my location' : 'Use my location'}
          </Button>
          {center ? (
            <Located>
              Centred on {center[1].toFixed(3)}, {center[0].toFixed(3)}
            </Located>
          ) : null}
        </AreaRow>
        <Select
          label="How far do you travel?"
          value={String(radiusM)}
          options={RADIUS_OPTIONS.map((r) => ({ value: String(r.value), label: r.label }))}
          onChange={(e) => onRadiusM(Number(e.target.value))}
        />
        {!center ? (
          <Banner tone="info">
            Sharing your location helps customers nearby find you. You can skip it and set your area
            later in settings.
          </Banner>
        ) : null}
      </Field>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[5]}px;
  /**
   * Grid and flex children default to min-width: auto, which means "never shrink below your
   * intrinsic content width". One wide descendant (here, a row of time inputs) therefore widens
   * the whole column past the viewport instead of being constrained by it. min-width: 0 on the
   * containers is what actually lets the layout narrow — it is the fix for almost every mystery
   * horizontal scrollbar.
   */
  min-width: 0;
`;
const Field = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  min-width: 0;
`;
const FieldLabel = styled.p`
  font-size: 13px;
  font-weight: 700;
`;
const Hint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const LogoPreview = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
`;
const LogoEmpty = styled.span`
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-size: 22px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const HiddenInput = styled.input`
  display: none;
`;
const Days = styled.div`
  display: grid;
  gap: 4px;
`;
const DayRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: 6px 10px;
  min-width: 0;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};

  /**
   * Below this the toggle and two time inputs genuinely do not fit side by side, so the times drop
   * to their own line rather than being squeezed to unusability or pushed off-screen. Wrapping is
   * the honest response to not enough room; shrinking a time field until its clock icon overlaps
   * the digits is not.
   */
  @media (max-width: 420px) {
    flex-wrap: wrap;
    row-gap: 8px;
  }
`;
const DayToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;
const DayName = styled.span`
  font-size: 13px;
  font-weight: 650;
  width: 34px;
`;
const Times = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
  min-width: 0;

  /* Once wrapped, the pair takes the full width so both fields stay comfortably tappable. */
  @media (max-width: 420px) {
    width: 100%;
  }
`;
const TimeInput = styled.input`
  height: 34px;
  padding: 0 8px;
  /**
   * <input type="time"> has a wide intrinsic size (the browser's clock affordance) and, as a flex
   * item, will not go below it without this. Two of them are what pushed this page off-screen.
   */
  min-width: 0;
  flex: 1 1 0;
  max-width: 140px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceBase};
  color: ${({ theme }) => theme.color.textPrimary};
  font-size: 13px;
`;
const Closed = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const AreaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  flex-wrap: wrap;
`;
const Located = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.statusLive};
  font-weight: 650;
`;
