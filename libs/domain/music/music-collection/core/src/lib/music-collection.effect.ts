import {
	Observable,
	combineLatest,
	filter,
	map,
	of,
	switchMap,
	tap,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { performanceLog } from '@music-collection/common/engine';
import {
	AlbumStateService,
	ArtistStateService,
	CollectionItemStateService,
	DocumentStateService,
	isWithdrawnDocument,
} from '@music-collection/api';
import {
	BadgeGenerationSettings,
	BadgeImage,
	CollectionShortfall,
	CreateMusicCollectionResult,
	DiscographyCandidate,
	DiscographyCreation,
	GenerateBadgeResult,
	MusicCollectionCatalog,
	MusicCollectionCriteria,
	MusicCollectionDraft,
	MusicCollectionEntity,
	MusicCollectionProgress,
	MusicCollectionRepository,
	MusicCollectionScore,
	NextAlbumSuggestion,
	ResolvedMusicCollection,
	UpdateMusicCollectionResult,
} from '@music-collection/domain/music-collection/api';
import {
	compareWithCollection,
	creditsNeededFor,
	listDiscographyCandidates,
	planDiscography,
	resolveMusicCollection,
	scoreCollection,
	suggestNextAlbums,
} from '@music-collection/domain/music-collection/engine';

import {
	toCatalogAlbum,
	toCatalogArtist,
	toOwnedCopies,
} from './music-collection.mapper';

/** A collection with where the signed-in collector stands on it. */
export interface MusicCollectionStanding {
	collection: MusicCollectionEntity;
	resolved: ResolvedMusicCollection;
	progress: MusicCollectionProgress;
	/** What it is worth, and what the collector has earned of that. */
	score: MusicCollectionScore;
}

/**
 * A definition with what it resolves to, without anyone's progress: what the
 * admin needs to see, where the question is what the rule catches.
 */
export interface MusicCollectionResolution {
	collection: MusicCollectionEntity;
	resolved: ResolvedMusicCollection;
}

/** The uid a criteria object is resolved under while it is still being written. */
const PREVIEW_UID = 'preview';

/**
 * A standing as the next-album ranking reads it. Only what is still missing
 * and what finishing would be worth: the definition, the badge and the
 * collector's own pressings have no say in which record to buy next.
 */
function toShortfall(standing: MusicCollectionStanding): CollectionShortfall {
	return {
		collectionUid: standing.collection.uid,
		albums: standing.resolved.albums,
		missingAlbumUids: standing.progress.missingAlbumUids,
		totalPoints: standing.score.totalPoints,
	};
}

/** Selects a feature's entities and asks for the list while it is empty. */
function entities$<T>(
	select: () => Observable<T[]>,
	dispatchList: () => void
): Observable<T[]> {
	return select().pipe(
		tap((items) => {
			if (!items?.length) {
				dispatchList();
			}
		}),
		filter((items) => items?.length > 0)
	);
}

/**
 * Abstract collections against the catalog and the collector's shelf.
 *
 * Resolving happens here, on the client, because the catalog is already
 * there: the sync service keeps `album` and `artist` in the local cache, so
 * a collection costs a pass over memory rather than a query. The moment the
 * catalog outgrows that, the same result can come from a precomputed
 * membership without anything above this effect noticing.
 */
@Injectable({ providedIn: 'root' })
export class MusicCollectionEffect {
	private readonly repository = inject(MusicCollectionRepository);
	private readonly albumStateService = inject(AlbumStateService);
	private readonly artistStateService = inject(ArtistStateService);
	private readonly collectionItemStateService = inject(
		CollectionItemStateService
	);
	private readonly documentStateService = inject(DocumentStateService);

	/** Every published collection with the collector's progress on it. */
	public listStandings$(): Observable<MusicCollectionStanding[]> {
		return combineLatest([
			this.repository.listPublished$(),
			this.collectionItemStateService.selectLoadedEntities$(),
		]).pipe(
			switchMap(([collections, items]) =>
				this.catalog$(collections).pipe(
					map((catalog) => {
						const copies = toOwnedCopies(items);

						return collections.map((collection) =>
							this.toStanding(collection, catalog, copies)
						);
					})
				)
			)
		);
	}

	/** One collection by its slug; null while the catalog has no such one. */
	public loadStanding$(
		slug: string
	): Observable<MusicCollectionStanding | null> {
		return combineLatest([
			this.repository.loadBySlug$(slug),
			this.collectionItemStateService.selectLoadedEntities$(),
		]).pipe(
			switchMap(([collection, items]) =>
				this.catalog$(collection ? [collection] : []).pipe(
					map((catalog) =>
						collection
							? this.toStanding(
									collection,
									catalog,
									toOwnedCopies(items)
								)
							: null
					)
				)
			)
		);
	}

	/**
	 * Which records to hunt for next, out of standings the caller already
	 * holds.
	 *
	 * Synchronous on purpose: every collection on the page was resolved once
	 * to draw it, and resolving them a second time to answer this would cost
	 * a second pass over the whole catalog for an answer already in hand. The
	 * engine call stays here rather than in a page, so the pages go on seeing
	 * only views.
	 */
	public suggestNextAlbums(
		standings: readonly MusicCollectionStanding[],
		/**
		 * The artists whose records the collector rated highly, by uid. A
		 * tie-breaker only, and the caller's to pass: the engine knows about
		 * points, and what somebody loves is not a point.
		 */
		lovedArtistUids: ReadonlySet<string> = new Set()
	): NextAlbumSuggestion[] {
		const run = performanceLog.start('collection.nextAlbums', {
			collections: standings.length,
		});
		const suggestions = suggestNextAlbums(
			standings.map(toShortfall),
			lovedArtistUids
		);

		run.end({ suggested: suggestions.length });

		return suggestions;
	}

	/**
	 * Every published definition, unresolved.
	 *
	 * What a page needs when it is about the collections themselves rather
	 * than about where anybody stands on them — a wall naming them, say.
	 * Resolving is a pass over the whole catalog per collection, and that is
	 * a price only a page showing progress has a reason to pay.
	 */
	public listPublishedDefinitions$(): Observable<MusicCollectionEntity[]> {
		return this.repository.listPublished$();
	}

	/**
	 * One collection's definition by its slug, without resolving it: what a
	 * page needs when all it asks is the name of the collection it was
	 * opened from. The definitions are cached whole, so this costs nothing.
	 */
	public loadDefinition$(
		slug: string
	): Observable<MusicCollectionEntity | null> {
		return this.repository
			.loadBySlug$(slug)
			.pipe(map((collection) => collection ?? null));
	}

	/** Every definition with what it resolves to, drafts included (admin). */
	public listAllResolutions$(): Observable<MusicCollectionResolution[]> {
		return this.repository.listAll$().pipe(
			switchMap((collections) =>
				this.catalog$(collections).pipe(
					map((catalog) => {
						// Every rule against the whole catalog, on the main
						// thread. Timed so it is known whether this too
						// belongs in a worker.
						const run = performanceLog.start(
							'collection.resolveAll',
							{
								collections: collections.length,
								albums: catalog.albums.length,
							}
						);
						const resolutions = collections.map((collection) => ({
							collection,
							resolved: resolveMusicCollection(
								collection,
								catalog
							),
						}));

						run.end();

						return resolutions;
					})
				)
			)
		);
	}

	/** One definition by its uid, with what it resolves to (admin). */
	public loadResolution$(
		uid: string
	): Observable<MusicCollectionResolution | null> {
		return this.repository.loadByUid$(uid).pipe(
			switchMap((collection) =>
				this.catalog$(collection ? [collection] : []).pipe(
					map((catalog) =>
						collection
							? {
									collection,
									resolved: resolveMusicCollection(
										collection,
										catalog
									),
								}
							: null
					)
				)
			)
		);
	}

	/**
	 * What a rule would catch right now, for the editor: the criteria are
	 * resolved without being saved, so the admin sees the records before
	 * anyone earns a badge for them.
	 */
	public preview$(
		criteria: MusicCollectionCriteria
	): Observable<ResolvedMusicCollection> {
		return this.catalog$([{ criteria }]).pipe(
			map((catalog) =>
				resolveMusicCollection(
					{ uid: PREVIEW_UID, criteria, criteriaVersion: 0 },
					catalog
				)
			)
		);
	}

	public create$(
		collection: MusicCollectionDraft
	): Observable<CreateMusicCollectionResult> {
		return this.repository.create$(collection);
	}

	/**
	 * The bands worth a discography, and which of them one already follows.
	 *
	 * Only the albums are needed — the rule is about the band and the format
	 * — so this does not ask for the artists or the credits the way resolving
	 * does. Drafts count as following: a pair left unpublished is still a
	 * pair, and offering the band again would open a second one.
	 */
	public listDiscographyCandidates$(): Observable<DiscographyCandidate[]> {
		return combineLatest([
			entities$(
				() => this.albumStateService.selectEntities$(),
				() => this.albumStateService.dispatchListEntitiesAction()
			),
			this.repository.listAll$(),
		]).pipe(
			map(([albums, definitions]) =>
				listDiscographyCandidates(
					albums.map(toCatalogAlbum),
					definitions
				)
			)
		);
	}

	/**
	 * Opens a band's discography: the studio albums, and the companion
	 * collection under it.
	 *
	 * Two calls rather than one, and the plan is made here rather than on the
	 * server: the functions do not see the domain libs, so a server-side pair
	 * would mean the naming and the rules written a second time. The price is
	 * that the two writes are not one transaction — if the companion fails,
	 * the studio-album collection stays, and the band then counts as followed
	 * so the picker will not offer it again. The pair is finished in the
	 * editor from there, which is why the error says what was created.
	 */
	public createDiscography$(
		candidate: DiscographyCandidate
	): Observable<DiscographyCreation> {
		const plan = planDiscography(candidate);

		return this.repository.create$(plan.main).pipe(
			switchMap(({ uid }) =>
				this.repository
					.create$({ ...plan.companion, parentUid: uid })
					.pipe(
						map((created) => ({
							artistUid: candidate.artistUid,
							artistName: candidate.artistName,
							main: {
								uid,
								name: plan.main.name,
								slug: plan.main.slug,
								status: plan.main.status,
							},
							companion: {
								uid: created.uid,
								name: plan.companion.name,
								slug: plan.companion.slug,
								status: plan.companion.status,
							},
						}))
					)
			)
		);
	}

	public update$(
		uid: string,
		collection: MusicCollectionDraft
	): Observable<UpdateMusicCollectionResult> {
		return this.repository.update$(uid, collection);
	}

	public delete$(uid: string): Observable<void> {
		return this.repository.delete$(uid);
	}

	/**
	 * The badge. Generating files every image it draws into the definition's
	 * gallery, but none of them is the badge yet: that stays an admin's
	 * choice, which is what keeps a bad draw from becoming a pin.
	 */
	public generateBadge$(
		uid: string,
		points: number
	): Observable<GenerateBadgeResult> {
		return this.repository.generateBadge$(uid, points);
	}

	/** `null` takes the pin off: the hand-made artwork becomes the badge. */
	public setBadgeImage$(
		uid: string,
		documentUid: string | null
	): Observable<void> {
		return this.repository.setBadgeImage$(uid, documentUid);
	}

	/**
	 * An image an admin uploaded, taken into the gallery and made the badge.
	 * The editor has already put the file in Storage; this is what gives it
	 * a document and a place among the pins.
	 */
	public adoptBadgeImage$(
		uid: string,
		storagePath: string,
		fileName: string
	): Observable<BadgeImage> {
		return this.repository.adoptBadgeImage$(uid, storagePath, fileName);
	}

	/**
	 * The images that are still on offer. A candidate withdrawn in the
	 * document admin keeps its file — whatever already points at it goes on
	 * loading, the frozen badge included — but it is not among what a pin
	 * can be picked from any more.
	 */
	public offeredBadgeGallery$(
		gallery: BadgeImage[]
	): Observable<BadgeImage[]> {
		if (!gallery.length) {
			return of(gallery);
		}

		return entities$(
			() => this.documentStateService.selectEntities$(),
			() => this.documentStateService.dispatchListEntitiesAction()
		).pipe(
			map((documents) => {
				const withdrawn = new Set(
					documents.filter(isWithdrawnDocument).map(({ uid }) => uid)
				);

				return gallery.filter(
					(image) => !withdrawn.has(image.documentUid)
				);
			})
		);
	}

	public readBadgeSettings$(): Observable<BadgeGenerationSettings> {
		return this.repository.readBadgeSettings$();
	}

	public updateBadgeSettings$(
		settings: BadgeGenerationSettings
	): Observable<BadgeGenerationSettings> {
		return this.repository.updateBadgeSettings$(settings);
	}

	private toStanding(
		collection: MusicCollectionEntity,
		catalog: MusicCollectionCatalog,
		copies: ReturnType<typeof toOwnedCopies>
	): MusicCollectionStanding {
		const run = performanceLog.start('collection.standing', {
			albums: catalog.albums.length,
			credits: catalog.credits?.length ?? 0,
		});
		const resolved = resolveMusicCollection(collection, catalog);
		const progress = compareWithCollection(resolved, copies);
		const standing: MusicCollectionStanding = {
			collection,
			resolved,
			progress,
			score: scoreCollection(
				resolved,
				copies,
				collection.basePoints,
				progress.completed
			),
		};

		run.end({ matched: resolved.total });

		return standing;
	}

	/**
	 * The catalog these rules are resolved against.
	 *
	 * The rules are handed in whole rather than a flag, because what has to
	 * be fetched of the credits is a question about them: one naming its
	 * musicians is answered from their credits alone, where a flag could only
	 * ever say "all of them".
	 */
	private catalog$(
		collections: readonly { criteria: MusicCollectionCriteria }[]
	): Observable<MusicCollectionCatalog> {
		return combineLatest([
			entities$(
				() => this.albumStateService.selectEntities$(),
				() => this.albumStateService.dispatchListEntitiesAction()
			),
			entities$(
				() => this.artistStateService.selectEntities$(),
				() => this.artistStateService.dispatchListEntitiesAction()
			),
			this.repository.listCredits$(creditsNeededFor(collections)),
		]).pipe(
			map(([albums, artists, credits]) => ({
				albums: albums.map(toCatalogAlbum),
				artists: artists.map(toCatalogArtist),
				credits,
			}))
		);
	}
}
