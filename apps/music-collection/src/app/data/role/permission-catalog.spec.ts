import { readFileSync } from 'fs';
import { join } from 'path';

import {
	PERMISSION_CATALOG,
	catalogPermissions,
	unknownPermissions,
} from './permission-catalog';

const repository = (file: string) =>
	readFileSync(join(__dirname, '../../../../../..', file), 'utf-8');

/**
 * The resources the rules compose a permission from at check time
 * (`hasPerm('delete' + syncResources()[featureKey])`): the values of the map
 * in `firestore.rules`.
 */
function syncResources(rules: string): string[] {
	const body = rules.slice(
		rules.indexOf('function syncResources()'),
		rules.indexOf('function isOwnedFeature(')
	);

	return [
		...new Set(
			[...body.matchAll(/'[a-z-]+':\s*'([A-Za-z]+)'/g)].map(
				([, resource]) => resource
			)
		),
	];
}

/** Every permission the two rule files check, the composed ones expanded. */
function enforcedPermissions(): string[] {
	const files = [repository('firestore.rules'), repository('storage.rules')];
	const enforced = new Set<string>();

	for (const rules of files) {
		for (const [, permission] of rules.matchAll(
			/hasPerm\('([A-Za-z]+)'\)/g
		)) {
			enforced.add(permission);
		}

		// A composed check is read together with the rule it stands in: the
		// one on a collector's own entity is fenced off by `isOwnedFeature`,
		// so it can only ever name an `Owned…` resource.
		for (const statement of rules.split(/\ballow\b/)) {
			const composed = statement.match(
				/hasPerm\('(create|update|delete|view)'\s*\+\s*syncResources\(\)/
			);

			if (!composed) continue;

			const owned = statement.includes('isOwnedFeature');

			for (const resource of syncResources(files[0])) {
				if (owned !== resource.startsWith('Owned')) continue;

				enforced.add(`${composed[1]}${resource}`);
			}
		}
	}

	return [...enforced].sort();
}

describe('the permission catalog', () => {
	it('offers every permission the rules check', () => {
		const offered = new Set(catalogPermissions());
		const missing = enforcedPermissions().filter(
			(permission) => !offered.has(permission)
		);

		expect(missing).toEqual([]);
	});

	/**
	 * The rules do check them; the catalog covers them with a single row each
	 * so that the grid does not grow a column nothing else uses.
	 */
	it('reads the composed permissions out of the rules at all', () => {
		expect(enforcedPermissions()).toContain('deleteOwnedArtistEntity');
		expect(enforcedPermissions()).toContain('createTrackEntity');
	});

	it('names every permission once', () => {
		const permissions = catalogPermissions();

		expect(permissions).toHaveLength(new Set(permissions).size);
	});

	it('gives every group at least one resource', () => {
		for (const group of PERMISSION_CATALOG) {
			expect(group.resources.length).toBeGreaterThan(0);
		}
	});

	it('keeps what it does not recognise', () => {
		expect(
			unknownPermissions(['createArtistEntity', 'viewSomethingElse'])
		).toEqual(['viewSomethingElse']);
	});
});
