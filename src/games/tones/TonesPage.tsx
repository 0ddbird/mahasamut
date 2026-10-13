import { useState } from 'react';
import { generateSyllable } from '../../thai/generator';
import type { Rng } from '../../thai/generator';
import { AnswerSheet } from './AnswerSheet';
import { checkAnswers, isComplete } from './check';
import type { CheckResult, PlayerAnswers } from './check';
import { NextButton } from './NextButton';
import { SyllableDisplay } from './SyllableDisplay';
import styles from './TonesPage.module.scss';
import { ValidateButton } from './ValidateButton';
import { Verdict } from './Verdict';

interface TonesPageProps {
  /** Source of random numbers for the draws; tests pass a seeded one. */
  rng?: Rng;
}

/**
 * Wannayuk (วรรณยุกต์), the tone game: the player reads a syllable and finds
 * its tone, step by step. Validate checks the five answers once they are all
 * given, and locks them; Next draws another syllable and starts again.
 */
export function TonesPage({ rng = Math.random }: TonesPageProps) {
  const [syllable, setSyllable] = useState(() => generateSyllable(rng));
  const [answers, setAnswers] = useState<PlayerAnswers>({});
  // Null until the answers are checked.
  const [result, setResult] = useState<CheckResult | null>(null);

  const checked = result !== null;

  const validate = () => {
    if (isComplete(answers)) setResult(checkAnswers(answers, syllable.analyses));
  };

  const next = () => {
    setSyllable(generateSyllable(rng));
    setAnswers({});
    setResult(null);
  };

  return (
    <main className={styles.page}>
      <h1>
        Wannayuk <span lang="th">วรรณยุกต์</span>
      </h1>
      <SyllableDisplay text={syllable.text} />
      <AnswerSheet answers={answers} onChange={setAnswers} disabled={checked} />
      {checked && <Verdict correct={result.correct} />}
      <div className={styles.actions}>
        <ValidateButton disabled={!isComplete(answers) || checked} onClick={validate} />
        <NextButton onClick={next} />
      </div>
    </main>
  );
}
