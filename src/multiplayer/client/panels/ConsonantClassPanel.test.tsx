import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ConsonantClass } from '../../../thai/types';
import { ConsonantClassPanel } from './ConsonantClassPanel';

describe('ConsonantClassPanel', () => {
  it('lets the player choose a class', async () => {
    const chosen: ConsonantClass[] = [];
    render(
      <ConsonantClassPanel chosen={undefined} onChange={(c) => chosen.push(c)} locked={false} />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'High' }));
    expect(chosen).toEqual(['high']);
  });

  it('locks the choices when locked', () => {
    render(<ConsonantClassPanel chosen="mid" onChange={() => {}} locked />);
    expect(screen.getAllByRole('radio').every((r) => r.matches(':disabled'))).toBe(true);
  });

  it('shows the correction when revealed', () => {
    render(
      <ConsonantClassPanel
        chosen="low"
        onChange={() => {}}
        locked
        reveal={{ game: 'consonantClass', consonantClass: 'high' }}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Low (wrong)' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'High (the right answer)' })).toBeDefined();
  });

  it('shows the right answer when the player gave none', () => {
    render(
      <ConsonantClassPanel
        chosen={undefined}
        onChange={() => {}}
        locked
        reveal={{ game: 'consonantClass', consonantClass: 'mid' }}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Mid (the right answer)' })).toBeDefined();
  });
});
