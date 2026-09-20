import { Identifiable } from '@music-collection/common/api';

export interface Role extends Identifiable {
	name: string;
	permissions: string[];
}
