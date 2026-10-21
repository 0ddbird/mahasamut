import { useEffect, useRef } from 'react';
import { Button } from '../../components/Button/Button';
import { resultSentence, resultTitle, streakSentence } from './resultText';
import type { Score } from './score';
import type { GameSettings } from './settings';
import { describeSettings } from './settingsLabels';
import styles from './Summary.module.scss';

interface SummaryProps {
  score: Score;
  /** The settings of the game just played, which Play again keeps. */
  settings: GameSettings;
  /** Whether the game has an answer mode to describe (the syllable game). */
  withAnswerMode: boolean;
  onPlayAgain: () => void;
}

/**
 * The results of a game, once a series is over or the player ended it. Home
 * and the game's settings are in the navigation bar above.
 */
export function Summary({ score, settings, withAnswerMode, onPlayAgain }: SummaryProps) {
  const sentence = resultSentence(score);
  const streak = streakSentence(score);

  // The button that ended the game is gone: the focus goes to the results, so
  // that keyboard and screen reader users land on them.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className={styles.summary}>
      <h2 ref={heading} tabIndex={-1} className={styles.title}>
        {resultTitle(score)}
      </h2>
      {sentence !== null && <p className={styles.score}>{sentence}</p>}
      {streak !== null && <p>{streak}</p>}
      <p className={styles.settings}>{describeSettings(settings, withAnswerMode)}</p>
      <Button onClick={onPlayAgain}>Play again</Button>
    </section>
  );
}
