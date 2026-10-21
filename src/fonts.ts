/**
 * Fonts, bundled with the app (no CDN).
 *
 * Thai is written in two styles, and the player should learn to read both:
 * - Noto Sans Thai has no loops, as on signs and on the web;
 * - Sarabun has loops, as in textbooks and official documents.
 *
 * Only the Thai and Latin subsets are loaded, in regular (400) and bold (700):
 * the interface is in English. Fredoka, a rounded Latin font with no Thai,
 * draws the titles and the logo only, in medium (500) and bold (700). The font
 * families are named in styles/fonts.scss.
 */
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-700.css';
// Noto Sans draws the answers in IPA (ɛ ɔ ɯ ɤ ː), which Sarabun has not:
// basic and extended Latin, so that a whole answer is in the one font.
import '@fontsource/noto-sans/latin-400.css';
import '@fontsource/noto-sans/latin-700.css';
import '@fontsource/noto-sans/latin-ext-400.css';
import '@fontsource/noto-sans/latin-ext-700.css';
import '@fontsource/noto-sans-thai/thai-400.css';
import '@fontsource/noto-sans-thai/thai-700.css';
import '@fontsource/noto-sans-thai/latin-400.css';
import '@fontsource/noto-sans-thai/latin-700.css';
import '@fontsource/sarabun/thai-400.css';
import '@fontsource/sarabun/thai-700.css';
import '@fontsource/sarabun/latin-400.css';
import '@fontsource/sarabun/latin-700.css';
