import type { SyllableAnswers } from '../../thai/answers';
import { TONE_MARK } from '../../thai/types';
import { AnswerRow } from './AnswerRow';
import styles from './AnswerSheet.module.scss';
import type { CheckResult, GameAnswers, PlayerAnswers, Step } from './check';
import { rowFeedback } from './feedback';
import {
  CONSONANT_CLASS_OPTIONS,
  FINAL_KIND_OPTIONS,
  LIVENESS_OPTIONS,
  TONE_MARK_OPTIONS,
  TONE_OPTIONS,
  VOWEL_LENGTH_OPTIONS,
} from './options';

/** Once the answers are checked: the result, and the analyses it was checked against. */
export interface Correction {
  result: CheckResult;
  analyses: readonly SyllableAnswers[];
}

interface AnswerSheetProps {
  answers: PlayerAnswers;
  onChange: (answers: PlayerAnswers) => void;
  /** Once the answers are checked: the rows are locked and show what was right. */
  correction?: Correction;
}

const NOT_NEEDED_WITH_A_MARK = 'Not needed with a tone mark';

/**
 * The six steps of the answer, in the order the reasoning goes: the class of
 * the onset, then the tone mark. With a mark, the tone follows from the class
 * and the mark alone, so the three middle steps are locked. Without one, the
 * vowel length and the final make the syllable live or dead, which gives the
 * tone.
 */
export function AnswerSheet({ answers, onChange, correction }: AnswerSheetProps) {
  // Keeps the type of each answer tied to its step.
  const choose = <K extends Step>(step: K, value: GameAnswers[K]) =>
    onChange({ ...answers, [step]: value });

  const feedbackOf = <K extends Step>(step: K) =>
    correction && rowFeedback(step, correction.result, correction.analyses);

  const checked = correction !== undefined;
  const markChosen = answers.toneMark !== undefined && answers.toneMark !== TONE_MARK.None;
  const middleStep = {
    disabled: checked || markChosen,
    note: markChosen ? NOT_NEEDED_WITH_A_MARK : undefined,
  };

  return (
    <div className={styles.sheet}>
      <AnswerRow
        title="Consonant class"
        name="consonantClass"
        options={CONSONANT_CLASS_OPTIONS}
        selected={answers.consonantClass}
        onSelect={(value) => choose('consonantClass', value)}
        disabled={checked}
        feedback={feedbackOf('consonantClass')}
      />
      <AnswerRow
        title="Tone mark"
        name="toneMark"
        options={TONE_MARK_OPTIONS}
        selected={answers.toneMark}
        onSelect={(value) => choose('toneMark', value)}
        disabled={checked}
        feedback={feedbackOf('toneMark')}
      />
      <AnswerRow
        title="Vowel length"
        name="vowelLength"
        options={VOWEL_LENGTH_OPTIONS}
        selected={answers.vowelLength}
        onSelect={(value) => choose('vowelLength', value)}
        feedback={feedbackOf('vowelLength')}
        {...middleStep}
      />
      <AnswerRow
        title="Final"
        name="finalKind"
        options={FINAL_KIND_OPTIONS}
        selected={answers.finalKind}
        onSelect={(value) => choose('finalKind', value)}
        feedback={feedbackOf('finalKind')}
        {...middleStep}
      />
      <AnswerRow
        title="Syllable"
        name="liveness"
        options={LIVENESS_OPTIONS}
        selected={answers.liveness}
        onSelect={(value) => choose('liveness', value)}
        feedback={feedbackOf('liveness')}
        {...middleStep}
      />
      <AnswerRow
        title="Tone"
        name="tone"
        options={TONE_OPTIONS}
        selected={answers.tone}
        onSelect={(value) => choose('tone', value)}
        disabled={checked}
        feedback={feedbackOf('tone')}
      />
    </div>
  );
}
