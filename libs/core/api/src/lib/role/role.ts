import { Identifiable } from '@music-collection/common/api';

/**
 * A role: a name and the permissions it carries.
 *
 * This document is the single source of truth for what a permission grants.
 * A user document only points at roles (`roleIds`); the server side sync
 * gathers the permissions of every role a user holds into
 * `security/users/{uid}/effective_permissions`, and that is what the Firestore
 * rules, the Storage rules and the client all read.
 */
export interface Role extends Identifiable {
	name: string;
	permissions: string[];
	/** What the role is for; shown on the admin page only. */
	description?: string | null;
	/** Time of the last write (FirestoreSyncService stamp), epoch milliseconds. */
	updatedAt?: number;
}

/** A role as the admin page writes it: the document without its identity. */
export type RoleDraft = Pick<Role, 'name' | 'permissions' | 'description'>;
