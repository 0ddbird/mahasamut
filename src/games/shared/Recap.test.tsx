import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VOWEL } from '../../thai/types';
import { spokenIpa } from '../../thai/vowels/ipa';
import { Recap } from './Recap';
import { consonantClassEntry, syllableEntry, vowelEntry } from './recap';

const SOUND = '/sounds/syllables/nam.mp3';

const RIGHT = syllableEntry('น้ำ', 'high', 'high', 'right', SOUND);
const WRONG = syllableEntry('ขาว', 'high', 'falling', 'wrong', null);
const TIME_UP = syllableEntry('มา', 'mid', null, 'timeUp', null);

/** The line of the `index`th question, as screen readers get it (hidden parts included). */
const rowText = (index: number) => screen.getAllByRole('listitem')[index].textContent ?? '';

describe('Recap', () => {
  it('renders nothing without a question', () => {
    const { container } = render(<Recap entries={[]} mode="solo" />);
    expect(container.innerHTML).toBe('');
  });

  it('offers no Report button in a production build without a DSN, which would lose the reports', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_SENTRY_DSN', '');
    try {
      render(<Recap entries={[RIGHT, WRONG]} mode="solo" />);
      expect(screen.queryByRole('button', { name: /^Report/ })).toBeNull();
      // The rest of the line is untouched.
      expect(screen.getAllByRole('button', { name: /^Listen to/ })).toHaveLength(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('lists the questions in the order played, under "Your answers"', () => {
    render(<Recap entries={[RIGHT, WRONG, TIME_UP]} mode="solo" />);
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
    render(<Recap entries={[RIGHT]} mode="solo" />);
    const [row] = screen.getAllByRole('listitem');
    expect(row.textContent).toContain('High');
    expect(row.querySelector('s')).toBeNull();
    expect(rowText(0)).toContain('Right. High');
  });

  it('strikes a wrong answer and shows the right one', () => {
    render(<Recap entries={[WRONG]} mode="solo" />);
    const [row] = screen.getAllByRole('listitem');
    expect(row.querySelector('s')?.textContent).toBe('Falling');
    expect(rowText(0)).toContain('Your answer: Falling');
    expect(rowText(0)).toContain('Right answer: High');
  });

  it('does not strike a right tone counted wrong (full reasoning)', () => {
    render(
      <Recap entries={[syllableEntry('ขาว', 'rising', 'rising', 'wrong', null)]} mode="solo" />,
    );
    const [row] = screen.getAllByRole('listitem');
    expect(row.querySelector('s')).toBeNull();
    expect(rowText(0)).toContain('Wrong');
    expect(rowText(0)).toContain('Rising');
  });

  it('says when the time ran out', () => {
    render(<Recap entries={[TIME_UP]} mode="solo" />);
    expect(rowText(0)).toContain("Time's up");
    expect(rowText(0)).toContain('Right answer: Mid');
  });

  it('reads a vowel answer by its spoken form, not by its IPA', () => {
    render(<Recap entries={[vowelEntry(VOWEL.A, 'อะ', 'aː', 'wrong')]} mode="solo" />);
    expect(rowText(0)).toContain(`Your answer: ${spokenIpa('aː')}`);
    expect(rowText(0)).toContain(`Right answer: ${spokenIpa('a')}`);

    const [row] = screen.getAllByRole('listitem');
    const raw = [...row.querySelectorAll('[aria-hidden="true"]')].map((node) => node.textContent);
    expect(raw).toContain('/aː/');
    expect(raw).toContain('/a/');
  });

  it('reads a right vowel answer by its spoken form', () => {
    render(<Recap entries={[vowelEntry(VOWEL.A, 'อะ', 'a', 'right')]} mode="solo" />);
    expect(rowText(0)).toContain(`Right. ${spokenIpa('a')}`);
  });

  it('plays the sound of a question that has one', async () => {
    const play = vi.fn();
    render(<Recap entries={[RIGHT]} play={play} mode="solo" />);
    await userEvent.click(screen.getByRole('button', { name: 'Listen to น้ำ' }));
    expect(play).toHaveBeenCalledWith(SOUND);
  });

  it('has no Listen button without a sound', () => {
    render(<Recap entries={[consonantClassEntry('ก', 'mid', 'high', 'wrong')]} mode="solo" />);
    expect(screen.queryByRole('button', { name: /^Listen/ })).toBeNull();
  });
});

describe('Recap, reporting a question', () => {
  const report = (text: string) =>
    screen.getByRole('button', { name: `Report the question ${text}` });

  const renderRecap = (mode: 'solo' | 'multi' = 'solo') => {
    const send = vi.fn().mockResolvedValue('sent');
    render(<Recap entries={[RIGHT, WRONG, TIME_UP]} mode={mode} send={send} />);
    return { send };
  };

  const sendReport = async () => {
    await userEvent.click(screen.getByRole('checkbox', { name: 'The expected tone is wrong' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
  };

  it('offers to report each question', () => {
    renderRecap();
    expect(screen.getAllByRole('button', { name: /^Report the question/ })).toHaveLength(3);
    for (const text of ['น้ำ', 'ขาว', 'มา']) expect(report(text).textContent).toBe('Report');
  });

  it("opens the report window for that line's question", async () => {
    renderRecap();
    await userEvent.click(report('ขาว'));

    const dialog = screen.getByRole('dialog', { name: 'Report a problem' });
    expect(within(dialog).getByText('ขาว')).toBeDefined();
  });

  it.each(['solo', 'multi'] as const)(
    'sends the report as made in the recap (%s)',
    async (mode) => {
      const { send } = renderRecap(mode);
      await userEvent.click(report('ขาว'));
      await sendReport();

      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          question: expect.objectContaining({ game: 'syllable', questionId: 'ขาว', text: 'ขาว' }),
          where: 'recap',
          mode,
        }),
      );
    },
  );

  it('marks a reported line, and only that one', async () => {
    renderRecap();
    await userEvent.click(report('ขาว'));
    await sendReport();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    const reported = screen.getByRole('button', { name: 'Reported: ขาว' });
    expect(reported.textContent).toBe('Reported');
    expect(reported.getAttribute('aria-disabled')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Report the question ขาว' })).toBeNull();
    for (const text of ['น้ำ', 'มา']) {
      expect(report(text).getAttribute('aria-disabled')).toBeNull();
    }
  });

  it('does not open the window again from a reported line', async () => {
    renderRecap();
    await userEvent.click(report('ขาว'));
    await sendReport();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reported: ขาว' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('marks the line as soon as the report is received, behind the thanks', async () => {
    renderRecap();
    await userEvent.click(report('ขาว'));
    await sendReport();

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reported: ขาว' })).toBeDefined();
  });

  it('does not mark a line whose window was closed without sending', async () => {
    renderRecap();
    await userEvent.click(report('ขาว'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(report('ขาว').getAttribute('aria-disabled')).toBeNull();
  });

  it('gives the focus back to the Report button of the line when the window closes', async () => {
    renderRecap();
    await userEvent.click(report('ขาว'));
    await userEvent.keyboard('{Escape}');

    expect(document.activeElement).toBe(report('ขาว'));
  });

  it('gives the focus to the Reported button of the line when a sent report is closed', async () => {
    renderRecap();
    await userEvent.click(report('ขาว'));
    await sendReport();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reported: ขาว' }));
  });
});
