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

const logo = () => screen.getByRole('link', { name: 'Scriptomancy Thai' });
const barLink = (name: string) =>
  within(screen.getByRole('navigation', { name: 'Games' })).getByRole('link', { name });
const dialog = () => screen.queryByRole('alertdialog', { name: 'Leave the game?' });
const onHomePage = () =>
  screen.queryByRole('heading', { level: 1, name: 'Scriptomancy Thai' }) !== null;

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
    expect(screen.getByText(/^Score \d \/ 1$/)).toBeDefined();
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

  it('asks too for the link of the game being played', async () => {
    renderAt(PLAY);
    await answerOne();
    await userEvent.click(barLink(GAME_NAMES[GAME.ConsonantClass]));
    expect(dialog()).not.toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(screen.getByRole('group', { name: 'Length' })).toBeDefined();
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
    expect(screen.getByText('Score 0 / 1')).toBeDefined();

    // userEvent hangs on Vitest's fake timers: this click goes through fireEvent.
    fireEvent.click(logo());
    expect(dialog()).not.toBeNull();
  });

  it('asks from the menu on a phone too, and closes the menu', async () => {
    renderAt(PLAY);
    await answerOne();
    const menuButton = screen.getByRole('button', { name: 'Games menu' });
    await userEvent.click(menuButton);
    await userEvent.click(barLink(GAME_NAMES[GAME.Syllable]));

    expect(dialog()).not.toBeNull();
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('gives the focus back to the menu button on a phone, the link being folded away', async () => {
    renderAt(PLAY);
    await answerOne();
    const menuButton = screen.getByRole('button', { name: 'Games menu' });
    await userEvent.click(menuButton);
    await userEvent.click(barLink(GAME_NAMES[GAME.Syllable]));
    await userEvent.click(screen.getByRole('button', { name: 'Keep playing' }));

    expect(document.activeElement).toBe(menuButton);
  });

  it('gives the focus back to a game link clicked with the menu closed', async () => {
    renderAt(PLAY);
    await answerOne();
    await userEvent.click(barLink(GAME_NAMES[GAME.Syllable]));
    await userEvent.click(screen.getByRole('button', { name: 'Keep playing' }));

    expect(document.activeElement).toBe(barLink(GAME_NAMES[GAME.Syllable]));
  });

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['middle', { button: 1 }],
  ])('lets a %s click open the link elsewhere, without asking', async (_, modifiers) => {
    renderAt(PLAY);
    await answerOne();
    fireEvent.click(barLink(GAME_NAMES[GAME.Syllable]), modifiers);
    expect(dialog()).toBeNull();
  });

  // The help panels hang from the top of the window, over the bar: the bar
  // only comes forward while its menu is open, so the dialog lives outside it.
  it('shows the dialog outside the bar, which comes forward only with its menu open', async () => {
    renderAt(PLAY);
    const bar = screen.getByRole('banner');
    expect(bar.hasAttribute('data-menu-open')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Games menu' }));
    expect(bar.hasAttribute('data-menu-open')).toBe(true);
    await userEvent.click(screen.getByTestId('menu-shade'));

    await answerOne();
    await userEvent.click(logo());
    expect(bar.contains(dialog())).toBe(false);
  });
});
