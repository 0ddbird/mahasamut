/**
 * Setup of the component tests (*.test.tsx), run before each of their files.
 *
 * Vitest globals are off, so Testing Library cannot find a global `afterEach`
 * to clean the DOM up between tests by itself: it is done here, once.
 */
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);
