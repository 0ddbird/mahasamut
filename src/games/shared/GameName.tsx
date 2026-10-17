import { GAME_NAMES, GAME_THAI_NAMES } from './games';
import type { GameId } from './games';

/** The name of a game, followed by the Thai name it comes from, marked as Thai. */
export function GameName({ game }: { game: GameId }) {
  return (
    <>
      {GAME_NAMES[game]} <span lang="th">{GAME_THAI_NAMES[game]}</span>
    </>
  );
}
