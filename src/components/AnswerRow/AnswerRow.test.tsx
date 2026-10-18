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

  it('shows an icon in place of the label, and gives screen readers its spoken label', () => {
    const Icon = ({ className }: { className?: string }) => (
      <svg className={className} data-testid="icon" aria-hidden="true" />
    );
    render(
      <AnswerRow
        title="Tone mark"
        name="mark"
        options={[{ value: 'eek', label: '◌่', spokenLabel: 'Mai eek', icon: Icon }]}
        onSelect={() => {}}
      />,
    );
    const choice = screen.getByRole('radio', { name: 'Mai eek' });
    const label = choice.closest('label');
    expect(label?.querySelector('[data-testid="icon"]')).not.toBeNull();
    expect(label?.textContent).not.toContain('◌');
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

  describe('once checked', () => {
    // The accessible name of each choice, in display order.
    const names = () =>
      screen.getAllByRole('radio').map((choice) => choice.closest('label')?.textContent);

    it('marks a right choice', () => {
      render(
        <AnswerRow
          title="Vowel length"
          name="length"
          options={OPTIONS}
          selected="long"
          onSelect={() => {}}
          feedback={{ chosen: 'long', expected: 'long', accepted: ['long'] }}
        />,
      );
      expect(names()).toEqual(['Short', 'Long (right)']);
    });

    it('marks a wrong choice, and the right answer', () => {
      render(
        <AnswerRow
          title="Vowel length"
          name="length"
          options={OPTIONS}
          selected="short"
          onSelect={() => {}}
          feedback={{ chosen: 'short', expected: 'long', accepted: ['long'] }}
        />,
      );
      expect(names()).toEqual(['Short (wrong)', 'Long (the right answer)']);
      expect(screen.getByRole('radio', { name: 'Long (the right answer)' })).toBeDefined();
    });

    it('marks the other reading of a homograph as also accepted', () => {
      render(
        <AnswerRow
          title="Vowel length"
          name="length"
          options={OPTIONS}
          selected="short"
          onSelect={() => {}}
          feedback={{ chosen: 'short', expected: 'short', accepted: ['long', 'short'] }}
        />,
      );
      expect(names()).toEqual(['Short (right)', 'Long (also accepted)']);
    });
  });
});
