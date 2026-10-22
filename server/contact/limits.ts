/**
 * How often messages are accepted: at most 2 per hour and 5 per day for one
 * visitor, and 30 per day for the whole site. Everything is kept in memory,
 * so a restart of the service forgets it, which is fine for a limit this small.
 * Node loads this file as it is, by stripping its types: no enums, no
 * namespaces, no parameter properties.
 */
import { isIP } from 'node:net';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PER_IP_PER_HOUR = 2;
const PER_IP_PER_DAY = 5;
const PER_SITE_PER_DAY = 30;

/** Splits an IPv6 address into its eight 16-bit groups. */
function ipv6Groups(ip: string): number[] {
  let text = ip.split('%')[0].toLowerCase();
  // A dotted IPv4 tail (::ffff:1.2.3.4) stands for the last two groups.
  const dotted = text.match(/^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (dotted) {
    const [, head, a, b, c, d] = dotted;
    const high = (Number(a) << 8) | Number(b);
    const low = (Number(c) << 8) | Number(d);
    text = `${head}${high.toString(16)}:${low.toString(16)}`;
  }
  const [before, after] = text.split('::');
  const first = before === '' ? [] : before.split(':');
  const last = after === undefined || after === '' ? [] : after.split(':');
  const missing = after === undefined ? 0 : 8 - first.length - last.length;
  return [...first, ...Array<string>(missing).fill('0'), ...last].map((group) =>
    parseInt(group, 16),
  );
}

/**
 * The key a visitor is limited by. An IPv4 address is its own key, and so is
 * the IPv4 address inside an IPv4-mapped IPv6 address (::ffff:a.b.c.d). Any
 * other IPv6 address is keyed by its /64 network, the first four groups
 * expanded and in lowercase, because one visitor usually owns a whole /64.
 */
export function ipKey(ip: string): string {
  const family = isIP(ip.split('%')[0]);
  if (family !== 6) return ip;
  const groups = ipv6Groups(ip);
  const mapped = groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  if (mapped) {
    return [groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255].join('.');
  }
  return groups
    .slice(0, 4)
    .map((group) => group.toString(16).padStart(4, '0'))
    .join(':');
}

/** A place taken in the limits; cancelling it gives the place back. */
export interface Reservation {
  /** Frees the place, e.g. when the message was invalid or could not be sent. */
  cancel(): void;
}

/** One reservation, as the windows remember it. */
interface Entry {
  at: number;
  key: string;
}

/**
 * Creates the limits. `reserve` takes a place for `key` (see `ipKey`) and
 * returns it, or says which limit is reached: 'ip' for the visitor's own,
 * 'site' for the whole site's. A reservation counts from the moment `reserve`
 * returns until it is cancelled, and a refused call counts for nothing.
 * Windows slide: a place comes back an hour (or a day) after it was taken.
 */
export function createLimits(now: () => number): {
  reserve(key: string): Reservation | 'ip' | 'site';
} {
  let entries: Entry[] = [];

  function prune(at: number): void {
    entries = entries.filter((entry) => at - entry.at < DAY);
  }

  return {
    reserve(key) {
      const at = now();
      prune(at);
      const mine = entries.filter((entry) => entry.key === key);
      const lastHour = mine.filter((entry) => at - entry.at < HOUR).length;
      if (lastHour >= PER_IP_PER_HOUR || mine.length >= PER_IP_PER_DAY) return 'ip';
      if (entries.length >= PER_SITE_PER_DAY) return 'site';
      const entry: Entry = { at, key };
      entries.push(entry);
      return {
        cancel() {
          entries = entries.filter((other) => other !== entry);
        },
      };
    },
  };
}
