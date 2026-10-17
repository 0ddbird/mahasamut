/**
 * The settings of a game in its URL (`/syllable/play?count=10&time=15`), so
 * that reloading the page starts a new game with the same settings. A setting
 * left at its default is not written, so the default game has a plain URL.
 */
import { DEFAULT_SETTINGS, parseGameSettings } from './settings';
import type { GameSettings } from './settings';

/** The query string of `settings`, without the leading `?`; empty for the defaults. */
export function settingsToSearch(settings: GameSettings): string {
  const params = new URLSearchParams();
  if (settings.questionCount !== DEFAULT_SETTINGS.questionCount) {
    params.set('count', String(settings.questionCount));
  }
  if (settings.secondsPerQuestion !== DEFAULT_SETTINGS.secondsPerQuestion) {
    params.set('time', String(settings.secondsPerQuestion));
  }
  if (settings.answerMode !== DEFAULT_SETTINGS.answerMode) {
    params.set('answer', settings.answerMode);
  }
  return params.toString();
}

/** The settings of a URL; a missing or wrong parameter gives the default of its setting. */
export function settingsFromSearch(params: URLSearchParams): GameSettings {
  const numberParam = (name: string) => {
    const value = params.get(name);
    return value === null ? undefined : Number(value);
  };
  return parseGameSettings({
    questionCount: numberParam('count'),
    secondsPerQuestion: numberParam('time'),
    answerMode: params.get('answer') ?? undefined,
  });
}
