import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { GAME, GAME_NAMES, GAME_PATHS } from '../games/shared/games';

/** Renders the whole app, as if the browser had opened `path`. */
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

const PLAY = `${GAME_PATHS[GAME.ConsonantClass]}/play`;

const logo = () => screen.getByRole('link', { name: 'Mahasamut' });
const barLink = (name: string) =>
  within(screen.getByRole('navigation', { name: 'Games' })).getByRole('link', { name });
const dialog = () => screen.queryByRole('alertdialog', { name: 'Leave the game?' });
const onHomePage = () => screen.queryByRole('heading', { level: 1, name: 'Mahasamut' }) !== null;

/** Answers the question shown, right or wrong: it counts as played. */
const answerOne = async () => {
  const row = within(screen.getByRole('group', { name: 'Consonant class' }));
  await userEvent.click(row.getByRole('radio', { name: 'High' }));
  await userEvent.click(screen.getByRole('button', { name: 'Validate' }));
};

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('leaving a game from the bar', () => {
  it('leaves without asking before the first answer', async () => {
    renderAt(PLAY);
    await userEvent.click(logo());
    expect(dialog()).toBeNull();
    expect(onHomePage()).toBe(true);
  });

  it('asks before leaving a game once a question is answered; Keep playing stays', async () => {
    renderAt(PLAY);
    await answerOne();
    await userEvent.click(logo());

    expect(dialog()).not.toBeNull();
    expect(within(dialog()!).getByText('Your score will be lost.')).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(dialog()).toBeNull();
    expect(screen.getByRole('group', { name: 'Consonant class' })).toBeDefined();
    expect(document.activeElement).toBe(logo());
  });

  it('leaves once Leave is chosen', async () => {
    renderAt(PLAY);
    await answerOne();
    await userEvent.click(logo());
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }));

    expect(dialog()).toBeNull();
    expect(onHomePage()).toBe(true);
  });

  // The player is in the game, not choosing one: the logo is the only way out.
  it('offers End in place of the game links during a game', () => {
    renderAt(PLAY);
    expect(screen.queryByRole('navigation', { name: 'Games' })).toBeNull();
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'End' })).toBeDefined();
  });

  it('leaves without asking from the results', async () => {
    renderAt(PLAY);
    await answerOne();
    await userEvent.click(screen.getByRole('button', { name: 'End' }));
    await userEvent.click(barLink(GAME_NAMES[GAME.Syllable]));
    expect(dialog()).toBeNull();
    expect(screen.getByRole('group', { name: 'Answer' })).toBeDefined();
  });

  it('leaves without asking after Play again, until a new answer', async () => {
    renderAt(PLAY);
    await answerOne();
    await userEvent.click(screen.getByRole('button', { name: 'End' }));
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }));
    await userEvent.click(logo());
    expect(dialog()).toBeNull();
    expect(onHomePage()).toBe(true);
  });

  it('asks once a question is lost to the time', () => {
    vi.useFakeTimers();
    renderAt(`${PLAY}?time=10`);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole('status').textContent).toBe("Time's up!");

    // userEvent hangs on Vitest's fake timers: this click goes through fireEvent.
    fireEvent.click(logo());
    expect(dialog()).not.toBeNull();
  });

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['middle', { button: 1 }],
  ])('lets a %s click open the logo elsewhere, without asking', async (_, modifiers) => {
    renderAt(PLAY);
    await answerOne();
    fireEvent.click(logo(), modifiers);
    expect(dialog()).toBeNull();
  });

  // The help panels hang from the top of the window, over the bar: the dialog
  // lives outside the bar, so that it covers both.
  it('shows the dialog outside the bar', async () => {
    renderAt(PLAY);
    const bar = screen.getByRole('banner');
    await answerOne();
    await userEvent.click(logo());
    expect(bar.contains(dialog())).toBe(false);
  });
});
