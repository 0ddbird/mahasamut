import { useState } from 'react';
import { playSound } from '../../audio/playSound';
import type { PlaySound } from '../../audio/playSound';
import { AnswerRow } from '../../components/AnswerRow/AnswerRow';
import type { Option } from '../../components/AnswerRow/option';
import { Button } from '../../components/Button/Button';
import { HelpPanels } from '../../components/HelpPanels/HelpPanels';
import { ListenButton } from '../../components/ListenButton/ListenButton';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { Verdict } from '../../components/Verdict/Verdict';
import { VOWELS_PANEL } from '../../help/panels';
import { ReportFlag } from '../../report/ReportFlag';
import type { Rng } from '../../thai/generator';
import { VOWELS } from '../../thai/vowels';
import type { Vowel } from '../../thai/vowels';
import { spokenIpa, VOWEL_IPA, vowelOnCarrier } from '../../thai/vowels/ipa';
import { currentCard, newDeck, nextCard } from '../shared/deck';
import type { Deck } from '../shared/deck';
import { GAME, GAME_NAMES } from '../shared/games';
import { QuestionBar } from '../shared/QuestionBar';
import { vowelEntry } from '../shared/recap';
import type { RecapResult } from '../shared/recap';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { GameSettings } from '../shared/settings';
import { Summary } from '../shared/Summary';
import { useSoloGame } from '../shared/useSoloGame';
import { vowelChoices } from './choices';
import { SOUND_VOWEL, vowelSoundUrl } from './sounds';
import styles from './VowelPage.module.scss';

/** In learning mode: how each vowel is written, the only help this game needs. */
const HELP_PANELS = [VOWELS_PANEL];

/** A question: the deck at the vowel shown, and the sounds offered for it. */
interface Question {
  deck: Deck<Vowel>;
  choices: string[];
}

const questionAt = (deck: Deck<Vowel>, rng: Rng): Question => ({
  deck,
  choices: vowelChoices(currentCard(deck), rng),
});

/** A choice shows its sound in IPA, between slashes, and screen readers say its name. */
const toOption = (sound: string): Option<string> => ({
  value: sound,
  label: `/${sound}/`,
  spokenLabel: spokenIpa(sound),
});

interface VowelPageProps {
  /** Source of random numbers for the shuffles; tests pass a seeded one. */
  rng?: Rng;
  /** How the game is played: its length and its time. */
  settings?: GameSettings;
  /** Plays a recorded sound; tests pass a mock. */
  play?: PlaySound;
}

/**
 * The vowel game: the player reads a vowel, written on อ, and finds how it
 * sounds among four answers in IPA. Choosing an answer plays its sound, since
 * IPA is hard to read alone. Validate checks it; once checked on a wrong
 * answer, Listen plays the right one again. A right answer moves on by itself,
 * a wrong one waits for Next.
 */
export function VowelPage({
  rng = Math.random,
  settings = DEFAULT_SETTINGS,
  play = playSound,
}: VowelPageProps) {
  const [question, setQuestion] = useState(() => questionAt(newDeck(VOWELS, rng), rng));
  const [chosen, setChosen] = useState<string | undefined>(undefined);

  // The game always calls the latest callback, so `question` is the one shown.
  const vowel = currentCard(question.deck);
  // The recap line of the question, which a report names it by as well.
  const entryOf = (result: RecapResult) =>
    vowelEntry(vowel.id, vowelOnCarrier(vowel), chosen ?? null, result);
  const game = useSoloGame(
    settings,
    () => {
      setQuestion(questionAt(nextCard(question.deck, rng), rng));
      setChosen(undefined);
    },
    entryOf,
    () => (chosen === undefined ? null : chosen === VOWEL_IPA[vowel.id]),
  );

  const expected = VOWEL_IPA[vowel.id];
  const checked = game.phase === 'checked';

  // Every click plays the sound, the answer already chosen included.
  const playAnswer = (sound: string) => {
    const id = SOUND_VOWEL.get(sound);
    if (id !== undefined) play(vowelSoundUrl(id));
  };

  const title = <h1>{GAME_NAMES[GAME.Vowel]}</h1>;
  // On the question, read but not shown: its room goes to the game.
  const hiddenTitle = <h1 className="visually-hidden">{GAME_NAMES[GAME.Vowel]}</h1>;

  if (game.phase === 'finished') {
    return (
      <main className={styles.page}>
        {title}
        <Summary
          score={game.score}
          recap={game.recap}
          settings={settings}
          withAnswerMode={false}
          onPlayAgain={game.restart}
          play={play}
        />
      </main>
    );
  }

  // A new question closes the help panel: the help stays a choice for each one.
  return (
    <HelpPanels panels={settings.learningMode ? HELP_PANELS : []} resetKey={game.questionNumber}>
      <main className={styles.page}>
        {hiddenTitle}
        <QuestionBar
          questionNumber={game.questionNumber}
          questionCount={settings.questionCount}
          remainingMs={game.remainingMs}
          secondsPerQuestion={settings.secondsPerQuestion}
        />
        <ThaiDisplay text={vowelOnCarrier(vowel)} />
        <ListenButton
          visible={checked && !game.correct}
          onClick={() => play(vowelSoundUrl(vowel.id))}
        />
        <div className={styles.answer}>
          <AnswerRow
            title="Sound"
            name="sound"
            options={question.choices.map(toOption)}
            selected={chosen}
            onSelect={setChosen}
            onActivate={playAnswer}
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
        <ReportFlag question={entryOf('right')} onOpenChange={game.setPaused} />
      </main>
    </HelpPanels>
  );
}
