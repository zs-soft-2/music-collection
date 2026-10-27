import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoverTurn, CoverMosaicService } from '../../data/cover-mosaic';
import { CoverMosaicComponent } from './cover-mosaic.component';

/** Covers whose url says they are not there; the rest load at once. */
const dead = new Set<string>();

/**
 * Covers that are there the moment they are asked for, the way a cached one
 * is. jsdom fetches nothing, so without this no tile would ever be told its
 * cover had arrived.
 */
class CachedImage {
	public onload: (() => void) | null = null;
	public onerror: (() => void) | null = null;
	private asked = '';

	public set src(url: string) {
		this.asked = url;
		void Promise.resolve().then(() =>
			dead.has(url) ? this.onerror?.() : this.onload?.()
		);
	}

	public get src(): string {
		return this.asked;
	}
}

/**
 * The browser's observer, as far as the mosaic is concerned: jsdom has none,
 * so without this the one path the real page always takes — the mosaic being
 * told it is on the screen — would never be walked in a test.
 */
const watchers: ((seen: boolean) => void)[] = [];

class FakeIntersectionObserver {
	public constructor(
		private readonly report: (
			entries: { isIntersecting: boolean }[]
		) => void
	) {
		watchers.push((seen) => this.report([{ isIntersecting: seen }]));
	}

	public observe(): void {
		/* The browser reports when it gets round to it; the test says when. */
	}

	public disconnect(): void {
		/* Nothing held on to. */
	}
}

/** A page with two mosaics on it, the way a list of collections is. */
@Component({
	imports: [CoverMosaicComponent],
	selector: 'mc-two-mosaics',
	template: `
		<mc-cover-mosaic [covers]="covers" />
		<mc-cover-mosaic [covers]="covers" />
	`,
})
class TwoMosaics {
	public readonly covers = covers(9);
}

function covers(count: number): string[] {
	return Array.from({ length: count }, (_, index) => `cover-${index}.jpg`);
}

