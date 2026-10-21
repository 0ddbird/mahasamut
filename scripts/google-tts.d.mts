/** The voice the trials chose. */
export const DEFAULT_VOICE: string;

/** The API key, from the environment or from .env.local; undefined if there is none. */
export function apiKey(): Promise<string | undefined>;

/**
 * The MP3 of `text` said by `voice`.
 * @throws an Error with a numeric `status` property when the response is not OK.
 */
export function synthesize(text: string, key: string, voice?: string): Promise<Buffer>;
