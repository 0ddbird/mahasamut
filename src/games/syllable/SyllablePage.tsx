import { useState } from 'react';
import { playSound } from '../../audio/playSound';
import type { PlaySound } from '../../audio/playSound';
import { Button } from '../../components/Button/Button';
import { HelpPanels } from '../../components/HelpPanels/HelpPanels';
import { ListenButton } from '../../components/ListenButton/ListenButton';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { CONSONANTS_PANEL, TONES_PANEL, VOWELS_PANEL } from '../../help/panels';
import { Verdict } from '../../components/Verdict/Verdict';
import { ReportFlag } from '../../report/ReportFlag';
import { generateSyllable } from '../../thai/generator';
import type { Rng } from '../../thai/generator';
import type { CategoryGroup } from '../../thai/generator/syllables';
import { TONE_MARK } from '../../thai/types';
import { wordGroups } from '../../thai/words';
import { wordSoundUrl } from '../../thai/words/sounds';
import { GAME, GAME_NAMES } from '../shared/games';
import { QuestionBar } from '../shared/QuestionBar';
import { syllableEntry } from '../shared/recap';
import type { RecapResult } from '../shared/recap';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { GameSettings } from '../shared/settings';
import { Summary } from '../shared/Summary';
import { useSoloGame } from '../shared/useSoloGame';
import { AnswerSheet } from './AnswerSheet';
import { checkAnswers, isComplete } from './check';
import type { PlayerAnswers } from './check';
import styles from './SyllablePage.module.scss';

interface SyllablePageProps {
  /** Source of random numbers for the draws; tests pass a seeded one. */
  rng?: Rng;
  /** How the game is played: its length, its time, and the answer asked. */
  settings?: GameSettings;
  /**
   * The syllables drawn, grouped by category: the words of the pool by default.
   * Passing `categoryGroups()` brings back every valid syllable.
   */
  groups?: readonly CategoryGroup[];
  /** Plays a recorded sound; tests pass a mock. */
  play?: PlaySound;
  /** Where the sound of a word is served, `null` if it has none yet; tests pass their own. */
  soundOf?: (text: string) => string | null;
}

/** In learning mode: everything that tells the tone, from the letters to the rules. */
const HELP_PANELS = [CONSONANTS_PANEL, VOWELS_PANEL, TONES_PANEL];

/** The answers of a new syllable: nothing chosen yet, except "no tone mark". */
const NO_ANSWERS: PlayerAnswers = { toneMark: TONE_MARK.None };

/**
 * The syllable game: the player reads a real word of the pool and finds its tone, step by
 * step, or the tone alone in tone-only mode. Validate checks the answers once
 * every needed step is given, and locks them. Right answers move on to another
 * syllable by themselves; after a wrong one, or once the time is up, Validate
 * becomes Next, so the player reads the correction before moving on. Once
 * checked, Listen plays the word, for the words that have a recording. The
 * results show at the end of a series, or when the player ends the game.
 */
export function SyllablePage({
  rng = Math.random,
  settings = DEFAULT_SETTINGS,
  groups = wordGroups(),
  play = playSound,
  soundOf = wordSoundUrl,
}: SyllablePageProps) {
  const [syllable, setSyllable] = useState(() => generateSyllable(rng, groups));
  const [answers, setAnswers] = useState<PlayerAnswers>(NO_ANSWERS);
  const mode = settings.answerMode;

  const sound = soundOf(syllable.text);
  // The recap line of the question, which a report names it by as well.
  // All the homographs of a word have the same tone.
  const entryOf = (result: RecapResult) =>
    syllableEntry(syllable.text, syllable.analyses[0].tone, answers.tone ?? null, result, sound);
  const game = useSoloGame(
    settings,
    () => {
      setSyllable(generateSyllable(rng, groups));
      setAnswers(NO_ANSWERS);
    },
    entryOf,
  );

  const check = () => checkAnswers(answers, syllable.analyses, syllable.parts.mark, mode);
  const checked = game.phase === 'checked';
  // Once checked, by Validate or by the end of the time, the rows show what the
  // player had chosen against the right answers.
  const result = checked ? check() : null;

  const validate = () => {
    if (!isComplete(answers, mode)) return;
    game.check(check().correct);
  };

  const title = <h1>{GAME_NAMES[GAME.Syllable]}</h1>;

  if (game.phase === 'finished') {
    return (
      <main className={styles.page}>
        {title}
        <Summary
          score={game.score}
          recap={game.recap}
          settings={settings}
          withAnswerMode
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
        {title}
        <QuestionBar
          questionNumber={game.questionNumber}
          questionCount={settings.questionCount}
          remainingMs={game.remainingMs}
          secondsPerQuestion={settings.secondsPerQuestion}
        />
        <ThaiDisplay text={syllable.text} />
        <ListenButton
          visible={checked && sound !== null}
          onClick={() => {
            if (sound !== null) play(sound);
          }}
        />
        <AnswerSheet
          answers={answers}
          onChange={setAnswers}
          answerMode={mode}
          correction={result === null ? undefined : { result, analyses: syllable.analyses }}
        />
        {checked && <Verdict correct={game.correct} timeUp={game.timedOut} />}
        {/* One button in both cases: the same element stays, and keeps the focus. */}
        {checked && !game.correct ? (
          <Button onClick={game.next}>{game.isLast ? 'See results' : 'Next'}</Button>
        ) : (
          <Button disabled={!isComplete(answers, mode) || checked} onClick={validate}>
            Validate
          </Button>
        )}
        <ReportFlag question={entryOf('right')} onOpenChange={game.setPaused} />
      </main>
    </HelpPanels>
  );
}
