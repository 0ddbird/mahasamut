import type { AnswerMode } from '../../../games/shared/settings';
import { AnswerSheet } from '../../../games/syllable/AnswerSheet';
import { checkAnswers } from '../../../games/syllable/check';
import type { PlayerAnswers } from '../../../games/syllable/check';
import type { Reveal } from '../../protocol';

interface SyllablePanelProps {
  answers: PlayerAnswers;
  onChange: (answers: PlayerAnswers) => void;
  answerMode: AnswerMode;
  locked: boolean;
  reveal?: Extract<Reveal, { game: 'syllable' }>;
}

/**
 * The answer sheet of Find the tone inside a multiplayer room: editable while
 * answering, locked once validated, and showing the correction once the
 * question closes (`reveal`).
 */
export function SyllablePanel({
  answers,
  onChange,
  answerMode,
  locked,
  reveal,
}: SyllablePanelProps) {
  const correction =
    reveal === undefined
      ? undefined
      : {
          result: checkAnswers(answers, reveal.analyses, reveal.mark, answerMode),
          analyses: reveal.analyses,
        };

  return (
    <AnswerSheet
      answers={answers}
      onChange={onChange}
      answerMode={answerMode}
      locked={locked}
      correction={correction}
    />
  );
}
