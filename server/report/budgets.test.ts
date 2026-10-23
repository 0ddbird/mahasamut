import { beforeEach, describe, expect, it } from 'vitest';
import { BUDGETS, createBudgets } from './budgets.ts';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe('BUDGETS', () => {
  it('holds the values of the spec', () => {
    expect(BUDGETS).toEqual({
      report: { perMinute: 10, perDay: 100, sitePerDay: 100 },
      error: { perMinute: 3, perDay: 10, sitePerDay: 50 },
    });
  });
});

describe('createBudgets', () => {
  let now = 0;
  let budgets = createBudgets(() => now);

  beforeEach(() => {
    now = 1_000_000;
    budgets = createBudgets(() => now);
  });

  it('lets a visitor send 3 errors a minute, then comes back after the minute', () => {
    for (let i = 0; i < 3; i++) expect(budgets.take('error', '203.0.113.7')).toBe(true);
    expect(budgets.take('error', '203.0.113.7')).toBe(false);

    now += MINUTE;

    expect(budgets.take('error', '203.0.113.7')).toBe(true);
  });

  it('lets a visitor send 10 errors a day', () => {
    for (let i = 0; i < 10; i++) {
      expect(budgets.take('error', '203.0.113.7')).toBe(true);
      now += 2 * MINUTE;
    }
    expect(budgets.take('error', '203.0.113.7')).toBe(false);

    now += DAY;

    expect(budgets.take('error', '203.0.113.7')).toBe(true);
  });

  it('lets a visitor send 10 reports a minute and 100 a day', () => {
    for (let i = 0; i < 10; i++) expect(budgets.take('report', '203.0.113.7')).toBe(true);
    expect(budgets.take('report', '203.0.113.7')).toBe(false);

    // Ten a minute, spread out so that only the daily budget is left to stop the visitor.
    for (let sent = 10; sent < 100; sent++) {
      if (sent % 10 === 0) now += MINUTE;
      expect(budgets.take('report', '203.0.113.7')).toBe(true);
    }
    now += MINUTE;
    expect(budgets.take('report', '203.0.113.7')).toBe(false);

    now += DAY;

    expect(budgets.take('report', '203.0.113.7')).toBe(true);
  });

  it('keeps errors and reports apart', () => {
    for (let i = 0; i < 3; i++) budgets.take('error', '203.0.113.7');
    expect(budgets.take('error', '203.0.113.7')).toBe(false);

    expect(budgets.take('report', '203.0.113.7')).toBe(true);
  });

  it('counts each visitor on their own', () => {
    for (let i = 0; i < 3; i++) budgets.take('error', '203.0.113.7');

    expect(budgets.take('error', '203.0.113.8')).toBe(true);
  });

  it('limits the whole site for the day', () => {
    for (let i = 0; i < 50; i++) expect(budgets.take('error', `10.0.0.${i}`)).toBe(true);
    expect(budgets.take('error', '10.0.1.0')).toBe(false);
    expect(budgets.take('report', '10.0.1.0')).toBe(true);

    now += DAY;

    expect(budgets.take('error', '10.0.1.0')).toBe(true);
  });

  it('shares the budget of an IPv6 /64', () => {
    for (let i = 0; i < 3; i++) budgets.take('error', `2001:db8:0:0:${i + 1}::1`);

    expect(budgets.take('error', '2001:db8::ffff')).toBe(false);
    expect(budgets.take('error', '2001:db8:0:1::1')).toBe(true);
  });

  it('counts nothing for a refused call', () => {
    for (let i = 0; i < 3; i++) budgets.take('error', '203.0.113.7');
    for (let i = 0; i < 20; i++) expect(budgets.take('error', '203.0.113.7')).toBe(false);

    // 3 places of the day are taken: if the refusals had counted, the day would already be over.
    for (let round = 0; round < 2; round++) {
      now += MINUTE;
      for (let i = 0; i < 3; i++) expect(budgets.take('error', '203.0.113.7')).toBe(true);
    }
    now += MINUTE;
    expect(budgets.take('error', '203.0.113.7')).toBe(true);
    expect(budgets.take('error', '203.0.113.7')).toBe(false);
  });
});
