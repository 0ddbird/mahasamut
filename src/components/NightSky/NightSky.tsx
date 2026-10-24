import type { CSSProperties, ReactNode } from 'react';
import lanternLarge from '../../assets/home/lantern-large.webp';
import lanternMedium from '../../assets/home/lantern-medium.webp';
import lanternMedium2 from '../../assets/home/lantern-medium-2.webp';
import lanternSmall from '../../assets/home/lantern-small.webp';
import { makeSparks, type Spark, type SparkArea } from './sparks';
import styles from './NightSky.module.scss';

// The wind blows from the right: the sparks fly mostly sideways, to the left,
// rising a little. Around a lantern they start close to it, in % of its box;
// across the sky they are fewer, smaller and slower.
const AROUND: SparkArea = {
  x: [-70, 170],
  y: [-10, 110],
  dx: [-220, -90],
  dy: [-50, -10],
  size: [2, 4.5],
  drift: [9, 18],
};
const FAR: SparkArea = { ...AROUND, size: [1.5, 3] };
const ACROSS_SKY: SparkArea = {
  x: [0, 100],
  y: [5, 95],
  dx: [-260, -120],
  dy: [-40, -10],
  size: [1.5, 3.5],
  drift: [25, 45],
};

const SKY_SPARKS = makeSparks(10, ACROSS_SKY, 7);

// Each lantern sways at its own pace, so that they never move together, and
// has its own sparks around it.
const LANTERNS = [
  {
    src: lanternLarge,
    className: styles.large,
    sway: 9,
    delay: -2,
    sparks: makeSparks(12, AROUND, 11),
  },
  {
    src: lanternSmall,
    className: styles.small,
    sway: 7,
    delay: -5,
    sparks: makeSparks(7, FAR, 13),
  },
  {
    src: lanternMedium,
    className: styles.medium,
    sway: 8,
    delay: 0,
    sparks: makeSparks(10, AROUND, 17),
  },
  {
    src: lanternMedium2,
    className: styles.medium2,
    sway: 10,
    delay: -7,
    sparks: makeSparks(8, FAR, 19),
  },
];

function Sparks({ sparks }: { sparks: Spark[] }) {
  return sparks.map((spark, i) => (
    <span
      key={i}
      className={`${styles.spark} ${styles[spark.tone]}`}
      style={
        {
          '--x': `${spark.x}%`,
          '--y': `${spark.y}%`,
          '--size': `${spark.size}px`,
          '--dx': `${spark.dx}px`,
          '--dy': `${spark.dy}px`,
          '--drift': `${spark.drift}s`,
          '--twinkle': `${spark.twinkle}s`,
          '--delay': `${spark.delay}s`,
        } as CSSProperties
      }
    >
      <span />
    </span>
  ));
}

interface NightSkyProps {
  /** Where the lanterns stand: by the masthead, or by a column of text. */
  layout: 'home' | 'page';
  children: ReactNode;
}

/**
 * A page over the night sky: the sky over the water, paper lanterns that float
 * in place, swaying, and gold sparks around them that the wind carries away,
 * twinkling. Only decoration: hidden from screen readers, and still for those
 * who ask for less motion. The lanterns scroll with the page, in its margins.
 */
export function NightSky({ layout, children }: NightSkyProps) {
  return (
    <div className={`${styles.scene} ${styles[layout]}`}>
      <div className={styles.sky} aria-hidden="true">
        <Sparks sparks={SKY_SPARKS} />
      </div>
      <div className={styles.lanterns} aria-hidden="true">
        {LANTERNS.map(({ src, className, sway, delay, sparks }) => (
          <div key={src} className={`${styles.slot} ${className}`}>
            <div
              className={styles.lantern}
              style={{ '--sway': `${sway}s`, '--delay': `${delay}s` } as CSSProperties}
            >
              <img src={src} alt="" />
            </div>
            <Sparks sparks={sparks} />
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
