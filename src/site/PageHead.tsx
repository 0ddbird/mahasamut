import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { getClientDevice, trackEvent } from './analytics';
import { normalizeRoute } from './events';
import { pageMeta } from './pageMeta';

/**
 * Keeps the head's title, description and address in step with the page: the
 * site is a single page, so index.html only carries the home page's tags.
 * Renders nothing.
 */
export function PageHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const { title, description, canonical } = pageMeta(pathname);
    document.title = title;
    setTag('meta', 'name', 'description', 'content', description);
    setTag('meta', 'property', 'og:title', 'content', title);
    setTag('meta', 'property', 'og:description', 'content', description);
    setTag('link', 'rel', 'canonical', 'href', canonical);
    setTag('meta', 'property', 'og:url', 'content', canonical);
    setTag('meta', 'name', 'robots', 'content', canonical === null ? 'noindex' : null);

    trackEvent({
      type: 'page_view',
      route: normalizeRoute(pathname),
      device: getClientDevice(),
    });
  }, [pathname]);

  return null;
}

/**
 * Sets the head tag `<tag key="name" attribute="value">`, creating it if
 * needed; a `null` value removes it.
 */
function setTag(
  tag: 'meta' | 'link',
  key: string,
  name: string,
  attribute: string,
  value: string | null,
) {
  let element = document.head.querySelector(`${tag}[${key}="${name}"]`);
  if (value === null) {
    element?.remove();
    return;
  }
  if (element === null) {
    element = document.createElement(tag);
    element.setAttribute(key, name);
    document.head.append(element);
  }
  element.setAttribute(attribute, value);
}
