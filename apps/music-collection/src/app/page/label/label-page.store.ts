import { map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LabelEntity, ReleaseEntity } from '@music-collection/api';
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

import { LabelDetailsEffect } from '../../data/label-details';
import { Crumb } from '../../shared/page-breadcrumb';
import {
	PressingRow,
	newestPressingFirst,
	toPressingRow,
} from '../../shared/entity-view';

/** One of the artists a label pressed, with how much of it it put out. */
export interface LabelArtistRow {
	uid: string;
	name: string;
	releases: number;
}

interface LabelPageState {
	labelId: string;
	/** The label document; a sub-label is kept under its parent instead. */
	label: LabelEntity | null;
	children: LabelEntity[];
	releases: ReleaseEntity[];
	loading: boolean;
}

const initialState: LabelPageState = {
	labelId: '',
	label: null,
	children: [],
	releases: [],
	loading: true,
};

/**
 * The label page: who pressed what.
 *
 * A label is known from two directions — the document that names it and the
 * pressings that carry it — and the page needs both, because a sub-label has
 * no document of its own here while its records still say whose they are.
 */
export const LabelPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const pressings = computed<PressingRow[]>(() =>
			newestPressingFirst(store.releases().map(toPressingRow))
		);

		/** The name the label document gives, else what its records say. */
		const name = computed(
			() => store.label()?.name ?? store.releases()[0]?.label?.name ?? ''
		);

		const parent = computed(() => {
			const parentLabel = store.label()?.parent;

			return parentLabel
				? { uid: parentLabel.uid, name: parentLabel.name }
				: null;
		});

		return {
			name,
			parent,
			pressings,
			/** The artists it put out, the most pressed first. */
			artists: computed<LabelArtistRow[]>(() => {
				const counts = new Map<string, LabelArtistRow>();

				for (const release of store.releases()) {
					const artist = release.artist;

					if (!artist?.uid) {
						continue;
					}

					const row = counts.get(artist.uid);

					if (row) {
						row.releases += 1;
					} else {
						counts.set(artist.uid, {
							uid: artist.uid,
							name: artist.name,
							releases: 1,
						});
					}
				}

				return [...counts.values()].sort(
					(a, b) =>
						b.releases - a.releases || a.name.localeCompare(b.name)
				);
			}),
			/** The years its records span, when any of them is dated. */
			years: computed(() => {
				const years = pressings()
					.map((pressing) => pressing.year)
					.filter((year): year is number => year !== null);

				return years.length
					? { from: Math.min(...years), to: Math.max(...years) }
					: null;
			}),
			/** Nothing is known under this id (once the load is over). */
			notFound: computed(
				() =>
					!store.loading() &&
					!store.label() &&
					!store.releases().length
			),
			trail: computed<Crumb[]>(() => {
				const parentLabel = parent();

				return [
					...(parentLabel
						? [
								{
									label: parentLabel.name,
									link: ['/label', parentLabel.uid],
								},
							]
						: []),
					{ label: name() || 'Label' },
				];
			}),
		};
	}),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			labelDetailsEffect = inject(LabelDetailsEffect)
		) => ({
			/** Follows the `:labelId` route parameter. */
			loadLabel: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => params.get('labelId') ?? ''),
					tap((labelId) =>
						patchState(store, {
							labelId,
							label: null,
							children: [],
							releases: [],
							loading: true,
						})
					),
					switchMap((labelId) =>
						labelDetailsEffect.load$(labelId).pipe(
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
		})
	),
	withHooks({
		onInit(store) {
			store.loadLabel(of(undefined));
		},
	})
);
