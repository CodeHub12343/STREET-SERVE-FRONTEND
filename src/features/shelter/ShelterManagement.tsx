'use client';

/**
 * A-06 Shelter partner oversight (docs/12 §4, FR-12). Admin-only.
 *
 * **This screen was a mockup.** Its query returned `demoShelterPartners()` in BOTH branches — demo
 * and live — so an operator on the production URL was reading two invented organisations with
 * invented enrollment counts, and the "Approve" button was a toast that called nothing. There was no
 * list endpoint for it to call even if it had wanted to.
 *
 * Two design corrections came out of building the real thing:
 *
 *  • **There is no approval queue, so there is no Approve button.** A partner is created BY an
 *    admin, and that act is the verification — the vetting happens off-platform, before anyone
 *    types the name in. A button implying a pending queue that was never built is the same lie as
 *    the old one, just wired up.
 *  • **Suspend is the action that was actually missing.** `suspended` sat in the model reachable by
 *    no code path, which meant a partner mishandling residents' money could not be stopped without
 *    editing the database. These organisations hold cash belonging to people who cannot hold it
 *    themselves; that lever is not optional.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Home, Plus, ShieldOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import {
  useRegisterShelterPartner,
  useSetShelterPartnerStatus,
  useShelterPartners,
} from './hooks/useShelter';

export function ShelterManagement() {
  const { show } = useToast();
  const { data, isLoading, isError, refetch } = useShelterPartners();
  const register = useRegisterShelterPartner();
  const setStatus = useSetShelterPartnerStatus();

  const [adding, setAdding] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  /** Which partner is mid-confirm. Suspending cuts off a real organisation — not a one-tap action. */
  const [confirming, setConfirming] = useState<string | null>(null);

  const canRegister = orgName.trim().length > 1 && /^[a-f0-9]{24}$/i.test(ownerId.trim());

  const submit = () =>
    register.mutate(
      { organizationName: orgName.trim(), ownerUserId: ownerId.trim() },
      {
        onSuccess: () => {
          show(`${orgName.trim()} is now a verified partner`, 'success');
          setOrgName('');
          setOwnerId('');
          setAdding(false);
        },
        onError: (e) =>
          show(
            e instanceof AppApiError ? e.message : 'Could not register that partner',
            'danger',
          ),
      },
    );

  const changeStatus = (id: string, name: string, status: 'verified' | 'suspended') =>
    setStatus.mutate(
      { id, status },
      {
        onSuccess: (res) => {
          setConfirming(null);
          /**
           * Naming the custody balance on suspension is the point. An admin who has just cut off a
           * partner still holding residents' cash needs to know that immediately — it is the next
           * thing that has to be handled, and it will not surface anywhere else.
           */
          show(
            status === 'suspended'
              ? res.custodyHeldCents > 0
                ? `${name} suspended. They still hold ${formatCents(res.custodyHeldCents)} of residents' money — arrange handover.`
                : `${name} suspended. They hold none of residents' money.`
              : `${name} reinstated`,
            status === 'suspended' ? 'warning' : 'success',
          );
        },
        onError: (e) =>
          show(e instanceof AppApiError ? e.message : 'Could not change that partner', 'danger'),
      },
    );

  if (isLoading) {
    return (
      <Wrap>
        <Skeleton $h="120px" $radius={16} />
      </Wrap>
    );
  }
  if (isError || !data) {
    return (
      <Wrap>
        <ErrorState title="Couldn’t load shelter partners" onRetry={() => void refetch()} />
      </Wrap>
    );
  }

  return (
    <Wrap>
      {adding ? (
        <AddCard>
          <AddTitle>Register a shelter partner</AddTitle>
          {/* Said plainly, because there is no second step in which someone else checks this. */}
          <AddNote>
            Registering verifies them immediately and grants the named staff account shelter-admin
            rights. Vet the organisation before you do this — there is no approval queue behind it.
          </AddNote>
          <Input
            label="Organisation name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            maxLength={160}
          />
          <Input
            label="Staff account user ID"
            hint="The shelter employee who will enrol residents. They gain shelter-admin rights."
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            error={ownerId.trim() && !/^[a-f0-9]{24}$/i.test(ownerId.trim()) ? 'That is not a user ID' : undefined}
          />
          <AddActions>
            <Button disabled={!canRegister} loading={register.isPending} onClick={submit}>
              Register partner
            </Button>
            <Button variant="tertiary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </AddActions>
        </AddCard>
      ) : (
        <TopBar>
          <Button size="compact" variant="secondary" onClick={() => setAdding(true)}>
            <Plus size={15} /> Register a partner
          </Button>
        </TopBar>
      )}

      {data.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="No shelter partners yet"
          description="Register an organisation to let their staff enrol residents who have no ID and no bank account."
        />
      ) : (
        data.map((s) => {
          const suspended = s.status === 'suspended';
          return (
            <Card key={s.id} $suspended={suspended}>
              <Row>
                <Icon aria-hidden>
                  <Home size={18} />
                </Icon>
                <Info>
                  <Name>{s.organizationName}</Name>
                  <Meta className="tnum">
                    {s.residentsEnrolled} resident{s.residentsEnrolled === 1 ? '' : 's'} enrolled
                    {/* The fiduciary exposure. Nothing surfaced this anywhere before. */}
                    {s.custodyHeldCents > 0
                      ? ` · holding ${formatCents(s.custodyHeldCents)} for residents`
                      : s.custodyAccepted
                        ? ' · holding nothing'
                        : ' · not holding money'}
                  </Meta>
                </Info>
                <StatusChip
                  status={suspended ? 'away' : 'free'}
                  label={suspended ? 'Suspended' : 'Verified'}
                  size="sm"
                />
              </Row>

              {/*
                ═══ WHAT HAPPENS NEXT. ═══

                Registering a partner grants their named contact the `shelter_admin` role, and from
                that moment the whole programme runs on THEIR side of the app — but this screen said
                nothing about it. An admin registered an organisation, saw "0 residents enrolled",
                and had no way to know whether something had gone wrong, whether they were meant to
                enrol people themselves, or that they were now waiting on somebody else entirely.
                A screen that shows a zero and no next step reads as broken.

                Shown only while nobody is enrolled, because after that the count IS the status and
                a permanent instruction block would just be noise.
              */}
              {!suspended && s.residentsEnrolled === 0 ? (
                <NextSteps>
                  <NextTitle>Nothing to do here &mdash; it&rsquo;s with them now</NextTitle>
                  <NextList>
                    <li>
                      Their contact has been given shelter-admin access. They sign in and open{' '}
                      <code>/shelter</code>.
                    </li>
                    <li>
                      They enrol a resident there, which produces a <b>claim code</b>.
                    </li>
                    <li>
                      The resident enters that code in the app to link their account. This number
                      moves when they do.
                    </li>
                  </NextList>
                  <NextHint>
                    Residents are enrolled by the shelter, never by you — they are the ones who know
                    who is actually staying there.
                  </NextHint>
                </NextSteps>
              ) : null}

              {confirming === s.id ? (
                <Confirm>
                  <ConfirmText>
                    {suspended
                      ? `Reinstate ${s.organizationName}? Their staff can enrol residents again.`
                      : `Suspend ${s.organizationName}? They take no new residents and hold no new money. Residents already enrolled keep working, and money already held stays payable to them.`}
                  </ConfirmText>
                  <ConfirmActions>
                    <Button
                      size="compact"
                      variant={suspended ? 'primary' : 'destructive'}
                      loading={setStatus.isPending}
                      onClick={() =>
                        changeStatus(s.id, s.organizationName, suspended ? 'verified' : 'suspended')
                      }
                    >
                      {suspended ? 'Reinstate' : 'Suspend'}
                    </Button>
                    <Button size="compact" variant="tertiary" onClick={() => setConfirming(null)}>
                      Cancel
                    </Button>
                  </ConfirmActions>
                </Confirm>
              ) : (
                <Actions>
                  <Button size="compact" variant="tertiary" onClick={() => setConfirming(s.id)}>
                    {suspended ? (
                      <>
                        <ShieldCheck size={15} /> Reinstate
                      </>
                    ) : (
                      <>
                        <ShieldOff size={15} /> Suspend
                      </>
                    )}
                  </Button>
                </Actions>
              )}
            </Card>
          );
        })
      )}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 560px;
`;
const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
`;
const Card = styled.div<{ $suspended: boolean }>`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid
    ${({ theme, $suspended }) => ($suspended ? theme.color.statusAway : theme.color.line2)};
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Icon = styled.span`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.accentSecondary};
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Meta = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;
const NextSteps = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const NextTitle = styled.p`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const NextList = styled.ol`
  display: grid;
  gap: 4px;
  padding-left: 18px;
  li {
    font-size: 12.5px;
    line-height: 1.5;
    color: ${({ theme }) => theme.color.textSecondary};
    list-style: decimal;
  }
  code {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    padding: 1px 5px;
    border-radius: 4px;
    background: ${({ theme }) => theme.color.surfaceBase};
  }
`;
const NextHint = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Confirm = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const ConfirmText = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const ConfirmActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const AddCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const AddTitle = styled.h2`
  font-size: 15px;
  font-weight: 800;
`;
const AddNote = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const AddActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
