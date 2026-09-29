import {
	ADMIN_PERMISSION,
	PERMISSION_CATALOG,
	PermissionAction,
	toPermission,
} from './permission-catalog';

/**
 * The catalog read backwards: from a permission name to what it means.
 *
 * The grid answers "what may this role do?"; this answers the other question —
 * given `createArtistEntity`, what is it? Every page that shows a permission
 * the user did not just tick needs it: the effective permissions of a person,
 * the diff of a role about to be saved, a warning about a permission that does
 * not go with another.
 *
 * Borrowed from the shape of `PermissionsService` in the shared role library,
 * with one change: it hands back translation keys rather than words. The words
 * are the template's business, and there are three dictionaries.
 */
export interface PermissionDescriptor {
	permission: string;
	action: PermissionAction;
	/** The resource token, e.g. `ArtistEntity`. */
	resource: string;
	/** Translation key of the resource label. */
	labelKey: string;
	/** Translation key of the group the resource sits in. */
	groupKey: string;
}

const REGISTRY: ReadonlyMap<string, PermissionDescriptor> = new Map(
	PERMISSION_CATALOG.flatMap((group) =>
		group.resources.flatMap((resource) =>
			resource.actions.map((action): [string, PermissionDescriptor] => {
				const permission = toPermission(action, resource.resource);

				return [
					permission,
					{
						action,
						groupKey: group.labelKey,
						labelKey: resource.labelKey,
						permission,
						resource: resource.resource,
					},
				];
			})
		)
	)
);

/** What a permission means, or null when the catalog does not know it. */
export const describePermission = (
	permission: string
): PermissionDescriptor | null => REGISTRY.get(permission) ?? null;

/** One resource's worth of permissions, as a page lists them. */
export interface PermissionLine {
	labelKey: string;
	actions: PermissionAction[];
}

/** A group of permissions, as a page lists them. */
export interface PermissionGrouping {
	groupKey: string;
	lines: PermissionLine[];
}

/**
 * Permissions sorted into the groups and rows of the catalog, so a list of
 * them reads as sentences — "Catalog · Artist: create, update" — instead of
 * forty identifiers in a row.
 *
 * The wildcard and anything the catalog does not know are left out; a caller
 * that wants to show them asks for them separately, because they are not rows.
 */
export function groupPermissions(permissions: string[]): PermissionGrouping[] {
	const groups = new Map<string, Map<string, PermissionAction[]>>();

	for (const permission of permissions) {
		const descriptor = describePermission(permission);

		if (!descriptor) continue;

		const lines = groups.get(descriptor.groupKey) ?? new Map();
		const actions = lines.get(descriptor.labelKey) ?? [];

		actions.push(descriptor.action);
		lines.set(descriptor.labelKey, actions);
		groups.set(descriptor.groupKey, lines);
	}

	// The catalog's own order, not the order the permissions happened to be
	// written in: a role reads the same way wherever it is shown.
	return PERMISSION_CATALOG.filter((group) => groups.has(group.labelKey)).map(
		(group) => ({
			groupKey: group.labelKey,
			lines: group.resources
				.filter((resource) =>
					groups.get(group.labelKey)?.has(resource.labelKey)
				)
				.map((resource) => ({
					labelKey: resource.labelKey,
					actions: orderActions(
						groups.get(group.labelKey)?.get(resource.labelKey) ?? []
					),
				})),
		})
	);
}

/** Whether the list carries the wildcard. */
export const hasWildcard = (permissions: string[]): boolean =>
	permissions.includes(ADMIN_PERMISSION);

/** The actions in the catalog's column order, each one once. */
function orderActions(actions: PermissionAction[]): PermissionAction[] {
	const held = new Set(actions);

	return (['view', 'create', 'update', 'delete'] as PermissionAction[]).filter(
		(action) => held.has(action)
	);
}
