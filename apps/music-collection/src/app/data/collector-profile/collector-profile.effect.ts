import {
	Observable,
	combineLatest,
	distinctUntilChanged,
	map,
	of,
	startWith,
	switchMap,
} from 'rxjs';

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
import {
	NO_LOCATION,
	UserLocationEffect,
	toPublicLocation,
} from '../user-location';
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
 * Whether anything of this collector may go out at all.
 *
 * Two consents, and either one of them is enough. Sharing the page publishes
 * the shelf; showing a followed collection publishes the single sentence "I
 * am after this" — and that sentence earns a name on the wall, which is the
 * one place a collector can be found before they have finished anything.
 */
function publishes(source: CollectorProfileSource): boolean {
	return source.settings.shared || source.shownCollections.length > 0;
}

/**
 * Whether a document is worth taking away.
 *
 * `known` is what this session has seen of it: true where it wrote one,
 * false where it took one away, null where it has never looked.
 *
 * Asked for — a switch turned off in front of the collector — the unknown
 * counts as "take it away", because being sure is the whole point of a
 * withdrawal. Merely implied by a snapshot that publishes nothing, it does
 * not: the standings arrive a moment after the shelf does, so every session
 * of every collector would otherwise open with deletes of documents that
 * were never written.
 */
function withdraws(known: boolean | null, asked: boolean): boolean {
	return asked ? known !== false : known === true;
}

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
 * The shelf is followed from here, for as long as the app is open and only
 * while a consent stands, and this is what decides whether what comes out of
 * it is worth a write.
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
	 * session knows. Null while it has not been seen — what a withdrawal
	 * makes of that is `withdraws`.
	 */
	private shared: boolean | null = null;

	/**
	 * The same two for the directory entry, which comes and goes on its own
	 * consent: a shown collection keeps it alive after the page is gone.
	 */
	private listed: boolean | null = null;
	private cardFingerprint: string | null = null;

	/**
	 * Whether the collector has turned something off in front of us since the
	 * last withdrawal — see `takesBack` and `withdraws`.
	 */
	private asked = false;

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
	 * Started with the app, not with a page. What is published follows the
	 * consents, and those are given in one place and acted on in another: a
	 * hunt is shown from the collections page, a record is filed from the
	 * scanner, and the wall has to be right after either. Tying this to a
	 * route meant an entry that appeared only if the collector happened to
	 * walk past the right page afterwards. Idempotent: whoever asks second
	 * changes nothing.
	 *
	 * Until a consent stands it costs two setting documents and nothing else
	 * — `publishing$` is what keeps the shelf out of it. Once one does, the
	 * shelf is followed wherever the collector is, because that is what the
	 * snapshot is made of.
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

		combineLatest([this.settings$(), this.owner$(), this.publishing$()])
			.pipe(
				switchMap(([settings, owner, publishing]) =>
					owner && publishing
						? this.source$(settings, owner).pipe(
								map((source) => ({
									uid: owner.uid,
									source,
								}))
							)
						: of({
								uid: owner?.uid ?? null,
								source: null,
							})
				)
			)
			.subscribe(({ uid, source }) => {
				if (!uid) {
					this.forget();
				} else if (source) {
					this.schedule(source);
				} else {
					this.retract(uid);
				}
			});
	}

	/**
	 * Whether either consent stands — the same question as `publishes`, asked
	 * of the settings rather than of a snapshot, because it decides whether a
	 * snapshot is worth building at all.
	 *
	 * Distinct, because it changes when a switch is turned and not when a
	 * record is filed: every answer resubscribes the shelf under it, and the
	 * shown list itself reaches the snapshot through `source$`.
	 */
	private publishing$(): Observable<boolean> {
		return combineLatest([
			this.settings$(),
			this.settings.value$(COLLECTION_FOLLOWING_SETTING),
		]).pipe(
			map(
				([settings, following]) =>
					settings.shared || following.shown.length > 0
			),
			distinctUntilChanged()
		);
	}

	/**
	 * A collection has just stopped being shown.
	 *
	 * Nothing is written from here — the watch does that, out of the shelf it
	 * is already following. What this adds is certainty: a switch turned off
	 * in front of the collector takes the entry down even where this session
	 * never saw it written, and an entry published in an earlier session is
	 * exactly that. Where other collections are still shown, the entry is
	 * rewritten rather than withdrawn, and this changes nothing.
	 */
	public takesBack(): void {
		this.asked = true;
		this.watch();
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
	 * One collector's entry. What a page falls back to where there is no
	 * shelf behind the name: a collector who only showed a hunt still has
	 * something to open.
	 */
	public card$(uid: string): Observable<CollectorCardDocument | null> {
		return this.repository.card$(uid);
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

		return this.write({ ...source, settings }, true);
	}

	/**
	 * The shelf changed somewhere. The write waits out the delay and then
	 * happens only if the page would read differently.
	 */
	public schedule(source: CollectorProfileSource): void {
		this.latest = source;

		if (!publishes(source) || this.pending) {
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

	/**
	 * Neither consent stands any more: whatever this session put up comes
	 * down.
	 *
	 * Only what this session put up — unless the collector asked, which is
	 * what `takesBack` says. A collector who shares nothing arrives here on
	 * every change to their shelf, and taking down documents that were never
	 * written would cost them a delete apiece for the privilege of sharing
	 * nothing.
	 *
	 * The asking only reaches the entry. The page has a switch of its own and
	 * `save` carries the certainty for it; a collection taken back says
	 * nothing about a shelf.
	 */
	private retract(uid: string): void {
		this.cancel();
		this.latest = null;

		const asked = this.asked;

		this.asked = false;

		this.withdrawPage(uid).catch((error) =>
			console.error('Collector profile not withdrawn', error)
		);

		this.withdrawCard(uid, asked).catch((error) =>
			console.error('Collector entry not withdrawn', error)
		);
	}

	/**
	 * Somebody signed out. What they published stays where it is — signing
	 * out is not withdrawing — but this session stops claiming to know
	 * anything about it, so the next account cannot inherit the fingerprints
	 * of the one before it.
	 */
	private forget(): void {
		this.cancel();
		this.latest = null;
		this.asked = false;
		this.shared = null;
		this.listed = null;
		this.fingerprint = null;
		this.cardFingerprint = null;
	}

	/**
	 * Writes whatever the two consents allow, and takes away whatever they no
	 * longer do.
	 *
	 * They are two, not one. Sharing the page publishes the shelf; showing a
	 * collection publishes only the statement "I am after this" — and that
	 * second one is enough to be named on the wall, which is why the entry
	 * is written on its own fingerprint rather than the page's.
	 *
	 * `asked` is the collector having just turned a switch off in front of
	 * us; see `withdraws`.
	 */
	private async write(
		source: CollectorProfileSource,
		asked = false
	): Promise<void> {
		await this.writePage(source, asked);

		return this.writeCard(source, asked);
	}

	private async writePage(
		source: CollectorProfileSource,
		asked = false
	): Promise<void> {
		const profile = toPublicCollectorProfile(source);

		if (!profile) {
			return this.withdrawPage(source.owner.uid, asked);
		}

		const fingerprint = collectorProfileFingerprint(profile);

		if (this.shared === true && fingerprint === this.fingerprint) {
			return;
		}

		await this.repository.save(profile);

		// The full shelf follows the page it belongs to. One fingerprint
		// covers both: the list is made of what the page already counts, so
		// it cannot change while the page does not.
		const albums = toPublicCollectorAlbums(source);

		if (albums) {
			await this.repository.saveAlbums(albums);
		}

		this.shared = true;
		this.fingerprint = fingerprint;
	}

	private async writeCard(
		source: CollectorProfileSource,
		asked = false
	): Promise<void> {
		const card = toPublicCollectorCard(source);

		if (!card) {
			return this.withdrawCard(source.owner.uid, asked);
		}

		const fingerprint = collectorProfileFingerprint(card);

		if (this.listed === true && fingerprint === this.cardFingerprint) {
			return;
		}

		await this.repository.saveCard(card);

		this.listed = true;
		this.cardFingerprint = fingerprint;
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
			// not worth a query, and the switch is what turns it on. The page
			// consent counts too — the wishlist goes on the page and nowhere
			// else, so without a page there is nothing for it to go on.
			settings.shared && settings.shareWishlist
				? this.wishlistItems
						.selectLoadedOwnEntities$()
						.pipe(startWith([]))
				: of([]),
			// And again the same: the place belongs to the page, so a
			// collector who has only shown a hunt is not asked for theirs.
			settings.shared ? this.locations.settings$() : of(NO_LOCATION),
			// The same rule as the wishlist: asked for only where the consent
			// publishes it. The list is shared with the rest of the app, so
			// this costs no query of its own where something else already
			// reads it.
			settings.shared && settings.shareRatings
				? this.ratings.list$()
				: of([]),
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

	private async withdrawPage(uid: string, asked = false): Promise<void> {
		// Nothing is out there to take away, and a withdrawal leaves a
		// tombstone the other clients would reload for.
		if (!uid || !withdraws(this.shared, asked)) {
			return;
		}

		this.shared = false;
		this.fingerprint = null;

		// The list first: Firestore does not cascade, and a list left behind
		// under a deleted page is a shelf still published. (The rules refuse
		// to serve it either way — they check that the page above it exists
		// — but a withdrawal should take the data, not only the reading
		// of it.)
		await this.repository.removeAlbums(uid);

		return this.repository.remove(uid);
	}

	/**
	 * The directory entry goes when both consents are gone — the page
	 * withdrawn and no collection shown. It outlives the page on purpose: a
	 * collector who stops publishing their shelf but still says they are
	 * after something is still on the wall, under their name alone.
	 */
	private async withdrawCard(uid: string, asked = false): Promise<void> {
		if (!uid || !withdraws(this.listed, asked)) {
			return;
		}

		this.listed = false;
		this.cardFingerprint = null;

		return this.repository.removeCard(uid);
	}
}
