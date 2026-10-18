import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { GAME, GAME_PATHS } from './games';
import type { GameId } from './games';
import { DEFAULT_SETTINGS } from './settings';
import { loadSettings, saveSettings } from './settingsStorage';
import { SetupPage } from './SetupPage';

/** Shows where Play led, instead of the game itself. */
function WhereAmI() {
  const { pathname, search } = useLocation();
  return <p>{`At ${pathname}${search}`}</p>;
}

const renderSetup = (game: GameId = GAME.Syllable) =>
  render(
    <MemoryRouter initialEntries={[GAME_PATHS[game]]}>
      <Routes>
        <Route path={GAME_PATHS[game]} element={<SetupPage game={game} />} />
        <Route path={`${GAME_PATHS[game]}/play`} element={<WhereAmI />} />
      </Routes>
    </MemoryRouter>,
  );

const rowOf = (title: string) => within(screen.getByRole('group', { name: title }));
const choice = (row: string, label: string) => rowOf(row).getByRole('radio', { name: label });
const isChecked = (row: string, label: string) => (choice(row, label) as HTMLInputElement).checked;
const countInput = () =>
  screen.queryByRole('spinbutton', { name: 'Number of questions' }) as HTMLInputElement | null;
const playButton = () => screen.getByRole('button', { name: 'Play' }) as HTMLButtonElement;

afterEach(() => {
  localStorage.clear();
});

describe('SetupPage', () => {
  it('starts from the defaults the first time', () => {
    renderSetup();
    expect(isChecked('Length', 'Endless')).toBe(true);
    expect(isChecked('Time per question', 'Free')).toBe(true);
    expect(isChecked('Answer', 'Full reasoning')).toBe(true);
    expect(isChecked('Learning mode', 'Off')).toBe(true);
    expect(countInput()).toBeNull();
  });

  it('starts from the last settings played', () => {
    saveSettings(GAME.Syllable, {
      questionCount: 20,
      secondsPerQuestion: 15,
      answerMode: 'toneOnly',
      learningMode: true,
    });
    renderSetup();

    expect(isChecked('Length', 'Series')).toBe(true);
    expect(countInput()?.value).toBe('20');
    expect(isChecked('Time per question', '15 s')).toBe(true);
    expect(isChecked('Answer', 'Tone only')).toBe(true);
    expect(isChecked('Learning mode', 'On')).toBe(true);
  });

  it('offers the learning mode for both games', () => {
    renderSetup(GAME.ConsonantClass);
    expect(screen.getByRole('group', { name: 'Learning mode' })).toBeDefined();
  });

  it('offers the answer mode for the syllable game only', () => {
    renderSetup(GAME.ConsonantClass);
    expect(screen.queryByRole('group', { name: 'Answer' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Length' })).toBeDefined();
  });

  it('proposes 10 questions when switching to a series', async () => {
    renderSetup();
    await userEvent.click(choice('Length', 'Series'));
    expect(countInput()?.value).toBe('10');
  });

  it('refuses a number of questions out of range', async () => {
    renderSetup();
    await userEvent.click(choice('Length', 'Series'));
    const input = countInput();
    if (input === null) throw new Error('No number of questions');

    await userEvent.clear(input);
    await userEvent.type(input, '4');
    expect(playButton().disabled).toBe(true);
    expect(screen.getByText('Choose 5 to 30 questions.')).toBeDefined();

    await userEvent.clear(input);
    await userEvent.type(input, '30');
    expect(playButton().disabled).toBe(false);
  });

  it('ties the error to the field, for screen readers', async () => {
    renderSetup();
    await userEvent.click(choice('Length', 'Series'));
    const input = countInput();
    if (input === null) throw new Error('No number of questions');
    expect(input.getAttribute('aria-invalid')).toBe('false');

    await userEvent.clear(input);
    await userEvent.type(input, '4');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('Choose 5 to 30 questions.');
  });

  it('plays with the defaults in one click', async () => {
    renderSetup();
    await userEvent.click(playButton());
    expect(screen.getByText('At /syllable/play')).toBeDefined();
  });

  it('plays with the chosen settings, and remembers them', async () => {
    renderSetup();
    await userEvent.click(choice('Length', 'Series'));
    await userEvent.click(choice('Time per question', '15 s'));
    await userEvent.click(choice('Answer', 'Tone only'));
    await userEvent.click(choice('Learning mode', 'On'));
    await userEvent.click(playButton());

    expect(
      screen.getByText('At /syllable/play?count=10&time=15&answer=toneOnly&learn=1'),
    ).toBeDefined();
    expect(loadSettings(GAME.Syllable)).toEqual({
      questionCount: 10,
      secondsPerQuestion: 15,
      answerMode: 'toneOnly',
      learningMode: true,
    });
  });

  it('remembers nothing until Play', async () => {
    renderSetup();
    await userEvent.click(choice('Length', 'Series'));
    expect(loadSettings(GAME.Syllable)).toEqual(DEFAULT_SETTINGS);
  });
});
