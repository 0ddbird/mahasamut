import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

const renderDialog = () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Leave the game?"
      message="Your score will be lost."
      confirmLabel="Leave"
      cancelLabel="Keep playing"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
};

const cancelButton = () => screen.getByRole('button', { name: 'Keep playing' });
const confirmButton = () => screen.getByRole('button', { name: 'Leave' });

describe('ConfirmDialog', () => {
  it('is a modal alert named by its title and described by its message', () => {
    renderDialog();
    const dialog = screen.getByRole('alertdialog', { name: 'Leave the game?' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const description = document.getElementById(dialog.getAttribute('aria-describedby')!);
    expect(description?.textContent).toBe('Your score will be lost.');
  });

  it('focuses the cancel button when it opens', () => {
    renderDialog();
    expect(document.activeElement).toBe(cancelButton());
  });

  it('cancels on Escape and on a click on the backdrop', async () => {
    const { onCancel, onConfirm } = renderDialog();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps the focus inside: Tab goes from one button to the other', async () => {
    renderDialog();
    await userEvent.tab();
    expect(document.activeElement).toBe(confirmButton());
    await userEvent.tab();
    expect(document.activeElement).toBe(cancelButton());
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(confirmButton());
  });

  it('keeps the focus inside after a click on its text', async () => {
    const { onCancel } = renderDialog();
    await userEvent.click(screen.getByText('Your score will be lost.'));
    await userEvent.tab();
    expect(document.activeElement).toBe(confirmButton());

    await userEvent.click(screen.getByText('Your score will be lost.'));
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('confirms with its confirm button', async () => {
    const { onConfirm, onCancel } = renderDialog();
    await userEvent.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
