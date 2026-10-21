import { Volume2 } from 'lucide-react';
import { useState } from 'react';
import { speakThai } from '../../audio/speak';
import type { Speak } from '../../audio/speak';
import { AnswerRow } from '../../components/AnswerRow/AnswerRow';
import type { Option } from '../../components/AnswerRow/option';
import { Button } from '../../components/Button/Button';
import { HelpPanels } from '../../components/HelpPanels/HelpPanels';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { Verdict } from '../../components/Verdict/Verdict';
import { VOWELS_PANEL } from '../../help/panels';
import type { Rng } from '../../thai/generator';
import { VOWELS } from '../../thai/vowels';
import type { Vowel } from '../../thai/vowels';
import { VOWEL_IPA, vowelOnCarrier } from '../../thai/vowels/ipa';
import { currentCard, newDeck, nextCard } from '../shared/deck';
import type { Deck } from '../shared/deck';
import { GAME, GAME_NAMES } from '../shared/games';
import { QuestionBar } from '../shared/QuestionBar';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { GameSettings } from '../shared/settings';
import { Summary } from '../shared/Summary';
import { useSoloGame } from '../shared/useSoloGame';
import { vowelChoices } from './choices';
import styles from './VowelPage.module.scss';

/** In learning mode: how each vowel is written, the only help this game needs. */
const HELP_PANELS = [VOWELS_PANEL];

/** The Thai read aloud for each sound: the first vowel that has it, on อ. */
const SOUND_TEXT = new Map<string, string>();
for (const v of VOWELS) {
  if (!SOUND_TEXT.has(VOWEL_IPA[v.id])) SOUND_TEXT.set(VOWEL_IPA[v.id], vowelOnCarrier(v));
}

/** A question: the deck at the vowel shown, and the sounds offered for it. */
interface Question {
  deck: Deck<Vowel>;
  choices: string[];
}

const questionAt = (deck: Deck<Vowel>, rng: Rng): Question => ({
  deck,
  choices: vowelChoices(currentCard(deck), rng),
});

/** A choice shows its sound in IPA, between slashes. */
const toOption = (sound: string): Option<string> => ({ value: sound, label: `/${sound}/` });

interface VowelPageProps {
  /** Source of random numbers for the shuffles; tests pass a seeded one. */
  rng?: Rng;
  /** How the game is played: its length and its time. */
  settings?: GameSettings;
  /** Reads a sound aloud; tests pass a mock. */
  speak?: Speak;
}

/**
 * The vowel game: the player reads a vowel, written on อ, and finds how it
 * sounds among four answers in IPA. Choosing an answer plays its sound, since
 * IPA is hard to read alone. Validate checks it; once checked, Listen plays
 * the right one again. A right answer moves on by itself, a wrong one waits
 * for Next.
 */
export function VowelPage({
  rng = Math.random,
  settings = DEFAULT_SETTINGS,
  speak = speakThai,
}: VowelPageProps) {
  const [question, setQuestion] = useState(() => questionAt(newDeck(VOWELS, rng), rng));
  const [chosen, setChosen] = useState<string | undefined>(undefined);

  // The game always calls the latest callback, so `question` is the one shown.
  const game = useSoloGame(settings, () => {
    setQuestion(questionAt(nextCard(question.deck, rng), rng));
    setChosen(undefined);
  });

  const vowel = currentCard(question.deck);
  const expected = VOWEL_IPA[vowel.id];
  const checked = game.phase === 'checked';

  // Every click plays the sound, the answer already chosen included.
  const play = (sound: string) => {
    const text = SOUND_TEXT.get(sound);
    if (text !== undefined) speak(text);
  };

  const title = <h1>{GAME_NAMES[GAME.Vowel]}</h1>;

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
        <ThaiDisplay text={vowelOnCarrier(vowel)} />
        {checked && (
          <button
            type="button"
            className={styles.listen}
            onClick={() => speak(vowelOnCarrier(vowel))}
          >
            <Volume2 size={18} aria-hidden="true" />
            Listen
          </button>
        )}
        <div className={styles.answer}>
          <AnswerRow
            title="Sound"
            name="sound"
            options={question.choices.map(toOption)}
            selected={chosen}
            onSelect={setChosen}
            onActivate={play}
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
