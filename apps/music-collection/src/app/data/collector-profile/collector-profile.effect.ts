import { Observable, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	AuthenticationStateService,
	CollectionItemStateService,
	UserStateService,
	WishlistItemStateService,
} from '@music-collection/api';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';
import { toReleaseView } from '@music-collection/ui/music-view';

import { RatingEffect } from '../rating';
import { COLLECTION_FOLLOWING_SETTING } from '../collection-following';
import { UserLocationEffect, toPublicLocation } from '../user-location';
import { UserSettingsEffect } from '../user-settings';
import {
	COLLECTOR_PROFILE_SETTING,
	CollectorAlbumsDocument,
	CollectorCardDocument,
	CollectorProfileDocument,
	CollectorProfileOwner,
	CollectorProfileSettings,
	CollectorProfileSource,
	collectorProfileFingerprint,
	toPublicCollectorAlbums,
	toPublicCollectorCard,
	toPublicCollectorProfile,
} from './collector-profile.model';
import { CollectorProfileRepository } from './collector-profile.repository';

/**
 * How long a change waits before it is written.
 *
 * Filing twenty records is one change to the page, not twenty, and the shelf
 * streams emit on every one of them. The delay is what turns an evening of
 * cataloguing into a single write.
 */
const WRITE_DELAY = 3000;

/**
 * The collector's public page: their choice, and the snapshot that choice
 * publishes.
 *
 * The two are kept apart the way the shared location keeps them apart: the
 * settings are the whole truth and stay under `user/{uid}/setting`, and the
 * public document holds only what the consents allow. Here the document IS
 * the sharing — there is no flag on it to turn off — so withdrawing means
 * deleting it.
 *
 * Nothing is watched from here. The stores that already hold the shelf and
 * the standings hand them in; this decides whether the result is worth a
 * write.
 */
@Injectable({ providedIn: 'root' })
export class CollectorProfileEffect {
	private readonly settings = inject(UserSettingsEffect);
	private readonly repository = inject(CollectorProfileRepository);
	private readonly authentication = inject(AuthenticationStateService);
	private readonly users = inject(UserStateService);
	private readonly collectionItems = inject(CollectionItemStateService);
	private readonly collections = inject(MusicCollectionEffect);
	private readonly wishlistItems = inject(WishlistItemStateService);
	private readonly locations = inject(UserLocationEffect);
	private readonly ratings = inject(RatingEffect);

	/** Whether the shelf is already being followed; the watch is started once. */
	private watching = false;

	/**
	 * The fingerprint of what is out there, as far as this session knows.
	 * Deliberately not kept in the browser: a page reload then costs one
	 * needless write, which is cheaper than a stale fingerprint that would
	 * leave the page wrong until the next change.
	 */
	private fingerprint: string | null = null;

	/**
	 * Whether something of this collector is published, as far as this
	 * session knows. Null while it has not been seen — then withdrawing
	 * still goes through, because being sure is what matters there.
	 */
	private shared: boolean | null = null;

	/** A write waiting out its delay, and the newest shelf to write. */
	private pending: ReturnType<typeof setTimeout> | null = null;
	private latest: CollectorProfileSource | null = null;

	public settings$(): Observable<CollectorProfileSettings> {
		return this.settings.value$(COLLECTOR_PROFILE_SETTING);
	}

	/**
	 * Follows the shelf for as long as the app is open, and writes the page
	 * again whenever it would read differently.
	 *
	 * Started by the pages that have a reason to care — the profile and the
	 * collection — and then it outlives both, so a record filed from the album
	 * page or the scanner lands on the public page too. Idempotent: whoever
	 * asks second changes nothing.
	 *
	 * What is waited for and what is not: the copies decide the whole page, so
	 * they are waited for (and `selectLoadedEntities$` asks for the list where
	 * nobody has). The published collections only decide the badges, and that
	 * stream goes silent on a failed query rather than erroring — so it starts
	 * empty, and a page without badges is published rather than no page at
	 * all. When the collections do arrive, the fingerprint changes and the
	 * page is written again.
	 */
	public watch(): void {
		if (this.watching) {
			return;
		}

		this.watching = true;

		combineLatest([this.settings$(), this.owner$()])
			.pipe(
				switchMap(([settings, owner]) =>
					!settings.shared || !owner
						? of(null)
						: this.source$(settings, owner)
				)
			)
			.subscribe((source) => {
				if (source) {
					this.schedule(source);
				}
			});
	}

	/** One collector's page, as a visitor reads it. */
	public profile$(uid: string): Observable<CollectorProfileDocument | null> {
		return this.repository.profile$(uid);
	}

	/** The whole shelf of that page — a second read, on request. */
	public albums$(uid: string): Observable<CollectorAlbumsDocument | null> {
		return this.repository.albums$(uid);
	}

	/** Every shared collector, for the wall of finished collections. */
	public cards$(): Observable<CollectorCardDocument[]> {
		return this.repository.cards$();
	}

