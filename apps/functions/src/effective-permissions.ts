/**
 * A jogosultság-számítás tiszta (Firestore-mentes) logikája.
 *
 * Igazságforrás a `role/{roleId}` dokumentum `permissions` tömbje: a user
 * dokumentumon lévő hivatkozások (`roleIds`, illetve a régi, beágyazott
 * `roles`) csak megnevezik a szerepkört. A beágyazott `roles[].permissions`
 * tömböt SZÁNDÉKOSAN nem vesszük figyelembe — az a kliens régi, elavuló
 * másolata, és két igazságforrás egyben a hiba forrása is.
 */

/**
 * Az alapértelmezett szerepkör neve (`RoleNames.USER`): minden user megkapja,
 * amikor a dokumentuma létrejön. A kliens magának nem írhat szerepkört (a
 * rules tiltja), ezért ezt a function teszi a `roleIds`-be — enélkül egy új
 * gyűjtőnek egyetlen permissionje sincs, és a saját polcára sem tehet lemezt.
 */
export const DEFAULT_ROLE = 'USER';

/** A `role/{roleId}` dokumentum, az azonosítójával együtt. */
export interface CatalogRole {
	id: string;
	name?: string;
	permissions?: string[];
}

/** A `user/{uid}` dokumentum jogosultság szempontjából érdekes része. */
export interface UserDocument {
	roleIds?: unknown;
	/** ÁTMENETI: a régi, beágyazott szerepkörlista. */
	roles?: unknown;
}

/** A `security/users/{uid}/effective_permissions` dokumentum tartalma. */
export interface EffectivePermissions {
	permissions: string[];
	roles: string[];
}

/**
 * A user szerepkör-hivatkozásai: a `roleIds` elemei, valamint a beágyazott
 * `roles` elemeinek `uid`-ja és `name`-je (a régi adatokban hol az egyik, hol
 * a másik azonosít).
 */
export function roleReferences(user: UserDocument | undefined): Set<string> {
	const references = new Set<string>();

	for (const roleId of asArray(user?.roleIds)) {
		if (typeof roleId === 'string' && roleId) references.add(roleId);
	}

	for (const role of asArray(user?.roles)) {
		if (!role || typeof role !== 'object') continue;

		const { uid, name } = role as { uid?: unknown; name?: unknown };

		if (typeof uid === 'string' && uid) references.add(uid);
		if (typeof name === 'string' && name) references.add(name);
	}

	return references;
}

/**
 * Az alapértelmezett szerepkör hivatkozása, ha a user még nem kapta meg;
 * `null`, ha már megvan. A hivatkozás a szerepkör-dokumentum azonosítója (az
 * admin felületen létrehozotté generált), ha ilyen nincs, a neve — arra is
 * illeszkedik, amint a szerepkör létrejön.
 */
export function missingDefaultRole(
	user: UserDocument | undefined,
	roles: CatalogRole[]
): string | null {
	const references = roleReferences(user);
	const role = roles.find(
		(candidate) =>
			candidate.id === DEFAULT_ROLE || candidate.name === DEFAULT_ROLE
	);

	if (
		references.has(DEFAULT_ROLE) ||
		(role &&
			(references.has(role.id) ||
				(!!role.name && references.has(role.name))))
	) {
		return null;
	}

	return role?.id ?? DEFAULT_ROLE;
}

/** A user szerepköreiből következő permissionök, rendezve és duplikátum nélkül. */
export function calculateEffectivePermissions(
	user: UserDocument | undefined,
	roles: CatalogRole[]
): EffectivePermissions {
	const references = roleReferences(user);
	const matched = roles.filter(
		(role) =>
			references.has(role.id) || (!!role.name && references.has(role.name))
	);

	return {
		permissions: sortedUnique(
			matched.flatMap((role) =>
				asArray(role.permissions).filter(
					(permission): permission is string =>
						typeof permission === 'string' && !!permission
				)
			)
		),
		roles: sortedUnique(matched.map((role) => role.name || role.id)),
	};
}

/** Azonos-e a két jogosultság-állapot (fölösleges írás elkerülésére). */
export function isSameEffectivePermissions(
	a: EffectivePermissions | undefined,
	b: EffectivePermissions
): boolean {
	return (
		!!a &&
		a.permissions.length === b.permissions.length &&
		a.roles.length === b.roles.length &&
		a.permissions.every((value, index) => value === b.permissions[index]) &&
		a.roles.every((value, index) => value === b.roles[index])
	);
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function sortedUnique(values: string[]): string[] {
	return [...new Set(values)].sort();
}
