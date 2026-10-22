/**
 * How a solo game unfolds, the same for every game: questions one after the
 * other, an optional time per question, the score, and the end of the game.
 *
 * A game only keeps its own question and the player's answers. It tells the
 * hook when the player validates (`check`); the hook counts the result, moves
 * on by itself after a right answer, waits for Next after a wrong one, and
 * asks the game for a new question (`onNewQuestion`) when one starts.
 */
import { useEffect, useRef, useState } from 'react';
import { useGameEndInBar, useLeaveGuard } from '../../site/leaveGuard';
import { addResult, EMPTY_SCORE } from './score';
import type { Score } from './score';
import type { GameSettings } from './settings';
import { useNextWhenCorrect } from './useNextWhenCorrect';

/** How often the time left is refreshed, in milliseconds. */
const TICK_MS = 250;

export type SoloPhase = 'answering' | 'checked' | 'finished';

export interface SoloGame {
  phase: SoloPhase;
  /** The question shown, from 1. */
  questionNumber: number;
  score: Score;
  /** The time left to answer; null in free time, and once the question is checked. */
  remainingMs: number | null;
  /** The checked question ended because the time ran out. */
  timedOut: boolean;
  /** Whether the checked question was right. */
  correct: boolean;
  /** The question shown is the last one of a series. */
  isLast: boolean;
  /** The player validated: counts the question. Ignored once it is checked. */
  check: (correct: boolean) => void;
  /** Shows the next question, or ends the game after the last one of a series. */
  next: () => void;
  /** Ends the game now; a question shown but not answered is not counted. */
  end: () => void;
  /** Plays again with the same settings, from an empty score. */
  restart: () => void;
}

/**
 * @param onNewQuestion called when a question starts after the first one: the
 *   game draws it and clears the answers.
 */
export function useSoloGame(settings: GameSettings, onNewQuestion: () => void): SoloGame {
  const timeLimitMs =
    settings.secondsPerQuestion === null ? null : settings.secondsPerQuestion * 1000;

  const [phase, setPhase] = useState<SoloPhase>('answering');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(EMPTY_SCORE);
  const [remainingMs, setRemainingMs] = useState<number | null>(timeLimitMs);
  const [timedOut, setTimedOut] = useState(false);
  const [correct, setCorrect] = useState(false);
  // Changes with every question, so that its timer starts afresh.
  const [questionKey, setQuestionKey] = useState(0);

  // Set at once, not on the next render: a click and the end of the time can
  // come in the same tick, and only the first may count.
  const answering = useRef(true);

  const onNewQuestionRef = useRef(onNewQuestion);
  useEffect(() => {
    onNewQuestionRef.current = onNewQuestion;
  });

  const isLast = settings.questionCount !== null && questionNumber >= settings.questionCount;

  const finishQuestion = (right: boolean, timeUp: boolean) => {
    if (!answering.current) return;
    answering.current = false;
    setScore((current) => addResult(current, right));
    setCorrect(right);
    setTimedOut(timeUp);
    setRemainingMs(null);
    setPhase('checked');
  };

  const startQuestion = () => {
    answering.current = true;
    onNewQuestionRef.current();
    setCorrect(false);
    setTimedOut(false);
    setRemainingMs(timeLimitMs);
    setQuestionKey((key) => key + 1);
    setPhase('answering');
  };

  // The latest `finishQuestion`, for the timer started with an older render.
  const finishQuestionRef = useRef(finishQuestion);
  useEffect(() => {
    finishQuestionRef.current = finishQuestion;
  });

  useEffect(() => {
    if (phase !== 'answering' || timeLimitMs === null) return;
    const deadline = Date.now() + timeLimitMs;
    const timer = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setRemainingMs(left);
      if (left === 0) finishQuestionRef.current(false, true);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [phase, questionKey, timeLimitMs]);

  const next = () => {
    if (phase !== 'checked') return;
    if (isLast) {
      setPhase('finished');
      return;
    }
    setQuestionNumber((number) => number + 1);
    startQuestion();
  };

  useNextWhenCorrect(phase === 'checked' && correct, next);

  // The game is not saved: once a question counts, leaving it would lose the
  // score, until the results show.
  useLeaveGuard(score.played > 0 && phase !== 'finished');

  const end = () => {
    answering.current = false;
    setRemainingMs(null);
    setPhase('finished');
  };

  // End sits in the site's bar, in place of the games, until the results show.
  useGameEndInBar(phase !== 'finished', end);

  const restart = () => {
    setScore(EMPTY_SCORE);
    setQuestionNumber(1);
    startQuestion();
  };

  return {
    phase,
    questionNumber,
    score,
    remainingMs,
    timedOut,
    correct,
    isLast,
    check: (right) => finishQuestion(right, false),
    next,
    end,
    restart,
  };
}
