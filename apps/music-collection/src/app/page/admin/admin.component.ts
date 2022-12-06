import { MenuItem } from 'primeng/api';

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-admin',
	templateUrl: './admin.component.html',
	styleUrls: ['./admin.component.scss'],
})
export class AdminComponent {
	public items!: MenuItem[];

	public constructor() {
		this.items = [
			{
				label: 'Artist',
				routerLink: 'artist',
			},
			{
				label: 'Album',
				routerLink: 'album',
			},
			{
				label: 'Label',
				routerLink: 'label',
			},
			{
				label: 'Release',
				routerLink: 'release',
			},
			{
				label: 'Collection Item',
				routerLink: 'collection-item',
			},
			{
				label: 'Wishlist Item',
				routerLink: 'wishlist-item',
			},
			{
				icon: 'pi pi-file-edit',
				label: 'Document',
				routerLink: 'document',
			},
		];
	}
}
