import { signal } from '@angular/core';

import {
	type CollectionForm,
	emptyCollectionForm,
} from '../music-collection-admin.model';
import { MusicCollectionEditStore } from './music-collection-edit.store';

/**
 * The editor's store as the page and its tabs see it: the state they read as
 * writable signals a test can set, and every method they call as a spy.
 * Only for specs — the real store reaches the catalog through its effects.
 */
export function fakeEditStore(form: Partial<CollectionForm> = {}) {
	const state = {
		form: signal<CollectionForm>({ ...emptyCollectionForm(), ...form }),
		uid: signal<string | null>('one'),
		isNew: signal(false),
		parents: signal<{ uid: string; name: string }[]>([]),
		artists: signal<{ uid: string; name: string }[]>([]),
		musicians: signal<{ uid: string; name: string }[]>([]),
		styles: signal<string[]>([]),
		derivedPoints: signal(0),
		uploadingField: signal<'coverImageUrl' | 'badgeArtworkUrl' | null>(
			null
		),
		libraryTarget: signal<string | null>(null),
		library: signal([]),
		imageModels: signal<{ id: string }[]>([]),
		sceneLocks: signal([]),
		badgeImageUid: signal<string | null>(null),
		badgeImageUrl: signal<string | null>(null),
		badgeGallery: signal<
			{ documentUid: string; filePath: string; name: string }[]
		>([]),
		badgeModel: signal(''),
		isUploadingPin: signal(false),
		isPickingBadge: signal(false),
		isGeneratingBadge: signal(false),
		// What only the page and its frame read.
		isLoading: signal(false),
		isSaving: signal(false),
		error: signal<string | null>(null),
		criteria: signal<Record<string, unknown>>({}),
		matchesEverything: signal(true),
		previewTotal: signal(0),
		previewAlbums: signal([]),
		isPreviewing: signal(false),
		curatedPoints: signal<number | null>(null),
		canSave: signal(false),
	};
	const methods = {
		setName: jest.fn(),
		setSlug: jest.fn(),
		setField: jest.fn(),
		setCriteria: jest.fn(),
		uploadImage: jest.fn(),
		uploadPin: jest.fn(),
		openLibrary: jest.fn(),
		closeLibrary: jest.fn(),
		pickFromLibrary: jest.fn(),
		useAsCover: jest.fn(),
		setBadgeModel: jest.fn(),
		generateBadge: jest.fn(),
		clearBadgeImage: jest.fn(),
		pickBadge: jest.fn(),
		load: jest.fn(),
		save: jest.fn(),
	};

	return { ...state, ...methods };
}

export type FakeEditStore = ReturnType<typeof fakeEditStore>;

export function provideFakeEditStore(store: FakeEditStore) {
	return { provide: MusicCollectionEditStore, useValue: store };
}
