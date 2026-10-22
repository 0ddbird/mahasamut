import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { createFakeSocket } from '../../multiplayer/client/fakeSocket.test-utils';
import type { RoomSocket } from '../../multiplayer/client/socket';
import { loadToken } from '../../multiplayer/client/tokens';
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

const renderSetup = (game: GameId = GAME.Syllable, socket?: RoomSocket) =>
  render(
    <MemoryRouter initialEntries={[GAME_PATHS[game]]}>
      <Routes>
        <Route path={GAME_PATHS[game]} element={<SetupPage game={game} socket={socket} />} />
        <Route path={`${GAME_PATHS[game]}/play`} element={<WhereAmI />} />
        <Route path="/room/:roomId" element={<WhereAmI />} />
      </Routes>
    </MemoryRouter>,
  );

const rowOf = (title: string) => within(screen.getByRole('group', { name: title }));
const choice = (row: string, label: string) => rowOf(row).getByRole('radio', { name: label });
const isChecked = (row: string, label: string) => (choice(row, label) as HTMLInputElement).checked;
const countInput = () =>
  screen.queryByRole('spinbutton', { name: 'Number of questions' }) as HTMLInputElement | null;
const secondsInput = () =>
  screen.queryByRole('spinbutton', { name: 'Seconds per question' }) as HTMLInputElement | null;
