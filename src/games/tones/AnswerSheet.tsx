import type { SyllableAnswers } from '../../thai/answers';
import { AnswerRow } from './AnswerRow';
import styles from './AnswerSheet.module.scss';
import type { CheckResult, PlayerAnswers, Step } from './check';
import { rowFeedback } from './feedback';
import {
  CONSONANT_CLASS_OPTIONS,
  FINAL_KIND_OPTIONS,
  LIVENESS_OPTIONS,
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

/**
 * The five steps of the answer, in the order the reasoning goes: the class of
 * the onset, the vowel length and the final make the syllable live or dead,
 * which gives the tone.
 */
export function AnswerSheet({ answers, onChange, correction }: AnswerSheetProps) {
  // Keeps the type of each answer tied to its step.
  const choose = <K extends Step>(step: K, value: SyllableAnswers[K]) =>
    onChange({ ...answers, [step]: value });

  const feedbackOf = <K extends Step>(step: K) =>
    correction && rowFeedback(step, correction.result, correction.analyses);

  const locked = correction !== undefined;

  return (
    <div className={styles.sheet}>
      <AnswerRow
        title="Consonant class"
        name="consonantClass"
        options={CONSONANT_CLASS_OPTIONS}
        selected={answers.consonantClass}
        onSelect={(value) => choose('consonantClass', value)}
        disabled={locked}
        feedback={feedbackOf('consonantClass')}
      />
      <AnswerRow
        title="Vowel length"
        name="vowelLength"
        options={VOWEL_LENGTH_OPTIONS}
        selected={answers.vowelLength}
        onSelect={(value) => choose('vowelLength', value)}
        disabled={locked}
        feedback={feedbackOf('vowelLength')}
      />
      <AnswerRow
        title="Final"
        name="finalKind"
        options={FINAL_KIND_OPTIONS}
        selected={answers.finalKind}
        onSelect={(value) => choose('finalKind', value)}
        disabled={locked}
        feedback={feedbackOf('finalKind')}
      />
      <AnswerRow
        title="Syllable"
        name="liveness"
        options={LIVENESS_OPTIONS}
        selected={answers.liveness}
        onSelect={(value) => choose('liveness', value)}
        disabled={locked}
        feedback={feedbackOf('liveness')}
      />
      <AnswerRow
        title="Tone"
        name="tone"
        options={TONE_OPTIONS}
        selected={answers.tone}
        onSelect={(value) => choose('tone', value)}
        disabled={locked}
        feedback={feedbackOf('tone')}
      />
    </div>
  );
}
