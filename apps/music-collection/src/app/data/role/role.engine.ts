import { Role, RoleDraft } from '@music-collection/api';

import {
	ADMIN_PERMISSION,
	PERMISSION_CATALOG,
	PermissionGroup,
	keepsAccess,
	toPermission,
} from './permission-catalog';

/** Longest a role name — and with it the document id — may be. */
export const ROLE_NAME_MAX_LENGTH = 60;

/**
 * The document id of a role with this name: the name in capitals, anything
 * else an underscore.
 *
 * It reads like the name because the permission sync matches a user's
 * reference against the id *or* the name (`apps/functions` —
 * `roleReferences`), and the seeding scripts write `role/USER` by that same
 * spelling. Once written the id stays put: renaming a role leaves what points
 * at it alone, exactly as a genre's slug does.
 */
export const toRoleId = (name: string): string =>
	name
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, ROLE_NAME_MAX_LENGTH);

/** Whether two names would name the same role. */
export const sameRoleName = (left: string, right: string): boolean =>
	left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();

export type RoleFindingCode =
	| 'name-empty'
	| 'name-too-long'
	| 'name-taken'
	| 'id-taken'
	| 'locks-me-out'
	| 'no-permissions'
	| 'wildcard-redundant'
	| 'edit-page-without-write'
	| 'user-admin-without-view'
	| 'role-delete-without-user-view';

/**
 * Something worth saying about the role being written. An `error` stops the
 * save; a `warning` does not — it is a configuration that will work exactly as
 * written and probably not as meant.
 */
export interface RoleFinding {
	code: RoleFindingCode;
	severity: 'error' | 'warning';
	/** Values the sentence needs, e.g. the label key of a resource. */
	params?: Record<string, string | number>;
}

export interface RoleValidationContext {
	/** The role being edited; null while one is being added. */
	uid: string | null;
	/** Every role there is, the one being edited included. */
	roles: Role[];
	/** The roles the signed-in admin holds, by name, as the server reported. */
	myRoleNames: string[];
}

/**
 * Everything worth saying about a draft before it is written.
 *
 * It is a pure function on purpose — the shared role library keeps its
 * validation in an engine of its own, and the reason holds here too: these are
 * the rules that decide whether a save may happen, they are the part most
 * worth testing, and none of them need Angular to be true.
 *
 * The warnings are not generic role-model advice. Each one is a hole the
 * rules of *this* database actually have: a page that opens on a form whose
 * save the rules will refuse, a user admin who may write a user but not list
 * one, a role admin who may delete a role but cannot find out who holds it.
 */
export function validateRole(
	draft: RoleDraft,
	context: RoleValidationContext
): RoleFinding[] {
	const findings: RoleFinding[] = [];
	const name = draft.name.trim();
	const permissions = draft.permissions;

	if (!name) {
		findings.push({ code: 'name-empty', severity: 'error' });
	} else if (name.length > ROLE_NAME_MAX_LENGTH) {
		findings.push({
			code: 'name-too-long',
			severity: 'error',
			params: { max: ROLE_NAME_MAX_LENGTH },
		});
	} else {
		findings.push(...nameFindings(name, context));
	}

	if (!permissions.length) {
		findings.push({ code: 'no-permissions', severity: 'warning' });
	}

	if (!keepsMyAccess(draft, context)) {
		findings.push({ code: 'locks-me-out', severity: 'error' });
	}

	if (permissions.includes(ADMIN_PERMISSION) && permissions.length > 1) {
		findings.push({
			code: 'wildcard-redundant',
			severity: 'warning',
			params: { count: permissions.length - 1 },
		});
	}

	findings.push(...coherenceFindings(permissions));

	return findings;
}

/** Whether any finding stops the save. */
export const hasErrors = (findings: RoleFinding[]): boolean =>
	findings.some((finding) => finding.severity === 'error');

/**
 * What saving would change. Shown before the save rather than after, because
 * a role is not one person's setting: the sync hands the difference to
 * everybody holding the role, at once, a moment later.
 */
export interface PermissionDiff {
	added: string[];
	removed: string[];
}

export function permissionDiff(
	before: string[],
	after: string[]
): PermissionDiff {
	const held = new Set(before);
	const next = new Set(after);

	return {
		added: after.filter((permission) => !held.has(permission)).sort(),
		removed: before.filter((permission) => !next.has(permission)).sort(),
	};
}

export const isEmptyDiff = (diff: PermissionDiff): boolean =>
	!diff.added.length && !diff.removed.length;

/** How much of one group of the catalog a role carries. */
export interface RoleCoverage {
	groupKey: string;
	granted: number;
	total: number;
}

/**
 * A role summed up group by group, for a list that has one line per role.
 * "12 permissions" says nothing an admin can act on; "Catalog 12/36, Collector
 * data 10/10" says what kind of role it is.
 */
