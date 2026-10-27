import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import {
	CATALOG_BUNDLE_STATUS_FUNCTION,
	CatalogBundleKind,
	CatalogBundleRebuildResult,
	CatalogBundleStatus,
	REBUILD_CATALOG_BUNDLE_FUNCTION,
	REBUILD_TIMEOUT_MS,
} from './catalog-bundle.model';

/**
 * The catalog bundles, through the admin callables. Nothing here reads
 * Firestore directly: the counting is aggregations the server runs, and the
 * building needs the Admin SDK and the bucket.
 */
@Injectable({ providedIn: 'root' })
export class CatalogBundleRepository {
	private readonly functions = inject(Functions);

	public status$(): Observable<CatalogBundleStatus[]> {
		const callable = httpsCallable<
			Record<string, never>,
			{ bundles: CatalogBundleStatus[] }
		>(this.functions, CATALOG_BUNDLE_STATUS_FUNCTION);

		return from(callable({})).pipe(map((result) => result.data.bundles));
	}

	public rebuild$(
		kind: CatalogBundleKind,
		key: string
	): Observable<CatalogBundleRebuildResult> {
		const callable = httpsCallable<
			{ kind: CatalogBundleKind; key: string },
			CatalogBundleRebuildResult
		>(this.functions, REBUILD_CATALOG_BUNDLE_FUNCTION, {
			timeout: REBUILD_TIMEOUT_MS,
		});

		return from(callable({ kind, key })).pipe(map((result) => result.data));
	}
}
