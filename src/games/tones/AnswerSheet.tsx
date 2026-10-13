import type { SyllableAnswers } from '../../thai/answers';
import { AnswerRow } from './AnswerRow';
import styles from './AnswerSheet.module.scss';
import type { PlayerAnswers } from './check';
import {
  CONSONANT_CLASS_OPTIONS,
  FINAL_KIND_OPTIONS,
  LIVENESS_OPTIONS,
  TONE_OPTIONS,
  VOWEL_LENGTH_OPTIONS,
} from './options';

interface AnswerSheetProps {
  answers: PlayerAnswers;
  onChange: (answers: PlayerAnswers) => void;
}

/**
 * The five steps of the answer, in the order the reasoning goes: the class of
 * the onset, the vowel length and the final make the syllable live or dead,
 * which gives the tone.
 */
export function AnswerSheet({ answers, onChange }: AnswerSheetProps) {
  // Keeps the type of each answer tied to its step.
  const choose = <K extends keyof SyllableAnswers>(step: K, value: SyllableAnswers[K]) =>
    onChange({ ...answers, [step]: value });

  return (
    <div className={styles.sheet}>
      <AnswerRow
        title="Consonant class"
        name="consonantClass"
        options={CONSONANT_CLASS_OPTIONS}
        selected={answers.consonantClass}
        onSelect={(value) => choose('consonantClass', value)}
      />
      <AnswerRow
        title="Vowel length"
        name="vowelLength"
        options={VOWEL_LENGTH_OPTIONS}
        selected={answers.vowelLength}
        onSelect={(value) => choose('vowelLength', value)}
      />
      <AnswerRow
        title="Final"
        name="finalKind"
        options={FINAL_KIND_OPTIONS}
        selected={answers.finalKind}
        onSelect={(value) => choose('finalKind', value)}
      />
      <AnswerRow
        title="Syllable"
        name="liveness"
        options={LIVENESS_OPTIONS}
        selected={answers.liveness}
        onSelect={(value) => choose('liveness', value)}
      />
      <AnswerRow
        title="Tone"
        name="tone"
        options={TONE_OPTIONS}
        selected={answers.tone}
        onSelect={(value) => choose('tone', value)}
      />
    </div>
  );
}
