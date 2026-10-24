import { SUBTITLE, THAI_TITLE } from './glyphs';
import styles from './Masthead.module.scss';

/**
 * The home page title: มหาสมุด, THE GREAT NOTEBOOK below it, both in the
 * page's text colour. The drawing is hidden from screen readers and search
 * engines, which read the text beside it instead: the site's name, in Latin
 * letters and in Thai, and what it means.
 */
export function Masthead() {
  return (
    <>
      <svg
        className={styles.masthead}
        viewBox="0 0 480 118"
        fill="var(--color-text)"
        aria-hidden="true"
        focusable="false"
      >
        <path d={THAI_TITLE} transform="translate(49.3 69.73)" />
        <path d={SUBTITLE} transform="translate(46.62 101.29)" />
      </svg>
      <span className={styles.text}>
        Mahasamut (<span lang="th">มหาสมุด</span>), the great notebook
      </span>
    </>
  );
}
