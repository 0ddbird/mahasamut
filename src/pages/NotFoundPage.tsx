import { Link } from 'react-router';

/** Shown for any path the app does not know. */
export function NotFoundPage() {
  return (
    <main>
      <h1>Page not found</h1>
      <Link to="/">Back to home</Link>
    </main>
  );
}
