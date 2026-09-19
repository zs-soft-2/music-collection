import { Signal, signal } from '@angular/core';

/** How a collection page shows its entities. */
export type CollectionView = 'table' | 'cards';

export interface CollectionViewState {
	readonly view: Signal<CollectionView>;
	setView(view: CollectionView): void;
}

/**
 * The view of a collection page, remembered in this browser under the key
 * (a convenience only: without storage it starts as a table).
 */
export function createCollectionView(storageKey: string): CollectionViewState {
	const view = signal<CollectionView>(read(storageKey));

	return {
		view: view.asReadonly(),
		setView: (value: CollectionView) => {
			view.set(value);
			try {
				localStorage.setItem(storageKey, value);
			} catch {
				// Preference is a convenience only.
			}
		},
	};
}

function read(storageKey: string): CollectionView {
	try {
		return localStorage.getItem(storageKey) === 'cards' ? 'cards' : 'table';
	} catch {
		return 'table';
	}
}
