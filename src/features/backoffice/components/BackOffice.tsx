'use client';

/**
 * 7.10 — the vendor's back office: crew, expenses, invoices.
 *
 * Built on ADR-002 (**engagements, not employment**), and the UI carries that decision as much as
 * the schema does. The tab is "Crew", the field is "Rate for work offered", and the invitation says
 * "work with" — because for a sole trader, a screen that looks like an employer's HR panel is an
 * invitation to describe a relationship they cannot afford to be held to.
 *
 * Expenses lead. It is the one thing here a vendor will open weekly, and the deduction they usually
 * lose is the one they never wrote down.
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Receipt, FileText, Users } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Banner } from '@/components/feedback/Banner';
import { formatCents } from '@/lib/money';
import {
  useAddExpense,
  useCreateInvoice,
  useCrew,
  useExpenseSummary,
  useExpenses,
  useInvoices,
  useSetInvoiceStatus,
} from '../hooks/useBackoffice';
import type { ExpenseCategory, InvoiceStatus } from '../types';

const TabRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[2]}px ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.line2)};
  background: ${({ theme, $active }) =>
    $active ? theme.color.accentPrimary : theme.color.surfaceRaised};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.color.textPrimary)};
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Muted = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Total = styled.p`
  font-size: 24px;
  font-weight: 800;
`;
const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.space[1]}px;
  font-size: 13px;
  font-weight: 600;
`;
const Input = styled.input`
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceBase};
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Select = styled.select`
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceBase};
  color: ${({ theme }) => theme.color.textPrimary};
`;

const CATEGORIES: ExpenseCategory[] = [
  'inventory',
  'fuel',
  'vehicle',
  'supplies',
  'permits',
  'pitch_fees',
  'equipment',
  'marketing',
  'other',
];
const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  inventory: 'Stock',
  fuel: 'Fuel',
  vehicle: 'Vehicle',
  supplies: 'Supplies',
  permits: 'Permits & licences',
  pitch_fees: 'Pitch fees',
  equipment: 'Equipment',
  marketing: 'Marketing',
  other: 'Other',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  void: 'Void',
};

export function BackOffice({ businessId }: { businessId: string }) {
  const [tab, setTab] = useState<'expenses' | 'invoices' | 'crew'>('expenses');

  // This tax year to date. A vendor thinking about expenses is thinking about the return.
  const { from, to } = useMemo(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), 0, 1).toISOString(),
      to: now.toISOString(),
    };
  }, []);

  return (
    <TabPage title="Back office" backHref="/vendor" backLabel="Back to dashboard">
      <TabRow role="tablist" aria-label="Back office sections">
        <Tab role="tab" aria-selected={tab === 'expenses'} $active={tab === 'expenses'} onClick={() => setTab('expenses')}>
          <Receipt size={16} aria-hidden /> Expenses
        </Tab>
        <Tab role="tab" aria-selected={tab === 'invoices'} $active={tab === 'invoices'} onClick={() => setTab('invoices')}>
          <FileText size={16} aria-hidden /> Invoices
        </Tab>
        {/* "Crew", never "Staff" — ADR-002. */}
        <Tab role="tab" aria-selected={tab === 'crew'} $active={tab === 'crew'} onClick={() => setTab('crew')}>
          <Users size={16} aria-hidden /> Crew
        </Tab>
      </TabRow>

      {tab === 'expenses' ? <Expenses businessId={businessId} from={from} to={to} /> : null}
      {tab === 'invoices' ? <Invoices businessId={businessId} /> : null}
      {tab === 'crew' ? <Crew businessId={businessId} /> : null}
    </TabPage>
  );
}

function Expenses({ businessId, from, to }: { businessId: string; from: string; to: string }) {
  const expenses = useExpenses(businessId);
  const summary = useExpenseSummary(businessId, from, to);
  const add = useAddExpense(businessId);
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  if (expenses.isLoading) return <Skeleton $h="140px" $radius={16} />;

  return (
    <List>
      <Card>
        <Muted>This year so far</Muted>
        <Total>{formatCents(summary.data?.totalCents ?? 0)}</Total>
        {/* The server's own statement of what this is not. A platform-computed "profit" would be
            wrong in the direction that matters and would look authoritative while being so. */}
        {summary.data?.disclosure ? <Banner tone="info">{summary.data.disclosure}</Banner> : null}
        {summary.data ? (
          <>
            {CATEGORIES.filter((c) => (summary.data!.byCategory[c] ?? 0) > 0).map((c) => (
              <Row key={c}>
                <span>{CATEGORY_LABEL[c]}</span>
                <strong>{formatCents(summary.data!.byCategory[c] ?? 0)}</strong>
              </Row>
            ))}
            <Muted>
              {summary.data.withReceipt} of {summary.data.count} have a receipt attached.
            </Muted>
          </>
        ) : null}
      </Card>

      <Card as="form"
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          const cents = Math.round(Number(amount) * 100);
          if (!Number.isFinite(cents) || cents <= 0) return;
          add.mutate(
            {
              category,
              amountCents: cents,
              incurredOn: new Date().toISOString(),
              ...(description ? { description } : {}),
            },
            {
              onSuccess: () => {
                setAmount('');
                setDescription('');
              },
            },
          );
        }}
      >
        <strong>Add an expense</strong>
        <Field>
          What for
          <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          Amount
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field>
          Note (optional)
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Button type="submit" disabled={add.isPending || !amount}>
          Save
        </Button>
      </Card>

      {(expenses.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Receipt size={28} aria-hidden />}
          title="No expenses recorded"
          description="Log fuel, pitch fees, and stock as you go. It is much easier than reconstructing a year at once."
        />
      ) : (
        (expenses.data ?? []).map((e) => (
          <Card key={e.id}>
            <Row>
              <div>
                <strong>{CATEGORY_LABEL[e.category]}</strong>
                <Muted>
                  {new Date(e.incurredOn).toLocaleDateString()}
                  {e.description ? ` · ${e.description}` : ''}
                </Muted>
              </div>
              <strong>{formatCents(e.amountCents)}</strong>
            </Row>
          </Card>
        ))
      )}
    </List>
  );
}

