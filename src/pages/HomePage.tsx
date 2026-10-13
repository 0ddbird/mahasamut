import { Link } from 'react-router';

/** The landing page: what the game is about, and a way in. */
export function HomePage() {
  return (
    <main>
      <h1>
        Wannayuk <span lang="th">วรรณยุกต์</span>
      </h1>
      <p>Learn to read the tone of Thai syllables.</p>
      <Link to="/play">Start</Link>
    </main>
  );
}