	/**
	 * Keeps the choice, then publishes what it allows — or takes the page
	 * away. Runs at once rather than on the delay: a consent withdrawn has to
	 * take effect while the collector is still looking at the switch.
	 */
	public async save(
		settings: CollectorProfileSettings,
		source: CollectorProfileSource
	): Promise<void> {
		await this.settings.save(COLLECTOR_PROFILE_SETTING, settings);

		this.cancel();

		return this.write({ ...source, settings });
	}

	/**
	 * The shelf changed somewhere. The write waits out the delay and then
	 * happens only if the page would read differently.
	 */
	public schedule(source: CollectorProfileSource): void {
		this.latest = source;

		if (!source.settings.shared || this.pending) {
			return;
		}

		this.pending = setTimeout(() => {
			const latest = this.latest;

			this.pending = null;

			if (latest) {
				this.write(latest).catch((error) =>
					console.error('Collector profile not published', error)
				);
			}
		}, WRITE_DELAY);
	}

	/** Forgets a scheduled write, because a newer decision overtook it. */
	private cancel(): void {
		if (this.pending) {
			clearTimeout(this.pending);
			this.pending = null;
		}
	}

	private async write(source: CollectorProfileSource): Promise<void> {
		const profile = toPublicCollectorProfile(source);

		if (!profile) {
			return this.withdraw(source.owner.uid);
		}

		const fingerprint = collectorProfileFingerprint(profile);

		if (this.shared === true && fingerprint === this.fingerprint) {
			return;
		}

		await this.repository.save(profile);

		// The directory entry and the full shelf follow the page they belong
		// to. One fingerprint covers all three: both are made of what the
		// page already shows, so neither can change while the page does not.
		const card = toPublicCollectorCard(source);

		if (card) {
			await this.repository.saveCard(card);
		}

		const albums = toPublicCollectorAlbums(source);

		if (albums) {
			await this.repository.saveAlbums(albums);
		}

		this.shared = true;
		this.fingerprint = fingerprint;
	}

	/** Everything the snapshot is made of, as the app holds it right now. */
	private source$(
		settings: CollectorProfileSettings,
		owner: CollectorProfileOwner
	): Observable<CollectorProfileSource> {
		return combineLatest([
			this.collectionItems.selectLoadedEntities$(),
			this.collections.listStandings$().pipe(startWith([])),
			// Asked for only where it is published: an unshared wishlist is
			// not worth a query, and the switch is what turns it on.
			settings.shareWishlist
				? this.wishlistItems
						.selectLoadedOwnEntities$()
						.pipe(startWith([]))
				: of([]),
			this.locations.settings$(),
			// The same rule as the wishlist: asked for only where the consent
			// publishes it. The list is shared with the rest of the app, so
			// this costs no query of its own where something else already
			// reads it.
			settings.shareRatings ? this.ratings.list$() : of([]),
			// Which collections the collector has chosen to be seen chasing.
			// Always read: this one is not a consent of its own, it IS the
			// consent — following stays private until a collection is shown.
			this.settings.value$(COLLECTION_FOLLOWING_SETTING),
		]).pipe(
			map(([items, standings, wishes, location, ratings, following]) => ({
				settings,
				owner,
				releases: items.map(toReleaseView),
				standings,
				wishes,
				ratings,
				shownCollections: following.shown,
				// The place is the map's consent, taken as it stands: this
				// page may carry it, never widen it.
				location: toPublicLocation(location, owner),
				now: Date.now(),
			}))
		);
	}

	/** The signed-in collector, with the name and picture they carry now. */
	private owner$(): Observable<CollectorProfileOwner | null> {
		return combineLatest([
			this.authentication.selectIsAuthenticated$(),
			this.authentication.selectAuthenticatedUser$(),
		]).pipe(
			switchMap(([isAuthenticated, authenticated]) =>
				isAuthenticated && authenticated?.uid
					? this.users
							.selectEntityById$(authenticated.uid)
							.pipe(map((stored) => stored ?? authenticated))
					: of(null)
			),
			map((user) =>
				user?.uid
					? {
							uid: user.uid,
							displayName: user.displayName,
							photoURL: user.photoURL,
						}
					: null
			)
		);
	}

	private async withdraw(uid: string): Promise<void> {
		// Nothing is out there to take away, and a withdrawal leaves a
		// tombstone the other clients would reload for.
		if (!uid || this.shared === false) {
			return;
		}

		this.shared = false;
		this.fingerprint = null;

		// Both documents, and the list first: Firestore does not cascade, and
		// a list left behind under a deleted page is a shelf still published.
		// (The rules refuse to serve it either way — they check that the page
		// above it exists — but a withdrawal should take the data, not only
		// the reading of it.)
		await this.repository.removeAlbums(uid);
		await this.repository.removeCard(uid);

		return this.repository.remove(uid);
	}
}
