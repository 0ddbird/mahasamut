import { GraduationCap, KeyRound, Layers, ListChecks, Timer, Users } from 'lucide-react';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button/Button';
import { getRoomSocket } from '../../multiplayer/client/socket';
import type { RoomSocket } from '../../multiplayer/client/socket';
import { saveToken } from '../../multiplayer/client/tokens';
import type { CreateRoomError } from '../../multiplayer/protocol';
import { PSEUDO_MAX_LENGTH } from '../../multiplayer/pseudo';
import { PASSWORD_MAX_LENGTH } from '../../multiplayer/settings';
import { GAME, GAME_NAMES, GAME_PATHS } from './games';
import type { GameId } from './games';
import { isWholeIn, PLAY_MODE, QUESTION_COUNT, SECONDS_PER_QUESTION } from './settings';
import type { AnswerMode, GameSettings, PlayMode } from './settings';
import {
  ANSWER_MODE_OPTIONS,
  LEARNING_MODE_OPTIONS,
  LENGTH_OPTIONS,
  PLAY_MODE_OPTIONS,
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

const CREATE_ERROR_MESSAGES: Record<CreateRoomError, string> = {
  'invalid-pseudo': 'Choose a nickname of 1 to 20 characters.',
  'server-full': 'The server is full, try again in a few minutes.',
  'invalid-settings': 'These settings are not valid.',
};

/**
 * The settings of a game, chosen before it starts, a card each: whether the
 * player plays alone or creates a room, its length, its time, in the syllable
 * game the answer asked, and in solo the learning mode.
 */
export function SetupPage({
  game,
  socket = getRoomSocket(),
}: {
  game: GameId;
  socket?: RoomSocket;
}) {
  const navigate = useNavigate();
  const nicknameId = useId();
  const passwordId = useId();
  const [initial] = useState(() => loadSettings(game));

  const [playMode, setPlayMode] = useState<PlayMode>(PLAY_MODE.Solo);
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
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [createError, setCreateError] = useState<CreateRoomError | null>(null);

  const inRoom = playMode === PLAY_MODE.Multi;
  const series = inRoom || length === 'series';
  const timed = inRoom || time === 'timed';
  const valid =
    (!series || isWholeIn(Number(countText), QUESTION_COUNT)) &&
    (!timed || isWholeIn(Number(secondsText), SECONDS_PER_QUESTION));

  const choosePlayMode = (value: PlayMode) => {
    if (value === PLAY_MODE.Multi && !inRoom) {
      if (length !== 'series') setCountText(String(QUESTION_COUNT.default));
      if (time !== 'timed') setSecondsText(String(SECONDS_PER_QUESTION.default));
    }
    setCreateError(null);
    setPlayMode(value);
  };

  // A series or a timed game always starts from the proposed number, not from
  // one left behind.
  const chooseLength = (value: LengthChoice) => {
    if (value === 'series' && length !== 'series') setCountText(String(QUESTION_COUNT.default));
    setLength(value);
  };
  const chooseTime = (value: TimeChoice) => {
    if (value === 'timed' && time !== 'timed') setSecondsText(String(SECONDS_PER_QUESTION.default));
    setTime(value);
  };

  const play = () => {
    if (!valid) return;
    if (inRoom) {
      setCreateError(null);
      if (!socket.connected) socket.connect();
      socket.emit(
        'room:create',
        {
          settings: {
            game,
            secondsPerQuestion: Number(secondsText),
            questionCount: Number(countText),
            answerMode,
            password,
          },
          pseudo,
        },
        (res) => {
          if (res.ok) {
            saveToken(res.roomId, res.token);
            navigate(`/room/${res.roomId}`);
          } else {
            setCreateError(res.error);
          }
        },
      );
      return;
    }

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

  const countStepper = (
    <NumberStepper
      label="Number of questions"
      unit="questions"
      fewerLabel="Fewer questions"
      moreLabel="More questions"
      range={QUESTION_COUNT}
      text={countText}
      onChange={setCountText}
    />
  );

  const secondsStepper = (
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
  );

  return (
    <main className={styles.page}>
      <h1>{GAME_NAMES[game]}</h1>
      <div className={styles.settings}>
        <SettingCard
          title="Players"
          icon={<Users size={ICON_SIZE} />}
          name="playMode"
          options={PLAY_MODE_OPTIONS}
          selected={playMode}
          onSelect={choosePlayMode}
        />
        {inRoom ? (
          <fieldset className={styles.card}>
            <legend className={styles.cardTitle}>
              <span className={styles.icon} aria-hidden="true">
                <Layers size={ICON_SIZE} />
              </span>
              Length
            </legend>
            {countStepper}
          </fieldset>
        ) : (
          <SettingCard
            title="Length"
            icon={<Layers size={ICON_SIZE} />}
            name="length"
            options={LENGTH_OPTIONS}
            selected={length}
            onSelect={chooseLength}
          >
            {series && countStepper}
          </SettingCard>
        )}
        {inRoom ? (
          <fieldset className={styles.card}>
            <legend className={styles.cardTitle}>
              <span className={styles.icon} aria-hidden="true">
                <Timer size={ICON_SIZE} />
              </span>
              Time
            </legend>
            {secondsStepper}
          </fieldset>
        ) : (
          <SettingCard
            title="Time"
            icon={<Timer size={ICON_SIZE} />}
            name="time"
            options={TIME_OPTIONS}
            selected={time}
            onSelect={chooseTime}
          >
            {timed && secondsStepper}
          </SettingCard>
        )}
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
        {!inRoom && (
          <SettingCard
            title="Learning mode"
            icon={<GraduationCap size={ICON_SIZE} />}
            name="learningMode"
            hint="Turned on, cheat sheets with the rules can be opened at any time during the game."
            options={LEARNING_MODE_OPTIONS}
            selected={learning}
            onSelect={setLearning}
          />
        )}
        {inRoom && (
          <fieldset className={styles.card}>
            <legend className={styles.cardTitle}>
              <span className={styles.icon} aria-hidden="true">
                <KeyRound size={ICON_SIZE} />
              </span>
              Lobby
            </legend>
            <div className={styles.field}>
              <label htmlFor={nicknameId} className={styles.fieldLabel}>
                Your nickname
              </label>
              <input
                id={nicknameId}
                type="text"
                className={styles.textInput}
                maxLength={PSEUDO_MAX_LENGTH}
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={passwordId} className={styles.fieldLabel}>
                Password (optional)
              </label>
              <input
                id={passwordId}
                type="password"
                className={styles.textInput}
                maxLength={PASSWORD_MAX_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </fieldset>
        )}
      </div>
      {createError !== null && (
        <p role="alert" className={styles.error}>
          {CREATE_ERROR_MESSAGES[createError]}
        </p>
      )}
      <Button disabled={!valid} onClick={play}>
        {inRoom ? 'Create lobby' : 'Play'}
      </Button>
    </main>
  );
}
