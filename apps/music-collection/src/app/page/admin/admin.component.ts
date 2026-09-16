import { MenuItem } from 'primeng/api';

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BreadcrumbModule } from '@music-collection/ui';
import {
	DefaultLayoutDirective,
	DefaultFlexDirective,
} from 'ng-flex-layout/flex';
import { Bind } from 'primeng/bind';
import { Menu } from 'primeng/menu';
import { RouterOutlet } from '@angular/router';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-admin',
	templateUrl: './admin.component.html',
	styleUrls: ['./admin.component.scss'],
	imports: [
		BreadcrumbModule,
		DefaultLayoutDirective,
		DefaultFlexDirective,
		Bind,
		Menu,
		RouterOutlet,
	],
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
