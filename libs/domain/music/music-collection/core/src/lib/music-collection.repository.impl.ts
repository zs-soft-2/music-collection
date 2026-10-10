import { Observable, combineLatest, from, map, of } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	CONTRIBUTION_FEATURE_KEY,
	ContributionEntity,
	FirestoreSyncService,
} from '@music-collection/api';
import {
	ADOPT_MUSIC_COLLECTION_BADGE_IMAGE_FUNCTION,
	BadgeGenerationSettings,
	BadgeImage,
	CREATE_MUSIC_COLLECTION_FUNCTION,
	CatalogCredit,
	CreateMusicCollectionResult,
	CreditsNeeded,
	DELETE_MUSIC_COLLECTION_FUNCTION,
	GENERATE_MUSIC_COLLECTION_BADGE_FUNCTION,
	GenerateBadgeResult,
	MUSIC_COLLECTION_FEATURE_KEY,
	MusicCollectionDraft,
	MusicCollectionEntity,
	MusicCollectionRepository,
	READ_BADGE_GENERATION_SETTINGS_FUNCTION,
	SET_MUSIC_COLLECTION_BADGE_IMAGE_FUNCTION,
	SceneProbeInput,
	SceneProbeResult,
	SceneProbeSetup,
	UPDATE_BADGE_GENERATION_SETTINGS_FUNCTION,
	UPDATE_MUSIC_COLLECTION_FUNCTION,
	UpdateMusicCollectionResult,
} from '@music-collection/domain/music-collection/api';

import { toCatalogCredit } from './music-collection.mapper';

/** How many values an `in` filter takes; the credits are asked for in batches. */
const MUSICIANS_PER_QUERY = 30;

/**
 * The definitions in `music-collection/{uid}`, served from the client cache
 * and kept current like the rest of the catalog.
 *
 * Drafts are filtered here rather than in the query: there are few
 * definitions, they are cached whole anyway, and a second filtered query
 * would need its own index and its own cache marker for nothing.
 *
 * Writing is the other way round: the rules refuse every client write here,
 * so it goes to the callables and comes back through the cache.
 */
