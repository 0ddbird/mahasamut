import { useEffect, useRef } from 'react';

/**
 * How long a right answer stays on screen before the next question, in
 * milliseconds: long enough to see it is right, and later for a short
 * celebration.
 */
export const CORRECT_DELAY_MS = 1000;

/**
 * Moves on to the next question by itself, CORRECT_DELAY_MS after the answer
 * is found right. A wrong answer waits for the player's Next instead, so they
 * can read the correction for as long as they need.
 */
export function useNextWhenCorrect(correct: boolean, next: () => void) {
  // The latest `next`, so that a new render does not restart the delay.
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });

  useEffect(() => {
    if (!correct) return;
    const timer = setTimeout(() => nextRef.current(), CORRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [correct]);
}
