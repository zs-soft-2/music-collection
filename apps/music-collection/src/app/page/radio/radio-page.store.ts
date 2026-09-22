import { combineLatest, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
	CollectionItemEntity,
	CollectionItemStateService,
} from '@music-collection/api';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { ExternalPlayerConsentService } from '../../data/external-player';
import { RadioEffect, RadioStation } from '../../data/radio';
import { UserSettingsEffect } from '../../data/user-settings';
import { PlayerStore } from '../../shared/player';
import {
	NO_SHELF_LAYOUT,
	SHELF_LAYOUT_SETTING,
} from '../collection/shelf-layout.setting';

import { radioStations, toStationView } from './radio.mapper';
import { RadioStationView } from './radio.model';

interface RadioPageState {
	stations: RadioStationView[];
	isLoading: boolean;
}

const initialState: RadioPageState = {
	stations: [],
	isLoading: true,
};

/**
 * The radio: every way this collector can have a record chosen for them.
 *
 * The stations are built from what the app already holds — the catalog, the
 * shelf, the drawn furniture and the published collections — and each is
 * then asked what it would play, so a station with nothing behind it never
 * reaches the page. Playing is the player's own business; this page only
 * hands it a station.
 */
export const RadioPageStore = signalStore(
	withState(initialState),
	withComputed(
		(
			store,
			player = inject(PlayerStore),
			consent = inject(ExternalPlayerConsentService)
		) => ({
			/**
			 * Why the radio is silent, where the reason is not the catalog:
			 * the stations play through YouTube and Spotify, and neither is
			 * put on the page for a guest or without the collector's leave.
			 */
			blocked: computed<'sign-in' | 'consent' | null>(() =>
				player.playersAllowed()
					? null
					: consent.asking() || consent.consented() === false
						? 'consent'
						: 'sign-in'
			),
			/** The station playing now, so the page can show which one is on. */
			playingStationId: computed(() => {
				const station = player.station();

				return station
					? (store
							.stations()
							.find(
								(view) =>
									view.station.kind === station.kind &&
									view.station.unitId === station.unitId &&
									view.station.slug === station.slug
							)?.id ?? null)
					: null;
			}),
			tuning: computed(() => player.tuning()),
			/** Queues are drawn at random rather than played as they come. */
			shuffled: computed(() => player.shuffled()),
			/** The records waiting behind the one playing, named. */
			upNext: computed(() => player.queueRecords()),
			/** Records still waiting to go on. */
			queued: computed(() => player.queue().length),
		})
	),
	withMethods(
		(
			store,
			player = inject(PlayerStore),
			radio = inject(RadioEffect),
			settings = inject(UserSettingsEffect),
			musicCollections = inject(MusicCollectionEffect),
			collectionItems = inject(CollectionItemStateService)
		) => {
			const playable$ = toObservable(player.playableAlbumIds);

			return {
				/**
				 * The stations, each with what it would play. A collection
				 * knows its own size already; the rest are asked, and a
				 * station with nothing behind it never reaches the page.
				 */
				loadStations: rxMethod<void>(
					pipe(
						switchMap(() =>
							combineLatest([
								settings.value$(SHELF_LAYOUT_SETTING),
								musicCollections.listStandings$(),
								collectionItems.selectLoadedEntities$(),
								playable$,
								radio.names$(),
							])
						),
						map(([layout, standings, copies, playable, names]) =>
							radioStations(
								(layout ?? NO_SHELF_LAYOUT).units,
								standings,
								copies as CollectionItemEntity[],
								playable
							).map((station) => ({ station, playable, names }))
						),
						switchMap((stations) =>
							stations.length
								? combineLatest(
										stations.map(
											({ station, playable, names }) =>
												station.albumIds
													? of(
															toStationView(
																station,
																station.albumIds,
																names
															)
														)
													: radio
															.albums$(
																station.station,
																playable
															)
															.pipe(
																map((albums) =>
																	toStationView(
																		station,
																		albums,
																		names
																	)
																)
															)
										)
									)
								: of([] as RadioStationView[])
						),
						tap((stations) =>
							patchState(store, {
								stations: stations.filter(
									(station) => station.count > 0
								),
								isLoading: false,
							})
						)
					)
				),

				/** Tunes the station in: the first record goes on at once. */
				play(station: RadioStation, label: string): void {
					player
						.startStation(station, label)
						.catch((error) =>
							console.error('The station did not come on', error)
						);
				},

				/** Puts a waiting record on now, passing over the ones before it. */
				playQueued(albumId: string): void {
					player
						.playQueuedAlbum(albumId)
						.catch((error) =>
							console.error('That record did not go on', error)
						);
				},

				/** Whether a station is played as it comes or drawn at random. */
				setShuffled(shuffled: boolean): void {
					player.setShuffled(shuffled);
				},

				/** Takes the queue off; what plays now plays to its end. */
				stop(): void {
					player.stopStation();
				},

				/** Passes this record over for the next of the queue. */
				skip(): void {
					player
						.playNextAlbum()
						.catch((error) =>
							console.error(
								'The next record did not go on',
								error
							)
						);
				},
			};
		}
	),
	withHooks({
		onInit(store) {
			store.loadStations(of(undefined));
		},
	})
);
