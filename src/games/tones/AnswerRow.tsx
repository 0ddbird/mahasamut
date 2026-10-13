import styles from './AnswerRow.module.scss';
import type { Option } from './options';

interface AnswerRowProps<T extends string> {
  /** What the row asks, e.g. "Vowel length". */
  title: string;
  /** Groups the row's radio buttons; must be unique on the page. */
  name: string;
  options: readonly Option<T>[];
  /** The option chosen so far, if any. */
  selected?: T;
  onSelect: (value: T) => void;
}

/**
 * One step of the answer: a row of choices, one of which can be selected.
 * The choices are radio buttons shown as buttons, so the row also works with
 * the keyboard (arrow keys) and with screen readers.
 */
export function AnswerRow<T extends string>({
  title,
  name,
  options,
  selected,
  onSelect,
}: AnswerRowProps<T>) {
  return (
    <fieldset className={styles.row}>
      <legend className={styles.title}>{title}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
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
    </fieldset>
  );
}
