import { Role, User } from '@music-collection/api';

/**
 * Between what a user document says and what the page shows.
 *
 * The persisted shape is `roleIds: string[]`; the page works in whole roles.
 * The shared role library keeps that translation in an adapter of its own, and
 * the reason applies here with one extra twist: this database has *two*
 * spellings of a reference. The permission sync accepts a role's document id
 * and its name alike, and older documents carry a whole embedded `roles`
 * array. Everything that reads or writes a user's roles has to agree about
 * that, so it is written down once, here, and tested on its own.
 */

/**
 * The roles a user document points at: the `roleIds`, plus the uid and the
 * name of every entry of the legacy embedded `roles`.
 *
 * It mirrors `roleReferences` in `apps/functions` deliberately — what this
 * page shows has to be what the permission sync will act on.
 */
export function roleReferences(user: User | undefined): Set<string> {
	const references = new Set<string>();

	for (const roleId of user?.roleIds ?? []) {
		if (roleId) references.add(roleId);
	}

	for (const role of user?.roles ?? []) {
		if (role?.uid) references.add(role.uid);
		if (role?.name) references.add(role.name);
	}

	return references;
}

/** The roles of the catalog a user actually holds. */
export function heldRoles(user: User | undefined, roles: Role[]): Role[] {
	const references = roleReferences(user);

	return roles.filter(
		(role) => references.has(role.uid) || references.has(role.name)
	);
}

/**
 * References the user holds that name no role at all — a role deleted out
 * from under them, or a name a script wrote. Shown rather than dropped: it
 * grants nothing, but it explains what a user's document says.
 */
export function danglingReferences(
	user: User | undefined,
	roles: Role[]
): string[] {
	const known = new Set(roles.flatMap((role) => [role.uid, role.name]));

	return [...roleReferences(user)]
		.filter((reference) => !known.has(reference))
		.sort();
}

/** What the given roles grant together. */
export function permissionsOf(roles: Role[]): string[] {
	return [...new Set(roles.flatMap((role) => role.permissions ?? []))].sort();
}

/**
 * The references after handing the role over, or taking it back.
 *
 * Both spellings go when a role is taken away, and only the document id comes
 * back when it is given: a role named twice is a role that cannot be taken
 * away in one move, which is the one failure this page must not have.
 */
export function withRole(
	references: string[],
	role: Role,
	granted: boolean
): string[] {
	const held = new Set(references);

	held.delete(role.name);
	held.delete(role.uid);

	if (granted) {
		held.add(role.uid);
	}

	return [...held].sort();
}

/** Whether the references name the role, however they spell it. */
export const holdsRole = (references: string[], role: Role): boolean =>
	references.includes(role.uid) || references.includes(role.name);

/** What to call the person: their name, failing that their email. */
export const userName = (user: User): string =>
	user.displayName || user.email || user.uid;
