import { afterEach, describe, expect, it, vi } from 'vitest';
import { forgetToken, loadToken, saveToken } from './tokens';

describe('room tokens in sessionStorage', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves, loads, and forgets a token for a room', () => {
    expect(loadToken('K7P2QX')).toBeNull();
    saveToken('K7P2QX', 'tok-1');
    expect(loadToken('K7P2QX')).toBe('tok-1');
    forgetToken('K7P2QX');
    expect(loadToken('K7P2QX')).toBeNull();
  });

  it('returns null without throwing when sessionStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(() => saveToken('K7P2QX', 'tok-1')).not.toThrow();
    expect(loadToken('K7P2QX')).toBeNull();
    expect(() => forgetToken('K7P2QX')).not.toThrow();
  });
});
