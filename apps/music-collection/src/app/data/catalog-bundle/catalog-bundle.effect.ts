import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';

import {
	CatalogBundleKind,
	CatalogBundleRebuildResult,
	CatalogBundleStatus,
} from './catalog-bundle.model';
import { CatalogBundleRepository } from './catalog-bundle.repository';

/** Admin: how current the catalog bundles are, and rebuilding one by hand. */
@Injectable({ providedIn: 'root' })
export class CatalogBundleEffect {
	private readonly repository = inject(CatalogBundleRepository);

	public status$(): Observable<CatalogBundleStatus[]> {
		return this.repository.status$();
	}

	public rebuild$(
		kind: CatalogBundleKind,
		key: string
	): Observable<CatalogBundleRebuildResult> {
		return this.repository.rebuild$(kind, key);
	}
}
