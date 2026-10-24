import { useEffect, useRef, useState } from 'react';
import { playSound } from '../../audio/playSound';
import type { PlaySound } from '../../audio/playSound';
import { Button } from '../../components/Button/Button';
import { Countdown } from '../../components/Countdown/Countdown';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { GAME_NAMES } from '../../games/shared/games';
import { QuestionNumber } from '../../games/shared/QuestionBar';
import type { AnswerMode } from '../../games/shared/settings';
import { isComplete } from '../../games/syllable/check';
import type { PlayerAnswers } from '../../games/syllable/check';
import { TONE_MARK } from '../../thai/types';
import type { ConsonantClass } from '../../thai/types';
import type { ActionError, GameAnswer, QuestionView, RoomView } from '../protocol';
import { ConsonantClassPanel } from './panels/ConsonantClassPanel';
import { SyllablePanel } from './panels/SyllablePanel';
import { VowelPanel } from './panels/VowelPanel';
import { PlayersPanel } from './PlayersPanel';
import styles from './QuestionScreen.module.scss';

const TICK_MS = 250;

/** The answer as the player has filled it in, or null while it is not complete. */
function filledAnswer(
  game: QuestionView['game'] | null,
  syllableAnswers: PlayerAnswers,
  chosenClass: ConsonantClass | undefined,
  chosenSound: string | undefined,
  answerMode: AnswerMode,
): GameAnswer | null {
  if (game === 'syllable') {
    return isComplete(syllableAnswers, answerMode)
      ? { game: 'syllable', answers: syllableAnswers }
      : null;
  }
  if (game === 'consonantClass') {
    return chosenClass === undefined
      ? null
      : { game: 'consonantClass', consonantClass: chosenClass };
  }
  if (game === 'vowel') {
    return chosenSound === undefined ? null : { game: 'vowel', sound: chosenSound };
  }
  return null;
}

interface QuestionScreenProps {
  view: RoomView;
  onAnswer: (answer: GameAnswer) => Promise<ActionError | null>;
  /**
   * Told of the answer filled in but not sent, each time it changes: null
   * while it is not complete. The server counts it if the time runs out.
   */
  onDraft?: (answer: GameAnswer | null) => void;
  /** The player became host during the game. */
  promoted?: boolean;
  play?: PlaySound;
}

/**
 * The screen of an open question in a multiplayer room: shows where the
 * series is and the shared countdown, the Thai text, the game's answer panel, and
 * locks the player's answer once sent; beside it, the players and who has
 * answered. An answer complete but not sent when the time runs out still
 * counts: the server is told of it as it is filled in.
 */
export function QuestionScreen({
  view,
  onAnswer,
  onDraft,
  promoted = false,
  play = playSound,
}: QuestionScreenProps) {
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

  const filled = filledAnswer(
    phase.kind === 'question' ? phase.question.game : null,
    syllableAnswers,
    chosenClass,
    chosenSound,
    view.settings.answerMode,
  );
  const sentAnswer = phase.kind === 'question' ? phase.yourAnswer : null;
  const locked = sentLocally || sentAnswer !== null;

  // Sent when the question opens (nothing filled in yet), then on each change
  // until the answer is sent: what the server holds is what the player sees.
  const latestOnDraft = useRef(onDraft);
  useEffect(() => {
    latestOnDraft.current = onDraft;
  });
  const filledKey = JSON.stringify(filled);
  useEffect(() => {
    if (locked) return;
    latestOnDraft.current?.(JSON.parse(filledKey) as GameAnswer | null);
  }, [filledKey, locked]);

  if (phase.kind !== 'question') return null;

  const effectiveSyllableAnswers =
    sentAnswer?.game === 'syllable' ? sentAnswer.answers : syllableAnswers;
  const effectiveClass =
    sentAnswer?.game === 'consonantClass' ? sentAnswer.consonantClass : chosenClass;
  const effectiveSound = sentAnswer?.game === 'vowel' ? sentAnswer.sound : chosenSound;

  const validate = async () => {
    if (filled === null || locked) return;
    setSentLocally(true);
    const err = await onAnswer(filled);
    if (err === 'too-late') {
      setTooLate(true);
    } else if (err !== null) {
      setSentLocally(false);
    }
  };

  return (
    <main className={styles.page}>
      <h1 className="visually-hidden">{GAME_NAMES[view.game]}</h1>
      <div className={styles.number}>
        <QuestionNumber
          questionNumber={phase.index + 1}
          questionCount={view.settings.questionCount}
        />
      </div>
      <div className={styles.clock}>
        <Countdown remainingMs={leftMs} totalMs={view.settings.secondsPerQuestion * 1000} />
      </div>
      <div className={styles.game}>
        {promoted && (
          <p role="status" className={styles.promoted}>
            You are now the host.
          </p>
        )}
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
            <ConsonantClassPanel
              chosen={effectiveClass}
              onChange={setChosenClass}
              locked={locked}
            />
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
          <p className={styles.status}>Answer sent.</p>
        ) : (
          <Button disabled={filled === null} onClick={() => void validate()}>
            Validate
          </Button>
        )}
      </div>
      <div className={styles.side}>
        <PlayersPanel players={view.players} answered={phase.answered} you={view.you.pseudo} />
      </div>
    </main>
  );
}
