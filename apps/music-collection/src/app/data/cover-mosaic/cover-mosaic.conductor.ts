import { DOCUMENT } from '@angular/common';
import {
	DestroyRef,
	Injectable,
	computed,
	effect,
	inject,
	signal,
} from '@angular/core';

import { CoverMosaicService } from './cover-mosaic.service';

/**
 * A mosaic as the conductor knows it: a bag of tiles that could turn, and a
 * way to turn one of them. Nothing about which collection it stands for —
 * the conductor is counting pictures, not records.
 */
export interface ConductedMosaic {
	/**
	 * The tiles that would move if one of them were picked, by key. Empty
	 * from a mosaic that should stand: one off the screen, or one whose set
	 * has no more covers than it has tiles.
	 */
	readonly turnable: () => readonly number[];
	/**
	 * Turns that one tile over, and says when it is done — or has given up,
	 * because every cover it could have turned to is gone.
	 */
	readonly turn: (tile: number) => Promise<void>;
}

/** A tile of a particular mosaic: one ticket in the hat. */
interface Candidate {
	mosaic: ConductedMosaic;
	tile: number;
}

/**
 * The one clock every cover mosaic on the page moves to.
 *
 * The pace the collector sets is an answer about the page, not about each
 * card: "a cover changes every ten seconds" means one cover, somewhere.
 * Left to themselves the mosaics each kept their own clock, so a page of
 * twenty collections changed twenty covers a pace — a wall of movement that
 * reads as a page refusing to settle, and twenty covers fetched at once.
 *
 * So the mosaics do not keep time at all. They register here, say which of
 * their tiles could turn, and this draws one ticket out of all of them and
 * turns that single tile. A mosaic showing four covers has four tickets and
 * a lone cover has one, so the movement is spread over the pictures on the
 * page rather than over the cards — which is what the eye is following.
 *
 * Nothing moves while the reader is in another tab, nor for a reader who
 * asked for less movement, nor until one of the mosaics has a tile to offer.
 */
@Injectable({ providedIn: 'root' })
export class CoverMosaicConductor {
	private readonly document = inject(DOCUMENT);
	private readonly destroyRef = inject(DestroyRef);
	private readonly settings = inject(CoverMosaicService);

	/** The mosaics on the page, in the order they were drawn. */
	private readonly mosaics = signal<readonly ConductedMosaic[]>([]);
	/** Whether a turn is still waiting on its cover, so they do not pile up. */
	private turning = false;
	/** Whether this is the tab the reader is looking at. */
	private readonly awake = signal(true);
	/** A reader who asked for less movement gets none. */
	private readonly still =
		this.document.defaultView?.matchMedia?.(
			'(prefers-reduced-motion: reduce)'
		)?.matches ?? false;

	/** How long the page stands between two covers changing, in milliseconds. */
	private readonly pace = computed(() => {
		const seconds = this.settings.rotateSeconds();

		if (!seconds || this.still || !this.awake()) {
			return 0;
		}

		return seconds * 1000;
	});

	public constructor() {
		this.watchTab();

		effect((onCleanup) => {
			const pace = this.pace();

			if (!pace) {
				return;
			}

			const repeat = setInterval(() => this.turnOne(), pace);

			onCleanup(() => clearInterval(repeat));
		});
	}

	/**
	 * Takes a mosaic into the count, and hands back the way out of it. The
	 * clock is not restarted for a mosaic arriving or leaving: a page whose
	 * cards come and go as they are scrolled would otherwise never reach the
	 * end of a pace, and so never turn anything at all.
	 */
	public register(mosaic: ConductedMosaic): () => void {
		this.mosaics.update((all) => [...all, mosaic]);

		return () =>
			this.mosaics.update((all) => all.filter((one) => one !== mosaic));
	}

	/**
	 * Turns a single tile, drawn from every tile every mosaic is offering.
	 *
	 * A turn that is still waiting on its cover holds the next one off rather
	 * than letting them overlap: the point of the whole arrangement is that
	 * one picture is changing at a time, and a slow cover must not be what
	 * breaks that.
	 */
	private turnOne(): void {
		if (this.turning) {
			return;
		}

		const hat = this.hat();

		if (!hat.length) {
			return;
		}

		const picked = hat[Math.floor(Math.random() * hat.length)];

		this.turning = true;
		picked.mosaic.turn(picked.tile).then(
			() => (this.turning = false),
			() => (this.turning = false)
		);
	}

	/** Every cover on the page that could change, as one list. */
	private hat(): Candidate[] {
		return this.mosaics().flatMap((mosaic) =>
			mosaic.turnable().map((tile) => ({ mosaic, tile }))
		);
	}

	/** A page in a tab somebody left open behind another one does not move. */
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
