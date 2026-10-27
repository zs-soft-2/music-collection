import { Provider } from '@angular/core';

/**
 * What the tests get instead of `network-layout.worker-provider` (see the
 * `moduleNameMapper` of `jest.config.ts`): the real one is written with
 * `import.meta.url`, which is how the bundler finds the worker and what
 * jest's CommonJS transform cannot load.
 *
 * Providing nothing is the honest stand-in: without a worker the layout runs
 * on the main thread, which is where a test wants it anyway.
 */
export function provideNetworkLayoutWorker(): Provider {
	return [];
}
