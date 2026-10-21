import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnswerRow } from '../../components/AnswerRow/AnswerRow';
import { Button } from '../../components/Button/Button';
import { GAME, GAME_NAMES, GAME_PATHS } from './games';
import type { GameId } from './games';
import { isWholeIn, QUESTION_COUNT, SECONDS_PER_QUESTION } from './settings';
import type { AnswerMode, GameSettings } from './settings';
import {
  ANSWER_MODE_OPTIONS,
  LEARNING_MODE_OPTIONS,
  LENGTH_OPTIONS,
  TIME_OPTIONS,
} from './settingsLabels';
import type { LearningChoice, LengthChoice, TimeChoice } from './settingsLabels';
import { loadSettings, saveSettings } from './settingsStorage';
import { settingsToSearch } from './settingsUrl';
import styles from './SetupPage.module.scss';

interface WholeNumberFieldProps {
  label: string;
  range: { min: number; max: number };
  /** What the error says the player can choose, after the range: "questions". */
  unit: string;
  /** Kept as typed, so the field can be empty or wrong while the player edits it. */
  text: string;
  onChange: (text: string) => void;
}

/** A whole number within `range`, with the error that says why Play is disabled. */
function WholeNumberField({ label, range, unit, text, onChange }: WholeNumberFieldProps) {
  const valid = isWholeIn(Number(text), range);
  const errorId = useId();
  return (
    <>
      <label className={styles.count}>
        {label}
        <input
          type="number"
          min={range.min}
          max={range.max}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          // Screen readers say why Play is disabled, from the field itself.
          aria-invalid={!valid}
          aria-describedby={valid ? undefined : errorId}
        />
      </label>
      {!valid && (
        <p className={styles.error} id={errorId}>
          Choose {range.min} to {range.max} {unit}.
        </p>
      )}
    </>
  );
}

/**
 * The settings of a game, chosen before it starts: its length, its time and,
 * in the syllable game, the answer asked. The page opens on the settings the
 * player last played with, so a regular player only has to click Play; they are
 * remembered again when Play starts the game.
 */
export function SetupPage({ game }: { game: GameId }) {
  const navigate = useNavigate();
  const [initial] = useState(() => loadSettings(game));

  const [length, setLength] = useState<LengthChoice>(
    initial.questionCount === null ? 'endless' : 'series',
  );
  const [countText, setCountText] = useState(
    String(initial.questionCount ?? QUESTION_COUNT.default),
  );
  const [time, setTime] = useState<TimeChoice>(
    initial.secondsPerQuestion === null ? 'free' : 'timed',
  );
  const [secondsText, setSecondsText] = useState(
    String(initial.secondsPerQuestion ?? SECONDS_PER_QUESTION.default),
  );
  const [answerMode, setAnswerMode] = useState<AnswerMode>(initial.answerMode);
  const [learning, setLearning] = useState<LearningChoice>(initial.learningMode ? 'on' : 'off');

  const series = length === 'series';
  const timed = time === 'timed';
  const valid =
    (!series || isWholeIn(Number(countText), QUESTION_COUNT)) &&
    (!timed || isWholeIn(Number(secondsText), SECONDS_PER_QUESTION));

  // A series or a timed game always starts from the proposed number, not from
  // one left behind.
  const chooseLength = (value: LengthChoice) => {
    if (value === 'series' && !series) setCountText(String(QUESTION_COUNT.default));
    setLength(value);
  };
  const chooseTime = (value: TimeChoice) => {
    if (value === 'timed' && !timed) setSecondsText(String(SECONDS_PER_QUESTION.default));
    setTime(value);
  };

  const play = () => {
    if (!valid) return;
    const settings: GameSettings = {
      questionCount: series ? Number(countText) : null,
      secondsPerQuestion: timed ? Number(secondsText) : null,
      answerMode,
      learningMode: learning === 'on',
    };
    saveSettings(game, settings);
    const search = settingsToSearch(settings);
    navigate(`${GAME_PATHS[game]}/play${search === '' ? '' : `?${search}`}`);
  };

  return (
    <main className={styles.page}>
      <h1>{GAME_NAMES[game]}</h1>
      <div className={styles.settings}>
        <AnswerRow
          title="Length"
          name="length"
          options={LENGTH_OPTIONS}
          selected={length}
          onSelect={chooseLength}
        />
        {series && (
          <WholeNumberField
            label="Number of questions"
            range={QUESTION_COUNT}
            unit="questions"
            text={countText}
            onChange={setCountText}
          />
        )}
        <AnswerRow
          title="Time per question"
          name="time"
          options={TIME_OPTIONS}
          selected={time}
          onSelect={chooseTime}
        />
        {timed && (
          <WholeNumberField
            label="Seconds per question"
            range={SECONDS_PER_QUESTION}
            unit="seconds"
            text={secondsText}
            onChange={setSecondsText}
          />
        )}
        {game === GAME.Syllable && (
          <AnswerRow
            title="Answer"
            name="answerMode"
            options={ANSWER_MODE_OPTIONS}
            selected={answerMode}
            onSelect={setAnswerMode}
          />
        )}
        <AnswerRow
          title="Learning mode"
          name="learningMode"
          options={LEARNING_MODE_OPTIONS}
          selected={learning}
          onSelect={setLearning}
          note="Help panels to open during the game"
        />
      </div>
      <Button disabled={!valid} onClick={play}>
        Play
      </Button>
    </main>
  );
}
