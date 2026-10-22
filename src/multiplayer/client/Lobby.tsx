import { ChevronLeft, ChevronRight, Crown, Layers, ListChecks, Timer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '../../site/analytics';
import { Button } from '../../components/Button/Button';
import { GAME, GAME_GOALS, GAME_IDS, GAME_NAMES, GAME_SAMPLES } from '../../games/shared/games';
import { NumberStepper } from '../../games/shared/NumberStepper';
import { SettingCard } from '../../games/shared/SettingCard';
import {
  ANSWER_MODE,
  isWholeIn,
  QUESTION_COUNT,
  SECONDS_PER_QUESTION,
} from '../../games/shared/settings';
import { ANSWER_MODE_OPTIONS } from '../../games/shared/settingsLabels';
import { cycleAvatar } from '../avatars';
import type { AvatarId } from '../avatars';
import type { RoomView } from '../protocol';
import type { LobbySettings } from '../settings';
import { Avatar } from './Avatar';
import styles from './Lobby.module.scss';

const ICON_SIZE = 18;
const COPIED_FEEDBACK_MS = 2000;

interface LobbyProps {
  view: RoomView;
  onStart: () => void;
  onChangeAvatar?: (avatar: AvatarId) => void;
  onUpdateSettings?: (settings: LobbySettings) => void;
}

/**
 * The waiting room before the game starts:
 * - On desktop/tablet: a two-column layout with the three Thai game tiles, the
 *   settings, and Start on the left; Invite friends, the Thai avatar picker,
 *   and the players list on the right.
 * - On mobile: Invite friends and avatar at the top, then Game and Settings,
 *   Start, and the players list at the very bottom so players joining or
 *   leaving never shift the settings controls.
 */
export function Lobby({ view, onStart, onChangeAvatar, onUpdateSettings }: LobbyProps) {
  const roomUrl = `${window.location.origin}/room/${view.roomId}`;
  const answerLabel =
    view.settings.answerMode === ANSWER_MODE.ToneOnly ? 'Tone only' : 'Full reasoning';

  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

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
    trackEvent({ type: 'lobby_link_copied' });
    setCopied(true);
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, COPIED_FEEDBACK_MS);
  };

  return (
    <main className={styles.page}>
      <h1 className={styles.pageTitle}>{GAME_NAMES[view.game]}</h1>
      <div className={styles.layout}>
        <div className={styles.inviteArea}>
          <section className={styles.share} aria-label="Invite friends">
            <h2 className={styles.heading}>Invite friends</h2>
            <p className={styles.lobbyCode}>
              Code: <strong className={styles.codeValue}>{view.roomId}</strong>
            </p>
            <div className={styles.copyWrap} data-copied={copied || undefined}>
              <Button onClick={copyLink}>{copied ? '✓ Link copied!' : 'Copy the link'}</Button>
            </div>
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
        </div>

        <div className={styles.mainArea}>
          <fieldset className={styles.gameSection} disabled={!view.you.isHost}>
            <legend className={styles.sectionTitle}>Game</legend>
            <div className={styles.gameTiles}>
              {GAME_IDS.map((id) => {
                const selected = view.game === id;
                return (
                  <label key={id} className={styles.gameTile} data-selected={selected || undefined}>
                    <input
                      type="radio"
                      name="game"
                      className={styles.gameRadio}
                      value={id}
                      checked={selected}
                      onChange={() => emitSettings({ game: id })}
                    />
                    <span lang="th" className={styles.gameSample}>
                      {GAME_SAMPLES[id]}
                    </span>
                    <span className={styles.gameName}>{GAME_NAMES[id]}</span>
                    <span className={styles.gameGoal}>{GAME_GOALS[id]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {view.you.isHost ? (
            <section className={styles.hostSettings} aria-label="Settings">
              <div className={styles.settingsGrid}>
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
              </div>
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

          <div className={styles.startArea}>
            {view.you.isHost ? (
              <Button disabled={!valid} onClick={onStart}>
                Start
              </Button>
            ) : view.host.connected ? (
              <p className={styles.waiting}>Waiting for the host to start…</p>
            ) : (
              <p className={styles.waiting}>The host is away.</p>
            )}
          </div>
        </div>

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
      </div>
    </main>
  );
}
