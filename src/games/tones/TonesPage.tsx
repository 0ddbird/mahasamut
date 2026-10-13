import { useState } from 'react';
import { generateSyllable } from '../../thai/generator';
import type { Rng } from '../../thai/generator';
import { NextButton } from './NextButton';
import { SyllableDisplay } from './SyllableDisplay';
import styles from './TonesPage.module.scss';

interface TonesPageProps {
  /** Source of random numbers for the draws; tests pass a seeded one. */
  rng?: Rng;
}

/**
 * Wannayuk (วรรณยุกต์), the tone game: the player reads a syllable and finds
 * its tone, step by step. For now the page shows a syllable and draws another
 * one on Next; the answer rows come next.
 */
export function TonesPage({ rng = Math.random }: TonesPageProps) {
  const [syllable, setSyllable] = useState(() => generateSyllable(rng));

  return (
    <main className={styles.page}>
      <h1>
        Wannayuk <span lang="th">วรรณยุกต์</span>
      </h1>
      <SyllableDisplay text={syllable.text} />
      <NextButton onClick={() => setSyllable(generateSyllable(rng))} />
    </main>
  );
}
