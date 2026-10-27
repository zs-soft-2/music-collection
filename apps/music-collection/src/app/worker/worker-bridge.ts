/**
 * A request / reply channel to one web worker, with the same work on the
 * main thread as a fallback.
 *
 * The fallback is not a nicety: it is what runs in unit tests, in a browser
 * without module workers, and whenever the worker fails to start or throws.
 * A caller therefore never has to know which side did the work — only
 * `ready()` tells it, and only so it can measure the difference.
 */

import { WorkerReply, WorkerRequest } from './worker-message';

/** Turned off, every bridge runs on the main thread: the A/B switch. */
let enabled = true;

export function setWorkersEnabled(value: boolean): void {
	enabled = value;
}

export function areWorkersEnabled(): boolean {
	return enabled;
}

export class WorkerBridge<TRequest, TResponse> {
	private worker: Worker | null = null;
	/** The worker could not be started, or died: do not try again. */
	private broken = false;
	private nextId = 1;
	private readonly pending = new Map<
		number,
		{
			request: TRequest;
			settle: (response: TResponse | null) => void;
		}
	>();

	/**
	 * @param factory Creates the worker; null where the app did not provide
	 * one (a test, or a build that does not bundle it).
	 * @param onMainThread The same work, synchronously.
	 */
	constructor(
		private readonly factory: (() => Worker) | null,
		private readonly onMainThread: (request: TRequest) => TResponse
	) {}

	/** Whether the next run goes to a worker; starts it on the first call. */
	public ready(): boolean {
		if (!enabled || this.broken || !this.factory) {
			return false;
		}

		if (!this.worker) {
			try {
				this.worker = this.factory();
				this.worker.addEventListener('message', (event) =>
					this.onReply(event.data as WorkerReply<TResponse>)
				);
				this.worker.addEventListener('error', (event) =>
					this.onFailure(event.message)
				);
			} catch (error) {
				console.warn(
					'Worker unavailable, staying on the main thread',
					error
				);
				this.broken = true;
				this.worker = null;
			}
		}
		return !!this.worker;
	}

	/**
	 * Runs the work and resolves with its result, or with null when the
	 * bridge was terminated before the answer arrived. It never rejects:
	 * a broken worker falls back to the main thread.
	 */
	public run(request: TRequest): Promise<TResponse | null> {
		if (!this.ready() || !this.worker) {
			return Promise.resolve(this.onMainThread(request));
		}
		const id = this.nextId++;
		const worker = this.worker;

		return new Promise<TResponse | null>((settle) => {
			this.pending.set(id, { request, settle });

			try {
				worker.postMessage({
					id,
					payload: request,
				} as WorkerRequest<TRequest>);
			} catch (error) {
				// An unclonable request: nothing will ever come back for it.
				this.pending.delete(id);
				console.warn('Worker request could not be posted', error);
				settle(this.onMainThread(request));
			}
		});
	}

	public terminate(): void {
		this.worker?.terminate();
		this.worker = null;
		// Whoever is still waiting is being torn down with the bridge:
		// redoing the work on the main thread would only cost a freeze.
		for (const { settle } of this.pending.values()) {
			settle(null);
		}
		this.pending.clear();
	}

	private onReply(reply: WorkerReply<TResponse>): void {
		const waiting = this.pending.get(reply.id);

		if (!waiting) {
			return;
		}
		this.pending.delete(reply.id);

		if (reply.error !== undefined || reply.payload === undefined) {
			console.warn('Worker failed, redoing the work here', reply.error);
			waiting.settle(this.onMainThread(waiting.request));
			return;
		}
		waiting.settle(reply.payload);
	}

	private onFailure(message: string): void {
		console.warn('Worker died, staying on the main thread', message);
		this.broken = true;
		this.worker?.terminate();
		this.worker = null;

		const waiting = [...this.pending.values()];

		this.pending.clear();

		for (const { request, settle } of waiting) {
			settle(this.onMainThread(request));
		}
	}
}
