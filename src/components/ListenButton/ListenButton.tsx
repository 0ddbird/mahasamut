import { Volume2 } from 'lucide-react';
import styles from './ListenButton.module.scss';

interface ListenButtonProps {
  /** Whether it can be used: hidden otherwise, though it keeps its room. */
  visible: boolean;
  onClick: () => void;
}

/**
 * Replays a sound under the Thai text, once the answer is checked. Always
 * there, hidden until then: appearing would push the answers down just as the
 * correction shows. Hidden this way, it is out of the tab order and of what
 * screen readers say.
 */
export function ListenButton({ visible, onClick }: ListenButtonProps) {
  return (
    <button
      type="button"
      className={styles.listen}
      style={{ visibility: visible ? 'visible' : 'hidden' }}
      onClick={onClick}
    >
      <Volume2 size={18} aria-hidden="true" />
      Listen
    </button>
  );
}
