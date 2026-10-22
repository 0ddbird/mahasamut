import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Recap } from './Recap';
import { consonantClassEntry, syllableEntry } from './recap';

const SOUND = '/sounds/syllables/nam.mp3';

const RIGHT = syllableEntry('น้ำ', 'high', 'high', 'right', SOUND);
const WRONG = syllableEntry('ขาว', 'high', 'falling', 'wrong', null);
const TIME_UP = syllableEntry('มา', 'mid', null, 'timeUp', null);

/** The line of the `index`th question, as screen readers get it (hidden parts included). */
const rowText = (index: number) => screen.getAllByRole('listitem')[index].textContent ?? '';

describe('Recap', () => {
  it('renders nothing without a question', () => {
    const { container } = render(<Recap entries={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('lists the questions in the order played, under "Your answers"', () => {
    render(<Recap entries={[RIGHT, WRONG, TIME_UP]} />);
    const region = screen.getByRole('region', { name: 'Your answers' });
    const rows = within(region).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.querySelector('[lang="th"]')?.textContent)).toEqual([
      'น้ำ',
      'ขาว',
      'มา',
    ]);
  });

  it('shows a right answer alone', () => {
    render(<Recap entries={[RIGHT]} />);
    const [row] = screen.getAllByRole('listitem');
    expect(row.textContent).toContain('High');
    expect(row.querySelector('s')).toBeNull();
    expect(rowText(0)).toContain('Right. High');
  });

  it('strikes a wrong answer and shows the right one', () => {
    render(<Recap entries={[WRONG]} />);
    const [row] = screen.getAllByRole('listitem');
    expect(row.querySelector('s')?.textContent).toBe('Falling');
    expect(rowText(0)).toContain('Your answer: Falling');
    expect(rowText(0)).toContain('Right answer: High');
  });

  it('does not strike a right tone counted wrong (full reasoning)', () => {
    render(<Recap entries={[syllableEntry('ขาว', 'rising', 'rising', 'wrong', null)]} />);
    const [row] = screen.getAllByRole('listitem');
    expect(row.querySelector('s')).toBeNull();
    expect(rowText(0)).toContain('Wrong');
    expect(rowText(0)).toContain('Rising');
  });

  it('says when the time ran out', () => {
    render(<Recap entries={[TIME_UP]} />);
    expect(rowText(0)).toContain("Time's up");
    expect(rowText(0)).toContain('Right answer: Mid');
  });

  it('plays the sound of a question that has one', async () => {
    const play = vi.fn();
    render(<Recap entries={[RIGHT]} play={play} />);
    await userEvent.click(screen.getByRole('button', { name: 'Listen to น้ำ' }));
    expect(play).toHaveBeenCalledWith(SOUND);
  });

  it('has no Listen button without a sound', () => {
    render(<Recap entries={[consonantClassEntry('ก', 'mid', 'high', 'wrong')]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
