import { Link } from 'react-router';
import { GameName } from '../games/shared/GameName';
import { GAME_IDS, GAME_PATHS } from '../games/shared/games';
import type { GameId } from '../games/shared/games';

/** What each game asks, after its name in the list. */
const GAME_GOALS: Record<GameId, string> = {
  syllable: 'find the tone of a syllable.',
  consonantClass: 'find the class of a consonant.',
};

/** The site home page: the games for learning to read Thai. */
export function HomePage() {
  return (
    <main>
      <h1>Scriptomancy - Thai</h1>
      <p>Games to learn to read the Thai script.</p>
      <ul>
        {GAME_IDS.map((game) => (
          <li key={game}>
            <Link to={GAME_PATHS[game]}>
              <GameName game={game} />
            </Link>
            : {GAME_GOALS[game]}
          </li>
        ))}
      </ul>
    </main>
  );
}
