import { useEffect, useState } from 'react';
import { playSound } from '../../audio/playSound';
import type { PlaySound } from '../../audio/playSound';
import { Button } from '../../components/Button/Button';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { GAME_NAMES } from '../../games/shared/games';
import { QuestionBar } from '../../games/shared/QuestionBar';
import { isComplete } from '../../games/syllable/check';
import type { PlayerAnswers } from '../../games/syllable/check';
import { TONE_MARK } from '../../thai/types';
import type { ConsonantClass } from '../../thai/types';
import type { ActionError, GameAnswer, RoomView } from '../protocol';
import { ConsonantClassPanel } from './panels/ConsonantClassPanel';
import { SyllablePanel } from './panels/SyllablePanel';
import { VowelPanel } from './panels/VowelPanel';
import styles from './QuestionScreen.module.scss';

const TICK_MS = 250;

interface QuestionScreenProps {
  view: RoomView;
  onAnswer: (answer: GameAnswer) => Promise<ActionError | null>;
  play?: PlaySound;
}

/**
 * The screen of an open question in a multiplayer room: shows the shared
 * countdown in `QuestionBar`, the Thai text, the game's answer panel, and
 * locks the player's answer once sent.
 */
export function QuestionScreen({ view, onAnswer, play = playSound }: QuestionScreenProps) {
  const { phase } = view;
  const initialRemainingMs = phase.kind === 'question' ? phase.remainingMs : 0;

  const [leftMs, setLeftMs] = useState(initialRemainingMs);
  const [lastRemainingMs, setLastRemainingMs] = useState(initialRemainingMs);
  if (initialRemainingMs !== lastRemainingMs) {
    setLastRemainingMs(initialRemainingMs);
    setLeftMs(initialRemainingMs);
  }
  const [syllableAnswers, setSyllableAnswers] = useState<PlayerAnswers>({
    toneMark: TONE_MARK.None,
  });
  const [chosenClass, setChosenClass] = useState<ConsonantClass | undefined>(undefined);
  const [chosenSound, setChosenSound] = useState<string | undefined>(undefined);
  const [sentLocally, setSentLocally] = useState(false);
  const [tooLate, setTooLate] = useState(false);

  useEffect(() => {
    const deadline = Date.now() + initialRemainingMs;
    const timer = setInterval(() => {
      setLeftMs(Math.max(0, deadline - Date.now()));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [initialRemainingMs]);

  if (phase.kind !== 'question') return null;

  const sentAnswer = phase.yourAnswer;
  const locked = sentLocally || sentAnswer !== null;

  const effectiveSyllableAnswers =
    sentAnswer?.game === 'syllable' ? sentAnswer.answers : syllableAnswers;
  const effectiveClass =
    sentAnswer?.game === 'consonantClass' ? sentAnswer.consonantClass : chosenClass;
  const effectiveSound = sentAnswer?.game === 'vowel' ? sentAnswer.sound : chosenSound;

  const complete =
    phase.question.game === 'syllable'
      ? isComplete(effectiveSyllableAnswers, view.settings.answerMode)
      : phase.question.game === 'consonantClass'
        ? effectiveClass !== undefined
        : effectiveSound !== undefined;

  const validate = async () => {
    if (!complete || locked) return;
    let payload: GameAnswer;
    if (phase.question.game === 'syllable') {
      payload = { game: 'syllable', answers: effectiveSyllableAnswers };
    } else if (phase.question.game === 'consonantClass') {
      if (effectiveClass === undefined) return;
      payload = { game: 'consonantClass', consonantClass: effectiveClass };
    } else {
      if (effectiveSound === undefined) return;
      payload = { game: 'vowel', sound: effectiveSound };
    }
    setSentLocally(true);
    const err = await onAnswer(payload);
    if (err === 'too-late') {
      setTooLate(true);
    } else if (err !== null) {
      setSentLocally(false);
    }
  };

  return (
    <main className={styles.page}>
      <h1>{GAME_NAMES[view.game]}</h1>
      <QuestionBar
        questionNumber={phase.index + 1}
        questionCount={view.settings.questionCount}
        remainingMs={leftMs}
        secondsPerQuestion={view.settings.secondsPerQuestion}
      />
      <ThaiDisplay text={phase.question.text} />
      <div className={styles.panel}>
        {phase.question.game === 'syllable' && (
          <SyllablePanel
            answers={effectiveSyllableAnswers}
            onChange={setSyllableAnswers}
            answerMode={view.settings.answerMode}
            locked={locked}
          />
        )}
        {phase.question.game === 'consonantClass' && (
          <ConsonantClassPanel chosen={effectiveClass} onChange={setChosenClass} locked={locked} />
        )}
        {phase.question.game === 'vowel' && (
          <VowelPanel
            choices={phase.question.choices}
            chosen={effectiveSound}
            onChange={setChosenSound}
            locked={locked}
            play={play}
          />
        )}
      </div>
      {tooLate ? (
        <p role="alert" className={styles.tooLate}>
          Too late!
        </p>
      ) : locked ? (
        <p className={styles.status}>
          {`Answer sent. ${phase.answeredCount} / ${phase.connectedCount} answered.`}
        </p>
      ) : (
        <Button disabled={!complete} onClick={() => void validate()}>
          Validate
        </Button>
      )}
    </main>
  );
}
