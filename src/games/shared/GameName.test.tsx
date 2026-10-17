import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GAME, GAME_NAMES, GAME_THAI_NAMES } from './games';
import { GameName } from './GameName';

describe('GameName', () => {
  it('shows the name of the game, then its Thai name marked as Thai', () => {
    const { container } = render(
      <p>
        <GameName game={GAME.ConsonantClass} />
      </p>,
    );

    expect(container.textContent).toBe(
      `${GAME_NAMES[GAME.ConsonantClass]} ${GAME_THAI_NAMES[GAME.ConsonantClass]}`,
    );
    expect(screen.getByText(GAME_THAI_NAMES[GAME.ConsonantClass]).getAttribute('lang')).toBe('th');
  });
});
