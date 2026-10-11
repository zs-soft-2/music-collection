import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CoverMosaicConductor } from './cover-mosaic.conductor';
import { CoverMosaicService } from './cover-mosaic.service';
import { CoverTurn } from './cover-mosaic.setting';

/** A mosaic as the conductor sees one, with a note of what it was asked. */
class FakeMosaic {
	public readonly turned: number[] = [];
	/** Held back where a test wants to see a turn that has not finished. */
	public settle: (() => void) | null = null;

	public constructor(private tiles: readonly number[]) {}

	public readonly turnable = (): readonly number[] => this.tiles;

	public readonly turn = (tile: number): Promise<void> => {
		this.turned.push(tile);

		if (!this.settle) {
			return Promise.resolve();
		}

		return new Promise((done) => (this.settle = () => done()));
	};

	/** The mosaic going off the screen, or running out of spare covers. */
	public standStill(): void {
		this.tiles = [];
	}
}

describe('CoverMosaicConductor', () => {
	const rotateSeconds = signal(0);
	const turn = signal<CoverTurn>('fade');
	let draw: jest.SpyInstance<number, []>;

	const conductor = (): CoverMosaicConductor =>
		TestBed.inject(CoverMosaicConductor);

	/** One pace of the page's clock, with the turn it starts settling. */
	const waitOnePace = async (seconds: number): Promise<void> => {
		jest.advanceTimersByTime(seconds * 1000);
		await Promise.resolve();
	};

	beforeEach(() => {
		jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
		draw = jest.spyOn(Math, 'random').mockReturnValue(0);
		rotateSeconds.set(0);
		turn.set('fade');

		TestBed.configureTestingModule({
			providers: [
				{
					provide: CoverMosaicService,
					useValue: { rotateSeconds, turn },
				},
			],
		});
	});

	afterEach(() => {
		jest.useRealTimers();
		draw.mockRestore();
	});

	it('holds the page still until a pace is set', async () => {
		const mosaic = new FakeMosaic([1, 2, 3, 4]);

		conductor().register(mosaic);
		TestBed.tick();

		await waitOnePace(60);

		expect(mosaic.turned).toEqual([]);
	});

	/**
	 * The whole point: a page of mosaics is one picture changing every pace,
	 * not one on every card.
	 */
	it('turns a single tile across the whole page each pace', async () => {
		rotateSeconds.set(5);

		const first = new FakeMosaic([1, 2, 3, 4]);
		const second = new FakeMosaic([5, 6, 7, 8]);

		conductor().register(first);
		conductor().register(second);
		TestBed.tick();

		await waitOnePace(5);

		expect(first.turned).toEqual([1]);
		expect(second.turned).toEqual([]);
	});

	/** Every tile on the page is one ticket, so the draw spreads over covers. */
	it('draws from the tiles of every mosaic at once', async () => {
		rotateSeconds.set(5);

		const first = new FakeMosaic([1, 2, 3, 4]);
		const second = new FakeMosaic([5, 6, 7, 8]);

		conductor().register(first);
		conductor().register(second);
		TestBed.tick();

		// Six tickets along the eight on the page: the second mosaic's third.
		draw.mockReturnValue(6 / 8);
		await waitOnePace(5);

		expect(first.turned).toEqual([]);
		expect(second.turned).toEqual([7]);
	});

	/** A mosaic offering nothing is passed over rather than holding a pace. */
	it('passes over a mosaic with no tile to offer', async () => {
		rotateSeconds.set(5);

		const still = new FakeMosaic([1, 2]);
		const moving = new FakeMosaic([5, 6]);

		still.standStill();
		conductor().register(still);
		conductor().register(moving);
		TestBed.tick();

		await waitOnePace(5);

		expect(still.turned).toEqual([]);
		expect(moving.turned).toEqual([5]);
	});

	/**
	 * A cover coming in slowly must not be what lets two tiles change at
	 * once: the next pace is given up rather than overlapped.
	 */
	it('lets a turn finish before starting the next', async () => {
		rotateSeconds.set(5);

		const mosaic = new FakeMosaic([1, 2, 3, 4]);

		mosaic.settle = () => undefined;
		conductor().register(mosaic);
		TestBed.tick();

		await waitOnePace(5);
		await waitOnePace(5);

		expect(mosaic.turned).toEqual([1]);

		mosaic.settle?.();
		await Promise.resolve();
		await waitOnePace(5);

		expect(mosaic.turned).toEqual([1, 1]);
	});

	/** A card scrolled out of the page takes its tiles with it. */
	it('stops drawing a mosaic that has left', async () => {
		rotateSeconds.set(5);

		const mosaic = new FakeMosaic([1, 2, 3, 4]);
		const leave = conductor().register(mosaic);

		TestBed.tick();
		leave();

		await waitOnePace(5);

		expect(mosaic.turned).toEqual([]);
	});

	/** Nothing moves in a tab somebody left open behind another one. */
	it('holds the page still while the reader is in another tab', async () => {
		rotateSeconds.set(5);

		const mosaic = new FakeMosaic([1, 2, 3, 4]);

		conductor().register(mosaic);
		TestBed.tick();

		jest.spyOn(document, 'visibilityState', 'get').mockReturnValue(
			'hidden'
		);
		document.dispatchEvent(new Event('visibilitychange'));
		TestBed.tick();

		await waitOnePace(5);

		expect(mosaic.turned).toEqual([]);
	});
});
