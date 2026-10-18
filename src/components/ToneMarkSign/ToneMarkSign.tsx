import { MARKS_BOTTOM, MARKS_TOP, TONE_MARK_OUTLINES } from './outlines';
import type { WrittenToneMark } from './outlines';
import styles from './ToneMarkSign.module.scss';

/** Room around the outline, in font units, so that its edges are not cut. */
const PADDING = 20;

interface ToneMarkSignProps {
  mark: WrittenToneMark;
  className?: string;
}

/**
 * A tone mark alone, drawn in the outline of the site's Thai font: written as
 * text, it would need a dotted circle (◌่) to sit on. The four marks share the
 * same height, so that they line up in a row; each is as wide as its outline.
 * The drawing is hidden from screen readers: what shows it names the mark.
 */
export function ToneMarkSign({ mark, className }: ToneMarkSignProps) {
  const { minX, maxX, d } = TONE_MARK_OUTLINES[mark];
  // Font units point up, SVG units down: the path is flipped, and the view
  // box spans the flipped heights.
  const viewBox = [
    minX - PADDING,
    -MARKS_TOP - PADDING,
    maxX - minX + 2 * PADDING,
    MARKS_TOP - MARKS_BOTTOM + 2 * PADDING,
  ].join(' ');

  return (
    <svg
      className={[styles.sign, className].filter(Boolean).join(' ')}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} transform="scale(1 -1)" />
    </svg>
  );
}
