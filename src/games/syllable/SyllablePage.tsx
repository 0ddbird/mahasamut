import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { Verdict } from '../../components/Verdict/Verdict';
import { generateSyllable } from '../../thai/generator';
import type { Rng } from '../../thai/generator';
import { TONE_MARK } from '../../thai/types';
import { GameName } from '../shared/GameName';
import { GAME } from '../shared/games';
import { useNextWhenCorrect } from '../shared/useNextWhenCorrect';
import { AnswerSheet } from './AnswerSheet';
import { checkAnswers, isComplete } from './check';
import type { CheckResult, PlayerAnswers } from './check';
import styles from './SyllablePage.module.scss';

interface SyllablePageProps {
  /** Source of random numbers for the draws; tests pass a seeded one. */
  rng?: Rng;
}

/** The answers of a new syllable: nothing chosen yet, except "no tone mark". */
const NO_ANSWERS: PlayerAnswers = { toneMark: TONE_MARK.None };

/**
 * The syllable game: the player reads a syllable and finds its tone, step by
 * step. Validate checks the answers once every needed step is given, and locks
 * them. Right answers move on to another syllable by themselves; after a wrong
 * one, Validate becomes Next, so the player reads the correction before moving
 * on.
 */
export function SyllablePage({ rng = Math.random }: SyllablePageProps) {
  const [syllable, setSyllable] = useState(() => generateSyllable(rng));
  const [answers, setAnswers] = useState<PlayerAnswers>(NO_ANSWERS);
  // Null until the answers are checked.
  const [result, setResult] = useState<CheckResult | null>(null);

  const checked = result !== null;

  const validate = () => {
    if (!isComplete(answers)) return;
    setResult(checkAnswers(answers, syllable.analyses, syllable.parts.mark));
  };

  const next = () => {
    setSyllable(generateSyllable(rng));
    setAnswers(NO_ANSWERS);
    setResult(null);
  };

  useNextWhenCorrect(checked && result.correct, next);

  return (
    <main className={styles.page}>
      <h1>
        <GameName game={GAME.Syllable} />
      </h1>
      <ThaiDisplay text={syllable.text} />
      <AnswerSheet
        answers={answers}
        onChange={setAnswers}
        correction={checked ? { result, analyses: syllable.analyses } : undefined}
      />
      {checked && <Verdict correct={result.correct} />}
      {/* One button in both cases: the same element stays, and keeps the focus. */}
      {checked && !result.correct ? (
        <Button onClick={next}>Next</Button>
      ) : (
        <Button disabled={!isComplete(answers) || checked} onClick={validate}>
          Validate
        </Button>
      )}
    </main>
  );
}
