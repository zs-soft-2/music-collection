import {
	WorkerBridge,
	areWorkersEnabled,
	setWorkersEnabled,
} from './worker-bridge';
import { WorkerReply, WorkerRequest } from './worker-message';

type Listener = (event: unknown) => void;

/** Stands in for a real worker: nothing is posted anywhere, tests reply. */
class FakeWorker {
	public readonly posted: WorkerRequest<string>[] = [];
	public terminated = false;

	private readonly listeners = new Map<string, Listener[]>();

	public addEventListener(type: string, listener: Listener): void {
		this.listeners.set(type, [
			...(this.listeners.get(type) ?? []),
			listener,
		]);
	}

	public postMessage(message: WorkerRequest<string>): void {
		this.posted.push(message);
	}

	public terminate(): void {
		this.terminated = true;
	}

	public reply(reply: WorkerReply<string>): void {
		this.emit('message', { data: reply });
	}

	public die(message: string): void {
		this.emit('error', { message });
	}

	private emit(type: string, event: unknown): void {
		for (const listener of this.listeners.get(type) ?? []) {
			listener(event);
		}
	}
}

describe('WorkerBridge', () => {
	const shout = (request: string): string => request.toUpperCase();
	let fake: FakeWorker;
	let bridge: WorkerBridge<string, string>;

	beforeEach(() => {
		jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		fake = new FakeWorker();
		bridge = new WorkerBridge<string, string>(
			() => fake as unknown as Worker,
			shout
		);
	});

	afterEach(() => {
		setWorkersEnabled(true);
		jest.restoreAllMocks();
	});

	it('does the work here when there is no worker to do it', async () => {
		const bridge = new WorkerBridge<string, string>(null, shout);

		expect(bridge.ready()).toBe(false);
		await expect(bridge.run('hello')).resolves.toBe('HELLO');
	});

	it('hands the work to the worker and waits for its answer', async () => {
		expect(bridge.ready()).toBe(true);

		const answer = bridge.run('hello');

		expect(fake.posted).toEqual([{ id: 1, payload: 'hello' }]);

		fake.reply({ id: 1, payload: 'HELLO from the worker' });

		await expect(answer).resolves.toBe('HELLO from the worker');
	});

	it('matches the answers to their requests, in any order', async () => {
		const first = bridge.run('one');
		const second = bridge.run('two');

		fake.reply({ id: 2, payload: 'TWO' });
		fake.reply({ id: 1, payload: 'ONE' });

		await expect(first).resolves.toBe('ONE');
		await expect(second).resolves.toBe('TWO');
	});

	it('redoes the work here when the worker reports a failure', async () => {
		const answer = bridge.run('hello');

		fake.reply({ id: 1, error: 'boom' });

		await expect(answer).resolves.toBe('HELLO');
	});

	it('gives up on a worker that died, and answers the waiting calls', async () => {
		const answer = bridge.run('hello');

		fake.die('boom');

		await expect(answer).resolves.toBe('HELLO');
		expect(fake.terminated).toBe(true);
		expect(bridge.ready()).toBe(false);
	});

	it('answers with nothing once it is torn down', async () => {
		const answer = bridge.run('hello');

		bridge.terminate();

		await expect(answer).resolves.toBeNull();
		expect(fake.terminated).toBe(true);
	});

	it('keeps everything on the main thread while workers are switched off', async () => {
		setWorkersEnabled(false);

		expect(areWorkersEnabled()).toBe(false);
		expect(bridge.ready()).toBe(false);
		await expect(bridge.run('hello')).resolves.toBe('HELLO');
		expect(fake.posted).toEqual([]);
	});
});
