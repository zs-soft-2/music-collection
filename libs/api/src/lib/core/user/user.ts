import { Identifiable } from '../../common';
import { Role } from '../role';

export interface User extends Identifiable {
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
