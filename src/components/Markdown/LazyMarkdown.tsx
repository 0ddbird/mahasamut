import { lazy, Suspense } from 'react';

// The Markdown renderer is about a third of the site's code, and only the help
// panels use it: it loads the first time one opens, in a chunk of its own.
const Markdown = lazy(() => import('./Markdown').then(({ Markdown }) => ({ default: Markdown })));

interface LazyMarkdownProps {
  /** Markdown with GitHub tables; any HTML in it is shown as text. */
  text: string;
}

/** A text written in Markdown, rendered once the renderer has loaded: empty until then. */
export function LazyMarkdown({ text }: LazyMarkdownProps) {
  return (
    <Suspense fallback={null}>
      <Markdown text={text} />
    </Suspense>
  );
}
