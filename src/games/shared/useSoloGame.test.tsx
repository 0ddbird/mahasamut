import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consonantClassEntry } from './recap';
import type { RecapEntry, RecapResult } from './recap';
import { EMPTY_SCORE } from './score';
import { DEFAULT_SETTINGS } from './settings';
import type { GameSettings } from './settings';
import { CORRECT_DELAY_MS } from './useNextWhenCorrect';
import { useSoloGame } from './useSoloGame';

const TIMED: GameSettings = { ...DEFAULT_SETTINGS, secondsPerQuestion: 15 };
const SERIES_OF_5: GameSettings = { ...DEFAULT_SETTINGS, questionCount: 5 };

/** Renders the hook with `settings`, and a spy for each new question and each line of the recap. */
const renderGame = (settings: GameSettings = DEFAULT_SETTINGS) => {
  const onNewQuestion = vi.fn();
  const entryOf = vi.fn((result: RecapResult) => consonantClassEntry('ก', 'mid', null, result));
  const rendered = renderHook(() => useSoloGame(settings, onNewQuestion, entryOf));
  return { ...rendered, onNewQuestion, entryOf, game: () => rendered.result.current };
};

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSoloGame', () => {
  it('starts on the first question, with no timer in free time', () => {
    const { game } = renderGame();
    expect(game().phase).toBe('answering');
    expect(game().questionNumber).toBe(1);
    expect(game().remainingMs).toBeNull();
    expect(game().score).toEqual(EMPTY_SCORE);
  });

  it('counts a checked answer', () => {
    const { game } = renderGame();
    act(() => game().check(false));

    expect(game().phase).toBe('checked');
    expect(game().correct).toBe(false);
    expect(game().score).toMatchObject({ played: 1, right: 0 });
  });

  it('goes on by itself after a right answer', () => {
    const { game, onNewQuestion } = renderGame();
    act(() => game().check(true));
    expect(game().correct).toBe(true);

    wait(CORRECT_DELAY_MS);
    expect(game().questionNumber).toBe(2);
    expect(game().phase).toBe('answering');
    expect(onNewQuestion).toHaveBeenCalledTimes(1);
  });

  it('waits for Next after a wrong answer', () => {
    const { game, onNewQuestion } = renderGame();
    act(() => game().check(false));
    wait(60_000);
    expect(game().phase).toBe('checked');

    act(() => game().next());
    expect(game().questionNumber).toBe(2);
    expect(onNewQuestion).toHaveBeenCalledTimes(1);
  });

  it('counts down and ends the question on time up', () => {
    const { game } = renderGame(TIMED);
    expect(game().remainingMs).toBe(15_000);

    wait(14_000);
    expect(game().remainingMs).toBeLessThanOrEqual(1000);
    expect(game().phase).toBe('answering');

    wait(1000);
    expect(game().phase).toBe('checked');
    expect(game().timedOut).toBe(true);
    expect(game().correct).toBe(false);
    expect(game().score).toMatchObject({ played: 1, right: 0 });
  });

  it('counts the question once if the player validates as time runs out', () => {
    const { game } = renderGame(TIMED);
    wait(15_000);
    act(() => game().check(true));

    expect(game().score).toMatchObject({ played: 1, right: 0 });
    expect(game().timedOut).toBe(true);
  });

  it('does not time the reading of the correction', () => {
    const { game } = renderGame(TIMED);
    act(() => game().check(false));
    expect(game().remainingMs).toBeNull();

    wait(60_000);
    expect(game().phase).toBe('checked');
    expect(game().timedOut).toBe(false);
    expect(game().score.played).toBe(1);
  });

  it('gives each new question its full time', () => {
    const { game } = renderGame(TIMED);
    wait(10_000);
    act(() => game().check(false));
    act(() => game().next());

    expect(game().remainingMs).toBe(15_000);
    wait(14_000);
    expect(game().phase).toBe('answering');
  });

  it('finishes after the last question of a series', () => {
    const { game, onNewQuestion } = renderGame(SERIES_OF_5);
    for (let question = 1; question <= 5; question++) {
      expect(game().questionNumber).toBe(question);
      expect(game().isLast).toBe(question === 5);
      act(() => game().check(false));
      act(() => game().next());
    }

    expect(game().phase).toBe('finished');
    expect(game().score.played).toBe(5);
    expect(onNewQuestion).toHaveBeenCalledTimes(4);
  });

  it('finishes by itself after a right last answer', () => {
    const { game } = renderGame(SERIES_OF_5);
    for (let question = 1; question < 5; question++) {
      act(() => game().check(false));
      act(() => game().next());
    }
    act(() => game().check(true));

    wait(CORRECT_DELAY_MS);
    expect(game().phase).toBe('finished');
  });

  it('ends at any time, without counting the question shown', () => {
    const { game } = renderGame();
    act(() => game().check(true));
    wait(CORRECT_DELAY_MS);
    act(() => game().end());

    expect(game().phase).toBe('finished');
    expect(game().score).toMatchObject({ played: 1, right: 1 });
  });

  it('does not start a new question after End during the right-answer delay', () => {
    const { game, onNewQuestion } = renderGame();
    act(() => game().check(true));
    act(() => game().end());

    wait(CORRECT_DELAY_MS);
    expect(game().phase).toBe('finished');
    expect(onNewQuestion).not.toHaveBeenCalled();
  });

  it('stops the timer at the end of the game', () => {
    const { game } = renderGame(TIMED);
    act(() => game().end());

    wait(60_000);
    expect(game().phase).toBe('finished');
    expect(game().score.played).toBe(0);
  });

  it('starts again with an empty score', () => {
    const { game, onNewQuestion } = renderGame(SERIES_OF_5);
    act(() => game().check(true));
    act(() => game().end());
    act(() => game().restart());

    expect(game().phase).toBe('answering');
    expect(game().questionNumber).toBe(1);
    expect(game().score).toEqual(EMPTY_SCORE);
    expect(onNewQuestion).toHaveBeenCalledTimes(1);
  });

  describe('recap', () => {
    const results = (game: () => { recap: readonly { result: RecapResult }[] }) =>
      game().recap.map((entry) => entry.result);

    it('adds a line for each question counted, in order', () => {
      const { game, entryOf } = renderGame();
      act(() => game().check(true));
      wait(CORRECT_DELAY_MS);
      act(() => game().check(false));

      expect(results(game)).toEqual(['right', 'wrong']);
      expect(game().recap.length).toBe(game().score.played);
      expect(entryOf).toHaveBeenCalledTimes(game().score.played);
    });

    it('adds a time-up line when the time runs out', () => {
      const { game } = renderGame(TIMED);
      wait(15_000);

      expect(results(game)).toEqual(['timeUp']);
    });

    it('adds one line when Validate and the end of the time come together', () => {
      const { game, entryOf } = renderGame(TIMED);
      wait(14_999);
      act(() => {
        game().check(true);
        vi.advanceTimersByTime(1);
      });

      expect(results(game)).toEqual(['right']);
      expect(entryOf).toHaveBeenCalledTimes(1);
    });

    /** Renders the hook so that `entryOf` can change between renders, as the answers of a page do. */
    const renderWithEntries = (
      settings: GameSettings,
      first: (result: RecapResult) => RecapEntry,
    ) =>
      renderHook(({ entryOf }) => useSoloGame(settings, vi.fn(), entryOf), {
        initialProps: { entryOf: first },
      });
    const entryFor = (consonant: string) => (result: RecapResult) =>
      consonantClassEntry(consonant, 'mid', null, result);

    it('builds the line with the entryOf of the latest render', () => {
      const { result, rerender } = renderWithEntries(DEFAULT_SETTINGS, entryFor('ก'));
      rerender({ entryOf: entryFor('ข') });
      act(() => result.current.check(false));

      expect(result.current.recap.map((entry) => entry.text)).toEqual(['ข']);
    });

    it('builds a time-up line with the entryOf of the latest render, not the one the timer started with', () => {
      const { result, rerender } = renderWithEntries(TIMED, entryFor('ก'));
      wait(5000);
      rerender({ entryOf: entryFor('ข') });
      wait(10_000);

      expect(result.current.recap.map((entry) => [entry.text, entry.result])).toEqual([
        ['ข', 'timeUp'],
      ]);
    });

    it('adds no line for a question shown but not answered', () => {
      const { game } = renderGame();
      act(() => game().end());

      expect(game().recap).toEqual([]);
    });

    it('starts afresh on Play again', () => {
      const { game } = renderGame();
      act(() => game().check(false));
      act(() => game().end());
      act(() => game().restart());

      expect(game().recap).toEqual([]);
    });
  });

  it('leaves no timer behind when unmounted', () => {
    const { unmount } = renderGame(TIMED);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
