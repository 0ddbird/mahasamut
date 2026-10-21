import { Link } from 'react-router';
import styles from './NotFoundPage.module.scss';

/** Shown for any path the app does not know. */
export function NotFoundPage() {
  return (
    <main className={styles.page}>
      <h1>Page not found</h1>
      <Link to="/">Back to home</Link>
    </main>
  );
}
