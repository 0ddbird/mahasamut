import { useState } from 'react';
import { AnswerRow } from '../../components/AnswerRow/AnswerRow';
import { Button } from '../../components/Button/Button';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { Verdict } from '../../components/Verdict/Verdict';
import type { Rng } from '../../thai/generator';
import type { ConsonantClass } from '../../thai/types';
import { CONSONANT_CLASS_OPTIONS } from '../shared/options';
import { currentCard, newDeck, nextCard } from './deck';
import styles from './ClassesPage.module.scss';

interface ClassesPageProps {
  /** Source of random numbers for the shuffles; tests pass a seeded one. */
  rng?: Rng;
}

/**
 * Akson sam mu (อักษรสามหมู่), the consonant class game: the player reads a
 * consonant and finds its class. Validate checks the answer and locks it;
 * Next shows the next consonant of the deck.
 */
export function ClassesPage({ rng = Math.random }: ClassesPageProps) {
  const [deck, setDeck] = useState(() => newDeck(rng));
  const [chosen, setChosen] = useState<ConsonantClass | undefined>(undefined);
  const [checked, setChecked] = useState(false);

  const consonant = currentCard(deck);
  const expected = consonant.consonantClass;

  const next = () => {
    setDeck(nextCard(deck, rng));
    setChosen(undefined);
    setChecked(false);
  };

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
      {checked && <Verdict correct={chosen === expected} />}
      <div className={styles.actions}>
        <Button disabled={chosen === undefined || checked} onClick={() => setChecked(true)}>
          Validate
        </Button>
        <Button onClick={next}>Next</Button>
      </div>
    </main>
  );
}
