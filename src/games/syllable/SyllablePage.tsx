import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { HelpPanels } from '../../components/HelpPanels/HelpPanels';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { CONSONANTS_PANEL, TONES_PANEL, VOWELS_PANEL } from '../../help/panels';
import { Verdict } from '../../components/Verdict/Verdict';
import { generateSyllable } from '../../thai/generator';
import type { Rng } from '../../thai/generator';
import { TONE_MARK } from '../../thai/types';
import { GAME, GAME_NAMES } from '../shared/games';
import { QuestionBar } from '../shared/QuestionBar';
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
}

/** In learning mode: everything that tells the tone, from the letters to the rules. */
const HELP_PANELS = [CONSONANTS_PANEL, VOWELS_PANEL, TONES_PANEL];

/** The answers of a new syllable: nothing chosen yet, except "no tone mark". */
const NO_ANSWERS: PlayerAnswers = { toneMark: TONE_MARK.None };

/**
 * The syllable game: the player reads a syllable and finds its tone, step by
 * step, or the tone alone in tone-only mode. Validate checks the answers once
 * every needed step is given, and locks them. Right answers move on to another
 * syllable by themselves; after a wrong one, or once the time is up, Validate
 * becomes Next, so the player reads the correction before moving on. The
 * results show at the end of a series, or when the player ends the game.
 */
export function SyllablePage({
  rng = Math.random,
  settings = DEFAULT_SETTINGS,
}: SyllablePageProps) {
  const [syllable, setSyllable] = useState(() => generateSyllable(rng));
  const [answers, setAnswers] = useState<PlayerAnswers>(NO_ANSWERS);
  const mode = settings.answerMode;

  const game = useSoloGame(settings, () => {
    setSyllable(generateSyllable(rng));
    setAnswers(NO_ANSWERS);
  });

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
        <Summary score={game.score} settings={settings} withAnswerMode onPlayAgain={game.restart} />
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
        <ThaiDisplay text={syllable.text} />
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
      </main>
    </HelpPanels>
  );
}
