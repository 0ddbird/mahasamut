import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import styles from './HelpPanels.module.scss';

/** One help panel: what its handle shows, and what the panel holds once open. */
export interface HelpPanel {
  /** Tells the panels apart; unique among them. */
  id: string;
  /** The name of the panel: said by its handle, and its title once open. */
  label: string;
  icon: LucideIcon;
  /** Any CSS colour: the background of the handle and the edge of the panel. */
  color: string;
  content: ReactNode;
}

interface HelpPanelsProps {
  panels: readonly HelpPanel[];
  /** Closes the panel when it changes: a page passes its question number. */
  resetKey: unknown;
  /** The page, which stays visible beside the panel on a wide screen. */
  children: ReactNode;
}

/** The handles' own colour on the panels' colours. */
const helpColor = (color: string) => ({ '--help-color': color }) as CSSProperties;

/**
 * Help panels the player can open while playing: one handle per panel on the
 * right edge of the screen. A handle opens its panel, which slides in from the
 * right with the handles on its left edge; another handle switches to its own
 * panel, and the handle of the open panel closes it, as do Escape and the close
 * button.
 *
 * On a wide screen the page moves aside to stay visible next to the panel; on
 * a narrow one the panel takes the whole width but for the handles.
 */
export function HelpPanels({ panels, resetKey, children }: HelpPanelsProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  // A new question closes the panel. Done while rendering, when the key
  // changes, rather than in an effect that would show the panel once more.
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setOpenId(null);
  }

  const handles = useRef(new Map<string, HTMLButtonElement>());
  const title = useRef<HTMLHeadingElement>(null);
  const panelId = useId();
  const titleId = useId();

  // The focus goes to the title of the panel that opens, so that keyboard and
  // screen reader users land on it.
  useEffect(() => {
    if (openId !== null) title.current?.focus();
  }, [openId]);

  if (panels.length === 0) return children;

  const open = panels.find((panel) => panel.id === openId) ?? null;

  /** Closes the panel, giving the focus back to its handle. */
  const close = (id: string) => {
    setOpenId(null);
    handles.current.get(id)?.focus();
  };

  const toggle = (id: string) => (id === openId ? close(id) : setOpenId(id));

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open !== null) close(open.id);
  };

  return (
    <div className={styles.layout} data-open={open !== null || undefined}>
      {children}
      <div className={styles.drawer} onKeyDown={closeOnEscape}>
        <div className={styles.handles}>
          {panels.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              ref={(element) => {
                if (element === null) handles.current.delete(id);
                else handles.current.set(id, element);
              }}
              type="button"
              className={styles.handle}
              style={helpColor(color)}
              aria-label={label}
              title={label}
              aria-expanded={id === openId}
              aria-controls={id === openId ? panelId : undefined}
              onClick={() => toggle(id)}
            >
              <Icon size={24} aria-hidden="true" />
            </button>
          ))}
        </div>
        {open !== null && (
          <aside
            id={panelId}
            className={styles.panel}
            style={helpColor(open.color)}
            aria-labelledby={titleId}
          >
            <header className={styles.header}>
              <h2 id={titleId} ref={title} tabIndex={-1} className={styles.title}>
                {open.label}
              </h2>
              <button
                type="button"
                className={styles.close}
                aria-label="Close"
                onClick={() => close(open.id)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>
            <div className={styles.content}>{open.content}</div>
          </aside>
        )}
      </div>
    </div>
  );
}
