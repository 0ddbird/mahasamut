import { describe, expect, it } from 'vitest';
import type { GameAnswer } from '../src/multiplayer/protocol';
import type { RoomSettings } from '../src/multiplayer/settings';
import { seededRng } from '../src/thai/generator/seeded-rng.test-utils';
import { SERVER_GAMES } from './games';
import { Room } from './room';

const SETTINGS: RoomSettings = {
  game: 'syllable',
  secondsPerQuestion: 15,
  questionCount: 2,
  answerMode: 'detailed',
  password: null,
};

function answersFor(index: number): { right: GameAnswer; wrong: GameAnswer } {
  const questions = SERVER_GAMES.syllable.drawQuestions(SETTINGS, seededRng(1));
  const reveal = questions[index].reveal;
  if (reveal.game !== 'syllable') throw new Error('expected syllable reveal');
  const rightAnswers = { ...reveal.analyses[0], toneMark: reveal.mark };
  const wrongTone = rightAnswers.tone === 'mid' ? 'low' : 'mid';
  return {
    right: { game: 'syllable', answers: rightAnswers },
    wrong: { game: 'syllable', answers: { ...rightAnswers, tone: wrongTone } },
  };
}

function startedRoom() {
  const { room, token: host } = Room.create('K7P2QX', SETTINGS, 'Host', 0, seededRng(1));
  const joined = room.join('Anna', null, 1);
  if (!joined.ok) throw new Error('expected join to succeed');
  const anna = joined.token;
  room.connect(host, 10);
  room.connect(anna, 20);
  room.start(host, 1_000);
  return { room, host, anna };
}

