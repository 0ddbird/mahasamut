import { Link } from 'react-router';

/** The site home page: the games for learning to read Thai. */
export function HomePage() {
  return (
    <main>
      <h1>Scriptomancy - Thai</h1>
      <p>Games to learn to read the Thai script.</p>
      <ul>
        <li>
          <Link to="/tones">
            Wannayuk <span lang="th">วรรณยุกต์</span>
          </Link>
          : find the tone of a syllable.
        </li>
        <li>
          Akson sam mu <span lang="th">อักษรสามหมู่</span>: find the class of a consonant. Coming
          soon.
        </li>
      </ul>
    </main>
  );
}
