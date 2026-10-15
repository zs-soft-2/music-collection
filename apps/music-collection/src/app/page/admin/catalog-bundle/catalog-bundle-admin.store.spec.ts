import { Subject, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import {
	CatalogBundleEffect,
	CatalogBundleRebuildResult,
	CatalogBundleStatus,
	catalogBundleState,
} from '../../../data/catalog-bundle';
import { CatalogBundleAdminStore } from './catalog-bundle-admin.store';

const bundle = (
	overrides: Partial<CatalogBundleStatus> = {}
): CatalogBundleStatus => ({
	kind: 'genre',
	key: 'rock',
	name: 'Rock',
	path: 'bundles/genre/rock/1.bundle',
	count: 39000,
	builtAt: 1,
	modifiedAt: 1,
	changed: 0,
	deleted: 0,
	outdatedByReset: false,
	readCost: 42000,
	week: null,
	...overrides,
});

describe('catalogBundleState', () => {
	it('a reset mindent megelőz, aztán a változás', () => {
		expect(catalogBundleState(bundle({ path: null }))).toBe('missing');
		expect(
			catalogBundleState(bundle({ outdatedByReset: true, changed: 0 }))
		).toBe('reset');
		expect(catalogBundleState(bundle({ deleted: 2 }))).toBe('behind');
		expect(catalogBundleState(bundle())).toBe('current');
	});
});

describe('CatalogBundleAdminStore', () => {
	let status: jest.Mock;
	let rebuild: jest.Mock;

	const create = () => TestBed.inject(CatalogBundleAdminStore);

	beforeEach(() => {
		status = jest
			.fn()
			.mockReturnValue(
				of([
					bundle({ kind: 'guest', key: 'guest', name: null }),
					bundle({ changed: 491 }),
					bundle({ kind: 'feature', key: 'track', name: null }),
				])
			);
		rebuild = jest.fn();

		TestBed.configureTestingModule({
			providers: [
				CatalogBundleAdminStore,
				{
					provide: CatalogBundleEffect,
					useValue: { status$: status, rebuild$: rebuild },
				},
			],
		});
	});

	it('fajtánként csoportosít, és megszámolja a lemaradtakat', () => {
		const store = create();

		expect(store.guest()).toHaveLength(1);
		expect(store.genres()).toHaveLength(1);
		expect(store.features()).toHaveLength(1);
		expect(store.behindCount()).toBe(1);
	});

	it('csak megerősítés után épít, és utána újraszámol', () => {
		const store = create();
		const done = new Subject<CatalogBundleRebuildResult>();

		rebuild.mockReturnValue(done);
		store.askRebuild(store.genres()[0]);

		expect(rebuild).not.toHaveBeenCalled();
		expect(store.pendingRebuild()).toBe('genre:rock');

		store.confirmRebuild();

		expect(rebuild).toHaveBeenCalledWith('genre', 'rock');
		expect(store.rebuilding()).toBe('genre:rock');
		expect(store.pendingRebuild()).toBeNull();

		done.next({
			kind: 'genre',
			key: 'rock',
			path: 'p',
			count: 39575,
			bytes: 3_372_059,
			collections: null,
		});

		expect(store.rebuilding()).toBeNull();
		expect(store.rebuilt()['genre:rock'].result.count).toBe(39575);
		expect(status).toHaveBeenCalledTimes(2);
	});

	it('a mégse nem épít', () => {
		const store = create();

		store.askRebuild(store.genres()[0]);
		store.cancelRebuild();
		store.confirmRebuild();

		expect(rebuild).not.toHaveBeenCalled();
	});

	it('a szerver hibáját a sorhoz írja, és a következő próba törli', () => {
		const store = create();

		rebuild.mockReturnValueOnce(
			throwError(() => ({
				code: 'functions/failed-precondition',
				message: 'Ebben a műfajban még nincs egyetlen előadó sem.',
			}))
		);
		store.askRebuild(store.genres()[0]);
		store.confirmRebuild();

		expect(store.failures()['genre:rock']).toContain('nincs egyetlen');
		expect(store.rebuilding()).toBeNull();

		rebuild.mockReturnValueOnce(new Subject());
		store.askRebuild(store.genres()[0]);
		store.confirmRebuild();

		expect(store.failures()['genre:rock']).toBeUndefined();
	});
});
