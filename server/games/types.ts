/**
 * What the room server asks of each game: drawing a series of questions,
 * parsing an untrusted answer from a client, and checking whether it is right.
 */
import type { GameAnswer, QuestionView, Reveal } from '../../src/multiplayer/protocol';
import type { RoomSettings } from '../../src/multiplayer/settings';
import type { Rng } from '../../src/thai/generator';

export interface ServerQuestion {
  view: QuestionView;
  reveal: Reveal;
  isCorrect(answer: GameAnswer): boolean;
}

export interface ServerGame {
  drawQuestions(settings: RoomSettings, rng: Rng): ServerQuestion[];
  parseAnswer(raw: unknown, settings: RoomSettings): GameAnswer | null;
}
