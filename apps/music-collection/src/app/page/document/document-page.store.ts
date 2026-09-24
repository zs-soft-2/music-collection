import { map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { TextService } from '@music-collection/core/i18n';
import { ActivatedRoute } from '@angular/router';
import { DocumentEntity, isWithdrawnDocument } from '@music-collection/api';
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

import { DocumentDetailsEffect } from '../../data/document-details';
import { Crumb } from '../../shared/page-breadcrumb';

interface DocumentPageState {
	documentId: string;
	document: DocumentEntity | null;
	loading: boolean;
}

const initialState: DocumentPageState = {
	documentId: '',
	document: null,
	loading: true,
};

/**
 * The document page: one uploaded file as the catalog holds it — what it is
 * called, what it was made for, and the file itself.
 *
 * A withdrawn document is shown like any other: it is not deleted, and
 * everything that already points at it goes on loading. The page says so
 * rather than hiding it.
 */
export const DocumentPageStore = signalStore(
	withState(initialState),
	withComputed((store, text = inject(TextService)) => {
		const name = computed(() => store.document()?.name ?? '');

		return {
			name,
			fileUrl: computed(() => store.document()?.filePath ?? null),
			isImage: computed(
				() => !!store.document()?.fileType?.startsWith('image/')
			),
			isPdf: computed(
				() => store.document()?.fileType === 'application/pdf'
			),
			/** When it was withdrawn, if it was (epoch milliseconds). */
			withdrawnAt: computed(() => {
				const document = store.document();

				return document && isWithdrawnDocument(document)
					? (document.deletedAt ?? null)
					: null;
			}),
			notFound: computed(() => !store.loading() && !store.document()),
			trail: computed<Crumb[]>(() => [
				{
					label: text.translator()('admin.nav.documents'),
					link: '/admin/document',
				},
				{ label: name() || 'Document' },
			]),
		};
	}),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			documentDetailsEffect = inject(DocumentDetailsEffect)
		) => ({
			/** Follows the `:documentId` route parameter. */
			loadDocument: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => params.get('documentId') ?? ''),
					tap((documentId) =>
						patchState(store, {
							documentId,
							document: null,
							loading: true,
						})
					),
					switchMap((documentId) =>
						documentDetailsEffect.load$(documentId).pipe(
							tapResponse({
								next: (document) =>
									patchState(store, {
										document,
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
			store.loadDocument(of(undefined));
		},
	})
);
