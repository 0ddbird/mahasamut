import styles from './Logo.module.scss';

/**
 * The site's name, standing in for a logo until there is one: large as the
 * home page title, small in the navigation bar. Its text reads "Mahasamut";
 * the capitals come from the style.
 */
export function Logo({ size }: { size: 'large' | 'small' }) {
  return <span className={`${styles.logo} ${styles[size]}`}>Mahasamut</span>;
}
