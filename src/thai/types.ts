/** Tone classes of a consonant. The class decides which row of the tone rules applies. */
export const CONSONANT_CLASS = {
  High: 'high',
  Mid: 'mid',
  Low: 'low',
} as const;
export type ConsonantClass = (typeof CONSONANT_CLASS)[keyof typeof CONSONANT_CLASS];
export const CONSONANT_CLASSES: readonly ConsonantClass[] = Object.values(CONSONANT_CLASS);
