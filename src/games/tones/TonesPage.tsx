import { useState } from 'react';
import { generateSyllable } from '../../thai/generator';
import type { Rng } from '../../thai/generator';
import { AnswerSheet } from './AnswerSheet';
import type { PlayerAnswers } from './AnswerSheet';
import { NextButton } from './NextButton';
import { SyllableDisplay } from './SyllableDisplay';
import styles from './TonesPage.module.scss';

interface TonesPageProps {
  /** Source of random numbers for the draws; tests pass a seeded one. */
  rng?: Rng;
}

/**
 * Wannayuk (วรรณยุกต์), the tone game: the player reads a syllable and finds
 * its tone, step by step. For now the page shows a syllable and the five answer
 * rows, and Next draws another syllable with empty answers; checking the
 * answers comes next.
 */
export function TonesPage({ rng = Math.random }: TonesPageProps) {
  const [syllable, setSyllable] = useState(() => generateSyllable(rng));
  const [answers, setAnswers] = useState<PlayerAnswers>({});

  const next = () => {
    setSyllable(generateSyllable(rng));
    setAnswers({});
  };

  return (
    <main className={styles.page}>
      <h1>
        Wannayuk <span lang="th">วรรณยุกต์</span>
      </h1>
      <SyllableDisplay text={syllable.text} />
      <AnswerSheet answers={answers} onChange={setAnswers} />
      <NextButton onClick={next} />
    </main>
  );
}
