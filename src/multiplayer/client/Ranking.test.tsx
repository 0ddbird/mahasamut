import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ranking } from './Ranking';

describe('Ranking', () => {
  it('lists the players with their rank and score, sharing a rank on a tie and marking the player', () => {
    render(
      <Ranking
        entries={[
          { rank: 1, pseudo: 'Anna', score: 180, isYou: false },
          { rank: 2, pseudo: 'Bob', score: 90, isYou: true },
          { rank: 2, pseudo: 'Cara', score: 90, isYou: false },
        ]}
      />,
    );

    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['1. Anna — 180', '2. Bob (you) — 90', '2. Cara — 90']);
  });
});
