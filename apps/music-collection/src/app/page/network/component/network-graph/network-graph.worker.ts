/// <reference lib="webworker" />

import type {
	WorkerReply,
	WorkerRequest,
} from '../../../../worker/worker-message';
import {
	NetworkLayoutRequest,
	NetworkLayoutResult,
	runLayout,
} from './network-graph.simulation';

/**
 * The force layout, off the main thread. It is hundreds of simulation ticks
 * over every pair of nodes, and the only reason it ever ran on the main
 * thread is that d3-force is synchronous.
 */
addEventListener(
	'message',
	({ data }: MessageEvent<WorkerRequest<NetworkLayoutRequest>>) => {
		const { id, payload } = data;

		try {
			const reply: WorkerReply<NetworkLayoutResult> = {
				id,
				payload: runLayout(payload),
			};

			postMessage(reply);
		} catch (error) {
			const reply: WorkerReply<NetworkLayoutResult> = {
				id,
				error: error instanceof Error ? error.message : String(error),
			};

			postMessage(reply);
		}
	}
);
