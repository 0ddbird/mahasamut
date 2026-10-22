import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Gamepad2,
  Layers,
  ListChecks,
  Timer,
} from 'lucide-react';
import { useState } from 'react';
import type { Option } from '../../components/AnswerRow/option';
import { Button } from '../../components/Button/Button';
import { GAME, GAME_IDS, GAME_NAMES } from '../../games/shared/games';
import type { GameId } from '../../games/shared/games';
import { NumberStepper } from '../../games/shared/NumberStepper';
import { SettingCard } from '../../games/shared/SettingCard';
import {
  ANSWER_MODE,
  isWholeIn,
  QUESTION_COUNT,
  SECONDS_PER_QUESTION,
} from '../../games/shared/settings';
import { ANSWER_MODE_OPTIONS } from '../../games/shared/settingsLabels';
import { AVATAR_LABELS, cycleAvatar } from '../avatars';
import type { AvatarId } from '../avatars';
import type { RoomView } from '../protocol';
import type { LobbySettings } from '../settings';
import { Avatar } from './Avatar';
import styles from './Lobby.module.scss';

const ICON_SIZE = 18;

const GAME_OPTIONS: readonly Option<GameId>[] = GAME_IDS.map((id) => ({
  value: id,
  label: GAME_NAMES[id],
}));

interface LobbyProps {
  view: RoomView;
  onStart: () => void;
  onChangeAvatar?: (avatar: AvatarId) => void;
  onUpdateSettings?: (settings: LobbySettings) => void;
}

/**
 * The waiting room before the game starts: shows the lobby ID and link to
 * share, lets the host edit the game and settings live while other players see
 * a compact read-only summary, provides a Thai avatar picker, and lists the
 * players with a crown for the host.
 */
