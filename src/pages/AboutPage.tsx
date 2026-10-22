import { Link } from 'react-router';
import { GAME_GOALS, GAME_IDS, GAME_NAMES, GAME_PATHS } from '../games/shared/games';
import { KOFI_URL } from '../site/support';
import styles from './AboutPage.module.scss';

/**
 * Where the name comes from, what the site is, its games (linked, which also
 * helps search engines find them), the credits of the sources they are built
 * on, and how to support or reach its author; linked from the footer of every
 * page.
 */
export function AboutPage() {
  return (
    <main className={styles.page}>
      <h1>About Mahasamut</h1>
      <p>
        From <span lang="th">มหา</span> <i>maha</i>, “great”, and <span lang="th">สมุด</span>{' '}
        <i>samut</i>, “notebook”, and it sounds just like <span lang="th">มหาสมุทร</span>, “ocean”.
      </p>
      <p>A set of short games to learn to read Thai script, made by a developer learning Thai.</p>

      <h2>The games</h2>
      <ul>
        {GAME_IDS.map((game) => (
          <li key={game}>
            <Link to={GAME_PATHS[game]}>{GAME_NAMES[game]}</Link> — {GAME_GOALS[game]}
          </li>
        ))}
      </ul>

      <h2>Credits</h2>
      <ul>
        <li>
          The words come from the word list of{' '}
          <a href="https://github.com/PyThaiNLP/pythainlp">PyThaiNLP</a>, and how common each one is
          from the Thai National Corpus of Chulalongkorn University.
        </li>
        <li>The sounds are recorded with a Google Cloud voice, and chosen by ear.</li>
      </ul>

      <p>
        If you like the games, you can <a href={KOFI_URL}>support me on Ko-fi</a>. A question, an
        idea, a mistake in a word? <Link to="/contact">Write to me</Link>.
      </p>
    </main>
  );
}
