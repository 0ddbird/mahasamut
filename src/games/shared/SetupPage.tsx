import { GraduationCap, Layers, ListChecks, Timer } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
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
import { NumberStepper } from './NumberStepper';
import { SettingCard } from './SettingCard';
import styles from './SetupPage.module.scss';

/** The icons of the cards, decorative. */
const ICON_SIZE = 20;

/**
 * The settings of a game, chosen before it starts, a card each: its length, its
 * time, in the syllable game the answer asked, and the learning mode. The
 * number a series or a timed game needs shows under its choice, with − and +.
 * The page opens on the settings the
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
        <SettingCard
          title="Length"
          icon={<Layers size={ICON_SIZE} />}
          name="length"
          options={LENGTH_OPTIONS}
          selected={length}
          onSelect={chooseLength}
        >
          {series && (
            <NumberStepper
              label="Number of questions"
              unit="questions"
              fewerLabel="Fewer questions"
              moreLabel="More questions"
              range={QUESTION_COUNT}
              text={countText}
              onChange={setCountText}
            />
          )}
        </SettingCard>
        <SettingCard
          title="Time"
          icon={<Timer size={ICON_SIZE} />}
          name="time"
          options={TIME_OPTIONS}
          selected={time}
          onSelect={chooseTime}
        >
          {timed && (
            <NumberStepper
              label="Seconds per question"
              unit="seconds"
              after="seconds per question"
              fewerLabel="Fewer seconds"
              moreLabel="More seconds"
              range={SECONDS_PER_QUESTION}
              text={secondsText}
              onChange={setSecondsText}
            />
          )}
        </SettingCard>
        {game === GAME.Syllable && (
          <SettingCard
            title="Answer"
            icon={<ListChecks size={ICON_SIZE} />}
            name="answerMode"
            options={ANSWER_MODE_OPTIONS}
            selected={answerMode}
            onSelect={setAnswerMode}
          />
        )}
        <SettingCard
          title="Learning mode"
          icon={<GraduationCap size={ICON_SIZE} />}
          name="learningMode"
          hint="Turned on, cheat sheets with the rules can be opened at any time during the game."
          options={LEARNING_MODE_OPTIONS}
          selected={learning}
          onSelect={setLearning}
        />
      </div>
      <Button disabled={!valid} onClick={play}>
        Play
      </Button>
    </main>
  );
}