const playButton = () => screen.getByRole('button', { name: 'Play' }) as HTMLButtonElement;

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('SetupPage', () => {
  it('starts from the defaults the first time', () => {
    renderSetup();
    expect(isChecked('Length', 'Endless')).toBe(true);
    expect(isChecked('Time', 'Untimed')).toBe(true);
    expect(isChecked('Answer', 'Full reasoning')).toBe(true);
    expect(isChecked('Learning mode', 'Off')).toBe(true);
    expect(countInput()).toBeNull();
    expect(secondsInput()).toBeNull();
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
    expect(isChecked('Time', 'Timed')).toBe(true);
    expect(secondsInput()?.value).toBe('15');
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

  it('proposes 15 seconds when switching to a timed game', async () => {
    renderSetup();
    await userEvent.click(choice('Time', 'Timed'));
    expect(secondsInput()?.value).toBe('15');
  });

  it('takes any whole number of seconds from 1 to 60', async () => {
    renderSetup();
    await userEvent.click(choice('Time', 'Timed'));
    const input = secondsInput();
    if (input === null) throw new Error('No seconds per question');

    for (const [typed, valid] of [
      ['0', false],
      ['61', false],
      ['1', true],
      ['60', true],
    ] as const) {
      await userEvent.clear(input);
      await userEvent.type(input, typed);
      expect(playButton().disabled).toBe(!valid);
      expect(input.getAttribute('aria-invalid')).toBe(String(!valid));
    }

    await userEvent.clear(input);
    await userEvent.type(input, '0');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('Choose 1 to 60 seconds.');
  });

  it('plays with any number of seconds', async () => {
    renderSetup();
    await userEvent.click(choice('Time', 'Timed'));
    const input = secondsInput();
    if (input === null) throw new Error('No seconds per question');
    await userEvent.clear(input);
    await userEvent.type(input, '7');
    await userEvent.click(playButton());
    expect(screen.getByText('At /syllable/play?time=7')).toBeDefined();
  });

  it('plays with the defaults in one click', async () => {
    renderSetup();
    await userEvent.click(playButton());
    expect(screen.getByText('At /syllable/play')).toBeDefined();
  });

  it('plays with the chosen settings, and remembers them', async () => {
    renderSetup();
    await userEvent.click(choice('Length', 'Series'));
    await userEvent.click(choice('Time', 'Timed'));
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

  it('explains the learning mode before its choice', () => {
    renderSetup();
    const learning = screen.getByRole('group', { name: 'Learning mode' });
    const hint = document.getElementById(learning.getAttribute('aria-describedby') ?? '');
    expect(hint?.textContent).toMatch(/cheat sheets/);
  });

  it('steps the number of questions with − and +, within its range', async () => {
    renderSetup();
    await userEvent.click(choice('Length', 'Series'));
    await userEvent.click(screen.getByRole('button', { name: 'More questions' }));
    expect(countInput()?.value).toBe('11');
    await userEvent.click(screen.getByRole('button', { name: 'Fewer questions' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fewer questions' }));
    expect(countInput()?.value).toBe('9');

    const input = countInput();
    if (input === null) throw new Error('No number of questions');
    await userEvent.clear(input);
    await userEvent.type(input, '30');
    expect(
      (screen.getByRole('button', { name: 'More questions' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    expect(
      (screen.getByRole('button', { name: 'Fewer questions' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('steps the seconds with − and +, within their range', async () => {
    renderSetup();
    await userEvent.click(choice('Time', 'Timed'));
    await userEvent.click(screen.getByRole('button', { name: 'More seconds' }));
    expect(secondsInput()?.value).toBe('16');
    await userEvent.click(screen.getByRole('button', { name: 'Fewer seconds' }));
    expect(secondsInput()?.value).toBe('15');
  });

  // A number typed out of range comes back within it with one step.
  it('brings a number out of range back within it', async () => {
    renderSetup();
    await userEvent.click(choice('Time', 'Timed'));
    const input = secondsInput();
    if (input === null) throw new Error('No seconds per question');
    await userEvent.clear(input);
    await userEvent.type(input, '99');
    await userEvent.click(screen.getByRole('button', { name: 'Fewer seconds' }));
    expect(input.value).toBe('60');
  });

  it('shows the numbers only for a series and a timed game', () => {
    renderSetup();
    expect(countInput()).toBeNull();
    expect(secondsInput()).toBeNull();
    expect(screen.queryByRole('button', { name: 'More questions' })).toBeNull();
  });

  it('remembers nothing until Play', async () => {
    renderSetup();
    await userEvent.click(choice('Length', 'Series'));
    expect(loadSettings(GAME.Syllable)).toEqual(DEFAULT_SETTINGS);
  });

  describe('when creating a multiplayer room', () => {
    it('shows the series and timer steppers, hides learning mode, and asks for a nickname', async () => {
      renderSetup();
      await userEvent.click(choice('Players', 'In a room'));

      expect(countInput()?.value).toBe('10');
      expect(secondsInput()?.value).toBe('15');
      expect(screen.queryByRole('group', { name: 'Learning mode' })).toBeNull();
      expect(screen.getByRole('group', { name: 'Answer' })).toBeDefined();
      expect(screen.getByLabelText('Your nickname')).toBeDefined();
      expect(screen.getByLabelText('Password (optional)')).toBeDefined();
    });

    it('creates the room, saves the host token, and navigates to /room/<id>', async () => {
      const fake = createFakeSocket();
      fake.replyTo('room:create', () => ({ ok: true, roomId: 'K7P2QX', token: 'tok-host' }));
      renderSetup(GAME.Syllable, fake.socket);

      await userEvent.click(choice('Players', 'In a room'));
      await userEvent.click(choice('Answer', 'Tone only'));
      await userEvent.type(screen.getByLabelText('Your nickname'), 'Anna');
      await userEvent.click(screen.getByRole('button', { name: 'Create room' }));

      expect(fake.emitted).toContainEqual({
        event: 'room:create',
        args: [
          {
            settings: {
              game: 'syllable',
              secondsPerQuestion: 15,
              questionCount: 10,
              answerMode: 'toneOnly',
              password: '',
            },
            pseudo: 'Anna',
          },
        ],
      });
      expect(loadToken('K7P2QX')).toBe('tok-host');
      expect(screen.getByText('At /room/K7P2QX')).toBeDefined();
    });

    it('shows the server error when the room could not be created', async () => {
      const fake = createFakeSocket();
      fake.replyTo('room:create', () => ({ ok: false, error: 'server-full' }));
      renderSetup(GAME.Vowel, fake.socket);

      await userEvent.click(choice('Players', 'In a room'));
      await userEvent.type(screen.getByLabelText('Your nickname'), 'Anna');
      await userEvent.click(screen.getByRole('button', { name: 'Create room' }));

      expect(screen.getByRole('alert').textContent).toBe(
        'The server is full, try again in a few minutes.',
      );
    });
  });
});
