import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button/Button';
import { scorePercent } from './score';
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
  /** The settings page of the game. */
  settingsPath: string;
  onPlayAgain: () => void;
}

/** The results of a game, once a series is over or the player ended it. */
export function Summary({
  score,
  settings,
  withAnswerMode,
  settingsPath,
  onPlayAgain,
}: SummaryProps) {
  const percent = scorePercent(score);
  const result = `${score.right} / ${score.played} right`;

  // The button that ended the game is gone: the focus goes to the results, so
  // that keyboard and screen reader users land on them.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className={styles.summary}>
      <h2 ref={heading} tabIndex={-1}>
        Results
      </h2>
      <p className={styles.score}>{percent === null ? result : `${result} (${percent}%)`}</p>
      <p>{`Best streak: ${score.bestStreak}`}</p>
      <p className={styles.settings}>{describeSettings(settings, withAnswerMode)}</p>
      <Button onClick={onPlayAgain}>Play again</Button>
      <nav className={styles.links}>
        <Link to={settingsPath}>Change settings</Link>
        <Link to="/">Home</Link>
      </nav>
    </section>
  );
}
