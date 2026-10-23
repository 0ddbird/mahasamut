import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GAME } from '../games/shared/games';
import type { GameId } from '../games/shared/games';
import { MAX_COMMENT_LENGTH } from './report';
import type { ReportInput, ReportOutcome, ReportedQuestion } from './report';
import { ReportDialog } from './ReportDialog';

const question = (game: GameId = GAME.Vowel): ReportedQuestion => ({
  game,
  questionId: 'sara-a',
  text: 'กะ',
  expected: '/a/',
  sound: null,
});

const renderDialog = (
  options: { game?: GameId; send?: (input: ReportInput) => Promise<ReportOutcome> } = {},
) => {
  const { game, send = vi.fn().mockResolvedValue('sent') } = options;
  const onClose = vi.fn();
  const onSent = vi.fn();
  render(
    <ReportDialog
      question={question(game)}
      where="question"
      mode="solo"
      onClose={onClose}
      onSent={onSent}
      send={send}
    />,
  );
  return { send, onClose, onSent };
};

const sendButton = () => screen.getByRole('button', { name: 'Send' });
const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });
const commentBox = () => screen.getByRole('textbox', { name: 'Tell me more' });

describe('ReportDialog', () => {
  it('is a modal dialog named by its title, showing the Thai text', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Report a problem' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('กะ').getAttribute('lang')).toBe('th');
  });

  it.each([
    [GAME.Vowel, ['The sound is wrong', 'The expected answer is wrong', 'Other']],
    [GAME.ConsonantClass, ['The expected class is wrong', 'Other']],
    [GAME.Syllable, ['The sound is wrong', 'The expected tone is wrong', 'Other']],
  ] as const)('offers the reasons of the game %s', (game, labels) => {
    renderDialog({ game });
    const offered = screen.getAllByRole('checkbox').map((box) => box.parentElement?.textContent);
    expect(offered).toEqual(labels);
  });

  it('focuses the first reason when it opens', () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getAllByRole('checkbox')[0]);
  });

  it('limits the comment to the length the report keeps', () => {
    renderDialog();
    expect(commentBox().getAttribute('maxlength')).toBe(String(MAX_COMMENT_LENGTH));
  });

  it('keeps Send disabled until a reason is checked', async () => {
    renderDialog();
    expect(sendButton().hasAttribute('disabled')).toBe(true);

    await userEvent.click(screen.getByRole('checkbox', { name: 'The sound is wrong' }));
    expect(sendButton().hasAttribute('disabled')).toBe(false);

    await userEvent.click(screen.getByRole('checkbox', { name: 'The sound is wrong' }));
    expect(sendButton().hasAttribute('disabled')).toBe(true);
  });

  it('does not send a comment alone', async () => {
    const { send } = renderDialog();
    await userEvent.type(commentBox(), 'Hmm');
    expect(sendButton().hasAttribute('disabled')).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends every reason checked and the comment', async () => {
    const { send } = renderDialog();
    // Checked in the reverse of the order they are listed in: the report keeps the form's order.
    await userEvent.click(screen.getByRole('checkbox', { name: 'The expected answer is wrong' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'The sound is wrong' }));
    await userEvent.type(commentBox(), 'It says a, not aa');
    await userEvent.click(sendButton());

    expect(send).toHaveBeenCalledExactlyOnceWith({
      question: question(),
      reasons: ['sound', 'expected'],
      comment: 'It says a, not aa',
      where: 'question',
      mode: 'solo',
    });
  });

  it('thanks the player once sent, and calls onSent', async () => {
    const { onSent, onClose } = renderDialog();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    await userEvent.click(sendButton());

    expect(await screen.findByText('Thanks!')).toBeTruthy();
    expect(onSent).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    const close = screen.getByRole('button', { name: 'Close' });
    expect(document.activeElement).toBe(close);
    await userEvent.click(close);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('disables Send while sending, and a double click sends once', async () => {
    let finish: (outcome: ReportOutcome) => void = () => {};
    const send = vi.fn(() => new Promise<ReportOutcome>((resolve) => (finish = resolve)));
    renderDialog({ send });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    await userEvent.dblClick(sendButton());

    expect(send).toHaveBeenCalledOnce();
    const sending = screen.getByRole('button', { name: 'Sending…' });
    expect(sending.hasAttribute('disabled')).toBe(true);

    await act(async () => finish('sent'));
    expect(screen.getByText('Thanks!')).toBeTruthy();
  });

  it.each([
    ['failed', 'Your report could not be sent. Please try again.'],
    ['limited', 'Too many reports for now. Please try again later.'],
  ] as const)('keeps the reasons and the text when sending ends %s', async (outcome, message) => {
    const { onSent } = renderDialog({ send: vi.fn().mockResolvedValue(outcome) });
    await userEvent.click(screen.getByRole('checkbox', { name: 'The sound is wrong' }));
    await userEvent.type(commentBox(), 'Wrong vowel');
    await userEvent.click(sendButton());

    expect((await screen.findByRole('alert')).textContent).toBe(message);
    expect(onSent).not.toHaveBeenCalled();
    expect(
      (screen.getByRole('checkbox', { name: 'The sound is wrong' }) as HTMLInputElement).checked,
    ).toBe(true);
    expect((commentBox() as HTMLTextAreaElement).value).toBe('Wrong vowel');
    // The player can try again at once.
    expect(sendButton().hasAttribute('disabled')).toBe(false);
  });

  it.each(['failed', 'limited'] as const)(
    'puts the focus back on Send when sending ends %s, not on Cancel',
    async (outcome) => {
      renderDialog({ send: vi.fn().mockResolvedValue(outcome) });
      await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
      await userEvent.click(sendButton());
      await screen.findByRole('alert');

      expect(document.activeElement).toBe(sendButton());
    },
  );

  it('treats a send that rejects as failed, and lets the player try again', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('sent');
    const { onSent } = renderDialog({ send });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    await userEvent.click(sendButton());

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Your report could not be sent. Please try again.',
    );
    expect(onSent).not.toHaveBeenCalled();
    expect(sendButton().hasAttribute('disabled')).toBe(false);

    await userEvent.click(sendButton());
    expect(await screen.findByText('Thanks!')).toBeTruthy();
  });

  it('announces the thanks', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    await userEvent.click(sendButton());

    expect((await screen.findByRole('status')).textContent).toBe('Thanks!');
  });

  it('describes Close by the thanks, since the focus moves there before a screen reader can announce them', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    await userEvent.click(sendButton());

    const close = await screen.findByRole('button', { name: 'Close' });
    const describedBy = close.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const thanks = document.getElementById(describedBy!);
    expect(thanks?.textContent).toBe('Thanks!');
    expect(thanks?.getAttribute('role')).toBe('status');
  });

  it('forgets the failure message when the player tries again', async () => {
    const send = vi.fn().mockResolvedValueOnce('failed').mockResolvedValueOnce('sent');
    renderDialog({ send });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    await userEvent.click(sendButton());
    await screen.findByRole('alert');

    await userEvent.click(sendButton());
    expect(await screen.findByText('Thanks!')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('closes on Escape and on a click on the backdrop', async () => {
    const { onClose, onSent } = renderDialog();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSent).not.toHaveBeenCalled();
  });

  it('keeps the focus inside: Tab wraps from the last element to the first', async () => {
    renderDialog();
    const [first] = screen.getAllByRole('checkbox');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    // Reasons, comment, Cancel, Send: Send is the last stop and takes the focus.
    await userEvent.tab();
    expect(document.activeElement).toBe(commentBox());
    await userEvent.tab();
    expect(document.activeElement).toBe(cancelButton());
    await userEvent.tab();
    expect(document.activeElement).toBe(sendButton());
    await userEvent.tab();
    expect(document.activeElement).toBe(first);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(sendButton());
  });

  it('keeps the focus inside when Send is disabled', async () => {
    renderDialog();
    // Nothing checked: Cancel is the last stop.
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(cancelButton());
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getAllByRole('checkbox')[0]);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(cancelButton());
  });

  it('closes without sending on Cancel', async () => {
    const { send, onClose, onSent } = renderDialog();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    await userEvent.click(cancelButton());

    expect(onClose).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
  });

  it('has no Cancel once sent: Close is enough', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    await userEvent.click(sendButton());
    await screen.findByText('Thanks!');
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('keeps the focus inside after a click on its text', async () => {
    const { onClose } = renderDialog();
    await userEvent.click(screen.getByText('กะ'));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getAllByRole('checkbox')[0]);

    await userEvent.click(screen.getByText('กะ'));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
