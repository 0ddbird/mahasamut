import styles from './Logo.module.scss';

/**
 * The site's name in the navigation bar: มหาสมุด, handwritten like the home
 * page's masthead. Screen readers read "Mahasamut" instead, so that the link
 * home keeps that name.
 */
export function Logo() {
  return (
    <span className={styles.logo}>
      <span lang="th" aria-hidden="true">
        มหาสมุด
      </span>
      <span className={styles.name}>Mahasamut</span>
    </span>
  );
}
