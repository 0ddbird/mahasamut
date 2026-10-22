import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { VowelPanel } from './VowelPanel';

const CHOICES = ['a', 'aː', 'i', 'iː'];

describe('VowelPanel', () => {
  it('lets the player choose an IPA sound and plays its recording', async () => {
    const chosen: string[] = [];
    const played: string[] = [];
    render(
      <VowelPanel
        choices={CHOICES}
        chosen={undefined}
        onChange={(s) => chosen.push(s)}
        locked={false}
        play={(url) => played.push(url)}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'a, short' }));
    expect(chosen).toEqual(['a']);
    expect(played).toEqual(['/audio/vowels/a.mp3']);
  });

  it('locks the choices when locked', () => {
    render(<VowelPanel choices={CHOICES} chosen="a" onChange={() => {}} locked />);
    expect(screen.getAllByRole('radio').every((r) => r.matches(':disabled'))).toBe(true);
  });

  it('shows the correction when revealed', () => {
    render(
      <VowelPanel
        choices={CHOICES}
        chosen="a"
        onChange={() => {}}
        locked
        reveal={{ game: 'vowel', vowelId: 'aa', expected: 'aː' }}
      />,
    );

    expect(screen.getByRole('radio', { name: 'a, short (wrong)' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'a, long (the right answer)' })).toBeDefined();
  });
});
