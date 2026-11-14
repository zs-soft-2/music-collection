import { Observable, exhaustMap, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReleaseEntity, ReleaseRarity } from '@music-collection/api';
import { RarityTier } from '@music-collection/common/api';
import { TextService } from '@music-collection/core/i18n';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { ReleaseDetailsEffect } from '../../data/release-details';
import { Crumb, pageTrail } from '../../shared/page-breadcrumb';
import {
	PressingRow,
	newestPressingFirst,
	toPressingRow,
} from '../../shared/entity-view';

interface ReleasePageState {
	releaseId: string;
	release: ReleaseEntity | null;
	/** Every pressing of the same album, this one among them. */
	pressings: ReleaseEntity[];
	loading: boolean;
	/** A curator's change to the rarity is on its way to the server. */
	raritySaving: boolean;
	/** What the server said when it refused one. */
	rarityError: string | null;
}

/** A curator's tier for the pressing; `tier: null` takes the override back. */
export interface RarityOverrideChange {
	tier: RarityTier | null;
	note: string;
}

const initialState: ReleasePageState = {
	releaseId: '',
	release: null,
	pressings: [],
	loading: true,
	raritySaving: false,
	rarityError: null,
};

/** Where a pressing can be read up on outside the catalog. */
const DISCOGS_RELEASE_URL = 'https://www.discogs.com/release/';

/**
 * The pressing page: one edition of an album — what it was pressed on, who
 * put it out, where, and which other editions of the same work exist.
 *
 * The album is the work and the pressing is one issue of it, so everything
 * true of every copy (the tracklist, the credits) stays on the album page:
 * this page only says what this edition added.
 */
export const ReleasePageStore = signalStore(
	withState(initialState),
	withComputed((store, text = inject(TextService)) => {
		const pressing = computed<PressingRow | null>(() => {
			const release = store.release();

			return release ? toPressingRow(release) : null;
		});

		return {
			pressing,
			/** The other editions of the same album, newest first. */
			siblings: computed<PressingRow[]>(() =>
				newestPressingFirst(
					store
						.pressings()
						.filter((other) => other.uid !== store.releaseId())
						.map(toPressingRow)
				)
			),
			/** The date as stored, for the page to format. */
			releasedAt: computed(() => store.release()?.date ?? null),
			discogsUrl: computed(() => {
				const discogsId = store.release()?.discogsReleaseId;

				return discogsId ? `${DISCOGS_RELEASE_URL}${discogsId}` : null;
			}),
			notFound: computed(() => !store.loading() && !store.release()),
			/** Home › the band › the album › this pressing. */
			trail: computed<Crumb[]>(() => {
				const row = pressing();

				return pageTrail(text.translator(), [
					row?.artistUid && row.artistName
						? {
								label: row.artistName,
								link: ['/artist', row.artistUid],
							}
						: null,
					row?.albumUid
						? {
								label: row.albumName ?? 'Album',
								link: ['/album', row.albumUid],
							}
						: null,
					{ label: row?.name ?? 'Pressing' },
				]);
			}),
		};
	}),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			releaseDetailsEffect = inject(ReleaseDetailsEffect)
		) => {
			/**
			 * One change to the rarity at a time, and the page shows the tier
			 * the server answered with — it is the server's to decide, so
			 * nothing is assumed about it here.
			 */
			const changeRarity = <T>(
				ask: (change: T) => Observable<ReleaseRarity>,
				after: (release: ReleaseEntity, change: T) => ReleaseEntity
			) =>
				rxMethod<T>(
					pipe(
						tap(() =>
							patchState(store, {
								raritySaving: true,
								rarityError: null,
							})
						),
						exhaustMap((change) =>
							ask(change).pipe(
								tapResponse({
									next: (rarity) => {
										const release = store.release();

										patchState(store, {
											release: release && {
												...after(release, change),
												rarity,
											},
											raritySaving: false,
										});
									},
									error: (error: unknown) => {
										console.error(error);
										patchState(store, {
											raritySaving: false,
											rarityError:
												error instanceof Error
													? error.message
													: String(error),
										});
									},
								})
							)
						)
					)
				);

			return {
				/** A curator's own tier, or taking it back. */
				overrideRarity: changeRarity<RarityOverrideChange>(
					({ tier, note }) =>
						releaseDetailsEffect.overrideRarity$(
							store.releaseId(),
							tier,
							note
						),
					(release, { tier, note }) => ({
						...release,
						rarityOverride:
							tier === null
								? null
								: {
										tier,
										note,
										byUserId:
											release.rarityOverride?.byUserId ??
											'',
										at: Date.now(),
									},
					})
				),
				/** Works the tier out again now. */
				refreshRarity: changeRarity<void>(
					() =>
						releaseDetailsEffect.refreshRarity$(store.releaseId()),
					(release) => release
				),
				/** Follows the `:releaseId` route parameter. */
				loadRelease: rxMethod<void>(
					pipe(
						switchMap(() => route.paramMap),
						map((params) => params.get('releaseId') ?? ''),
						tap((releaseId) =>
							patchState(store, {
								releaseId,
								release: null,
								pressings: [],
								loading: true,
							})
						),
						switchMap((releaseId) =>
							releaseDetailsEffect.load$(releaseId).pipe(
								tapResponse({
									next: (details) =>
										patchState(store, {
											...details,
											loading: false,
										}),
									error: (error) => {
										console.error(error);
										patchState(store, { loading: false });
									},
								})
							)
						)
					)
				),
			};
		}
	),
	withHooks({
		onInit(store) {
			store.loadRelease(of(undefined));
		},
	})
);
