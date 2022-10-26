import { MenuItem } from './menu-item.type';

export type TopBarParams = {
	menuItems: MenuItem[];
	addPagePermissions: string[];
	editPagePermissions: string[];
};
