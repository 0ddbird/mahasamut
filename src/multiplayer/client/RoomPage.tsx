import { Link, useNavigate, useParams } from 'react-router';
import { useGameEndInBar, useLeaveGuard } from '../../site/leaveGuard';
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
  'not-found': 'This room does not exist.',
  started: 'This game has already started.',
  full: 'This room is full.',
  closed: 'This room was closed after 30 minutes without activity.',
};

interface RoomPageProps {
  socket?: RoomSocket;
  onReadyRoom?: (view: unknown, actions: unknown) => React.ReactNode;
}

/**
 * The page at `/room/:roomId`: validates the ID, connects to the room, and
 * shows the join form, the lobby, the current question, the round results, or
 * the final podium. While in an active room, `Leave` takes the place of the
 * games in the top bar.
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
  const navigate = useNavigate();
  const [session, actions] = useRoomSession(socket, roomId);

  const inActiveRoom = session.status === 'in-room' && session.view.phase.kind !== 'finished';

  useLeaveGuard(inActiveRoom);
  useGameEndInBar(
    inActiveRoom,
    () => {
      actions.leave();
      navigate('/');
    },
    'Leave',
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

  const { view } = session;
  if (view.phase.kind === 'lobby') {
    return <Lobby view={view} onStart={actions.start} />;
  }
  if (view.phase.kind === 'question') {
    return <QuestionScreen key={view.phase.index} view={view} onAnswer={actions.answer} />;
  }
  if (view.phase.kind === 'results') {
    return <ResultsScreen view={view} onNext={actions.next} />;
  }

  return <FinalScreen view={view} />;
}
