import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { JoinForm } from './JoinForm';

describe('JoinForm', () => {
  it('hides the password field when not needed', () => {
    render(<JoinForm game="syllable" hasPassword={false} onJoin={async () => null} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Join the room · Find the tone' }),
    ).toBeDefined();
    expect(screen.getByLabelText('Your nickname')).toBeDefined();
    expect(screen.queryByLabelText('Password')).toBeNull();
  });

  it('shows the password field when needed and reports the join error', async () => {
    const calls: { pseudo: string; password: string | null }[] = [];
    render(
      <JoinForm
        game="vowel"
        hasPassword
        onJoin={async (pseudo, password) => {
          calls.push({ pseudo, password });
          return 'pseudo-taken';
        }}
      />,
    );

    await userEvent.type(screen.getByLabelText('Your nickname'), 'Anna');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Join' }));

    expect(calls).toEqual([{ pseudo: 'Anna', password: 'secret' }]);
    expect(screen.getByRole('alert').textContent).toBe('This nickname is already taken.');
  });
});