function Invoices({ businessId }: { businessId: string }) {
  const invoices = useInvoices(businessId);
  const create = useCreateInvoice(businessId);
  const setStatus = useSetInvoiceStatus(businessId);
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  if (invoices.isLoading) return <Skeleton $h="140px" $radius={16} />;

  return (
    <List>
      <Card as="form"
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          const cents = Math.round(Number(amount) * 100);
          if (!customerName || !Number.isFinite(cents) || cents < 0) return;
          create.mutate(
            {
              customerName,
              lineItems: [{ description: description || 'Services', quantity: 1, unitPriceCents: cents }],
            },
            {
              onSuccess: () => {
                setCustomerName('');
                setDescription('');
                setAmount('');
              },
            },
          );
        }}
      >
        <strong>New invoice</strong>
        <Field>
          Who is it for
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </Field>
        <Field>
          What for
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Catering, 12 May"
          />
        </Field>
        <Field>
          Amount
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Button type="submit" disabled={create.isPending || !customerName || !amount}>
          Create draft
        </Button>
      </Card>

      {(invoices.data ?? []).length === 0 ? (
        <EmptyState
          icon={<FileText size={28} aria-hidden />}
          title="No invoices"
          description="Bill a customer for work you did off the app — a market stall booking, a catering job."
        />
      ) : (
        (invoices.data ?? []).map((inv) => (
          <Card key={inv.id}>
            <Row>
              <div>
                <strong>
                  {inv.number} · {inv.customerName}
                </strong>
                <Muted>
                  {STATUS_LABEL[inv.status]}
                  {inv.paidAt ? ` on ${new Date(inv.paidAt).toLocaleDateString()}` : ''}
                </Muted>
              </div>
              <strong>{formatCents(inv.totalCents)}</strong>
            </Row>
            {inv.status === 'draft' ? (
              <Button
                variant="secondary"
                onClick={() => setStatus.mutate({ id: inv.id, status: 'sent' })}
              >
                Mark as sent
              </Button>
            ) : null}
            {inv.status === 'sent' ? (
              <>
                <Button onClick={() => setStatus.mutate({ id: inv.id, status: 'paid' })}>
                  Mark as paid
                </Button>
                {/* Said on the invoice itself, because "mark as paid" reads like the platform
                    collected the money and it did not. */}
                <Muted>{inv.disclosure}</Muted>
              </>
            ) : null}
          </Card>
        ))
      )}
    </List>
  );
}

function Crew({ businessId }: { businessId: string }) {
  const crew = useCrew(businessId);
  if (crew.isLoading) return <Skeleton $h="140px" $radius={16} />;

  const members = crew.data ?? [];
  return (
    <List>
      {/* The framing, stated once, at the top. It is the whole of ADR-002 in two sentences. */}
      <Banner tone="info">
        Your crew is a list of people you work with regularly, so you can offer them work first. It
        is not employment — nobody on it owes you hours, and you owe them none.
      </Banner>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users size={28} aria-hidden />}
          title="No crew yet"
          description="Invite someone you've worked with before. They choose whether to accept."
        />
      ) : (
        members.map((m) => (
          <Card key={m.id}>
            <Row>
              <div>
                <strong>{m.note ?? 'Crew member'}</strong>
                <Muted>
                  {m.status === 'invited'
                    ? 'Invitation sent — waiting for them to accept'
                    : m.status === 'active'
                      ? 'Gets your jobs first'
                      : 'Declined'}
                </Muted>
              </div>
              {/* "Rate for work offered", never "wage" — ADR-002's copy rule. */}
              {m.defaultRateCents ? (
                <strong>{formatCents(m.defaultRateCents)}</strong>
              ) : null}
            </Row>
          </Card>
        ))
      )}
    </List>
  );
}
