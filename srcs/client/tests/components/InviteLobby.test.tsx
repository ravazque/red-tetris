import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InviteLobby } from '../../src/components/InviteLobby.tsx';

describe('InviteLobby', () => {
  it('shows its waiting text and the invite for the room', () => {
    render(<InviteLobby room="room1" text="Hold on" size={4} className="placed" />);

    expect(screen.getByText('Hold on').parentElement?.style.getPropertyValue('--px')).toBe('4px');
    expect(screen.getByText('room1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();
    expect(screen.getByTestId('invite-lobby').className).toMatch(/placed/);
  });
});
