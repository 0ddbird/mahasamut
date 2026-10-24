import { playSound } from '../../audio/playSound';
import type { PlaySound } from '../../audio/playSound';
import { Button } from '../../components/Button/Button';
import { ListenButton } from '../../components/ListenButton/ListenButton';
import { ThaiDisplay } from '../../components/ThaiDisplay/ThaiDisplay';
import { Verdict } from '../../components/Verdict/Verdict';
import { GAME_NAMES } from '../../games/shared/games';
import { QuestionBar } from '../../games/shared/QuestionBar';
import { vowelSoundUrl } from '../../games/vowel/sounds';
import { wordSoundUrl } from '../../thai/words/sounds';
import type { RoomView } from '../protocol';
import { ConsonantClassPanel } from './panels/ConsonantClassPanel';
import { SyllablePanel } from './panels/SyllablePanel';
import { VowelPanel } from './panels/VowelPanel';
import { Ranking } from './Ranking';
import styles from './ResultsScreen.module.scss';

interface ResultsScreenProps {
  view: RoomView;
  onNext: () => void;
  /** The player became host during the game. */
  promoted?: boolean;
  play?: PlaySound;
  soundOf?: (text: string) => string | null;
}

/**
 * The results screen after a question closes: shows the Thai text, the Listen
 * button (for Vowel sounds and Find the tone), the points won, the player's
 * own correction, the host's Next button, and the updated ranking.
 */
export function ResultsScreen({
  view,
  onNext,
  promoted = false,
  play = playSound,
  soundOf = wordSoundUrl,
}: ResultsScreenProps) {
  const { phase } = view;
  if (phase.kind !== 'results') return null;

  const listenUrl =
    phase.reveal.game === 'vowel'
      ? vowelSoundUrl(phase.reveal.vowelId)
      : phase.reveal.game === 'syllable'
        ? soundOf(phase.question.text)
        : null;

  return (
    <main className={styles.page}>
      <h1 className="visually-hidden">{GAME_NAMES[view.game]}</h1>
      <QuestionBar
        questionNumber={phase.index + 1}
        questionCount={view.settings.questionCount}
        remainingMs={null}
        secondsPerQuestion={null}
      />
      <ThaiDisplay text={phase.question.text} />
      {phase.reveal.game !== 'consonantClass' && (
        <ListenButton
          visible={listenUrl !== null}
          context="multi"
          onClick={() => {
            if (listenUrl !== null) play(listenUrl);
          }}
        />
      )}
      <p className={styles.points}>{`+${phase.you.points}`}</p>
      <Verdict correct={phase.you.correct} timeUp={phase.you.answer === null} />
      <div className={styles.panel}>
        {phase.reveal.game === 'syllable' && (
          <SyllablePanel
            answers={phase.you.answer?.game === 'syllable' ? phase.you.answer.answers : {}}
            onChange={() => {}}
            answerMode={view.settings.answerMode}
            locked
            reveal={phase.reveal}
          />
        )}
        {phase.reveal.game === 'consonantClass' && (
          <ConsonantClassPanel
            chosen={
              phase.you.answer?.game === 'consonantClass'
                ? phase.you.answer.consonantClass
                : undefined
            }
            onChange={() => {}}
            locked
            reveal={phase.reveal}
          />
        )}
        {phase.reveal.game === 'vowel' && phase.question.game === 'vowel' && (
          <VowelPanel
            choices={phase.question.choices}
            chosen={phase.you.answer?.game === 'vowel' ? phase.you.answer.sound : undefined}
            onChange={() => {}}
            locked
            reveal={phase.reveal}
            play={play}
          />
        )}
      </div>
      {/* Where Validate was, above the ranking: the host need not scroll past a long class. */}
      {promoted && (
        <p role="status" className={styles.promoted}>
          You are now the host: the game goes on when you say so.
        </p>
      )}
      {view.you.isHost ? (
        <Button onClick={onNext}>{phase.isLast ? 'See the podium' : 'Next'}</Button>
      ) : view.host.connected ? (
        <p className={styles.waiting}>{`Waiting for ${view.host.pseudo}…`}</p>
      ) : (
        <p className={styles.waiting}>{`${view.host.pseudo} is away. The game is paused.`}</p>
      )}
      <section className={styles.rankingSection} aria-label="Ranking">
        <h2 className={styles.heading}>Ranking</h2>
        <Ranking entries={phase.ranking} />
      </section>
    </main>
  );
}
