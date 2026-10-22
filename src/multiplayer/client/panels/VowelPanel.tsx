import { playSound } from '../../../audio/playSound';
import type { PlaySound } from '../../../audio/playSound';
import { AnswerRow } from '../../../components/AnswerRow/AnswerRow';
import type { Option } from '../../../components/AnswerRow/option';
import { SOUND_VOWEL, vowelSoundUrl } from '../../../games/vowel/sounds';
import { spokenIpa } from '../../../thai/vowels/ipa';
import type { Reveal } from '../../protocol';

const toOption = (sound: string): Option<string> => ({
  value: sound,
  label: `/${sound}/`,
  spokenLabel: spokenIpa(sound),
});

interface VowelPanelProps {
  choices: readonly string[];
  chosen: string | undefined;
  onChange: (sound: string) => void;
  locked: boolean;
  reveal?: Extract<Reveal, { game: 'vowel' }>;
  play?: PlaySound;
}

/**
 * The answer row of Vowel sounds inside a multiplayer room: clicking an IPA
 * choice plays its recording just like in solo mode.
 */
export function VowelPanel({
  choices,
  chosen,
  onChange,
  locked,
  reveal,
  play = playSound,
}: VowelPanelProps) {
  const playChoice = (sound: string) => {
    const id = SOUND_VOWEL.get(sound);
    if (id !== undefined) play(vowelSoundUrl(id));
  };

  return (
    <AnswerRow
      title="Sound"
      name="sound"
      options={choices.map(toOption)}
      selected={chosen}
      onSelect={onChange}
      onActivate={playChoice}
      disabled={locked || reveal !== undefined}
      feedback={
        reveal === undefined
          ? undefined
          : {
              chosen,
              expected: reveal.expected,
              accepted: [reveal.expected],
            }
      }
    />
  );
}
