import { User } from '@music-collection/api';

import { MenuItem } from './menu-item.type';

export type TopBarParams = {
	addPagePermissions: string[];
	editPagePermissions: string[];
	menuItems: MenuItem[];
	user: User;
};
