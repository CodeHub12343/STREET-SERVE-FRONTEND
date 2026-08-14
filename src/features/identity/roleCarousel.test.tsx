import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithTheme } from '@/test/test-utils';
import { RoleCarousel } from './components/RoleCarousel';

const push = vi.fn();
// A self-grant that resolves synchronously so the success path (switch + route) runs in the test.
const { addRoleMock } = vi.hoisted(() => ({ addRoleMock: vi.fn() }));
// The carousel renders on /profile, and the active mode is now read from the route.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/profile' }));
vi.mock('@/lib/auth/useMe', () => ({
  useMe: () => ({ roles: ['customer'], principal: { name: 'Jake' }, tier: 'tier0', isLoading: false }),
}));
vi.mock('./hooks/useProfile', () => ({
  useAddRole: () => ({
    isPending: false,
    mutate: (role: string, opts?: { onSuccess?: () => void }) => {
      addRoleMock(role);
      opts?.onSuccess?.();
    },
  }),
}));

describe('RoleCarousel', () => {
  beforeEach(() => {
    push.mockClear();
    addRoleMock.mockClear();
  });

  it('shows every offerable role as a tile, marks the active one, and never offers Admin', () => {
    renderWithTheme(<RoleCarousel />);

    const active = screen.getByRole('button', { name: /Customer.*ACTIVE/s });
    expect(active.getAttribute('aria-pressed')).toBe('true');

    expect(screen.getByRole('button', { name: 'Street Seller' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Vendor' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Consignment Hub' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Admin/ })).toBeNull();
  });

  it('tapping an unheld role opens the preview sheet; its CTA self-grants the role and lands on its home', () => {
    renderWithTheme(<RoleCarousel />);

    fireEvent.click(screen.getByRole('button', { name: 'Vendor' }));
    const sheet = screen.getByRole('dialog', { name: 'Vendor role preview' });
    expect(sheet).toBeTruthy();
    expect(screen.getByText('Go live and be found on the map')).toBeTruthy();

    // "Become a X" now grants the role directly (one tap) and routes to that mode's home — it no
    // longer dead-ends in the generic onboarding step (which couldn't grant hub).
    fireEvent.click(screen.getByRole('button', { name: 'Become a Vendor' }));
    expect(addRoleMock).toHaveBeenCalledWith('vendor');
    expect(push).toHaveBeenCalledWith('/vendor');
  });

  it('self-grants the hub role from the Consignment Hub tile (the previously broken path)', () => {
    renderWithTheme(<RoleCarousel />);
    fireEvent.click(screen.getByRole('button', { name: 'Consignment Hub' }));
    fireEvent.click(screen.getByRole('button', { name: 'Become a Consignment Hub' }));
    expect(addRoleMock).toHaveBeenCalledWith('hub');
    expect(push).toHaveBeenCalledWith('/hub');
  });

  it('Explore other roles routes to the add-role flow', () => {
    renderWithTheme(<RoleCarousel />);
    fireEvent.click(screen.getByRole('button', { name: /Explore other roles/ }));
    expect(push).toHaveBeenCalledWith('/onboarding/role');
  });
});
