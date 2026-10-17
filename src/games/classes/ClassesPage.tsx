import { useState } from 'react';
import { AnswerRow } from '../../components/AnswerRow/AnswerRow';
import { Button } from '../../components/Button/Button';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { Verdict } from '../../components/Verdict/Verdict';
import type { Rng } from '../../thai/generator';
import type { ConsonantClass } from '../../thai/types';
import { CONSONANT_CLASS_OPTIONS } from '../shared/options';
import { useNextWhenCorrect } from '../shared/useNextWhenCorrect';
import { currentCard, newDeck, nextCard } from './deck';
import styles from './ClassesPage.module.scss';

interface ClassesPageProps {
  /** Source of random numbers for the shuffles; tests pass a seeded one. */
  rng?: Rng;
}

/**
 * Akson sam mu (อักษรสามหมู่), the consonant class game: the player reads a
 * consonant and finds its class. Validate checks the answer and locks it. A
 * right class moves on to the next consonant of the deck by itself; after a
 * wrong one, Validate becomes Next.
 */
export function ClassesPage({ rng = Math.random }: ClassesPageProps) {
  const [deck, setDeck] = useState(() => newDeck(rng));
  const [chosen, setChosen] = useState<ConsonantClass | undefined>(undefined);
  const [checked, setChecked] = useState(false);

  const consonant = currentCard(deck);
  const expected = consonant.consonantClass;

  const correct = checked && chosen === expected;

  const next = () => {
    setDeck(nextCard(deck, rng));
    setChosen(undefined);
    setChecked(false);
  };

  useNextWhenCorrect(correct, next);

  return (
    <main className={styles.page}>
      <h1>
        Akson sam mu <span lang="th">อักษรสามหมู่</span>
      </h1>
      <ThaiDisplay text={consonant.char} />
      <div className={styles.answer}>
        <AnswerRow
          title="Consonant class"
          name="consonantClass"
          options={CONSONANT_CLASS_OPTIONS}
          selected={chosen}
          onSelect={setChosen}
          disabled={checked}
          feedback={checked ? { chosen, expected, accepted: [expected] } : undefined}
        />
      </div>
      {checked && <Verdict correct={correct} />}
      {/* One button in both cases: the same element stays, and keeps the focus. */}
      {checked && !correct ? (
        <Button onClick={next}>Next</Button>
      ) : (
        <Button disabled={chosen === undefined || checked} onClick={() => setChecked(true)}>
          Validate
        </Button>
      )}
    </main>
  );
}
