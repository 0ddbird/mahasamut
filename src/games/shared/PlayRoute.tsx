import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { trackEvent } from '../../site/analytics';
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
  const settings = settingsFromSearch(params);
  const timed = settings.secondsPerQuestion !== null;
  const containerRef = useRef<HTMLDivElement>(null);
  const paramsKey = params.toString();

  useEffect(() => {
    trackEvent({
      type: 'solo_game_started',
      game,
      timed,
    });
  }, [game, timed, paramsKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof MutationObserver === 'undefined') return;

    let hasFinished = false;

    const checkSummary = () => {
      const buttons = container.querySelectorAll('button');
      let foundPlayAgain = false;
      for (const btn of buttons) {
        if (btn.textContent === 'Play again') {
          foundPlayAgain = true;
          break;
        }
      }
      if (foundPlayAgain && !hasFinished) {
        hasFinished = true;
        trackEvent({ type: 'solo_game_finished', game, timed });
      } else if (!foundPlayAgain && hasFinished) {
        hasFinished = false;
        trackEvent({ type: 'solo_game_started', game, timed });
      }
    };

    const observer = new MutationObserver(checkSummary);
    observer.observe(container, { childList: true, subtree: true });
    checkSummary();

    return () => observer.disconnect();
  }, [game, timed]);

  return (
    <div ref={containerRef} style={{ display: 'contents' }}>
      {PAGES[game](settings, paramsKey)}
    </div>
  );
}
