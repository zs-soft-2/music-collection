import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	CONTRIBUTION_FEATURE_KEY,
	ContributionEntity,
	FirestoreSyncService,
} from '@music-collection/api';
import {
	BadgeGenerationSettings,
	BadgeModelOption,
	BadgeImageDraft,
	CREATE_MUSIC_COLLECTION_FUNCTION,
	CatalogCredit,
	CreateMusicCollectionResult,
	DELETE_MUSIC_COLLECTION_FUNCTION,
	GENERATE_MUSIC_COLLECTION_BADGE_FUNCTION,
	GenerateBadgeResult,
	MUSIC_COLLECTION_FEATURE_KEY,
	MusicCollectionDraft,
	MusicCollectionEntity,
	MusicCollectionRepository,
	READ_BADGE_GENERATION_SETTINGS_FUNCTION,
	SET_MUSIC_COLLECTION_BADGE_IMAGE_FUNCTION,
	LIST_BADGE_GENERATION_MODELS_FUNCTION,
	UPDATE_BADGE_GENERATION_SETTINGS_FUNCTION,
	UPDATE_MUSIC_COLLECTION_FUNCTION,
	UpdateMusicCollectionResult,
} from '@music-collection/domain/music-collection/api';

import { toCatalogCredit } from './music-collection.mapper';

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
	public listCredits$(): Observable<CatalogCredit[]> {
		return this.firestoreSync
			.list$<ContributionEntity>({
				featureKey: CONTRIBUTION_FEATURE_KEY,
				query: collection(this.firestore, CONTRIBUTION_FEATURE_KEY),
				// The credits outnumber every other collection: a single new
				// one must not cost a download of all of them.
				incremental: true,
			})
			.pipe(map((contributions) => contributions.map(toCatalogCredit)));
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
		points: number
	): Observable<GenerateBadgeResult> {
		return this.call$<GenerateBadgeResult>(
			GENERATE_MUSIC_COLLECTION_BADGE_FUNCTION,
			{ uid, points }
		);
	}

	public setBadgeImage$(
		uid: string,
		image: BadgeImageDraft
	): Observable<void> {
		return this.call$<void>(SET_MUSIC_COLLECTION_BADGE_IMAGE_FUNCTION, {
			uid,
			image,
		});
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

	public listBadgeModels$(): Observable<BadgeModelOption[]> {
		return this.call$<BadgeModelOption[]>(
			LIST_BADGE_GENERATION_MODELS_FUNCTION,
			{}
		);
	}

	private call$<T>(name: string, input: object): Observable<T> {
		const callable = httpsCallable<object, T>(this.functions, name);

		return from(callable(input)).pipe(map((result) => result.data));
	}
}
