import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AnswerRow } from './AnswerRow';

const OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'long', label: 'Long' },
] as const;

describe('AnswerRow', () => {
  it('shows its title and one choice per option', () => {
    render(<AnswerRow title="Vowel length" name="length" options={OPTIONS} onSelect={() => {}} />);
    const row = screen.getByRole('group', { name: 'Vowel length' });
    const choices = within(row).getAllByRole('radio');
    expect(choices.map((choice) => choice.getAttribute('value'))).toEqual(['short', 'long']);
    expect(within(row).getByRole('radio', { name: 'Long' })).toBeDefined();
  });

  it('reports the option chosen', async () => {
    const chosen: string[] = [];
    render(
      <AnswerRow
        title="Vowel length"
        name="length"
        options={OPTIONS}
        onSelect={(value) => chosen.push(value)}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'Long' }));
    expect(chosen).toEqual(['long']);
  });

  it('shows the selected option as checked, and only that one', () => {
    render(
      <AnswerRow
        title="Vowel length"
        name="length"
        options={OPTIONS}
        selected="short"
        onSelect={() => {}}
      />,
    );
    const short = screen.getByRole('radio', { name: 'Short' }) as HTMLInputElement;
    const long = screen.getByRole('radio', { name: 'Long' }) as HTMLInputElement;
    expect([short.checked, long.checked]).toEqual([true, false]);
  });

  it('can be locked, so that no option can be chosen any more', async () => {
    const chosen: string[] = [];
    render(
      <AnswerRow
        title="Vowel length"
        name="length"
        options={OPTIONS}
        onSelect={(value) => chosen.push(value)}
        disabled
      />,
    );
    const long = screen.getByRole('radio', { name: 'Long' });

    await userEvent.click(long);
    // Disabled by its fieldset: its own `disabled` property stays false.
    expect(long.matches(':disabled')).toBe(true);
    expect(chosen).toEqual([]);
  });
});
