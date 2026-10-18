import type { ComponentType } from 'react';

/** One choice of an answer row: the answer it gives, and how it is shown. */
export interface Option<T extends string> {
  value: T;
  label: string;
  /**
   * Set when the label is Thai that cannot be read aloud on its own (a tone
   * mark sign): screen readers say this instead, and the label is shown only.
   */
  spokenLabel?: string;
  /**
   * A drawing shown in place of the label, hidden from screen readers, which
   * say `spokenLabel` instead: a tone mark drawn alone, without the dotted
   * circle its text needs.
   */
  icon?: ComponentType<{ className?: string }>;
}
