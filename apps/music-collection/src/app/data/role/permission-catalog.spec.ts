import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import {
	ADMIN_PERMISSION,
	PERMISSION_CATALOG,
	USER_BASELINE_GROUPS,
	baselinePermissions,
	catalogPermissions,
	grantablePermissions,
	unknownPermissions,
} from './permission-catalog';

const ROOT = join(__dirname, '../../../../../..');

const repository = (file: string) => readFileSync(join(ROOT, file), 'utf-8');

/**
 * A permission is only worth a checkbox where something reads it. Three places
 * do, and this file reads all three off the disk rather than trusting a list:
 *
 *  - the two rule files (`hasPerm`), which decide what a client may write;
 *  - the route guards (`only: [...]`), which decide what a page may open;
 *  - the callables (`requireCaller`), which decide what the server will do on
 *    a client's behalf — the only gate on everything the rules refuse outright.
 *
 * The guards name a permission through the constant that declares it
 * (`ArtistAdminPermissionsService.viewArtistListPage`), so a reference to a
 * constant counts as a use. The catalog's own neighbourhood does not count: it
 * references every constant it offers, and counting that would make the test
 * agree with whatever the catalog happens to say.
 */
const IGNORED_FOR_USE = [
	'apps/music-collection/src/app/data/role',
	'apps/music-collection/src/app/page/admin/role',
];

const isSourceFile = (path: string) =>
	(path.endsWith('.ts') || path.endsWith('.html')) &&
	!path.endsWith('.spec.ts');

function sourceFiles(directory: string): string[] {
	const found: string[] = [];

	for (const name of readdirSync(join(ROOT, directory))) {
		if (name === 'node_modules' || name === 'dist') continue;

		const path = `${directory}/${name}`;

		if (statSync(join(ROOT, path)).isDirectory()) {
			found.push(...sourceFiles(path));
		} else if (isSourceFile(path)) {
			found.push(path);
		}
	}

	return found;
}

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
function ruleChecks(): string[] {
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

	return [...enforced];
}

/** Every permission a callable demands of its caller. */
function callableChecks(): string[] {
	const demanded = new Set<string>();

	for (const file of sourceFiles('apps/functions/src')) {
		const source = repository(file);

		for (const [, argument] of source.matchAll(
			/requireCaller\(\s*request,\s*(\[[^\]]*\]|'[A-Za-z]+')/g
		)) {
			for (const [, permission] of argument.matchAll(/'([A-Za-z]+)'/g)) {
				demanded.add(permission);
			}
		}
	}

	return [...demanded];
}

/** Every permission the client names — a route guard, a directive, a check. */
function clientChecks(declared: Set<string>): string[] {
	const used = new Set<string>();
	const files = [
		...sourceFiles('apps/music-collection/src'),
		...sourceFiles('libs'),
	].filter(
		(file) =>
			!file.endsWith('-permissions.service.ts') &&
			!IGNORED_FOR_USE.some((ignored) => file.startsWith(ignored))
	);

	for (const file of files) {
		const source = repository(file);

		for (const [, permission] of source.matchAll(
			/PermissionsService\.([A-Za-z]+)/g
		)) {
			if (declared.has(permission)) used.add(permission);
		}

		for (const [, permission] of source.matchAll(
			/['"`]([A-Za-z]+)['"`]/g
		)) {
			if (declared.has(permission)) used.add(permission);
		}
	}

	return [...used];
}

/** Every permission the codebase declares, by the service that declares it. */
function declaredPermissions(): Set<string> {
	const declared = new Set<string>();

	for (const file of sourceFiles('libs')) {
		if (!file.endsWith('-permissions.service.ts')) continue;

		for (const [, permission] of repository(file).matchAll(
			/static readonly ([A-Za-z]+)/g
		)) {
			declared.add(permission);
		}
	}

	return declared;
}

const DECLARED = declaredPermissions();
const CHECKED = new Set([
	...ruleChecks(),
	...callableChecks(),
	...clientChecks(DECLARED),
]);

describe('the permission catalog', () => {
	it('offers or carries every permission something checks', () => {
		const known = new Set(catalogPermissions());

		expect([...CHECKED].filter((p) => !known.has(p)).sort()).toEqual([]);
	});

	it('offers nothing nobody checks', () => {
		const offered = grantablePermissions().filter(
			(permission) => permission !== ADMIN_PERMISSION
		);

		expect(offered.filter((p) => !CHECKED.has(p)).sort()).toEqual([]);
	});

	it('carries nothing nobody checks', () => {
		expect(
			baselinePermissions()
				.filter((p) => !CHECKED.has(p))
				.sort()
		).toEqual([]);
	});

	/**
	 * The names are not this file's to invent: every one is a constant some
	 * `*-permissions.service.ts` declares. A checkbox whose name nothing else
	 * in the codebase knows grants nothing, however plausible it reads.
	 */
	it('names only permissions the codebase declares', () => {
		const named = catalogPermissions().filter(
			(permission) => permission !== ADMIN_PERMISSION
		);

		expect(named.filter((p) => !DECLARED.has(p)).sort()).toEqual([]);
	});

	it('keeps what a role carries out of what a role is given', () => {
		const carried = new Set(baselinePermissions());

		expect(grantablePermissions().filter((p) => carried.has(p))).toEqual(
			[]
		);
	});

	/**
	 * What the editor shows as carried is what the seeding script actually
	 * hands the `USER` role. The script cannot import this file — it is a plain
	 * node script run against the database — so the two lists are held together
	 * here instead.
	 */
	it('shows the baseline the USER role is seeded with', () => {
		const script = repository('tools/sync/seed-user-role.mjs');
		const block = script.slice(
			script.indexOf('const PERMISSIONS = ['),
			script.indexOf('];', script.indexOf('const PERMISSIONS = ['))
		);
		const seeded = [...block.matchAll(/'([A-Za-z]+)'/g)].map(
			([, permission]) => permission
		);

		expect(seeded.sort()).toEqual(baselinePermissions().sort());
	});

	it('reads the composed permissions out of the rules at all', () => {
		expect(ruleChecks()).toContain('deleteOwnedArtistEntity');
		expect(ruleChecks()).toContain('createTrackEntity');
	});

	it('reads the page permissions off the guards at all', () => {
		expect([...CHECKED]).toContain('viewArtistListPage');
	});

	it('reads the callable permissions at all', () => {
		expect(callableChecks()).toContain('updateMusicCollectionEntity');
	});

	it('names every permission once', () => {
		const permissions = catalogPermissions();

		expect(permissions).toHaveLength(new Set(permissions).size);
	});

	it('gives every group at least one resource', () => {
		for (const group of [...PERMISSION_CATALOG, ...USER_BASELINE_GROUPS]) {
			expect(group.resources.length).toBeGreaterThan(0);
		}
	});

	it('keeps what it does not recognise', () => {
		expect(
			unknownPermissions(['createArtistEntity', 'viewSomethingElse'])
		).toEqual(['viewSomethingElse']);
	});
});