@Injectable({ providedIn: 'root' })
export class MusicCollectionFirestoreRepository extends MusicCollectionRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly functions = inject(Functions);

	public listAll$(): Observable<MusicCollectionEntity[]> {
		return this.firestoreSync.list$<MusicCollectionEntity>({
			featureKey: MUSIC_COLLECTION_FEATURE_KEY,
			query: query(
				collection(this.firestore, MUSIC_COLLECTION_FEATURE_KEY)
			),
			incremental: true,
		});
	}

	public listPublished$(): Observable<MusicCollectionEntity[]> {
		return this.listAll$().pipe(
			map((collections) =>
				collections.filter(
					(definition) => definition.status === 'published'
				)
			)
		);
	}

	public loadBySlug$(
		slug: string
	): Observable<MusicCollectionEntity | undefined> {
		return this.listAll$().pipe(
			map((collections) =>
				collections.find((definition) => definition.slug === slug)
			)
		);
	}

	public loadByUid$(
		uid: string
	): Observable<MusicCollectionEntity | undefined> {
		return this.listAll$().pipe(
			map((collections) =>
				collections.find((definition) => definition.uid === uid)
			)
		);
	}

	/** The whole `contribution` collection, served as a bundle like the rest. */
	public listCredits$(needed: CreditsNeeded): Observable<CatalogCredit[]> {
		if (needed.kind === 'none') {
			return of([]);
		}

		if (needed.kind === 'all') {
			return this.firestoreSync
				.list$<ContributionEntity>({
					featureKey: CONTRIBUTION_FEATURE_KEY,
					query: collection(this.firestore, CONTRIBUTION_FEATURE_KEY),
					// The credits outnumber every other collection: a single
					// new one must not cost a download of all of them.
					incremental: true,
				})
				.pipe(
					map((contributions) => contributions.map(toCatalogCredit))
				);
		}

		const { musicianUids } = needed;

		if (!musicianUids.length) {
			return of([]);
		}

		/*
		 * The narrow case, and the reason it is worth the extra queries: the
		 * credits of a handful of musicians instead of the catalog's whole
		 * set, for the same answer. `bundle: false` because the bundle is
		 * built per feature — taking it would download every credit there is,
		 * which is the cost being avoided.
		 */
		const batches: string[][] = [];

		for (let at = 0; at < musicianUids.length; at += MUSICIANS_PER_QUERY) {
			batches.push(musicianUids.slice(at, at + MUSICIANS_PER_QUERY));
		}

		return combineLatest(
			batches.map((uids) =>
				this.firestoreSync.list$<ContributionEntity>({
					featureKey: CONTRIBUTION_FEATURE_KEY,
					cacheKey: `${CONTRIBUTION_FEATURE_KEY}?musicianUid=${uids.join(',')}`,
					query: query(
						collection(this.firestore, CONTRIBUTION_FEATURE_KEY),
						where('musicianUid', 'in', uids)
					),
					bundle: false,
				})
			)
		).pipe(
			map((batched) =>
				batched
					.flat()
					.map((contribution) => toCatalogCredit(contribution))
			)
		);
	}

	public create$(
		collection: MusicCollectionDraft
	): Observable<CreateMusicCollectionResult> {
		return this.call$<CreateMusicCollectionResult>(
			CREATE_MUSIC_COLLECTION_FUNCTION,
			{ collection }
		);
	}

	public update$(
		uid: string,
		collection: MusicCollectionDraft
	): Observable<UpdateMusicCollectionResult> {
		return this.call$<UpdateMusicCollectionResult>(
			UPDATE_MUSIC_COLLECTION_FUNCTION,
			{ uid, collection }
		);
	}

	public delete$(uid: string): Observable<void> {
		return this.call$<void>(DELETE_MUSIC_COLLECTION_FUNCTION, { uid });
	}

	/**
	 * The candidates. The server builds the prompt from the stored
	 * definition; the points only reach it as a hint for how rich the rim
	 * is, so a client cannot dictate what gets drawn on our bill.
	 */
	public generateBadge$(
		uid: string,
		points: number,
		model: string | null
	): Observable<GenerateBadgeResult> {
		// Not `call$`: drawing four candidates runs well past the callable
		// client's seventy-second default, and a picture that outlives the
		// deadline is paid for and never arrives.
		const callable = httpsCallable<object, GenerateBadgeResult>(
			this.functions,
			GENERATE_MUSIC_COLLECTION_BADGE_FUNCTION,
			{ timeout: 300_000 }
		);

		return from(callable({ uid, points, model })).pipe(
			map((result) => result.data)
		);
	}

	public setBadgeImage$(
		uid: string,
		documentUid: string | null
	): Observable<void> {
		return this.call$<void>(SET_MUSIC_COLLECTION_BADGE_IMAGE_FUNCTION, {
			uid,
			documentUid,
		});
	}

	/**
	 * The uploaded file, taken into the gallery. Only its path travels: the
	 * server reads the object back from the bucket, so what becomes a pin is
	 * what is actually stored, not what a client says about it.
	 */
	public adoptBadgeImage$(
		uid: string,
		storagePath: string,
		fileName: string
	): Observable<BadgeImage> {
		return this.call$<BadgeImage>(
			ADOPT_MUSIC_COLLECTION_BADGE_IMAGE_FUNCTION,
			{ uid, storagePath, fileName }
		);
	}

	/**
	 * Egy már beiktatott kép a galériába. Ugyanaz a callable szolgálja ki,
	 * mint a frissen feltöltöttet: a szerveren ez a kettő egy művelet két
	 * bemenettel — amott az útvonal, itt a dokumentum azonosítója.
	 */
	public adoptBadgeDocument$(
		uid: string,
		documentUid: string
	): Observable<BadgeImage> {
		return this.call$<BadgeImage>(
			ADOPT_MUSIC_COLLECTION_BADGE_IMAGE_FUNCTION,
			{ uid, documentUid }
		);
	}

	public readBadgeSettings$(): Observable<BadgeGenerationSettings> {
		return this.call$<BadgeGenerationSettings>(
			READ_BADGE_GENERATION_SETTINGS_FUNCTION,
			{}
		);
	}

	public updateBadgeSettings$(
		settings: BadgeGenerationSettings
	): Observable<BadgeGenerationSettings> {
		return this.call$<BadgeGenerationSettings>(
			UPDATE_BADGE_GENERATION_SETTINGS_FUNCTION,
			{ settings }
		);
	}

	/**
	 * A scene probe — TEMPORARY.
	 *
	 * It travels on the badge callable, in a `probe` field, because the dev
	 * region's CPU quota cannot spare a function for an experiment. When the
	 * style lock is settled this goes, and the backdrops get their own call
	 * with the prompt built server-side, as the badge's is.
	 */
	public probeScene$(input: SceneProbeInput): Observable<SceneProbeResult> {
		// Not `call$`: a draw runs for minutes, and the callable client gives
		// up after seventy seconds by default — the picture would be drawn
		// and paid for, and simply never arrive. The server's own ceiling is
		// five minutes, so that is what the client waits for.
		const callable = httpsCallable<object, SceneProbeResult>(
			this.functions,
			GENERATE_MUSIC_COLLECTION_BADGE_FUNCTION,
			{ timeout: 300_000 }
		);

		return from(callable({ probe: input })).pipe(
			map((result) => result.data)
		);
	}

	/**
	 * The image models this tenant can reach — TEMPORARY.
	 *
	 * Draws nothing, so it is free, and it rides on the same callable as the
	 * probe. Until this existed, which model drew our pictures was whatever
	 * the gateway's price bracket happened to land on, with nothing on any
	 * screen saying so.
	 */
	public loadProbeSetup$(): Observable<SceneProbeSetup> {
		return this.call$<SceneProbeSetup>(
			GENERATE_MUSIC_COLLECTION_BADGE_FUNCTION,
			{ probe: { list: true } }
		).pipe(
			map((setup) => ({
				models: setup.models ?? [],
				locks: setup.locks ?? [],
			}))
		);
	}

	private call$<T>(name: string, input: object): Observable<T> {
		const callable = httpsCallable<object, T>(this.functions, name);

		return from(callable(input)).pipe(map((result) => result.data));
	}
}
