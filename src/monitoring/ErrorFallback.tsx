import styles from './ErrorFallback.module.scss';

/**
 * Shown in place of the whole site when a page fails to render, which would
 * otherwise leave a blank page. It sits outside the router and the site bar, so
 * the way home is a plain link: loading `/` afresh also gets rid of the broken state.
 */
export function ErrorFallback() {
  return (
    <main className={styles.page}>
      <h1>Something went wrong</h1>
      <a href="/">Back to home</a>
    </main>
  );
}