describe('CoverMosaicComponent', () => {
	let fixture: ComponentFixture<CoverMosaicComponent>;
	const rotateSeconds = signal(0);
	const turn = signal<CoverTurn>('fade');
	/** The conductor's draw, fixed so a test can say which tile it lands on. */
	let draw: jest.SpyInstance<number, []>;

	/** The cover each tile is showing, left to right. */
	const onShow = (): (string | null)[] =>
		Array.from(
			(fixture.nativeElement as HTMLElement).querySelectorAll(
				'.tile > img:last-child'
			)
		).map((image) => image.getAttribute('src'));

	const render = (urls: string[]): void => {
		fixture = TestBed.createComponent(CoverMosaicComponent);
		fixture.componentRef.setInput('covers', urls);
		fixture.detectChanges();
	};

	/** One pace's worth of waiting, with the cover arriving within it. */
	const waitOneTurn = async (seconds: number): Promise<void> => {
		jest.advanceTimersByTime(seconds * 1000);
		await fixture.whenStable();
		fixture.detectChanges();
	};

	beforeEach(() => {
		dead.clear();
		watchers.length = 0;
		jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
		Object.defineProperty(window, 'Image', {
			configurable: true,
			value: CachedImage,
		});
		draw = jest.spyOn(Math, 'random').mockReturnValue(0);
		rotateSeconds.set(0);
		turn.set('fade');

		TestBed.configureTestingModule({
			imports: [CoverMosaicComponent],
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
		Reflect.deleteProperty(window, 'Image');
		Reflect.deleteProperty(window, 'IntersectionObserver');
	});

	/** The mosaic as the browser builds it: an observer watches it. */
	const watched = (urls: string[]): void => {
		Object.defineProperty(window, 'IntersectionObserver', {
			configurable: true,
			value: FakeIntersectionObserver,
		});
		render(urls);
		watchers.forEach((report) => report(true));
		fixture.detectChanges();
	};

	it('draws four tiles however many covers it is given', () => {
		render(covers(9));

		expect(onShow()).toEqual([
			'cover-0.jpg',
			'cover-1.jpg',
			'cover-2.jpg',
			'cover-3.jpg',
		]);
	});

	it('says how many tiles it has, so the square can be laid out', () => {
		render(covers(3));

		expect(
			(fixture.nativeElement as HTMLElement).getAttribute('data-count')
		).toBe('3');
	});

	it('stands still until a pace is set', async () => {
		render(covers(9));

		await waitOneTurn(30);

		expect(onShow()).toEqual([
			'cover-0.jpg',
			'cover-1.jpg',
			'cover-2.jpg',
			'cover-3.jpg',
		]);
	});

	/**
	 * Which tile turns is the conductor's draw — here, fixed on the first —
	 * and the cover it turns to is the one after the last on show, so the
	 * mosaic walks the set rather than swapping the same two pictures back
	 * and forth.
	 */
	it('turns the tile it is asked for, to the next cover', async () => {
		rotateSeconds.set(5);
		render(covers(9));

		await waitOneTurn(5);

		expect(onShow()).toEqual([
			'cover-4.jpg',
			'cover-1.jpg',
			'cover-2.jpg',
			'cover-3.jpg',
		]);

		await waitOneTurn(5);

		expect(onShow()).toEqual([
			'cover-5.jpg',
			'cover-1.jpg',
			'cover-2.jpg',
			'cover-3.jpg',
		]);
	});

	/** A draw landing further along the hat turns that tile instead. */
	it('turns whichever tile the draw lands on', async () => {
		draw.mockReturnValue(0.5);
		rotateSeconds.set(5);
		render(covers(9));

		await waitOneTurn(5);

		expect(onShow()).toEqual([
			'cover-0.jpg',
			'cover-1.jpg',
			'cover-4.jpg',
			'cover-3.jpg',
		]);
	});

	/** The cover being replaced stays under the new one for the fade. */
	it('keeps the old cover under the one turning in', async () => {
		rotateSeconds.set(5);
		render(covers(9));

		await waitOneTurn(5);

		expect(
			(fixture.nativeElement as HTMLElement)
				.querySelector('.tile .under')
				?.getAttribute('src')
		).toBe('cover-0.jpg');
	});

	/** Nothing to turn over to: four covers are the four tiles. */
	it('leaves a set with no spare covers alone', async () => {
		rotateSeconds.set(5);
		render(covers(4));

		await waitOneTurn(5);

		expect(onShow()).toEqual([
			'cover-0.jpg',
			'cover-1.jpg',
			'cover-2.jpg',
			'cover-3.jpg',
		]);
	});

	/**
	 * The pace is the page's, not each card's: a page of mosaics changes one
	 * cover a pace, drawn from all of them, rather than every card on the
	 * screen changing at once.
	 */
	it('moves one cover on the page, not one on every mosaic', async () => {
		rotateSeconds.set(5);
		TestBed.configureTestingModule({ imports: [TwoMosaics] });

		const page = TestBed.createComponent(TwoMosaics);

		page.detectChanges();

		jest.advanceTimersByTime(5000);
		await page.whenStable();
		page.detectChanges();

		const shown = Array.from(
			(page.nativeElement as HTMLElement).querySelectorAll(
				'.tile > img:last-child'
			)
		).map((image) => image.getAttribute('src'));

		// The draw is fixed on the first ticket, so the first mosaic's first
		// tile is the one cover that moved; the second mosaic stands.
		expect(shown).toEqual([
			'cover-4.jpg',
			'cover-1.jpg',
			'cover-2.jpg',
			'cover-3.jpg',
			'cover-0.jpg',
			'cover-1.jpg',
			'cover-2.jpg',
			'cover-3.jpg',
		]);
	});

	/** The movement itself is the collector's, and the styles read it here. */
	it('says which movement it was asked for', () => {
		turn.set('flip');
		render(covers(9));

		expect(
			(fixture.nativeElement as HTMLElement).getAttribute('data-turn')
		).toBe('flip');
	});

	/**
	 * Random is an answer about the movements, not a movement: the styles are
	 * told a real one, drawn afresh for each turn and never the last one.
	 */
	it('draws a movement for every turn where random was asked for', async () => {
		turn.set('random');
		rotateSeconds.set(5);
		render(covers(9));

		expect(
			(fixture.nativeElement as HTMLElement).getAttribute('data-turn')
		).toBe('fade');

		// The first of the three that are not the one standing.
		await waitOneTurn(5);

		expect(
			(fixture.nativeElement as HTMLElement).getAttribute('data-turn')
		).toBe('slide');

		await waitOneTurn(5);

		expect(
			(fixture.nativeElement as HTMLElement).getAttribute('data-turn')
		).toBe('fade');
	});

	/** The browser decides when a mosaic is worth turning; the test plays it. */
	it('turns once the browser says it is on screen', async () => {
		rotateSeconds.set(5);
		watched(covers(9));

		await waitOneTurn(5);

		expect(onShow()[0]).toBe('cover-4.jpg');
	});

	/**
	 * The pages resolve their collections from live data, so the same covers
	 * arrive again in a new array every time anything ticks. That is the same
	 * mosaic, and it goes on from where it was — before this, a page with a
	 * stream behind it reset to the first four faster than it could turn, and
	 * the picture never changed at all.
	 */
	it('goes on turning when the same covers arrive again', async () => {
		rotateSeconds.set(5);
		render(covers(9));

		await waitOneTurn(5);

		expect(onShow()[0]).toBe('cover-4.jpg');

		fixture.componentRef.setInput('covers', covers(9));
		fixture.detectChanges();

		expect(onShow()[0]).toBe('cover-4.jpg');

		await waitOneTurn(5);

		expect(onShow()[0]).toBe('cover-5.jpg');
	});

	/**
	 * The Cover Art Archive, Discogs and Spotify all answer with a 404 often
	 * enough that a mosaic has to expect one. A dead cover is written off and
	 * the turn goes on to the next, rather than the picture standing still for
	 * another whole pace over a record whose picture is simply gone.
	 */
	it('passes over a cover that will not load within the same turn', async () => {
		dead.add('cover-4.jpg');
		dead.add('cover-5.jpg');
		rotateSeconds.set(5);
		render(covers(9));

		await waitOneTurn(5);

		expect(onShow()[0]).toBe('cover-6.jpg');
	});

	/**
	 * A tile is turning for as long as the movement lasts, and no longer: the
	 * styles read it off the tile, and a square where every tile still said
	 * it was turning played the next movement on all four covers at once —
	 * which is what a mosaic looks like when it has forgotten which cover it
	 * just changed.
	 */
	it('leaves only the tile it has just turned turning', async () => {
		// A draw that walks the four tiles, so each of them turns once.
		const tiles = [0, 0.25, 0.5, 0.75, 0];
		let taken = 0;

		draw.mockImplementation(() => tiles[taken++ % tiles.length]);
		rotateSeconds.set(5);
		render(covers(9));

		for (let turned = 0; turned < 5; turned++) {
			await waitOneTurn(5);
		}

		expect(
			(fixture.nativeElement as HTMLElement).querySelectorAll(
				'.tile.is-turning'
			)
		).toHaveLength(1);
	});

	/**
	 * A cover resolved late, a record joining the set, the catalog answering
	 * again: the array is not the same one, but the picture is. The covers on
	 * show stay where they are rather than the square changing all four at
	 * once, back to covers it walked past minutes ago.
	 */
	it('keeps the covers on show when the set grows', async () => {
		rotateSeconds.set(5);
		render(covers(9));

		await waitOneTurn(5);
		await waitOneTurn(5);

		expect(onShow()).toEqual([
			'cover-5.jpg',
			'cover-1.jpg',
			'cover-2.jpg',
			'cover-3.jpg',
		]);

		fixture.componentRef.setInput('covers', ['late.jpg', ...covers(9)]);
		fixture.detectChanges();

		expect(onShow()).toEqual([
			'cover-5.jpg',
			'cover-1.jpg',
			'cover-2.jpg',
			'cover-3.jpg',
		]);
	});

	/** Only the tile whose cover is gone changes; the other three stand. */
	it('fills the tile whose cover left the set, in its place', async () => {
		rotateSeconds.set(5);
		render(covers(9));

		await waitOneTurn(5);

		fixture.componentRef.setInput(
			'covers',
			covers(9).filter((url) => url !== 'cover-2.jpg')
		);
		fixture.detectChanges();

		expect(onShow()).toEqual([
			'cover-4.jpg',
			'cover-1.jpg',
			'cover-0.jpg',
			'cover-3.jpg',
		]);
	});

	/** The walk follows the covers on show, not where they sat in the array. */
	it('goes on from the cover on show after the set is reordered', async () => {
		rotateSeconds.set(5);
		render(covers(9));

		await waitOneTurn(5);

		fixture.componentRef.setInput('covers', ['late.jpg', ...covers(9)]);
		fixture.detectChanges();

		await waitOneTurn(5);

		expect(onShow()).toEqual([
			'cover-5.jpg',
			'cover-1.jpg',
			'cover-2.jpg',
			'cover-3.jpg',
		]);
	});

	/** A set that really did change is a different picture, and starts over. */
	it('starts over on a different set of covers', async () => {
		rotateSeconds.set(5);
		render(covers(9));

		await waitOneTurn(5);

		expect(onShow()[0]).toBe('cover-4.jpg');

		fixture.componentRef.setInput(
			'covers',
			covers(9).map((url) => `other-${url}`)
		);
		fixture.detectChanges();

		expect(onShow()).toEqual([
			'other-cover-0.jpg',
			'other-cover-1.jpg',
			'other-cover-2.jpg',
			'other-cover-3.jpg',
		]);
	});
});
