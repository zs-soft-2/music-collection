import { Provider } from '@angular/core';

import { NETWORK_LAYOUT_WORKER } from './component/network-graph/network-layout.model';

/**
 * Wires the force layout to its web worker. It lives apart from the graph
 * component because `import.meta.url` is what the bundler needs to emit the
 * worker, and the components and their tests are better off not carrying it.
 */
export function provideNetworkLayoutWorker(): Provider {
	return {
		provide: NETWORK_LAYOUT_WORKER,
		useValue: () =>
			new Worker(
				new URL(
					'./component/network-graph/network-graph.worker',
					import.meta.url
				),
				{ type: 'module' }
			),
	};
}
