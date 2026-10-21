import { useState } from 'react';
import { AnswerRow } from '../../components/AnswerRow/AnswerRow';
import { Button } from '../../components/Button/Button';
import { HelpPanels } from '../../components/HelpPanels/HelpPanels';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { CONSONANTS_PANEL } from '../../help/panels';
import { Verdict } from '../../components/Verdict/Verdict';
import type { Rng } from '../../thai/generator';
import type { ConsonantClass } from '../../thai/types';
import { GAME, GAME_NAMES } from '../shared/games';
import { CONSONANT_CLASS_OPTIONS } from '../shared/options';
import { QuestionBar } from '../shared/QuestionBar';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { GameSettings } from '../shared/settings';
import { Summary } from '../shared/Summary';
import { useSoloGame } from '../shared/useSoloGame';
import { currentCard, newDeck, nextCard } from './deck';
import styles from './ConsonantClassPage.module.scss';

/** In learning mode: the consonants by class, the only help this game needs. */
const HELP_PANELS = [CONSONANTS_PANEL];

interface ConsonantClassPageProps {
  /** Source of random numbers for the shuffles; tests pass a seeded one. */
  rng?: Rng;
  /** How the game is played: its length and its time. */
  settings?: GameSettings;
}

/**
 * The consonant class game: the player reads a consonant and finds its class.
 * Validate checks the answer and locks it. A right class moves on to the next
 * consonant of the deck by itself; after a wrong one, or once the time is up,
 * Validate becomes Next. The results show at the end of a series, or when the
 * player ends the game.
 */
export function ConsonantClassPage({
  rng = Math.random,
  settings = DEFAULT_SETTINGS,
}: ConsonantClassPageProps) {
  const [deck, setDeck] = useState(() => newDeck(rng));
  const [chosen, setChosen] = useState<ConsonantClass | undefined>(undefined);

  const game = useSoloGame(settings, () => {
    setDeck((current) => nextCard(current, rng));
    setChosen(undefined);
  });

  const consonant = currentCard(deck);
  const expected = consonant.consonantClass;
  const checked = game.phase === 'checked';

  const title = <h1>{GAME_NAMES[GAME.ConsonantClass]}</h1>;

  if (game.phase === 'finished') {
    return (
      <main className={styles.page}>
        {title}
        <Summary
          score={game.score}
          settings={settings}
          withAnswerMode={false}
          onPlayAgain={game.restart}
        />
      </main>
    );
  }

  // A new question closes the help panel: the help stays a choice for each one.
  return (
    <HelpPanels panels={settings.learningMode ? HELP_PANELS : []} resetKey={game.questionNumber}>
      <main className={styles.page}>
        {title}
        <QuestionBar
          questionNumber={game.questionNumber}
          questionCount={settings.questionCount}
          remainingMs={game.remainingMs}
          secondsPerQuestion={settings.secondsPerQuestion}
          onEnd={game.end}
        />
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
        {checked && <Verdict correct={game.correct} timeUp={game.timedOut} />}
        {/* One button in both cases: the same element stays, and keeps the focus. */}
        {checked && !game.correct ? (
          <Button onClick={game.next}>{game.isLast ? 'See results' : 'Next'}</Button>
        ) : (
          <Button
            disabled={chosen === undefined || checked}
            onClick={() => game.check(chosen === expected)}
          >
            Validate
          </Button>
        )}
      </main>
    </HelpPanels>
  );
}
