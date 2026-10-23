import { Flag, Volume2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { playSound } from '../../audio/playSound';
import type { PlaySound } from '../../audio/playSound';
import { reportsEnabled } from '../../monitoring/sentry';
import { ReportDialog } from '../../report/ReportDialog';
import type { ReportInput, ReportMode, ReportOutcome } from '../../report/report';
import { GAME } from './games';
import styles from './Recap.module.scss';
import type { RecapEntry } from './recap';

interface RecapProps {
  entries: readonly RecapEntry[];
  /** Plays the sound of a question; replaced in tests. */
  play?: PlaySound;
  /** The kind of game the questions were played in, which a report says. */
  mode: ReportMode;
  /** Sends a report; only tests give their own. */
  send?: (input: ReportInput) => Promise<ReportOutcome>;
}

/**
 * A label, read aloud by its spoken form when it has one: the label stays on
 * screen only, as screen readers would read it badly (IPA).
 */
function Label({ label, spoken }: { label: string; spoken?: string }) {
  if (spoken === undefined) return label;
  return (
    <>
      <span className={styles.visuallyHidden}>{spoken}</span>
      <span aria-hidden="true">{label}</span>
    </>
  );
}

/**
 * What the player answered and what was right, for one question. The marks
 * and the arrow are for the eye; the words that say the same to screen
 * readers are in the DOM but hidden on screen.
 */
function Answer({ entry }: { entry: RecapEntry }) {
  const { result, given, expected } = entry;
  // The IPA letters are missing from the body font.
  const ipa = entry.game === GAME.Vowel ? styles.ipa : '';
  const right = (
    <span className={`${styles.expected} ${ipa}`}>
      <Label label={expected} spoken={entry.spokenExpected} />
    </span>
  );

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
      <s className={`${styles.given} ${ipa}`}>
        <Label label={given} spoken={entry.spokenGiven} />
      </s>
      <span aria-hidden="true">→</span>
      <span className={styles.visuallyHidden}>. Right answer: </span>
      {right}
    </p>
  );
}

/**
 * The questions of a finished game, in the order played, each with the answer
 * given and the right one, and a button to report the question. Shared by the
 * solo results and the multiplayer final screen. Shows nothing when no question
 * was played.
 *
 * Which lines were reported is kept here, in memory: a new recap (Play again)
 * starts clean. ReportDialog does not give the focus back when it closes: the
 * line's button does.
 */
export function Recap({ entries, play = playSound, mode, send }: RecapProps) {
  const titleId = useId();
  // Lines are told apart by their index: the same word can come up twice in a game.
  const [reporting, setReporting] = useState<number | null>(null);
  const [reported, setReported] = useState<ReadonlySet<number>>(new Set());
  const reportButtons = useRef(new Map<number, HTMLButtonElement>());
  // A build with nowhere to send reports does not offer them.
  const canReport = reportsEnabled();
  if (entries.length === 0) return null;

  return (
    <section className={styles.recap} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        Your answers
      </h2>
      <ol className={styles.list}>
        {entries.map((entry, index) => {
          const { sound } = entry;
          const isReported = reported.has(index);
          return (
            <li key={index} className={styles.row}>
              <span className={styles.number}>{index + 1}</span>
              <span className={styles.text} lang="th">
                {entry.text}
              </span>
              <Answer entry={entry} />
              <div className={styles.actions}>
                {sound !== null && (
                  <button
                    type="button"
                    className={styles.action}
                    aria-label={`Listen to ${entry.text}`}
                    onClick={() => play(sound)}
                  >
                    <Volume2 size={18} aria-hidden="true" />
                  </button>
                )}
                {/* Reported is aria-disabled, not disabled: a disabled button
                    cannot take the focus back when the window closes. */}
                {canReport && (
                  <button
                    ref={(node) => {
                      if (node) reportButtons.current.set(index, node);
                      else reportButtons.current.delete(index);
                    }}
                    type="button"
                    className={styles.action}
                    aria-label={
                      isReported ? `Reported: ${entry.text}` : `Report the question ${entry.text}`
                    }
                    aria-disabled={isReported || undefined}
                    onClick={isReported ? undefined : () => setReporting(index)}
                  >
                    <Flag size={16} aria-hidden="true" />
                    {isReported ? 'Reported' : 'Report'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {reporting !== null && (
        <ReportDialog
          question={entries[reporting]}
          where="recap"
          mode={mode}
          onSent={() => setReported((current) => new Set(current).add(reporting))}
          onClose={() => {
            setReporting(null);
            reportButtons.current.get(reporting)?.focus();
          }}
          send={send}
        />
      )}
    </section>
  );
}
