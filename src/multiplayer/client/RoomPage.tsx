import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import {
  useAskToLeave,
  useGameActionInBar,
  useGameEndInBar,
  useLeaveGuard,
} from '../../site/leaveGuard';
import type { LeavePrompt } from '../../site/leaveGuard';
import { normalizeRoomId } from '../roomId';
import { FinalScreen } from './FinalScreen';
import { JoinForm } from './JoinForm';
import { Lobby } from './Lobby';
import { QuestionScreen } from './QuestionScreen';
import { ResultsScreen } from './ResultsScreen';
import styles from './RoomPage.module.scss';
import { getRoomSocket } from './socket';
import type { RoomSocket } from './socket';
import { useRoomSession } from './useRoomSession';

const UNAVAILABLE_MESSAGES: Record<'not-found' | 'started' | 'full' | 'closed', string> = {
  'not-found': 'This lobby does not exist.',
  started: 'This game has already started.',
  full: 'This lobby is full.',
  closed: 'This lobby was closed after 30 minutes without activity.',
};

const LOBBY_LEAVE_PROMPT: LeavePrompt = {
  title: 'Leave the lobby?',
  message: 'You can join again with the link until the game starts.',
};

const GAME_LEAVE_PROMPT: LeavePrompt = {
  title: 'Leave the game?',
  message: 'Your points stay in the ranking, and you can come back to the game from this tab.',
};

const HOST_LEAVE_PROMPT: LeavePrompt = {
  title: GAME_LEAVE_PROMPT.title,
  message: `${GAME_LEAVE_PROMPT.message} Another player will take over as host.`,
};

interface RoomPageProps {
  socket?: RoomSocket;
  onReadyRoom?: (view: unknown, actions: unknown) => React.ReactNode;
}

/**
 * The page at `/room/:roomId`: validates the ID, connects to the room, and
 * shows the join form, the lobby, the current question, the round results, or
 * the final podium. While in an active room, `Leave` takes the place of the
 * games in the top bar, and asks first; during the game, the host also has
 * `End the game` there, which sends everyone to the podium.
 */
export function RoomPage({ socket = getRoomSocket() }: RoomPageProps) {
  const { roomId: rawId } = useParams<{ roomId: string }>();
  const roomId = normalizeRoomId(rawId);

  if (roomId === null) {
    return (
      <main className={styles.page}>
        <p>{UNAVAILABLE_MESSAGES['not-found']}</p>
        <Link to="/" className={styles.homeLink}>
          Back to the home page
        </Link>
      </main>
    );
  }

  return <ConnectedRoomPage roomId={roomId} socket={socket} />;
}

function ConnectedRoomPage({ roomId, socket }: { roomId: string; socket: RoomSocket }) {
  const [session, actions] = useRoomSession(socket, roomId);
  const askToLeave = useAskToLeave();

  const view = session.status === 'in-room' ? session.view : null;
  const phaseKind = view?.phase.kind ?? null;
  const inActiveRoom = phaseKind !== null && phaseKind !== 'finished';
  const inGame = phaseKind === 'question' || phaseKind === 'results';
  const isHost = view?.you.isHost ?? false;

  // A player who becomes host during the game is told so until it ends. Not
  // a host back from a reload: before the first view, the role is unknown (null).
  const [lastIsHost, setLastIsHost] = useState<boolean | null>(null);
  const [promoted, setPromoted] = useState(false);
  const knownIsHost = view === null ? null : isHost;
  if (knownIsHost !== lastIsHost) {
    setLastIsHost(knownIsHost);
    setPromoted(knownIsHost === true && lastIsHost === false && inGame);
  }
  if (promoted && !inGame) {
    setPromoted(false);
  }

  useLeaveGuard(
    inActiveRoom,
    !inGame ? LOBBY_LEAVE_PROMPT : isHost ? HOST_LEAVE_PROMPT : GAME_LEAVE_PROMPT,
  );
  // Leaving the page leaves the room (useRoomSession): Leave goes home, once confirmed.
  useGameEndInBar(
    inActiveRoom,
    () =>
      askToLeave(
        '/',
        document.activeElement instanceof HTMLElement ? document.activeElement : null,
      ),
    'Leave',
  );

  const [ending, setEnding] = useState(false);
  if (ending && !(inGame && isHost)) {
    setEnding(false);
  }
  const focusOnStay = useRef<HTMLElement | null>(null);
  useGameActionInBar(
    inGame && isHost,
    () => {
      focusOnStay.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setEnding(true);
    },
    'End the game',
  );
  const endDialog = ending && (
    <ConfirmDialog
      title="End the game for everyone?"
      message={
        phaseKind === 'question'
          ? 'Everyone goes to the podium now. The question in progress will not count.'
          : 'Everyone goes to the podium now.'
      }
      confirmLabel="End the game"
      cancelLabel="Keep playing"
      onConfirm={() => {
        setEnding(false);
        actions.end();
      }}
      onCancel={() => {
        setEnding(false);
        focusOnStay.current?.focus();
      }}
    />
  );

  if (session.status === 'connecting') {
    return (
      <main className={styles.page}>
        <p>Connecting…</p>
      </main>
    );
  }

  if (session.status === 'unavailable') {
    return (
      <main className={styles.page}>
        <p>{UNAVAILABLE_MESSAGES[session.reason]}</p>
        <Link to="/" className={styles.homeLink}>
          Back to the home page
        </Link>
      </main>
    );
  }

  if (session.status === 'joining') {
    return <JoinForm game={session.game} hasPassword={session.hasPassword} onJoin={actions.join} />;
  }

  if (session.view.phase.kind === 'lobby') {
    return (
      <Lobby
        view={session.view}
        onStart={actions.start}
        onChangeAvatar={actions.setAvatar}
        onUpdateSettings={actions.updateSettings}
      />
    );
  }
  if (session.view.phase.kind === 'question') {
    return (
      <>
        <QuestionScreen
          key={session.view.phase.index}
          view={session.view}
          onAnswer={actions.answer}
          onDraft={actions.draft}
          promoted={promoted}
        />
        {endDialog}
      </>
    );
  }
  if (session.view.phase.kind === 'results') {
    return (
      <>
        <ResultsScreen view={session.view} onNext={actions.next} promoted={promoted} />
        {endDialog}
      </>
    );
  }

  return <FinalScreen view={session.view} onReturnToLobby={actions.returnToLobby} />;
}
