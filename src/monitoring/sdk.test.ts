import { describe, expect, it } from 'vitest';

describe('sdk', () => {
  it('brings in only what the site uses, so the bundle leaves out Replay, Feedback and tracing', async () => {
    const sdk = await import('./sdk');

    expect(Object.keys(sdk).sort()).toEqual(['captureException', 'init']);
    expect(typeof sdk.init).toBe('function');
    expect(typeof sdk.captureException).toBe('function');
  });
});
