import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Markdown.module.scss';

/**
 * The sections of a text sit under the title of what shows it (a help panel's
 * h2): `##` becomes an h3, `###` an h4.
 */
const SUB_HEADINGS: Components = { h1: 'h2', h2: 'h3', h3: 'h4', h4: 'h5' };

interface MarkdownProps {
  /** Markdown with GitHub tables; any HTML in it is shown as text. */
  text: string;
}

/** A text written in Markdown, such as a help page, with readable Thai in its tables. */
export function Markdown({ text }: MarkdownProps) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={SUB_HEADINGS}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