describe('Room (during a game)', () => {
  it('closes the question once every connected player has answered', () => {
    const { room, host, anna } = startedRoom();
    const { right, wrong } = answersFor(0);

    expect(room.answer(host, right, 3_500)).toEqual({ ok: true });
    expect(room.viewFor(host, 3_500).phase.kind).toBe('question');

    expect(room.answer(anna, wrong, 4_000)).toEqual({ ok: true });
    const hostView = room.viewFor(host, 4_000);
    const annaView = room.viewFor(anna, 4_000);
    expect(hostView.phase.kind).toBe('results');
    expect(annaView.phase.kind).toBe('results');
    if (hostView.phase.kind === 'results' && annaView.phase.kind === 'results') {
      expect(hostView.phase.you).toEqual({ answer: right, correct: true, points: 92 });
      expect(annaView.phase.you).toEqual({ answer: wrong, correct: false, points: 0 });
    }
  });

  it('shows each player their own answer and the ranking', () => {
    const { room, host, anna } = startedRoom();
    const { right, wrong } = answersFor(0);
    room.answer(host, right, 3_500);
    room.answer(anna, wrong, 4_000);

    const hostView = room.viewFor(host, 4_000);
    if (hostView.phase.kind === 'results') {
      expect(hostView.phase.ranking).toEqual([
        expect.objectContaining({ rank: 1, pseudo: 'Host', score: 92, isYou: true }),
        expect.objectContaining({ rank: 2, pseudo: 'Anna', score: 0, isYou: false }),
      ]);
    }
  });

  it('reveals the accepted answers once closed', () => {
    const { room, host, anna } = startedRoom();
    const { right } = answersFor(0);
    const expected = SERVER_GAMES.syllable.drawQuestions(SETTINGS, seededRng(1))[0].reveal;
    room.answer(host, right, 2_000);
    room.answer(anna, right, 2_000);

    const view = room.viewFor(host, 2_000);
    expect(view.phase.kind).toBe('results');
    if (view.phase.kind === 'results') {
      expect(view.phase.reveal).toEqual(expected);
    }
  });

  it('refuses a second answer', () => {
    const { room, host } = startedRoom();
    const { right } = answersFor(0);
    expect(room.answer(host, right, 2_000)).toEqual({ ok: true });
    expect(room.answer(host, right, 2_500)).toEqual({ ok: false, error: 'already-answered' });
  });

  it('refuses an invalid answer, and lets the player try again', () => {
    const { room, host } = startedRoom();
    const { right } = answersFor(0);
    expect(room.answer(host, {}, 2_000)).toEqual({ ok: false, error: 'invalid-answer' });
    expect(room.answer(host, right, 2_500)).toEqual({ ok: true });
  });

  it('refuses a late answer and closes the question', () => {
    const { room, host } = startedRoom();
    const { right } = answersFor(0);
    expect(room.answer(host, right, 16_000)).toEqual({ ok: false, error: 'too-late' });
    expect(room.viewFor(host, 16_000).phase.kind).toBe('results');
  });

  it('closes the question at the deadline', () => {
    const { room, host } = startedRoom();
    expect(room.expire(15_999)).toBe(false);
    expect(room.expire(16_000)).toBe(true);
    const view = room.viewFor(host, 16_000);
    expect(view.phase.kind).toBe('results');
    if (view.phase.kind === 'results') {
      expect(view.phase.you).toEqual({ answer: null, correct: false, points: 0 });
    }
  });

  it('does not wait for a player who left', () => {
    const { room, host, anna } = startedRoom();
    const { right } = answersFor(0);
    room.answer(host, right, 2_000);
    expect(room.viewFor(host, 2_000).phase.kind).toBe('question');
    room.disconnect(anna, 3_000);
    expect(room.viewFor(host, 3_000).phase.kind).toBe('results');
  });

  it('waits for the timer when nobody is connected', () => {
    const { room, host, anna } = startedRoom();
    room.disconnect(host, 2_000);
    room.disconnect(anna, 2_500);
    expect(room.viewFor(host, 2_500).phase.kind).toBe('question');
  });

  it('lets only the host go on, then shows the final ranking', () => {
    const { room, host, anna } = startedRoom();
    const q0 = answersFor(0);
    const q1 = answersFor(1);

    room.answer(host, q0.right, 3_500);
    room.answer(anna, q0.wrong, 4_000);

    expect(room.next(anna, 5_000)).toEqual({ ok: false, error: 'not-host' });
    expect(room.next(host, 5_000)).toEqual({ ok: true });

    const q1View = room.viewFor(host, 5_000);
    expect(q1View.phase.kind).toBe('question');
    if (q1View.phase.kind === 'question') {
      expect(q1View.phase.index).toBe(1);
    }

    room.answer(host, q1.right, 5_000);
    room.answer(anna, q1.right, 5_000);

    const lastResults = room.viewFor(host, 5_000);
    expect(lastResults.phase.kind).toBe('results');
    if (lastResults.phase.kind === 'results') {
      expect(lastResults.phase.isLast).toBe(true);
    }

    expect(room.next(host, 6_000)).toEqual({ ok: true });
    expect(room.viewFor(host, 6_000).phase.kind).toBe('finished');
    expect(room.next(host, 7_000)).toEqual({ ok: false, error: 'wrong-phase' });

    expect(room.returnToLobby(anna, 7_500)).toEqual({ ok: false, error: 'not-host' });
    expect(room.returnToLobby(host, 8_000)).toEqual({ ok: true });
    expect(room.viewFor(host, 8_000).phase).toEqual({ kind: 'lobby' });
  });

  describe('recap', () => {
    const questions = SERVER_GAMES.syllable.drawQuestions(SETTINGS, seededRng(1));

    /** Plays the two questions: Host always right, Anna wrong then silent. */
    function playedRoom() {
      const { room, host, anna } = startedRoom();
      const q0 = answersFor(0);
      const q1 = answersFor(1);
      room.answer(host, q0.right, 3_500);
      room.answer(anna, q0.wrong, 4_000);
      room.next(host, 5_000);
      room.answer(host, q1.right, 6_000);
      room.expire(21_000);
      room.next(host, 22_000);
      return { room, host, anna, q0, q1 };
    }

    function recapOf(room: Room, token: string, now: number) {
      const phase = room.viewFor(token, now).phase;
      if (phase.kind !== 'finished') throw new Error('expected the finished phase');
      return phase.recap;
    }

    it('gives each player their own answers, in the order of the game, once finished', () => {
      const { room, host, anna, q0, q1 } = playedRoom();

      expect(recapOf(room, host, 22_000)).toEqual([
        {
          question: questions[0].view,
          reveal: questions[0].reveal,
          answer: q0.right,
          correct: true,
        },
        {
          question: questions[1].view,
          reveal: questions[1].reveal,
          answer: q1.right,
          correct: true,
        },
      ]);
      expect(recapOf(room, anna, 22_000)).toEqual([
        {
          question: questions[0].view,
          reveal: questions[0].reveal,
          answer: q0.wrong,
          correct: false,
        },
        { question: questions[1].view, reveal: questions[1].reveal, answer: null, correct: false },
      ]);
    });

    it('shows time up for a player who was away during a question', () => {
      const { room, host, anna } = startedRoom();
      const q0 = answersFor(0);
      room.disconnect(anna, 2_000);
      room.answer(host, q0.right, 3_000);
      room.connect(anna, 3_500);
      room.next(host, 4_000);
      room.expire(20_000);
      room.next(host, 21_000);

      expect(recapOf(room, anna, 21_000)[0]).toEqual({
        question: questions[0].view,
        reveal: questions[0].reveal,
        answer: null,
        correct: false,
      });
    });

    it('keeps the list for a player who comes back once the game is over', () => {
      const { room, anna } = playedRoom();
      const before = recapOf(room, anna, 22_000);

      room.disconnect(anna, 23_000);
      room.connect(anna, 24_000);

      expect(recapOf(room, anna, 24_000)).toEqual(before);
    });

    it('forgets the answers of the previous game', () => {
      const { room, host } = playedRoom();
      expect(room.returnToLobby(host, 23_000)).toEqual({ ok: true });
      expect(room.start(host, 24_000)).toEqual({ ok: true });
      room.expire(40_000);
      room.next(host, 41_000);
      room.expire(60_000);
      room.next(host, 61_000);

      const recap = recapOf(room, host, 61_000);
      expect(recap).toHaveLength(2);
      expect(recap.map((round) => round.answer)).toEqual([null, null]);
      expect(recap.map((round) => round.correct)).toEqual([false, false]);
    });
  });

  it('adds up the points over the questions', () => {
    const { room, host, anna } = startedRoom();
    const q0 = answersFor(0);
    const q1 = answersFor(1);

    room.answer(host, q0.right, 3_500); // +92
    room.answer(anna, q0.wrong, 4_000); // +0
    room.next(host, 5_000);
    room.answer(host, q1.right, 5_000); // +100
    room.answer(anna, q1.right, 5_000); // +100

    const view = room.viewFor(host, 5_000);
    if (view.phase.kind === 'results') {
      expect(view.phase.ranking).toEqual([
        expect.objectContaining({ rank: 1, pseudo: 'Host', score: 192, isYou: true }),
        expect.objectContaining({ rank: 2, pseudo: 'Anna', score: 100, isYou: false }),
      ]);
    }
  });
});
