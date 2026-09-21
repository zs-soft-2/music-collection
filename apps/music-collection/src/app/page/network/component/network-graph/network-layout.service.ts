import { DestroyRef, Injectable, inject } from '@angular/core';
import { performanceLog } from '@music-collection/common/engine';

import { WorkerBridge } from '../../../../worker';
import { NetworkEdge, NetworkNode } from '../../network.model';
import { Point, toLayoutRequest } from './network-graph.layout';
import {
	NetworkLayoutRequest,
	NetworkLayoutResult,
	runLayout,
} from './network-graph.simulation';
import {
	NETWORK_LAYOUT_MEASURE,
	NETWORK_LAYOUT_WORKER,
} from './network-layout.model';

/**
 * Places the network's nodes, in a worker where there is one.
 *
 * Every run is written to the performance log with how long the main thread
 * was blocked by it, so the worker's gain can be read off
 * (`__mcPerf.compare('network.layout')` in the console) instead of guessed
 * at.
 */
@Injectable()
export class NetworkLayoutService {
	private readonly bridge = new WorkerBridge<
		NetworkLayoutRequest,
		NetworkLayoutResult
	>(inject(NETWORK_LAYOUT_WORKER, { optional: true }), runLayout);

	constructor() {
		inject(DestroyRef).onDestroy(() => this.bridge.terminate());
	}

	/**
	 * The settled positions, or null when the graph was torn down while the
	 * worker was still simulating.
	 */
	public async simulate(
		nodes: NetworkNode[],
		edges: NetworkEdge[],
		focusId: string | null,
		previous: ReadonlyMap<string, Point>
	): Promise<ReadonlyMap<string, Point> | null> {
		const onWorker = this.bridge.ready();
		const run = performanceLog.start(NETWORK_LAYOUT_MEASURE, {
			nodes: nodes.length,
			edges: edges.length,
			worker: onWorker,
		});

		if (onWorker) {
			// From here the main thread is free until the answer comes back.
			run.pause();
		}

		const result = await this.bridge.run(
			toLayoutRequest(nodes, edges, focusId, previous)
		);

		if (onWorker) {
			run.resume();
		}

		run.end(
			result
				? { computeMs: Math.round(result.computeMs * 100) / 100 }
				: { dropped: true }
		);

		return result?.positions ?? null;
	}
}
