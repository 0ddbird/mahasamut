import { useSearchParams } from 'react-router';
import { ConsonantClassPage } from '../consonantClass/ConsonantClassPage';
import { SyllablePage } from '../syllable/SyllablePage';
import { GAME } from './games';
import type { GameId } from './games';
import { settingsFromSearch } from './settingsUrl';

/**
 * A game played with the settings of its URL (`/syllable/play?count=10`). A
 * change of settings in the URL starts a new game: the page is keyed on them.
 */
export function PlayRoute({ game }: { game: GameId }) {
  const [params] = useSearchParams();
  const settings = settingsFromSearch(params);
  const key = params.toString();

  return game === GAME.Syllable ? (
    <SyllablePage key={key} settings={settings} />
  ) : (
    <ConsonantClassPage key={key} settings={settings} />
  );
}
