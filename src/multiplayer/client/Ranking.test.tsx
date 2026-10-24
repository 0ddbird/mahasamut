import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ranking } from './Ranking';

describe('Ranking', () => {
  it('lists each player with their avatar miniature, rank, score, host crown, and (you) marker', () => {
    render(
      <Ranking
        entries={[
          { rank: 1, pseudo: 'Anna', avatar: 'elephant', score: 190, isHost: true, isYou: false },
          { rank: 2, pseudo: 'Bob', avatar: 'tiger', score: 140, isHost: false, isYou: true },
        ]}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['1. Anna — 190', '2. Bob (you) — 140']);
    expect(within(items[0]).getByRole('img', { name: 'Elephant' })).toBeDefined();
    expect(within(items[1]).getByRole('img', { name: 'Tiger' })).toBeDefined();
    expect(items[1].getAttribute('data-you')).toBe('true');
    expect(within(items[0]).getByRole('img', { name: 'Host' })).toBeDefined();
    expect(within(items[1]).queryByRole('img', { name: 'Host' })).toBeNull();
  });
});
