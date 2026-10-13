import { Check, X } from 'lucide-react';
import styles from './AnswerRow.module.scss';
import { OPTION_FEEDBACK, optionFeedback } from './feedback';
import type { OptionFeedback, RowFeedback } from './feedback';
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
  /** Locks the row, once the answers are checked. */
  disabled?: boolean;
  /** Once the answers are checked: what each choice shows. */
  feedback?: RowFeedback<T>;
}

/**
 * Said to screen readers after the choice's label; the icons and colours that
 * show the same thing on screen are decorative.
 */
const SPOKEN_FEEDBACK: Record<Exclude<OptionFeedback, 'none'>, string> = {
  [OPTION_FEEDBACK.Right]: '(right)',
  [OPTION_FEEDBACK.Wrong]: '(wrong)',
  [OPTION_FEEDBACK.Expected]: '(the right answer)',
  [OPTION_FEEDBACK.AlsoAccepted]: '(also accepted)',
};

/**
 * One step of the answer: a row of choices, one of which can be selected.
 * The choices are radio buttons shown as buttons, so the row also works with
 * the keyboard (arrow keys) and with screen readers. Once the answers are
 * checked, each choice shows whether it was right, wrong or expected, with a
 * colour and an icon, so that the colour is never the only cue.
 */
export function AnswerRow<T extends string>({
  title,
  name,
  options,
  selected,
  onSelect,
  disabled = false,
  feedback,
}: AnswerRowProps<T>) {
  // A disabled fieldset disables every radio button inside it.
  return (
    <fieldset className={styles.row} disabled={disabled}>
      <legend className={styles.title}>{title}</legend>
      <div className={styles.options}>
        {options.map((option) => {
          const state = feedback ? optionFeedback(option.value, feedback) : OPTION_FEEDBACK.None;
          return (
            <label key={option.value} className={styles.option}>
              <input
                className={styles.input}
                type="radio"
                name={name}
                value={option.value}
                checked={selected === option.value}
                onChange={() => onSelect(option.value)}
              />
              <span className={`${styles.label} ${styles[state]}`}>
                {option.label}
                {state !== OPTION_FEEDBACK.None && (
                  <>
                    <FeedbackIcon state={state} />
                    {/* A separate space: a leading space inside the span would be
                        dropped from the accessible name ("Long(wrong)"). */}{' '}
                    <span className={styles.spoken}>{SPOKEN_FEEDBACK[state]}</span>
                  </>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** ✓ for a right, expected or accepted choice, ✗ for a wrong one. */
function FeedbackIcon({ state }: { state: Exclude<OptionFeedback, 'none'> }) {
  const Icon = state === OPTION_FEEDBACK.Wrong ? X : Check;
  return <Icon className={styles.icon} size={16} strokeWidth={3} aria-hidden="true" />;
}
