/**
 * The outlines of the four tone marks, as drawn in Sarabun Regular (Thai
 * subset of @fontsource/sarabun), so that the buttons show the mark alone,
 * without the dotted circle it otherwise needs to sit on.
 *
 * SVG path data in font units: 1000 per em, y pointing up, x around the
 * consonant the mark sits on (hence the negative values).
 *
 * Sarabun: Copyright 2018 The Sarabun Project Authors
 * (https://github.com/cadsondemak/Sarabun), under the SIL Open Font License 1.1.
 * Extracted once from the font file; extract again if the font changes.
 */
import type { ToneMark } from '../../thai/types';

/** A mark written above a consonant: every tone mark but "none". */
export type WrittenToneMark = Exclude<ToneMark, 'none'>;

export interface MarkOutline {
  minX: number;
  maxX: number;
  d: string;
}

/** The lowest and highest points of the four marks, shared so that they line up. */
export const MARKS_BOTTOM = 689;
export const MARKS_TOP = 957;

export const TONE_MARK_OUTLINES: Record<WrittenToneMark, MarkOutline> = {
  eek: {
    minX: -155,
    maxX: -75,
    d: 'M-155 903L-75 903L-75 689L-155 689Z',
  },
  thoo: {
    minX: -355,
    maxX: 31,
    d: 'M31 945Q22 868 -24.5 810Q-71 752 -146 720.5Q-221 689 -313 689L-351 689L-351 729Q-326 739 -302 757Q-278 775 -261 797Q-266 796 -276 796Q-313 796 -334 818.5Q-355 841 -355 877Q-355 912 -331 934.5Q-307 957 -269 957Q-231 957 -206.5 933Q-182 909 -182 869Q-182 839 -197.5 804.5Q-213 770 -239 748Q-160 759 -106.5 814.5Q-53 870 -45 945ZM-306 875Q-306 859 -295.5 848.5Q-285 838 -269 838Q-253 838 -242.5 848.5Q-232 859 -232 875Q-232 891 -242.5 901.5Q-253 912 -269 912Q-286 912 -296 902Q-306 892 -306 875Z',
  },
  trii: {
    minX: -458,
    maxX: 7,
    d: 'M7 934Q7 860 -21.5 804.5Q-50 749 -103 719Q-156 689 -226 689L-226 734Q-207 745 -194.5 770.5Q-182 796 -182 823Q-182 847 -191.5 865.5Q-201 884 -220 890L-282 846L-344 889Q-367 876 -385 842Q-381 843 -373 843Q-339 843 -317 821Q-295 799 -295 766Q-295 732 -317 710.5Q-339 689 -373 689Q-414 689 -436 716.5Q-458 744 -458 787Q-458 844 -426 888.5Q-394 933 -342 944L-282 900L-220 944Q-172 938 -147 905Q-122 872 -122 829Q-122 783 -154 745Q-111 762 -89.5 812Q-68 862 -68 934ZM-339 766Q-339 782 -348.5 791Q-358 800 -374 800Q-390 800 -399 791Q-408 782 -408 766Q-408 750 -399 740.5Q-390 731 -374 731Q-358 731 -348.5 740.5Q-339 750 -339 766Z',
  },
  djattawaa: {
    minX: -242,
    maxX: 11,
    d: 'M11 774L-77 774L-77 689L-153 689L-153 774L-242 774L-242 833L-153 833L-153 917L-77 917L-77 833L11 833Z',
  },
};
