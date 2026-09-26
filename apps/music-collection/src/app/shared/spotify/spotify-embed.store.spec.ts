import { TestBed } from '@angular/core/testing';

import {
	SpotifyEmbedController,
	SpotifyEmbedEffect,
	SpotifyEmbedEvents,
} from '../../data/spotify';
import { SpotifyEmbedStore } from './spotify-embed.store';

const ALBUM = 'spotify:album:4aawyAB9vmqN3uQ7FjRGTy';
const OTHER = 'spotify:album:1ATL5GLyefJaxhQzSPVrLX';

function controller(): jest.Mocked<SpotifyEmbedController> {
	return {
		play: jest.fn(),
		pause: jest.fn(),
		resume: jest.fn(),
		togglePlay: jest.fn(),
		seek: jest.fn(),
		loadUri: jest.fn(),
		destroy: jest.fn(),
		addListener: jest.fn(),
	} as unknown as jest.Mocked<SpotifyEmbedController>;
}

/** A frame that is handed over only when the test says so. */
class FrameMaker {
	public events: SpotifyEmbedEvents | null = null;
	public readonly frames: jest.Mocked<SpotifyEmbedController>[] = [];
	public uris: string[] = [];
	private settle:
		| ((controller: SpotifyEmbedController) => void)
		| ((reason: unknown) => void)
		| null = null;
	private reject: ((reason: unknown) => void) | null = null;

	public createFrame(
		_element: HTMLElement,
		uri: string,
		_heightPx: number,
		events: SpotifyEmbedEvents
	): Promise<SpotifyEmbedController> {
		this.events = events;
		this.uris.push(uri);

		return new Promise<SpotifyEmbedController>((resolve, reject) => {
			this.settle = resolve;
			this.reject = reject;
		});
	}

	/** Hands the frame over, as Spotify's API would. */
	public made(): jest.Mocked<SpotifyEmbedController> {
		const made = controller();
		this.frames.push(made);
		(this.settle as (c: SpotifyEmbedController) => void)(made);

		return made;
	}

	public failed(): void {
		this.reject?.(new Error('no frame'));
	}
}

describe('SpotifyEmbedStore', () => {
	let maker: FrameMaker;
	let store: InstanceType<typeof SpotifyEmbedStore>;
	let host: HTMLElement;

	beforeEach(() => {
		maker = new FrameMaker();
		TestBed.configureTestingModule({
			providers: [{ provide: SpotifyEmbedEffect, useValue: maker }],
		});
		store = TestBed.inject(SpotifyEmbedStore);
		host = document.createElement('div');
	});

	it('offers nothing to press before a frame is asked for', () => {
		expect(store.controllable()).toBe(false);
		expect(store.uri()).toBeNull();
	});

	it('is worth a button while the frame is on its way', () => {
		store.show(host, ALBUM, 352);

		expect(store.controllable()).toBe(true);
		expect(store.uri()).toBe(ALBUM);
	});

	it('puts the next record in the frame it already has', async () => {
		store.show(host, ALBUM, 352);
		const frame = maker.made();
		await Promise.resolve();

		store.show(host, OTHER, 352);

		expect(frame.loadUri).toHaveBeenCalledWith(OTHER);
		expect(maker.uris).toEqual([ALBUM]);
	});

	it('catches up the record the page moved on to while it waited', async () => {
		store.show(host, ALBUM, 352);
		store.show(host, OTHER, 352);
		const frame = maker.made();
		await Promise.resolve();

		expect(frame.loadUri).toHaveBeenCalledWith(OTHER);
	});

	it('follows what the frame reports about itself', async () => {
		store.show(host, ALBUM, 352);
		maker.made();
		await Promise.resolve();
		maker.events?.ready();
		maker.events?.update({
			isPaused: false,
			isBuffering: false,
			duration: 180_000,
			position: 4_000,
		});

		expect(store.playing()).toBe(true);
		expect(store.durationMs()).toBe(180_000);
		expect(store.positionMs()).toBe(4_000);
	});

	it('starts the record only while it is not playing', async () => {
		store.show(host, ALBUM, 352);
		const frame = maker.made();
		await store.play();

		expect(frame.togglePlay).toHaveBeenCalledTimes(1);

		maker.events?.update({
			isPaused: false,
			isBuffering: false,
			duration: 180_000,
			position: 0,
		});
		await store.play();

		expect(frame.togglePlay).toHaveBeenCalledTimes(1);
		await store.togglePlay();

		expect(frame.togglePlay).toHaveBeenCalledTimes(2);
	});

	it('throws away a frame handed over after the page left', async () => {
		store.show(host, ALBUM, 352);
		store.detach();
		const frame = maker.made();
		await Promise.resolve();

		expect(frame.destroy).toHaveBeenCalled();
		expect(store.uri()).toBeNull();
		expect(store.controllable()).toBe(false);
	});

	it('takes its frame off the page when the page is gone', async () => {
		store.show(host, ALBUM, 352);
		const frame = maker.made();
		await Promise.resolve();

		store.detach();

		expect(frame.destroy).toHaveBeenCalled();
		expect(store.status()).toBe('idle');
	});

	it('offers no button where Spotify will not hand a frame over', async () => {
		store.show(host, ALBUM, 352);
		maker.failed();
		await Promise.resolve();
		await Promise.resolve();

		expect(store.status()).toBe('unavailable');
		expect(store.controllable()).toBe(false);
	});
});
