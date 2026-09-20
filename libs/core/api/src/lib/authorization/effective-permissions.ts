/**
 * A `security/users/{uid}/effective_permissions` dokumentum: a user összes
 * szerepköréből következő permissionök. A szerveroldali jogosultság-szinkron
 * function írja (`apps/functions`), a kliens csak olvassa — ugyanaz az
 * igazságforrás, amit a firestore.rules és a storage.rules ellenőriz.
 */
export interface EffectivePermissions {
	permissions: string[];
	roles: string[];
}
