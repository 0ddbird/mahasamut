import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Markdown.module.scss';

const COMPONENTS: Components = {
  // The sections of a text sit under the title of what shows it (a help
  // panel's h2): `##` becomes an h3, `###` an h4.
  h1: 'h2',
  h2: 'h3',
  h3: 'h4',
  h4: 'h5',
  // A table too wide for a phone scrolls in its own box, so that its columns
  // are never cut; the box takes the focus, for keyboard users to scroll it.
  table: ({ node: _node, ...props }) => (
    <div className={styles.tableBox} tabIndex={0}>
      <table {...props} />
    </div>
  ),
};

interface MarkdownProps {
  /** Markdown with GitHub tables; any HTML in it is shown as text. */
  text: string;
}

/** A text written in Markdown, such as a help page, with readable Thai in its tables. */
export function Markdown({ text }: MarkdownProps) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
