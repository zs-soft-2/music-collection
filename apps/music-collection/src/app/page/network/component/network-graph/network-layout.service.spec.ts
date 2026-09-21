import { TestBed } from '@angular/core/testing';
import { performanceLog } from '@music-collection/common/engine';

import { WorkerReply, WorkerRequest } from '../../../../worker';
import { NetworkNode } from '../../network.model';
import { NetworkLayoutResult } from './network-graph.simulation';
import {
	NETWORK_LAYOUT_MEASURE,
	NETWORK_LAYOUT_WORKER,
} from './network-layout.model';
import { NetworkLayoutService } from './network-layout.service';

const nodes: NetworkNode[] = [
	{
		id: 'artist:1',
		uid: '1',
		kind: 'band',
		label: 'Death',
		imageUrl: null,
		owned: true,
		distance: 0,
		link: null,
	},
];

/** A worker that answers the next request with the given positions. */
function workerAnswering(positions: Map<string, { x: number; y: number }>) {
	let onMessage:
		((event: { data: WorkerReply<NetworkLayoutResult> }) => void) | null =
		null;

	return {
		addEventListener: (
			type: string,
			listener: (event: {
				data: WorkerReply<NetworkLayoutResult>;
			}) => void
		) => {
			if (type === 'message') {
				onMessage = listener;
			}
		},
		postMessage: (request: WorkerRequest<unknown>) =>
			onMessage?.({
				data: {
					id: request.id,
					payload: { positions, computeMs: 12 },
				},
			}),
		terminate: () => undefined,
	} as unknown as Worker;
}

describe('NetworkLayoutService', () => {
	beforeEach(() => performanceLog.clear());

	function serviceWith(worker?: Worker): NetworkLayoutService {
		TestBed.configureTestingModule({
			providers: [
				NetworkLayoutService,
				...(worker
					? [
							{
								provide: NETWORK_LAYOUT_WORKER,
								useValue: () => worker,
							},
						]
					: []),
			],
		});

		return TestBed.inject(NetworkLayoutService);
	}

	it('lays the network out here when the app provided no worker', async () => {
		const positions = await serviceWith().simulate(
			nodes,
			[],
			'artist:1',
			new Map()
		);

		expect(positions?.get('artist:1')).toEqual({ x: 0, y: 0 });

		const [sample] = performanceLog.samplesOf(NETWORK_LAYOUT_MEASURE);

		expect(sample.detail).toMatchObject({ worker: false, nodes: 1 });
		// Nothing was handed away: the whole run blocked the main thread.
		expect(sample.blockingMs).toBe(sample.totalMs);
	});

	it('takes the worker`s positions, and counts the wait as not blocking', async () => {
		const placed = new Map([['artist:1', { x: 7, y: 9 }]]);
		const positions = await serviceWith(workerAnswering(placed)).simulate(
			nodes,
			[],
			'artist:1',
			new Map()
		);

		expect(positions?.get('artist:1')).toEqual({ x: 7, y: 9 });

		const [sample] = performanceLog.samplesOf(NETWORK_LAYOUT_MEASURE);

		expect(sample.detail).toMatchObject({ worker: true, computeMs: 12 });
		expect(sample.blockingMs).toBeLessThanOrEqual(sample.totalMs);
	});

	it('answers with nothing when the graph is destroyed mid-layout', async () => {
		const silent = {
			addEventListener: () => undefined,
			postMessage: () => undefined,
			terminate: () => undefined,
		} as unknown as Worker;
		const service = serviceWith(silent);
		const pending = service.simulate(nodes, [], 'artist:1', new Map());

		TestBed.resetTestingModule();

		await expect(pending).resolves.toBeNull();
	});
});
