import { InjectionToken } from '@angular/core';

/**
 * Creates the layout worker. The app provides it (see
 * `provideNetworkLayoutWorker`); without it the layout runs on the main
 * thread, which is what tests do.
 */
export const NETWORK_LAYOUT_WORKER = new InjectionToken<() => Worker>(
	'Network layout worker'
);

/** The name the layout's timings are logged under. */
export const NETWORK_LAYOUT_MEASURE = 'network.layout';