export function describeRole(permissions: string[]): RoleCoverage[] {
	const held = new Set(permissions);

	return PERMISSION_CATALOG.map((group) => {
		const all = groupPermissionNames(group);

		return {
			granted: all.filter((permission) => held.has(permission)).length,
			groupKey: group.labelKey,
			total: all.length,
		};
	});
}

/**
 * The catalog narrowed to what matches the text, group labels included: a
 * search for "album" keeps the album rows, a search for "pages" keeps the
 * whole group. Translation is handed in, so the engine stays free of it and
 * the search works in whichever language is on screen.
 */
export function searchCatalog(
	term: string,
	translate: (key: string) => string
): PermissionGroup[] {
	const needle = term.trim().toLocaleLowerCase();

	if (!needle) return PERMISSION_CATALOG;

	const matches = (key: string) =>
		translate(key).toLocaleLowerCase().includes(needle);

	return PERMISSION_CATALOG.flatMap((group) => {
		if (matches(group.labelKey)) return [group];

		const resources = group.resources.filter(
			(resource) =>
				matches(resource.labelKey) ||
				resource.actions.some((action) =>
					toPermission(action, resource.resource)
						.toLocaleLowerCase()
						.includes(needle)
				)
		);

		return resources.length ? [{ ...group, resources }] : [];
	});
}

/**
 * Whether the admin doing the editing would still be able to open these pages
 * afterwards. Only the role they hold themselves can fail it.
 */
export function keepsMyAccess(
	draft: RoleDraft,
	context: RoleValidationContext
): boolean {
	if (!context.uid) return true;

	const mine = context.roles.filter((role) =>
		context.myRoleNames.includes(role.name)
	);

	if (!mine.some((role) => role.uid === context.uid)) return true;

	return keepsAccess(
		mine.flatMap((role) =>
			role.uid === context.uid
				? draft.permissions
				: (role.permissions ?? [])
		)
	);
}

/** Every permission one group of the catalog offers. */
function groupPermissionNames(group: PermissionGroup): string[] {
	return group.resources.flatMap((resource) =>
		resource.actions.map((action) => toPermission(action, resource.resource))
	);
}

/**
 * Whether another role already answers to the name — or, for a new role, to
 * the id the name would take. Either one identifies a role to the permission
 * sync, so two roles it cannot tell apart would hand a user the union of what
 * they grant without ever saying so.
 *
 * Exported because the write path checks it again on its own: by the time a
 * save goes out, the list the editor was drawn from may be a minute old.
 */
export function nameCollision(
	name: string,
	context: Pick<RoleValidationContext, 'uid' | 'roles'>
): 'name-taken' | 'id-taken' | null {
	const others = context.roles.filter((role) => role.uid !== context.uid);

	if (others.some((role) => sameRoleName(role.name, name))) {
		return 'name-taken';
	}

	// Only a new role picks an id; an existing one keeps the one it has.
	if (!context.uid && others.some((role) => role.uid === toRoleId(name))) {
		return 'id-taken';
	}

	return null;
}

function nameFindings(
	name: string,
	context: RoleValidationContext
): RoleFinding[] {
	const collision = nameCollision(name, context);

	if (!collision) return [];

	return [
		{
			code: collision,
			severity: 'error',
			params: collision === 'id-taken' ? { id: toRoleId(name) } : undefined,
		},
	];
}

/**
 * Combinations the rules of this database make pointless. Each one is a
 * permission that opens something whose next step is refused.
 */
function coherenceFindings(permissions: string[]): RoleFinding[] {
	if (permissions.includes(ADMIN_PERMISSION)) return [];

	const held = new Set(permissions);
	const findings: RoleFinding[] = [];

	// An edit page whose form the rules will not let the role save.
	for (const group of PERMISSION_CATALOG) {
		for (const resource of group.resources) {
			if (!resource.resource.endsWith('EditPage')) continue;
			if (!held.has(toPermission('view', resource.resource))) continue;

			const entity = resource.resource.replace(/EditPage$/, 'Entity');

			if (
				!held.has(`update${entity}`) &&
				!held.has(`create${entity}`)
			) {
				findings.push({
					code: 'edit-page-without-write',
					severity: 'warning',
					params: { labelKey: resource.labelKey },
				});
			}
		}
	}

	// `user/{uid}` may be written but not listed: the page opens on nobody.
	if (held.has('updateUserEntity') && !held.has('viewUserEntity')) {
		findings.push({
			code: 'user-admin-without-view',
			severity: 'warning',
		});
	}

	// Deleting a role first asks who holds it, and that is a user query.
	if (held.has('deleteRoleEntity') && !held.has('viewUserEntity')) {
		findings.push({
			code: 'role-delete-without-user-view',
			severity: 'warning',
		});
	}

	return findings;
}
