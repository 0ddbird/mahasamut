import { Volume2 } from 'lucide-react';
import { useId } from 'react';
import { playSound } from '../../audio/playSound';
import type { PlaySound } from '../../audio/playSound';
import styles from './Recap.module.scss';
import type { RecapEntry } from './recap';

interface RecapProps {
  entries: readonly RecapEntry[];
  /** Plays the sound of a question; replaced in tests. */
  play?: PlaySound;
}

/**
 * What the player answered and what was right, for one question. The marks
 * and the arrow are for the eye; the words that say the same to screen
 * readers are in the DOM but hidden on screen.
 */
function Answer({ entry }: { entry: RecapEntry }) {
  const { result, given, expected } = entry;
  const right = <span className={styles.expected}>{expected}</span>;

  if (result === 'right') {
    return (
      <p className={styles.verdict}>
        <span className={styles.rightMark} aria-hidden="true">
          ✓
        </span>
        <span className={styles.visuallyHidden}>Right. </span>
        {right}
      </p>
    );
  }

  const mark = (
    <span className={styles.wrongMark} aria-hidden="true">
      ✗
    </span>
  );

  if (result === 'timeUp') {
    return (
      <p className={styles.verdict}>
        {mark}
        <span>Time&apos;s up</span>
        <span aria-hidden="true">→</span>
        <span className={styles.visuallyHidden}>. Right answer: </span>
        {right}
      </p>
    );
  }

  // A wrong answer can be the right tone (full reasoning grades the steps
  // too): then there is nothing to strike, and nothing else to show.
  if (given === null || given === expected) {
    return (
      <p className={styles.verdict}>
        {mark}
        <span className={styles.visuallyHidden}>Wrong. </span>
        {right}
      </p>
    );
  }

  return (
    <p className={styles.verdict}>
      {mark}
      <span className={styles.visuallyHidden}>Wrong. Your answer: </span>
      <s className={styles.given}>{given}</s>
      <span aria-hidden="true">→</span>
      <span className={styles.visuallyHidden}>. Right answer: </span>
      {right}
    </p>
  );
}

/**
 * The questions of a finished game, in the order played, each with the answer
 * given and the right one. Shared by the solo results and the multiplayer
 * final screen. Shows nothing when no question was played.
 */
export function Recap({ entries, play = playSound }: RecapProps) {
  const titleId = useId();
  if (entries.length === 0) return null;

  return (
    <section className={styles.recap} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        Your answers
      </h2>
      <ol className={styles.list}>
        {entries.map((entry, index) => {
          const { sound } = entry;
          return (
            <li key={index} className={styles.row}>
              <span className={styles.number}>{index + 1}</span>
              <span className={styles.text} lang="th">
                {entry.text}
              </span>
              <Answer entry={entry} />
              {sound !== null && (
                <button
                  type="button"
                  className={styles.listen}
                  aria-label={`Listen to ${entry.text}`}
                  onClick={() => play(sound)}
                >
                  <Volume2 size={18} aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
