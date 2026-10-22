/**
 * The stable name of a word, with no Thai character in it: its code points in
 * hexadecimal, four digits at least, joined by hyphens (ไม่ is 0e44-0e21-0e48).
 * It names the word's audio files and its entries in the review tool.
 */
export function wordId(text: string): string {
  return [...text].map((char) => char.codePointAt(0)!.toString(16).padStart(4, '0')).join('-');
}
