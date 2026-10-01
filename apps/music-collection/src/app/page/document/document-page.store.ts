import { map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { Storage, ref } from '@angular/fire/storage';
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
import { ownStorageFileUrl } from '../../shared/storage-url';

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
	withComputed(
		(store, text = inject(TextService), storage = inject(Storage)) => {
			const name = computed(() => store.document()?.name ?? '');
			const fileUrl = computed(() => store.document()?.filePath ?? null);
			/** The bucket this build uploads to, and reads back from. */
			const bucket = ref(storage).bucket;

			return {
				name,
				fileUrl,
				/**
				 * The file's address when this catalog's own Storage is what
				 * holds it — the only address the page may frame.
				 *
				 * `filePath` is a plain string in a document. Everything that
				 * writes one today puts a download URL of our bucket there,
				 * but that is a habit of the writers, not a property of the
				 * field, and a frame is not the place to take a habit on
				 * trust: whatever loads in it runs on its own origin, inside
				 * this page. So the page asks rather than assumes, and when
				 * the answer is no it offers the file as a link instead of
				 * drawing it.
				 */
				framableFileUrl: computed(() =>
					ownStorageFileUrl(fileUrl(), bucket)
				),
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
		}
	),
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
