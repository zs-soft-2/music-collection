import { Entity } from '../../common';
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
	roles?: Role[];
}
