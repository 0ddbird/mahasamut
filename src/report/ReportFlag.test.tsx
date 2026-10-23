import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GAME } from '../games/shared/games';
import type { ReportedQuestion } from './report';
import { ReportFlag } from './ReportFlag';

const question: ReportedQuestion = {
  game: GAME.Vowel,
  questionId: 'sara-a',
  text: 'กะ',
  expected: '/a/',
  sound: null,
};

const renderFlag = () => {
  const onOpenChange = vi.fn();
  const send = vi.fn().mockResolvedValue('sent');
  const view = render(<ReportFlag question={question} onOpenChange={onOpenChange} send={send} />);
  return { onOpenChange, send, view };
};

const flag = () => screen.getByRole('button', { name: 'Report a problem with this question' });

describe('ReportFlag', () => {
  it('is a button named for what it does, with the same words as a tooltip', () => {
    renderFlag();
    expect(flag().getAttribute('title')).toBe('Report a problem with this question');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is not rendered in a production build without a DSN, which would lose the reports', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_SENTRY_DSN', '');
    try {
      const { view } = renderFlag();
      expect(view.container.innerHTML).toBe('');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('opens the report window on the question, and says so', async () => {
    const { onOpenChange } = renderFlag();
    await userEvent.click(flag());

    expect(screen.getByRole('dialog', { name: 'Report a problem' })).toBeDefined();
    expect(screen.getByText('กะ')).toBeDefined();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it('sends the report as made in a question, in a solo game', async () => {
    const { send } = renderFlag();
    await userEvent.click(flag());
    await userEvent.click(screen.getByRole('checkbox', { name: 'The sound is wrong' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ question, where: 'question', mode: 'solo' }),
    );
  });

  it.each([
    ['Escape', () => userEvent.keyboard('{Escape}')],
    ['Cancel', () => userEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['a click beside the window', () => userEvent.click(screen.getByTestId('dialog-backdrop'))],
  ])('closes with %s, says so, and gives the focus back to the flag', async (_way, close) => {
    const { onOpenChange } = renderFlag();
    await userEvent.click(flag());
    await close();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(document.activeElement).toBe(flag());
  });

  it('closes with Close once the report is sent', async () => {
    const { onOpenChange } = renderFlag();
    await userEvent.click(flag());
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(document.activeElement).toBe(flag());
  });

  it('says it is closed if it goes away while open', async () => {
    const { onOpenChange, view } = renderFlag();
    await userEvent.click(flag());
    view.unmount();

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('says nothing when it goes away while closed', () => {
    const { onOpenChange, view } = renderFlag();
    view.unmount();

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
