import { Entity, Identifiable } from '@music-collection/common/api';
import { Role } from '../role';

export interface User extends Entity {
	currentLanguage?: string;
	displayName?: string | null;
	email?: string | null;
	firstName?: string;
	language?: string;
	lastName?: string;
	phone?: string;
	photoURL?: string | null;
	/**
	 * The roles the user holds, by role document id (the permission sync also
	 * accepts a role's name). Written by an admin only — the rules refuse a
	 * user who hands themselves one — and by the sync itself, which puts the
	 * default `USER` role here when the document is first created.
	 */
	roleIds?: string[];
	/**
	 * LEGACY: the roles embedded in the user document, as the app used to
	 * write them. The permission sync still reads the names out of it, but
	 * never the permissions — `role/{roleId}` is the only source of those.
	 * The admin page clears it when it saves a user's roles.
	 */
	roles?: Role[];
}

export type UserReference = {
	displayName?: string | null;
} & Identifiable;