export function Lobby({ view, onStart, onChangeAvatar, onUpdateSettings }: LobbyProps) {
  const roomUrl = `${window.location.origin}/room/${view.roomId}`;
  const answerLabel =
    view.settings.answerMode === ANSWER_MODE.ToneOnly ? 'Tone only' : 'Full reasoning';

  const [countText, setCountText] = useState(String(view.settings.questionCount));
  const [lastCount, setLastCount] = useState(view.settings.questionCount);
  if (view.settings.questionCount !== lastCount) {
    setLastCount(view.settings.questionCount);
    setCountText(String(view.settings.questionCount));
  }

  const [secondsText, setSecondsText] = useState(String(view.settings.secondsPerQuestion));
  const [lastSeconds, setLastSeconds] = useState(view.settings.secondsPerQuestion);
  if (view.settings.secondsPerQuestion !== lastSeconds) {
    setLastSeconds(view.settings.secondsPerQuestion);
    setSecondsText(String(view.settings.secondsPerQuestion));
  }

  const valid =
    isWholeIn(Number(countText), QUESTION_COUNT) &&
    isWholeIn(Number(secondsText), SECONDS_PER_QUESTION);

  const emitSettings = (patch: Partial<LobbySettings>) => {
    onUpdateSettings?.({
      game: view.game,
      questionCount: view.settings.questionCount,
      secondsPerQuestion: view.settings.secondsPerQuestion,
      answerMode: view.settings.answerMode,
      ...patch,
    });
  };

  const changeCount = (text: string) => {
    setCountText(text);
    const num = Number(text);
    if (isWholeIn(num, QUESTION_COUNT)) {
      emitSettings({ questionCount: num });
    }
  };

  const changeSeconds = (text: string) => {
    setSecondsText(text);
    const num = Number(text);
    if (isWholeIn(num, SECONDS_PER_QUESTION)) {
      emitSettings({ secondsPerQuestion: num });
    }
  };

  const copyLink = () => {
    try {
      void navigator.clipboard?.writeText(roomUrl);
    } catch {
      // Ignore clipboard errors.
    }
  };

  return (
    <main className={styles.page}>
      <h1>{GAME_NAMES[view.game]}</h1>
      <section className={styles.share} aria-label="Lobby link">
        <p className={styles.roomId}>{`Lobby ${view.roomId}`}</p>
        <p className={styles.url}>{roomUrl}</p>
        <Button onClick={copyLink}>Copy the link</Button>
      </section>
      <section className={styles.avatarCard} aria-label="Your avatar">
        <h2 className={styles.heading}>Your avatar</h2>
        <div className={styles.avatarPicker}>
          <button
            type="button"
            className={styles.cycleButton}
            aria-label="Previous avatar"
            onClick={() => onChangeAvatar?.(cycleAvatar(view.you.avatar, -1))}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <div className={styles.avatarPreview}>
            <Avatar avatar={view.you.avatar} size="large" />
            <span className={styles.avatarName}>{AVATAR_LABELS[view.you.avatar]}</span>
          </div>
          <button
            type="button"
            className={styles.cycleButton}
            aria-label="Next avatar"
            onClick={() => onChangeAvatar?.(cycleAvatar(view.you.avatar, 1))}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </section>
      <section className={styles.playersSection} aria-label="Players">
        <h2 className={styles.heading}>{`Players (${view.players.length})`}</h2>
        <ul className={styles.players}>
          {view.players.map((player) => (
            <li key={player.pseudo} className={styles.player}>
              <Avatar avatar={player.avatar} size="small" />
              <span className={styles.playerName}>{player.pseudo}</span>
              {player.isHost && (
                <Crown size={16} className={styles.hostIcon} role="img" aria-label="Host" />
              )}
              {!player.connected && <span className={styles.away}>(away)</span>}
            </li>
          ))}
        </ul>
      </section>
      {view.you.isHost ? (
        <section className={styles.hostSettings} aria-label="Settings">
          <SettingCard
            title="Game"
            icon={<Gamepad2 size={ICON_SIZE} />}
            name="game"
            options={GAME_OPTIONS}
            selected={view.game}
            onSelect={(game) => emitSettings({ game })}
          />
          <fieldset className={styles.settingCard}>
            <legend className={styles.cardTitle}>
              <span className={styles.settingIcon} aria-hidden="true">
                <Layers size={ICON_SIZE} />
              </span>
              Length
            </legend>
            <NumberStepper
              label="Number of questions"
              unit="questions"
              fewerLabel="Fewer questions"
              moreLabel="More questions"
              range={QUESTION_COUNT}
              text={countText}
              onChange={changeCount}
            />
          </fieldset>
          <fieldset className={styles.settingCard}>
            <legend className={styles.cardTitle}>
              <span className={styles.settingIcon} aria-hidden="true">
                <Timer size={ICON_SIZE} />
              </span>
              Time
            </legend>
            <NumberStepper
              label="Seconds per question"
              unit="seconds"
              after="seconds per question"
              fewerLabel="Fewer seconds"
              moreLabel="More seconds"
              range={SECONDS_PER_QUESTION}
              text={secondsText}
              onChange={changeSeconds}
            />
          </fieldset>
          {view.game === GAME.Syllable && (
            <SettingCard
              title="Answer"
              icon={<ListChecks size={ICON_SIZE} />}
              name="answerMode"
              options={ANSWER_MODE_OPTIONS}
              selected={view.settings.answerMode}
              onSelect={(answerMode) => emitSettings({ answerMode })}
            />
          )}
        </section>
      ) : (
        <section className={styles.settingsCard} aria-label="Settings">
          <span className={styles.settingItem}>
            <Layers size={16} className={styles.settingIcon} aria-hidden="true" />
            {`${view.settings.questionCount} questions`}
          </span>
          <span className={styles.settingItem}>
            <Timer size={16} className={styles.settingIcon} aria-hidden="true" />
            {`${view.settings.secondsPerQuestion} s per question`}
          </span>
          {view.game === GAME.Syllable && (
            <span className={styles.settingItem}>
              <ListChecks size={16} className={styles.settingIcon} aria-hidden="true" />
              {answerLabel}
            </span>
          )}
        </section>
      )}
      {view.you.isHost ? (
        <Button disabled={!valid} onClick={onStart}>
          Start
        </Button>
      ) : view.host.connected ? (
        <p className={styles.waiting}>Waiting for the host to start…</p>
      ) : (
        <p className={styles.waiting}>The host is away.</p>
      )}
    </main>
  );
}
