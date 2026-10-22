import { describe, expect, it } from 'vitest';
import type { RoomSettings } from '../src/multiplayer/settings';
import { seededRng } from '../src/thai/generator/seeded-rng.test-utils';
import { Room } from './room';

const DEFAULT_SETTINGS: RoomSettings = {
  game: 'syllable',
  secondsPerQuestion: 15,
  questionCount: 5,
  answerMode: 'detailed',
  password: null,
};

function newRoom(overrides: Partial<RoomSettings> = {}) {
  return Room.create('K7P2QX', { ...DEFAULT_SETTINGS, ...overrides }, 'Host', 0, seededRng(1));
}

describe('Room (lobby and start)', () => {
  it('makes its creator the host, in the lobby', () => {
    const { room, token } = newRoom();
    const initial = room.viewFor(token, 0);
    expect(initial.you.pseudo).toBe('Host');
    expect(initial.you.isHost).toBe(true);
    expect(initial.phase).toEqual({ kind: 'lobby' });
    expect(initial.host).toEqual({ pseudo: 'Host', connected: false });

    expect(room.connect(token, 10)).toBe(true);
    expect(room.viewFor(token, 10).host.connected).toBe(true);
  });

  it('lets a player change their avatar in the lobby', () => {
    const { room, token } = newRoom();
    expect(room.setAvatar(token, 'lantern', 5)).toEqual({ ok: true });
    expect(room.viewFor(token, 5).you.avatar).toBe('lantern');
    expect(room.setAvatar(token, 'dragon', 6)).toEqual({ ok: false, error: 'invalid-avatar' });
  });

  it('lets only the host update the settings in the lobby', () => {
    const { room, token: hostToken } = newRoom();
    const anna = room.join('Anna', null, 1);
    if (!anna.ok) throw new Error('expected join');

    expect(
      room.updateSettings(
        anna.token,
        { game: 'vowel', secondsPerQuestion: 20, questionCount: 8, answerMode: 'toneOnly' },
        2,
      ),
    ).toEqual({ ok: false, error: 'not-host' });

    expect(
      room.updateSettings(
        hostToken,
        { game: 'vowel', secondsPerQuestion: 20, questionCount: 8, answerMode: 'toneOnly' },
        3,
      ),
    ).toEqual({ ok: true });
    expect(room.viewFor(hostToken, 3).game).toBe('vowel');
    expect(room.viewFor(hostToken, 3).settings).toEqual({
      secondsPerQuestion: 20,
      questionCount: 8,
      answerMode: 'toneOnly',
      hasPassword: false,
    });
  });

  it('lets players join with a pseudo, in arrival order', () => {
    const { room, token: hostToken } = newRoom();
    const anna = room.join('Anna', null, 1);
    const bob = room.join('Bob', null, 2);
    expect(anna.ok).toBe(true);
    expect(bob.ok).toBe(true);

    const view = room.viewFor(hostToken, 2);
    expect(view.players.map((p) => p.pseudo)).toEqual(['Host', 'Anna', 'Bob']);
  });

  it('refuses a pseudo already taken, whatever the case', () => {
    const { room } = newRoom();
    expect(room.join('Marie', null, 1).ok).toBe(true);
    expect(room.join('marie', null, 2)).toEqual({ ok: false, error: 'pseudo-taken' });
    expect(room.join('hOsT', null, 3)).toEqual({ ok: false, error: 'pseudo-taken' });
  });

  it('checks the password', () => {
    const { room } = newRoom({ password: 'pass' });
    expect(room.join('Anna', null, 1)).toEqual({ ok: false, error: 'wrong-password' });
    expect(room.join('Anna', 'nope', 2)).toEqual({ ok: false, error: 'wrong-password' });
    expect(room.join('Anna', 'pass', 3).ok).toBe(true);
  });

  it('refuses a player once full', () => {
    const { room } = newRoom();
    for (let i = 1; i <= 99; i++) {
      expect(room.join(`P${i}`, null, i).ok).toBe(true);
    }
    expect(room.status).toBe('full');
    expect(room.join('P100', null, 100)).toEqual({ ok: false, error: 'room-full' });
  });

  it('refuses newcomers once started', () => {
    const { room, token: hostToken } = newRoom();
    expect(room.start(hostToken, 10)).toEqual({ ok: true });
    expect(room.status).toBe('started');
    expect(room.join('Anna', null, 11)).toEqual({ ok: false, error: 'started' });
  });

  it('counts each connection of a token', () => {
    const { room, token } = newRoom();
    room.connect(token, 1);
    room.connect(token, 2);
    room.disconnect(token, 3);
    expect(room.viewFor(token, 3).host.connected).toBe(true);
    room.disconnect(token, 4);
    expect(room.viewFor(token, 4).host.connected).toBe(false);
  });

  it('refuses an unknown token', () => {
    const { room } = newRoom();
    expect(room.connect('nope', 0)).toBe(false);
    expect(room.hasPlayer('nope')).toBe(false);
  });

  it('lets only the host start, from the lobby', () => {
    const { room, token: hostToken } = newRoom();
    const anna = room.join('Anna', null, 1);
    if (!anna.ok) throw new Error('expected join to succeed');

    expect(room.start(anna.token, 2)).toEqual({ ok: false, error: 'not-host' });
    expect(room.start(hostToken, 100)).toEqual({ ok: true });

    const view = room.viewFor(hostToken, 100);
    expect(view.phase.kind).toBe('question');
    if (view.phase.kind === 'question') {
      expect(view.phase.index).toBe(0);
      expect(view.phase.remainingMs).toBe(15_000);
      expect(view.phase.question.text.length).toBeGreaterThan(0);
    }
    expect(room.start(hostToken, 101)).toEqual({ ok: false, error: 'wrong-phase' });
  });

  it('hides the answers while the question is open', () => {
    const { room, token: hostToken } = newRoom();
    room.start(hostToken, 100);
    const json = JSON.stringify(room.viewFor(hostToken, 100));
    expect(json).not.toContain('"reveal"');
    expect(json).not.toContain('"analyses"');
    expect(json).not.toContain('"consonantClass"');
  });

  it('keeps track of activity', () => {
    const { room, token: hostToken } = newRoom();
    expect(room.lastActivity).toBe(0);
    const anna = room.join('Anna', null, 10);
    expect(room.lastActivity).toBe(10);
    if (!anna.ok) throw new Error('expected join to succeed');
    room.connect(anna.token, 25);
    expect(room.lastActivity).toBe(25);
    room.disconnect(anna.token, 40);
    expect(room.lastActivity).toBe(40);
    room.start(hostToken, 60);
    expect(room.lastActivity).toBe(60);
  });
});
