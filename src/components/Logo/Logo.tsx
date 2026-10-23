import styles from './Logo.module.scss';

/**
 * The site's name in the navigation bar, standing in for a logo until there
 * is one (the home page has its masthead instead). Its text reads "Mahasamut";
 * the capitals come from the style.
 */
export function Logo() {
  return <span className={styles.logo}>Mahasamut</span>;
}
