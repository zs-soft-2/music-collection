import {
	TimeoutError,
	filter,
	firstValueFrom,
	pipe,
	switchMap,
	tap,
	timeout,
} from 'rxjs';

import { type Signal, computed, inject } from '@angular/core';
import type { AlbumEntity } from '@music-collection/api';
import {
	patchState,
	signalStoreFeature,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import type { PlayerSource } from '../../data/player';
import {
	RADIO_SHUFFLE_SETTING,
	RadioEffect,
	type RadioStation,
	shuffle,
} from '../../data/radio';
import { UserSettingsEffect } from '../../data/user-settings';

import type { PlayRequest, QueuedRecord } from './player-request';
import { queuedRecordsOf } from './player-sources';

/** How long a station may take to choose its records before it gives up. */
const TUNING_TIMEOUT_MS = 10_000;

/**
 * Records the queue may pass over in a row before it gives up. Without a
 * limit, a station tuned in before the Spotify sign-in would run through
 * everything it holds in one go.
 */
const MAX_PASSED_OVER = 5;

interface PlayerQueueState {
	/** Records waiting to go on after this one, by album id. */
	queue: string[];
	/** The station that filled the queue; null when nobody did. */
	station: RadioStation | null;
	/** What that station is called, for the player to say what is on. */
	stationLabel: string | null;
	/** A station is being tuned in: its records are being chosen. */
	tuning: boolean;
	/** Queues are put on in a random order. */
	shuffled: boolean;
}

/** What the queue needs of the player it feeds. */
export interface QueuePlayer {
	/** What was last started. */
	session: Signal<PlayRequest | null>;
	/** The albums of the catalog, for the queue to name its records. */
	albums: Signal<AlbumEntity[]>;
	playersAllowed: Signal<boolean>;
	playableAlbumIds: Signal<Set<string>>;
	/** Unlocks the audio from the tap; see the player's own `activate`. */
	activate(): void;
	/** Plays an album of the catalog from its start, without `activate`. */
	playAlbumById(albumId: string, on?: PlayerSource): Promise<void>;
}

/**
 * Records one after another: a station, or a run of records a page put in
 * front of the player. Each one goes on through the player's own
 * `playAlbumById`, so it plays exactly as a card's button would play it.
 *
 * The player is handed in (`withFeature`) rather than asked for as the
 * feature's input: an input naming the player's methods is checked before
 * those methods are inferred, and the whole store loses its types.
 */
export function withPlayerQueue(player: QueuePlayer) {
	return signalStoreFeature(
		withState<PlayerQueueState>({
			queue: [],
			station: null,
			stationLabel: null,
			tuning: false,
			shuffled: false,
		}),
		withComputed((store) => ({
			/**
			 * The records waiting to go on, in the order they will. The
			 * queue holds ids and the catalog holds the titles, so a
			 * record the catalog cannot name is left out of the list
			 * rather than standing in it as a blank — the count beside
			 * it comes from the queue itself and stays true.
			 */
			queueRecords: computed((): QueuedRecord[] =>
				queuedRecordsOf(store.queue(), player.albums() ?? [])
			),
		})),
		withMethods(
			(
				store,
				radioEffect = inject(RadioEffect),
				userSettingsEffect = inject(UserSettingsEffect)
			) => {
				/**
				 * The records of a queue in the order they go on: as they came,
				 * or drawn out of a hat where the collector asked for that.
				 */
				const inOrder = (albumIds: readonly string[]): string[] =>
					store.shuffled() ? shuffle(albumIds) : [...albumIds];

				/**
				 * The next record of the queue, or the end of the station. A
				 * record that turns out to have nothing to play on is passed
				 * over rather than leaving the queue stuck on it.
				 */
				const playNextAlbum = async (passedOver = 0): Promise<void> => {
					const [next, ...rest] = store.queue();

					patchState(store, { queue: rest });
					if (!next) {
						patchState(store, {
							station: null,
							stationLabel: null,
						});

						return;
					}
					await player.playAlbumById(next);
					if (
						player.session()?.albumId !== next &&
						passedOver < MAX_PASSED_OVER
					) {
						await playNextAlbum(passedOver + 1);
					}
				};

				return {
					/**
					 * Tunes in a station: chooses its records, puts the first on
					 * and leaves the rest waiting.
					 */
					async startStation(
						station: RadioStation,
						label: string
					): Promise<void> {
						if (!player.playersAllowed()) {
							return;
						}
						player.activate();
						patchState(store, { tuning: true });
						try {
							const albumIds = await firstValueFrom(
								radioEffect
									.albums$(station, player.playableAlbumIds())
									.pipe(
										filter((ids) => ids.length > 0),
										// The catalog and the shelf arrive on
										// their own time; a station that never
										// fills is one with nothing to play.
										timeout(TUNING_TIMEOUT_MS)
									)
							);
							const [first, ...rest] = inOrder(albumIds);

							patchState(store, {
								queue: rest,
								station,
								stationLabel: label,
							});
							await player.playAlbumById(first);
						} catch (error) {
							patchState(store, {
								queue: [],
								station: null,
								stationLabel: null,
							});
							if (!(error instanceof TimeoutError)) {
								console.error(error);
							}
						} finally {
							patchState(store, { tuning: false });
						}
					},

					/**
					 * Plays a run of records one after another — what stands in
					 * one compartment, what a page has in front of it. A station
					 * proper goes through `startStation`; this is the same queue
					 * without a rule behind it.
					 */
					async playQueue(
						albumIds: readonly string[],
						label: string
					): Promise<void> {
						player.activate();
						const playable = player.playableAlbumIds();
						const [first, ...rest] = inOrder(
							albumIds.filter((albumId) => playable.has(albumId))
						);

						if (!first) {
							return;
						}
						patchState(store, {
							queue: rest,
							station: null,
							stationLabel: label,
						});
						await player.playAlbumById(first);
					},

					/** Puts the next record of the queue on. */
					playNextAlbum(): Promise<void> {
						player.activate();

						return playNextAlbum();
					},

					/**
					 * Puts a record of the queue on now, passing over the ones
					 * standing before it — they have had their turn.
					 */
					playQueuedAlbum(albumId: string): Promise<void> {
						player.activate();
						const waiting = store.queue();
						const at = waiting.indexOf(albumId);

						if (at < 0) {
							return Promise.resolve();
						}
						patchState(store, { queue: waiting.slice(at + 1) });

						return player.playAlbumById(albumId);
					},

					/**
					 * Whether queues are put on in a random order. Turning it on
					 * draws the records still waiting again; turning it off
					 * leaves them as they stand, since the order they came in is
					 * not kept anywhere to be put back.
					 */
					setShuffled(shuffled: boolean): void {
						const waiting = store.queue();

						patchState(store, {
							shuffled,
							queue: shuffled ? shuffle(waiting) : waiting,
						});
						userSettingsEffect
							.save(RADIO_SHUFFLE_SETTING, shuffled)
							.catch((error) =>
								console.error('Shuffle not kept', error)
							);
					},

					/** The kept answer, which the collector gave last time. */
					loadShuffled: rxMethod<void>(
						pipe(
							switchMap(() =>
								userSettingsEffect.value$(RADIO_SHUFFLE_SETTING)
							),
							tap((shuffled) => patchState(store, { shuffled }))
						)
					),

					/** Takes the queue off; what plays now plays to its end. */
					stopStation(): void {
						patchState(store, {
							queue: [],
							station: null,
							stationLabel: null,
						});
					},
				};
			}
		)
	);
}
