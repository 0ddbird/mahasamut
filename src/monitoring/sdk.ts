/**
 * The only parts of the Sentry SDK the site uses. `sentry.ts` loads this module
 * instead of `@sentry/react` itself: importing the whole package as a namespace
 * keeps all of it in the bundle, Replay, Feedback and tracing included, none of
 * which the site turns on. Anything else the monitoring needs is added here.
 */
export { captureException, init } from '@sentry/react';
