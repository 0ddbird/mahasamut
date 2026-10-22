import { beforeEach, describe, expect, it } from 'vitest';
import { createLimits, ipKey } from './limits.ts';

describe('ipKey', () => {
  it('keys IPv4 as is and IPv6 by /64', () => {
    expect(ipKey('203.0.113.7')).toBe('203.0.113.7');
    expect(ipKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(ipKey('::FFFF:cb00:7107')).toBe('203.0.113.7');
    expect(ipKey('2001:db8::1')).toBe('2001:0db8:0000:0000');
    expect(ipKey('2001:db8:0:0:ffff::2')).toBe(ipKey('2001:db8::1'));
    expect(ipKey('2001:DB8:0:1::1')).toBe('2001:0db8:0000:0001');
  });
});

describe('createLimits', () => {
  let now = 0;
  let limits = createLimits(() => now);

  beforeEach(() => {
    now = 1_000_000;
    limits = createLimits(() => now);
  });

  it('allows two per hour per IP', () => {
    expect(typeof limits.reserve('k')).toBe('object');
    expect(typeof limits.reserve('k')).toBe('object');
    expect(limits.reserve('k')).toBe('ip');
    now += 3_600_001;
    expect(typeof limits.reserve('k')).toBe('object');
  });

  it('allows five per day per IP', () => {
    const hour = 3_600_000;
    for (let i = 0; i < 5; i++) {
      expect(typeof limits.reserve('k')).toBe('object');
      now += hour + 60_000;
    }
    expect(limits.reserve('k')).toBe('ip');
    now += 24 * hour;
    expect(typeof limits.reserve('k')).toBe('object');
  });

  it('allows thirty per day for the site', () => {
    for (let i = 0; i < 30; i++) {
      expect(typeof limits.reserve(`k${i}`)).toBe('object');
    }
    expect(limits.reserve('another')).toBe('site');
    now += 24 * 3_600_000 + 1;
    expect(typeof limits.reserve('another')).toBe('object');
  });

  it('a reservation counts until it is cancelled', () => {
    const first = limits.reserve('k');
    expect(typeof limits.reserve('k')).toBe('object');
    expect(limits.reserve('k')).toBe('ip');
    if (typeof first === 'string') throw new Error('expected a reservation');
    first.cancel();
    expect(typeof limits.reserve('k')).toBe('object');
    expect(limits.reserve('k')).toBe('ip');
  });

  it('cancelling twice frees only one slot', () => {
    const first = limits.reserve('k');
    limits.reserve('k');
    if (typeof first === 'string') throw new Error('expected a reservation');
    first.cancel();
    first.cancel();
    expect(typeof limits.reserve('k')).toBe('object');
    expect(limits.reserve('k')).toBe('ip');
  });

  it('a refused reservation does not count against the site', () => {
    limits.reserve('k');
    limits.reserve('k');
    for (let i = 0; i < 10; i++) limits.reserve('k');
    for (let i = 0; i < 28; i++) {
      expect(typeof limits.reserve(`other${i}`)).toBe('object');
    }
    expect(limits.reserve('last')).toBe('site');
  });
});
