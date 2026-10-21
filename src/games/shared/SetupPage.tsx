import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnswerRow } from '../../components/AnswerRow/AnswerRow';
import { Button } from '../../components/Button/Button';
import { GAME, GAME_NAMES, GAME_PATHS } from './games';
import type { GameId } from './games';
import { QUESTION_COUNT } from './settings';
import type { AnswerMode, GameSettings, SecondsPerQuestion } from './settings';
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

/** Whether `text` is a number of questions a series can have. */
const isValidCount = (text: string) => {
  const count = Number(text);
  return Number.isInteger(count) && count >= QUESTION_COUNT.min && count <= QUESTION_COUNT.max;
};

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
  // Kept as typed, so the field can be empty or wrong while the player edits it.
  const [countText, setCountText] = useState(
    String(initial.questionCount ?? QUESTION_COUNT.default),
  );
  const [time, setTime] = useState<TimeChoice>(
    initial.secondsPerQuestion === null ? 'free' : `${initial.secondsPerQuestion}`,
  );
  const [answerMode, setAnswerMode] = useState<AnswerMode>(initial.answerMode);
  const [learning, setLearning] = useState<LearningChoice>(initial.learningMode ? 'on' : 'off');

  const series = length === 'series';
  const countIsValid = !series || isValidCount(countText);
  const countErrorId = useId();

  const chooseLength = (value: LengthChoice) => {
    // A series always starts from the proposed number, not from one left behind.
    if (value === 'series' && length !== 'series') setCountText(String(QUESTION_COUNT.default));
    setLength(value);
  };

  const play = () => {
    if (!countIsValid) return;
    const settings: GameSettings = {
      questionCount: series ? Number(countText) : null,
      secondsPerQuestion: time === 'free' ? null : (Number(time) as SecondsPerQuestion),
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
          <label className={styles.count}>
            Number of questions
            <input
              type="number"
              min={QUESTION_COUNT.min}
              max={QUESTION_COUNT.max}
              value={countText}
              onChange={(event) => setCountText(event.target.value)}
              // Screen readers say why Play is disabled, from the field itself.
              aria-invalid={!countIsValid}
              aria-describedby={countIsValid ? undefined : countErrorId}
            />
          </label>
        )}
        {!countIsValid && (
          <p className={styles.error} id={countErrorId}>
            Choose {QUESTION_COUNT.min} to {QUESTION_COUNT.max} questions.
          </p>
        )}
        <AnswerRow
          title="Time per question"
          name="time"
          options={TIME_OPTIONS}
          selected={time}
          onSelect={setTime}
        />
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
      <Button disabled={!countIsValid} onClick={play}>
        Play
      </Button>
    </main>
  );
}
