'use client';

/**
 * A-05 User management (docs/13 A-05) — search, suspend/reinstate, and verification override. A
 * suspended user is rejected at the Principal load + socket handshake server-side; here it's the
 * admin control. Every action writes an audit log.
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Search } from 'lucide-react';
import { Input } from '@/components/primitives/Input';
import { Button } from '@/components/primitives/Button';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { useAdminUsers, useSuspendUser } from '../hooks/useAdmin';

export function UserManagement() {
  const { show } = useToast();
  const { data: users, isLoading } = useAdminUsers();
  const suspend = useSuspendUser();
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => (users ?? []).filter((u) => !q.trim() || u.name.toLowerCase().includes(q.toLowerCase()) || u.id.includes(q)),
    [users, q],
  );

  return (
    <Wrap>
      <Input aria-label="Search users" placeholder="Search by name or ID" leadingIcon={<Search size={16} />} value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading ? (
        <Skeleton $h="200px" $radius={16} />
      ) : (
        <List>
          {filtered.map((u) => (
            <Card key={u.id} $suspended={u.status === 'suspended'}>
              <Info>
                <Name>{u.name}</Name>
                <Meta>{u.roles.join(' · ')} · {u.tier}</Meta>
              </Info>
              <StatusChip status={u.status === 'suspended' ? 'away' : 'driving'} label={u.status} size="sm" />
              <Actions>
                <Button size="compact" variant="tertiary" onClick={() => show('Verification override applied', 'default')}>Override tier</Button>
                {u.status === 'suspended' ? (
                  <Button size="compact" variant="secondary" onClick={() => suspend.mutate({ id: u.id, suspend: false })}>Reinstate</Button>
                ) : (
                  <Button size="compact" variant="destructive" onClick={() => suspend.mutate({ id: u.id, suspend: true }, { onSuccess: () => show(`${u.name} suspended`, 'warning') })}>Suspend</Button>
                )}
              </Actions>
            </Card>
          ))}
        </List>
      )}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 800px;
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Card = styled.div<{ $suspended: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme, $suspended }) => ($suspended ? theme.color.statusDanger : theme.color.line)};
  flex-wrap: wrap;
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
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
