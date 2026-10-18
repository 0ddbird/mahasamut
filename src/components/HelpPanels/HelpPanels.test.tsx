import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookOpen, Music } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { HelpPanels } from './HelpPanels';
import type { HelpPanel } from './HelpPanels';

const PANELS: readonly HelpPanel[] = [
  { id: 'first', label: 'First help', icon: BookOpen, color: 'rgb(1, 2, 3)', content: <p>One</p> },
  { id: 'second', label: 'Second help', icon: Music, color: 'rgb(4, 5, 6)', content: <p>Two</p> },
];

const handle = (label: string) => screen.getByRole('button', { name: label });
const expanded = (label: string) => handle(label).getAttribute('aria-expanded');

const renderPanels = (resetKey = 1) =>
  render(
    <HelpPanels panels={PANELS} resetKey={resetKey}>
      <main>The game</main>
    </HelpPanels>,
  );

describe('HelpPanels', () => {
  it('shows the game, with one closed handle per panel', () => {
    renderPanels();
    expect(screen.getByText('The game')).toBeDefined();
    expect(expanded('First help')).toBe('false');
    expect(expanded('Second help')).toBe('false');
    expect(screen.queryByText('One')).toBeNull();
  });

  it('gives each handle its colour and an icon hidden from screen readers', () => {
    renderPanels();
    expect(handle('First help').style.getPropertyValue('--help-color')).toBe('rgb(1, 2, 3)');
    expect(handle('First help').querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('opens the panel of a handle, titled by its label, and moves the focus into it', async () => {
    renderPanels();
    await userEvent.click(handle('First help'));

    expect(expanded('First help')).toBe('true');
    expect(screen.getByText('One')).toBeDefined();
    const title = screen.getByRole('heading', { name: 'First help' });
    expect(document.activeElement).toBe(title);
    expect(screen.getByRole('complementary', { name: 'First help' })).toBeDefined();
  });

  it('switches to another panel without closing', async () => {
    renderPanels();
    await userEvent.click(handle('First help'));
    await userEvent.click(handle('Second help'));

    expect(screen.queryByText('One')).toBeNull();
    expect(screen.getByText('Two')).toBeDefined();
    expect(expanded('First help')).toBe('false');
    expect(expanded('Second help')).toBe('true');
  });

  it('closes when the handle of the open panel is clicked again', async () => {
    renderPanels();
    await userEvent.click(handle('First help'));
    await userEvent.click(handle('First help'));

    expect(screen.queryByText('One')).toBeNull();
    expect(document.activeElement).toBe(handle('First help'));
  });

  it('closes with its close button, giving the focus back to its handle', async () => {
    renderPanels();
    await userEvent.click(handle('Second help'));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('Two')).toBeNull();
    expect(document.activeElement).toBe(handle('Second help'));
  });

  it('closes with Escape', async () => {
    renderPanels();
    await userEvent.click(handle('First help'));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByText('One')).toBeNull();
    expect(document.activeElement).toBe(handle('First help'));
  });

  it('closes when the reset key changes, at the next question', async () => {
    const { rerender } = renderPanels(1);
    await userEvent.click(handle('First help'));

    rerender(
      <HelpPanels panels={PANELS} resetKey={2}>
        <main>The game</main>
      </HelpPanels>,
    );
    expect(screen.queryByText('One')).toBeNull();
    expect(screen.getByText('The game')).toBeDefined();
  });

  it('keeps the game mounted when a panel opens and closes', async () => {
    renderPanels();
    const game = screen.getByText('The game');
    await userEvent.click(handle('First help'));
    await userEvent.click(handle('First help'));
    expect(screen.getByText('The game')).toBe(game);
  });

  it('shows the game alone when there is no panel', () => {
    render(
      <HelpPanels panels={[]} resetKey={1}>
        <main>The game</main>
      </HelpPanels>,
    );
    expect(screen.getByText('The game')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
