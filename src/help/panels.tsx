/**
 * The help panels a game can offer in learning mode, one per help page. Each
 * game picks the ones that fit it.
 */
import { AudioLines, Brackets, Type } from 'lucide-react';
import type { HelpPanel } from '../components/HelpPanels/HelpPanels';
import { LazyMarkdown as Markdown } from '../components/Markdown/LazyMarkdown';
import { CONSONANTS_HELP, TONES_HELP, VOWELS_HELP } from './index';

/** The consonants by class: a letter for an icon. */
export const CONSONANTS_PANEL: HelpPanel = {
  id: 'consonants',
  label: 'Consonants',
  icon: Type,
  color: 'var(--color-help-blue)',
  content: <Markdown text={CONSONANTS_HELP} />,
};

/** The vowels: brackets for an icon, as a vowel is written around its consonant. */
export const VOWELS_PANEL: HelpPanel = {
  id: 'vowels',
  label: 'Vowels',
  icon: Brackets,
  color: 'var(--color-help-purple)',
  content: <Markdown text={VOWELS_HELP} />,
};

/** The tone rules by class: a sound wave for an icon. */
export const TONES_PANEL: HelpPanel = {
  id: 'tones',
  label: 'Tones',
  icon: AudioLines,
  color: 'var(--color-help-orange)',
  content: <Markdown text={TONES_HELP} />,
};
