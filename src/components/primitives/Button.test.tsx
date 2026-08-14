import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label', () => {
    renderWithTheme(<Button>Wave Down</Button>);
    expect(screen.getByRole('button', { name: 'Wave Down' })).toBeInTheDocument();
  });

  it('is disabled and busy while loading', () => {
    renderWithTheme(<Button loading>Pay</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('fires onClick when enabled', async () => {
    const onClick = vi.fn();
    renderWithTheme(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
