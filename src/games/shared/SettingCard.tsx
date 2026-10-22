import { useId } from 'react';
import type { ReactNode } from 'react';
import type { Option } from '../../components/AnswerRow/option';
import styles from './SettingCard.module.scss';

interface SettingCardProps<T extends string> {
  /** The setting, e.g. "Length": the card's title and the name of its group. */
  title: string;
  /** A small picture before the title; decorative. */
  icon: ReactNode;
  /** Groups the card's radio buttons; must be unique on the page. */
  name: string;
  /** Its two choices, side by side. */
  options: readonly Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
  /** A line between the title and the choices, when a choice needs explaining. */
  hint?: string;
  /** What the choice made needs next, under the choices: a number. */
  children?: ReactNode;
}

/**
 * One setting of a game, in its own card: an icon and a title, the choices as
 * large buttons, and what the chosen one needs under them. The choices are
 * radio buttons shown as buttons, so the card also works with the keyboard and
 * with screen readers.
 */
export function SettingCard<T extends string>({
  title,
  icon,
  name,
  options,
  selected,
  onSelect,
  hint,
  children,
}: SettingCardProps<T>) {
  const hintId = useId();
  return (
    <fieldset className={styles.card} aria-describedby={hint === undefined ? undefined : hintId}>
      <legend className={styles.title}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        {title}
      </legend>
      {hint !== undefined && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
      <div className={styles.choices}>
        {options.map((option) => (
          <label key={option.value} className={styles.choice}>
            <input
              className={styles.input}
              type="radio"
              name={name}
              value={option.value}
              checked={selected === option.value}
              onChange={() => onSelect(option.value)}
            />
            <span className={styles.label}>{option.label}</span>
          </label>
        ))}
      </div>
      {children}
    </fieldset>
  );
}
