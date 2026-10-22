import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';
import { isWholeIn } from './settings';
import styles from './NumberStepper.module.scss';

interface NumberStepperProps {
  /** What the number is, for screen readers: "Number of questions". */
  label: string;
  /** What is counted, as the error says it: "questions", "seconds". */
  unit: string;
  /** Shown after the number, if other than the unit: "seconds per question". */
  after?: string;
  /** Said by − and +: "Fewer questions", "More questions". */
  fewerLabel: string;
  moreLabel: string;
  range: { min: number; max: number };
  /** Kept as typed, so the field can be empty or wrong while the player edits it. */
  text: string;
  onChange: (text: string) => void;
}

/**
 * A whole number within `range`: − and + to step it, which a phone needs, and
 * the field itself to type it. A number typed out of range says why Play is
 * disabled, and one step brings it back within the range.
 */
export function NumberStepper({
  label,
  unit,
  after = unit,
  fewerLabel,
  moreLabel,
  range,
  text,
  onChange,
}: NumberStepperProps) {
  const errorId = useId();
  const value = Number(text);
  const valid = isWholeIn(value, range);
  const typed = text.trim() !== '' && Number.isFinite(value);

  /** One step from the number typed, within the range; the minimum if none is typed. */
  const step = (by: number) => {
    const next = typed ? Math.round(value) + by : range.min;
    onChange(String(Math.min(range.max, Math.max(range.min, next))));
  };

  return (
    <div className={styles.stepper}>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          aria-label={fewerLabel}
          disabled={typed && value <= range.min}
          onClick={() => step(-1)}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <input
          className={styles.input}
          type="number"
          min={range.min}
          max={range.max}
          aria-label={label}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          // Screen readers say why Play is disabled, from the field itself.
          aria-invalid={!valid}
          aria-describedby={valid ? undefined : errorId}
        />
        <button
          type="button"
          className={styles.button}
          aria-label={moreLabel}
          disabled={typed && value >= range.max}
          onClick={() => step(1)}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <span className={styles.unit} aria-hidden="true">
          {after}
        </span>
      </div>
      {!valid && (
        <p className={styles.error} id={errorId}>
          Choose {range.min} to {range.max} {unit}.
        </p>
      )}
    </div>
  );
}
