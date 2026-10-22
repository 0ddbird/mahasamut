import { AnswerRow } from '../../../components/AnswerRow/AnswerRow';
import { CONSONANT_CLASS_OPTIONS } from '../../../games/shared/options';
import type { ConsonantClass } from '../../../thai/types';
import type { Reveal } from '../../protocol';

interface ConsonantClassPanelProps {
  chosen: ConsonantClass | undefined;
  onChange: (chosen: ConsonantClass) => void;
  locked: boolean;
  reveal?: Extract<Reveal, { game: 'consonantClass' }>;
}

/**
 * The answer row of Consonant classes inside a multiplayer room.
 */
export function ConsonantClassPanel({
  chosen,
  onChange,
  locked,
  reveal,
}: ConsonantClassPanelProps) {
  return (
    <AnswerRow
      title="Consonant class"
      name="consonantClass"
      options={CONSONANT_CLASS_OPTIONS}
      selected={chosen}
      onSelect={onChange}
      disabled={locked || reveal !== undefined}
      feedback={
        reveal === undefined
          ? undefined
          : {
              chosen,
              expected: reveal.consonantClass,
              accepted: [reveal.consonantClass],
            }
      }
    />
  );
}
