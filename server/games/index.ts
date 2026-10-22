import { GAME } from '../../src/games/shared/games';
import type { GameId } from '../../src/games/shared/games';
import { consonantClassGame } from './consonantClass';
import { syllableGame } from './syllable';
import type { ServerGame } from './types';
import { vowelGame } from './vowel';

export const SERVER_GAMES: Record<GameId, ServerGame> = {
  [GAME.Vowel]: vowelGame,
  [GAME.ConsonantClass]: consonantClassGame,
  [GAME.Syllable]: syllableGame,
};
