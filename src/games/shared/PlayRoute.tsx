import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { ConsonantClassPage } from '../consonantClass/ConsonantClassPage';
import { SyllablePage } from '../syllable/SyllablePage';
import { VowelPage } from '../vowel/VowelPage';
import { GAME } from './games';
import type { GameId } from './games';
import type { GameSettings } from './settings';
import { settingsFromSearch } from './settingsUrl';

/** The page of each game, given its settings and the key that restarts it. */
const PAGES: Record<GameId, (settings: GameSettings, key: string) => ReactElement> = {
  [GAME.ConsonantClass]: (settings, key) => <ConsonantClassPage key={key} settings={settings} />,
  [GAME.Vowel]: (settings, key) => <VowelPage key={key} settings={settings} />,
  [GAME.Syllable]: (settings, key) => <SyllablePage key={key} settings={settings} />,
};

/**
 * A game played with the settings of its URL (`/syllable/play?count=10`). A
 * change of settings in the URL starts a new game: the page is keyed on them.
 */
export function PlayRoute({ game }: { game: GameId }) {
  const [params] = useSearchParams();
  return PAGES[game](settingsFromSearch(params), params.toString());
}
