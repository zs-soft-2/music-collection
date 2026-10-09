import { DOCUMENT } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	computed,
	effect,
	inject,
	input,
	linkedSignal,
	signal,
} from '@angular/core';

import {
	COVER_MOVEMENTS,
	CoverMosaicService,
	CoverMovement,
	DEFAULT_COVER_TURN,
} from '../../data/cover-mosaic';

/** One tile of the mosaic: what it shows, and what it is turning over from. */
interface MosaicTile {
	/** Handed out afresh on every turn, so a turned tile is a new element. */
	key: number;
	/** The cover on show; the set is read by url rather than by position. */
	url: string;
	/** The cover it is replacing, kept under it; null on a tile that stands. */
	under: string | null;
}

/**
 * A set of records as a single picture: four of its covers in a square.
 *
 * It can be set to move. One tile at a time turns over to a cover further
 * down the set, so twenty records are not represented forever by the same
 * four — the mosaic walks the collection instead of standing for its first
 * four albums. The collector sets the pace and the movement in their profile
 * and it stands still until they do, because a picture that moves unasked is
 * a distraction and every turn is a cover fetched over the network.
 *
 * What it costs is kept to what is being looked at: a tile turns only while
 * the mosaic is on the screen and in the tab the reader is in, the new cover
 * is fetched before the tile is pointed at it, and a cover that will not load
 * is not asked for twice.
 *
 * The host carries the size, so the same square works as a thumbnail in a
 * list row and as the artwork of a card.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-cover-mosaic',
	template: `
		@for (tile of tiles(); track tile.key) {
			<span class="tile" [class.is-turning]="!!tile.under">
				@if (tile.under) {
					<img class="under" [src]="tile.under" alt="" />
				}
				<img [src]="tile.url" alt="" loading="lazy" />
			</span>
		}
	`,
	host: {
		'[attr.data-count]': 'tiles().length',
		'[attr.data-turn]': 'turn()',
	},
	styles: `
		:host {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			width: 100%;
			height: 100%;
			overflow: hidden;

			/*
			 * One length for every movement, so the pace of the page is the
			 * same whichever one is chosen. Long enough to be seen as a
			 * change rather than a jump, short enough not to be a show.
			 */
			--mc-cover-turn-time: 450ms;
		}

		/* One cover on its own fills the square rather than a quarter of it. */
		:host([data-count='1']) {
			grid-template-columns: 1fr;
		}

		/* Two covers stand side by side, three keep the first whole. */
		:host([data-count='3']) .tile:first-child {
			grid-row: span 2;
		}

		/* A tile holds what it is turning over from until the new cover is in. */
		.tile {
			position: relative;
			display: block;
			min-width: 0;
			min-height: 0;
			overflow: hidden;
		}

		.tile img {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.tile .under {
			position: absolute;
			inset: 0;
		}

		/* The cover coming in stands over the one it replaces. */
		.tile.is-turning img:last-child {
			position: relative;
		}

		/*
		 * The movements. Each is the new cover's animation, and the one being
		 * replaced holds its place underneath — or moves out of the way where
		 * the movement says it should. The covers are fetched before any of
		 * this starts, so none of them is waiting on the network.
		 */

		/* Dissolve: the new cover simply arrives. */
		:host([data-turn='fade']) .tile.is-turning img:last-child {
			animation: mc-cover-fade var(--mc-cover-turn-time) ease-out;
		}

		/* Slide: it drops in from above and pushes the old one out below. */
		:host([data-turn='slide']) .tile.is-turning img:last-child {
			animation: mc-cover-slide-in var(--mc-cover-turn-time) ease-in-out;
		}

		:host([data-turn='slide']) .tile.is-turning .under {
			animation: mc-cover-slide-out var(--mc-cover-turn-time) ease-in-out
				forwards;
		}

		/* Flip: the tile turns over, the old cover on one face, the new on the other. */
		:host([data-turn='flip']) .tile.is-turning {
			perspective: 320px;
		}

		:host([data-turn='flip']) .tile.is-turning img:last-child {
			animation: mc-cover-flip-in calc(var(--mc-cover-turn-time) / 2)
				calc(var(--mc-cover-turn-time) / 2) ease-out backwards;
		}

		:host([data-turn='flip']) .tile.is-turning .under {
			animation: mc-cover-flip-out calc(var(--mc-cover-turn-time) / 2)
				ease-in forwards;
		}

		/* Zoom: the new cover settles back into the square. */
		:host([data-turn='zoom']) .tile.is-turning img:last-child {
			animation: mc-cover-zoom var(--mc-cover-turn-time)
				cubic-bezier(0.2, 0, 0.1, 1);
		}

		@keyframes mc-cover-fade {
			from {
				opacity: 0;
			}

			to {
				opacity: 1;
			}
		}

		@keyframes mc-cover-slide-in {
			from {
				transform: translateY(-100%);
			}

			to {
				transform: translateY(0);
			}
		}

		@keyframes mc-cover-slide-out {
			from {
				transform: translateY(0);
			}

			to {
				transform: translateY(100%);
			}
		}

		@keyframes mc-cover-flip-in {
			from {
				transform: rotateY(-90deg);
			}

			to {
				transform: rotateY(0);
			}
		}

		@keyframes mc-cover-flip-out {
			from {
				transform: rotateY(0);
			}

			to {
				transform: rotateY(90deg);
			}
		}

		@keyframes mc-cover-zoom {
			from {
				opacity: 0;
				transform: scale(1.25);
			}

			to {
				opacity: 1;
				transform: scale(1);
			}
		}

		/* A reader who asked for less movement gets the change, not the show. */
		@media (prefers-reduced-motion: reduce) {
			.tile.is-turning img:last-child,
			.tile.is-turning .under {
				animation: none;
			}
		}
	`,
})
export class CoverMosaicComponent {
	private readonly document = inject(DOCUMENT);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly destroyRef = inject(DestroyRef);
	private readonly settings = inject(CoverMosaicService);

	/** Covers of the set, in the order they are resolved. */
	public readonly covers = input<string[]>([]);
	/** How many tiles the mosaic has; fewer keeps it readable when small. */
	public readonly limit = input(4);

	/**
	 * The covers, read by what they are rather than which array they came in.
	 *
	 * A page resolves its collections from live data: the catalog, the shelf
	 * and the definition are all streams, and every tick of any of them hands
	 * the mosaic a brand-new array of the very same urls. Taken at face value
	 * that is a new set, and a new set starts the tiles over — which is how a
	 * mosaic on a busy page can walk its covers all day and still show the
	 * first four. It is the urls that make a set, so that is what is compared.
	 */
	private readonly set = computed(() => this.covers(), {
		equal: (before, after) =>
			before.length === after.length &&
			before.every((url, at) => url === after[at]),
	});

	/** Drawn afresh for every turn, where the collector asked for random. */
	private readonly drawn = signal<CoverMovement>(DEFAULT_COVER_TURN);

	/** What one cover changing to the next looks like; the styles do the rest. */
	protected readonly turn = computed<CoverMovement>(() => {
		const chosen = this.settings.turn();

		return chosen === 'random' ? this.drawn() : chosen;
	});

	/**
	 * The tiles as they stand.
	 *
	 * A set that changed does not throw the picture away: every tile whose
	 * cover is still in the set goes on standing, and only the holes are
	 * filled, from the covers nothing is showing. The pages resolve their
	 * collections from live data, and a cover that arrives late, a record
	 * joining the set or the catalog simply answering again all hand the
	 * mosaic a different array — starting over on each of those is how a
	 * mosaic comes to change all four of its covers at once, back to the
	 * four it walked past minutes ago.
	 *
	 * A set with nothing in common with the one before it is a different
	 * picture, and that one does start over: nothing is kept, so all four
	 * tiles are filled afresh.
	 */
	protected readonly tiles = linkedSignal<
		{ covers: string[]; limit: number },
		MosaicTile[]
	>({
		source: () => ({ covers: this.set(), limit: this.limit() }),
		computation: ({ covers, limit }, previous) => {
			const room = Math.min(limit, covers.length);
			const standing = (previous?.value ?? []).slice(0, room);
			const inSet = new Set(covers);
			const shown = new Set(
				standing
					.filter((tile) => inSet.has(tile.url))
					.map((tile) => tile.url)
			);
			// What a hole can be filled with: in the order of the set, and
			// never a cover one of the standing tiles already has.
			const spare = covers.filter((url) => !shown.has(url));
			const tiles: MosaicTile[] = [];

			for (let at = 0; at < room; at++) {
				const tile = standing[at];

				if (tile && inSet.has(tile.url)) {
					tiles.push(tile);

					continue;
				}

				const url = spare.shift();

				if (url !== undefined) {
					tiles.push({ key: this.takeKey(), url, under: null });
				}
			}

			return tiles;
		},
	});

	/** Keys handed out in order, so the lowest is the tile that has stood longest. */
	private keys = 0;
	/** Covers that would not load, so a tile stops asking for them. */
	private readonly broken = new Set<string>();
	/** Whether a turn is still waiting on its cover, so they do not pile up. */
	private turning = false;
	/** Whether the mosaic is on the screen at all. */
	private readonly onScreen = signal(true);
	/** Whether this is the tab the reader is looking at. */
	private readonly awake = signal(true);
	/** A reader who asked for less movement gets none. */
	private readonly still =
		this.document.defaultView?.matchMedia?.(
			'(prefers-reduced-motion: reduce)'
		)?.matches ?? false;

	/**
	 * How long a tile stands before the next one turns, in milliseconds; 0
	 * where nothing should move. A set with no more covers than tiles has
	 * nothing to turn over to.
	 */
	private readonly pace = computed(() => {
		const seconds = this.settings.rotateSeconds();

		if (
			!seconds ||
			this.still ||
			this.set().length <= this.limit() ||
			!this.onScreen() ||
			!this.awake()
		) {
			return 0;
		}

		return seconds * 1000;
	});

	public constructor() {
		this.watchScreen();
		this.watchTab();

		effect((onCleanup) => {
			const pace = this.pace();

			if (!pace) {
				return;
			}

			let repeat: ReturnType<typeof setInterval> | null = null;
			/*
			 * A page draws a mosaic for every collection the collector is
			 * after, and they all arrive at the same moment. Starting each
			 * one's clock where it was built would have the whole screen
			 * blink at once, every time. The first turn is waited out
			 * somewhere between one and two paces instead, and the rest of
			 * them follow from wherever that landed — so the page keeps
			 * moving, a tile here and a tile there.
			 */
			const first = setTimeout(
				() => {
					this.turnOne();
					repeat = setInterval(() => this.turnOne(), pace);
				},
				pace + Math.random() * pace
			);

			onCleanup(() => {
				clearTimeout(first);

				if (repeat) {
					clearInterval(repeat);
				}
			});
		});
	}

	/**
	 * Turns the tile that has stood longest over to a cover none of the
	 * others is showing. The cover is fetched first and the tile changes once
	 * it is there: pointing a tile at a url the browser has not loaded yet
	 * would leave a hole where a cover was.
	 *
	 * A cover that will not load is written off and the next one tried in the
	 * same turn rather than at the following one. Covers come from other
	 * people's servers and a dead one among them is ordinary; spending a whole
	 * pace on each is how a mosaic comes to look like it has stopped.
	 */
	private turnOne(): void {
		if (this.turning) {
			return;
		}

		const covers = this.set();
		const tiles = this.tiles();

		if (!tiles.length) {
			return;
		}

		this.turning = true;
		this.tryNext(
			covers,
			tiles,
			tiles.reduce((kept, tile) => (tile.key < kept.key ? tile : kept)),
			covers.length
		);
	}

	/**
	 * Fetches the next cover worth trying and puts it in; a dead one is
	 * written off and the one after it tried straight away. `left` counts the
	 * tries down from one per cover, so a set whose covers are all gone ends
	 * the turn rather than the turn chasing it.
	 */
	private tryNext(
		covers: string[],
		tiles: MosaicTile[],
		replaced: MosaicTile,
		left: number
	): void {
		const at = left > 0 ? this.nextCover(covers, tiles) : null;

		if (at === null) {
			this.turning = false;

			return;
		}

		const url = covers[at];

		this.load(url).then(
			() => {
				this.show(replaced, url);
				this.turning = false;
			},
			() => {
				this.broken.add(url);
				this.tryNext(covers, tiles, replaced, left - 1);
			}
		);
	}

	/**
	 * The cover to turn to: the one after the furthest cover on show, so the
	 * mosaic walks the set rather than picking at random, skipping whatever
	 * is already on show or would not load. Null where there is nothing left.
	 */
	private nextCover(covers: string[], tiles: MosaicTile[]): number | null {
		const shown = new Set(tiles.map((tile) => tile.url));
		const latest = tiles.reduce(
			(kept, tile) => Math.max(kept, covers.indexOf(tile.url)),
			0
		);

		for (let step = 1; step <= covers.length; step++) {
			const at = (latest + step) % covers.length;

			if (!shown.has(covers[at]) && !this.broken.has(covers[at])) {
				return at;
			}
		}

		return null;
	}

	/**
	 * Puts the new cover in. The tile is found by identity: a set that
	 * changed under the fetch has rebuilt its tiles, and this one is no
	 * longer among them — which is exactly when it should be left alone.
	 *
	 * Every other tile puts down what it was turning over from. A tile holds
	 * that only while it is turning, and the styles read it as exactly that:
	 * four tiles that had each turned once and never put it down left the
	 * whole square marked as turning, so every movement after the fourth
	 * played itself out on all four covers at once instead of the one that
	 * had just changed.
	 */
	private show(replaced: MosaicTile, url: string): void {
		if (this.settings.turn() === 'random') {
			this.drawn.set(this.draw());
		}

		const key = this.takeKey();

		this.tiles.update((tiles) =>
			tiles.map((tile) => {
				if (tile === replaced) {
					return { key, url, under: tile.url };
				}

				return tile.under ? { ...tile, under: null } : tile;
			})
		);
	}

	/** The next key, so a tile that has just arrived is the newest one. */
	private takeKey(): number {
		return this.keys++;
	}

	/**
	 * A movement for the turn about to happen, and never the one just used:
	 * drawn freely, one turn in four would repeat the last, and a mosaic that
	 * fades twice running reads as a mosaic stuck on fade rather than one
	 * picking at random.
	 */
	private draw(): CoverMovement {
		const others = COVER_MOVEMENTS.filter(
			(movement) => movement !== this.drawn()
		);

		return others[Math.floor(Math.random() * others.length)];
	}

	/** The cover in the browser's cache, before a tile is asked to show it. */
	private load(url: string): Promise<void> {
		const view = this.document.defaultView;

		if (!view) {
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			const image = new view.Image();

			image.onload = () => resolve();
			image.onerror = () =>
				reject(new Error(`Cover unavailable: ${url}`));
			image.src = url;
		});
	}

	/**
	 * A mosaic the reader cannot see does not turn. The collections page
	 * draws a card for every discography the catalog knows, and a mosaic
	 * turning below the fold is a cover fetched for nobody.
	 */
	private watchScreen(): void {
		const view = this.document.defaultView;

		if (!view?.IntersectionObserver) {
			return;
		}

		this.onScreen.set(false);

		const observer = new view.IntersectionObserver(
			(entries) =>
				this.onScreen.set(
					entries.some((entry) => entry.isIntersecting)
				),
			// Started a little before it is reached, so the first turn is not
			// the first thing the reader sees of a card.
			{ rootMargin: '200px' }
		);

		observer.observe(this.host.nativeElement);
		this.destroyRef.onDestroy(() => observer.disconnect());
	}

	/** Nor does a mosaic in a tab somebody left open behind another one. */
	private watchTab(): void {
		const wake = () =>
			this.awake.set(this.document.visibilityState === 'visible');

		wake();
		this.document.addEventListener('visibilitychange', wake);
		this.destroyRef.onDestroy(() =>
			this.document.removeEventListener('visibilitychange', wake)
		);
	}
}
